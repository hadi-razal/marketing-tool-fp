'use client';
import React, { useEffect, useState } from 'react';
import { StatsGrid } from '@/components/Dashboard/StatsGrid';
import { RecentActivity } from '@/components/Dashboard/RecentActivity';
import { createClient } from '@/lib/supabase';

type DashboardTask = {
    id: string | number;
    status?: string | null;
    related_to?: string | null;
};

export default function DashboardPage() {
    const [stats, setStats] = useState({
        totalCompanies: 0,
        totalPeople: 0,
        totalGoodLeads: 0,
        contacted: 0,
        needToContact: 0,
        followupNeeded: 0,
        pendingTasks: 0,
    });

    const [userName, setUserName] = useState<string>('');

    // Get greeting based on time of day
    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good morning';
        if (hour < 18) return 'Good afternoon';
        return 'Good evening';
    };

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const supabase = createClient();

                // Fetch total companies
                const { count: companyCount } = await supabase
                    .from('companies')
                    .select('*', { count: 'exact', head: true });

                // Fetch total people
                const { count: peopleCount } = await supabase
                    .from('people')
                    .select('*', { count: 'exact', head: true });

                // Fetch good leads
                const { count: goodLeadsCount } = await supabase
                    .from('people')
                    .select('*', { count: 'exact', head: true })
                    .eq('contact_status', 'Good Lead');

                // Fetch contacted count
                const { count: contactedCount } = await supabase
                    .from('people')
                    .select('*', { count: 'exact', head: true })
                    .eq('contact_status', 'Contacted');

                // Fetch followup needed (Need to Contact + In Progress)
                const { count: needToContactCount } = await supabase
                    .from('people')
                    .select('*', { count: 'exact', head: true })
                    .eq('contact_status', 'Need to Contact');
                
                const { count: inProgressCount } = await supabase
                    .from('people')
                    .select('*', { count: 'exact', head: true })
                    .eq('contact_status', 'In Progress');

                // Fetch pending tasks + tasks linked to people
                // Count tasks that are either pending OR linked to a person (via related_to)
                const { data: allTasks } = await supabase
                    .from('tasks')
                    .select('id, status, related_to');
                
                // Count unique tasks that are either pending OR have a related_to value
                const relevantTasks = (allTasks as DashboardTask[] | null)?.filter((task) =>
                    task.status === 'Pending' || (task.related_to && task.related_to.trim() !== '')
                ) || [];
                const pendingTasksCount = new Set(relevantTasks.map((t) => t.id)).size;

                setStats(prev => ({
                    ...prev,
                    totalCompanies: companyCount || 0,
                    totalPeople: peopleCount || 0,
                    totalGoodLeads: goodLeadsCount || 0,
                    contacted: contactedCount || 0,
                    needToContact: needToContactCount || 0,
                    followupNeeded: inProgressCount || 0,
                    pendingTasks: pendingTasksCount || 0
                }));
            } catch (err) {
                console.error('Failed to fetch dashboard stats', err);
            }
        };

        const fetchUser = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();

            if (user) {
                const { data: userData } = await supabase
                    .from('users')
                    .select('name')
                    .eq('uid', user.id)
                    .single();

                if (userData?.name) {
                    setUserName(userData.name);
                }
            }
        };

        fetchStats();
        fetchUser();
    }, []);

    return (
        <div className="h-full overflow-y-auto custom-scrollbar">
            <div className="max-w-7xl mx-auto p-6 lg:p-8 space-y-8">
                {/* Header */}
                <div className="rounded-2xl border border-zinc-200 bg-white/90 p-6 lg:p-8 shadow-xl shadow-zinc-950/5">
                    <p className="text-zinc-500 text-sm">{getGreeting()}, <span className="text-zinc-950 font-semibold">{userName || 'User'}</span></p>
                    <h1 className="mt-2 text-3xl lg:text-4xl font-bold text-zinc-950 tracking-tight">Dashboard</h1>
                    <p className="mt-2 text-sm text-zinc-500 max-w-2xl">
                        A cleaner overview of companies, leads, follow-ups, and tasks across your Fairplatz marketing workflow.
                    </p>
                </div>

                {/* Stats */}
                <StatsGrid stats={stats} />

                {/* Main Content */}
                <div className="w-full">
                    <RecentActivity />
                </div>
            </div>
        </div>
    );
}

