'use client';
import React, { useEffect, useState } from 'react';
import { StatsGrid, type DashboardStats } from '@/components/Dashboard/StatsGrid';
import { DashboardPipelineSummary } from '@/components/Dashboard/DashboardPipelineSummary';
import { RecentActivity } from '@/components/Dashboard/RecentActivity';
import { createClient } from '@/lib/supabase';
import { LayoutDashboard } from 'lucide-react';
import { format } from 'date-fns';

const emptyStats: DashboardStats = {
    totalGoodLeads: 0,
    contacted: 0,
    needToContact: 0,
    followupNeeded: 0,
};

export default function DashboardPage() {
    const [stats, setStats] = useState<DashboardStats>(emptyStats);
    const [statsLoading, setStatsLoading] = useState(true);
    const [userName, setUserName] = useState<string>('');

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good morning';
        if (hour < 18) return 'Good afternoon';
        return 'Good evening';
    };

    const firstName = userName.trim().split(/\s+/)[0] || 'there';

    useEffect(() => {
        const fetchStats = async () => {
            setStatsLoading(true);
            try {
                const supabase = createClient();

                const { count: goodLeadsCount } = await supabase
                    .from('people')
                    .select('*', { count: 'exact', head: true })
                    .eq('contact_status', 'Good Lead');

                const { count: contactedCount } = await supabase
                    .from('people')
                    .select('*', { count: 'exact', head: true })
                    .eq('contact_status', 'Contacted');

                const { count: needToContactCount } = await supabase
                    .from('people')
                    .select('*', { count: 'exact', head: true })
                    .eq('contact_status', 'Need to Contact');

                const { count: inProgressCount } = await supabase
                    .from('people')
                    .select('*', { count: 'exact', head: true })
                    .eq('contact_status', 'In Progress');

                setStats({
                    totalGoodLeads: goodLeadsCount || 0,
                    contacted: contactedCount || 0,
                    needToContact: needToContactCount || 0,
                    followupNeeded: inProgressCount || 0,
                });
            } catch (err) {
                console.error('Failed to fetch dashboard stats', err);
            } finally {
                setStatsLoading(false);
            }
        };

        const fetchUser = async () => {
            const supabase = createClient();
            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (user) {
                const { data: userData } = await supabase.from('users').select('name').eq('uid', user.id).single();

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
            <div className="mx-auto max-w-7xl space-y-8 p-6 pb-12 lg:p-8">
                {/* Hero */}
                <header className="relative overflow-hidden rounded-3xl border border-zinc-200/90 bg-white p-6 shadow-sm shadow-zinc-950/5 sm:p-8">
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_100%_0%,rgba(251,146,60,0.12),transparent)]" />
                    <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                        <div className="min-w-0 space-y-2">
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500">
                                <span className="inline-flex items-center gap-1.5 font-semibold uppercase tracking-[0.14em] text-orange-600">
                                    <LayoutDashboard className="h-3.5 w-3.5" aria-hidden />
                                    Overview
                                </span>
                                <span className="hidden text-zinc-300 sm:inline" aria-hidden>
                                    ·
                                </span>
                                <time dateTime={format(new Date(), 'yyyy-MM-dd')} className="tabular-nums">
                                    {format(new Date(), 'EEEE, MMMM d')}
                                </time>
                            </div>
                            <p className="text-sm text-zinc-600">
                                {getGreeting()}, <span className="font-semibold text-zinc-950">{firstName}</span>
                            </p>
                            <h1 className="text-balance text-3xl font-bold tracking-tight text-zinc-950 sm:text-4xl">Dashboard</h1>
                            <p className="max-w-xl text-pretty text-sm leading-relaxed text-zinc-500">
                                Pipeline counts refresh as you update people in the database.
                            </p>
                        </div>
                    </div>
                </header>

                {/* Stats + activity */}
                <div className="grid gap-8 xl:grid-cols-[1fr_minmax(300px,380px)] xl:items-start">
                    <div className="flex min-w-0 flex-col gap-6">
                        <StatsGrid stats={stats} loading={statsLoading} />
                        <DashboardPipelineSummary stats={stats} loading={statsLoading} />
                    </div>

                    <aside className="min-h-[280px] xl:sticky xl:top-4 xl:self-start">
                        <RecentActivity />
                    </aside>
                </div>
            </div>
        </div>
    );
}
