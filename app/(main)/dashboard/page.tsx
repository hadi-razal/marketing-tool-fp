'use client';
import React, { useEffect, useState } from 'react';
import { StatsGrid } from '@/components/Dashboard/StatsGrid';
import { RecentActivity } from '@/components/Dashboard/RecentActivity';
import { FPLevelDistribution } from '@/components/Dashboard/FPLevelDistribution';
import { RecentlySaved } from '@/components/Dashboard/RecentlySaved';
import { zohoApi } from '@/lib/zoho';
import { createClient } from '@/lib/supabase';

export default function DashboardPage() {
    const [stats, setStats] = useState({
        totalCompanies: 0,
        contacted: 142,
        pendingTasks: 4,
        avgLevel: 2.4,
    });

    const [fpLevels, setFpLevels] = useState({
        level1: 45,
        level2: 32,
        level3: 18,
        level4: 12
    });

    const [recentCompanies, setRecentCompanies] = useState<any[]>([]);
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
                const res = await zohoApi.getRecordCount('Exhibitor_List');
                if (res.code === 3000) {
                    setStats(prev => ({ ...prev, totalCompanies: parseInt(res.count) || 0 }));
                }
            } catch (err) {
                console.error('Failed to fetch dashboard stats', err);
            }
        };

        const fetchUser = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (user?.user_metadata?.name) {
                setUserName(user.user_metadata.name);
            }
        };

        fetchStats();
        fetchUser();
    }, []);

    return (
        <div className="h-full overflow-y-auto custom-scrollbar">
            <div className="max-w-7xl mx-auto p-6 lg:p-8 space-y-8">
                {/* Header */}
                <div className="space-y-1">
                    <p className="text-zinc-500 text-sm">{getGreeting()}, <span className="text-white font-medium">{userName || 'User'}</span></p>
                    <h1 className="text-2xl font-semibold text-white">Dashboard</h1>
                </div>

                {/* Stats */}
                <StatsGrid stats={stats} />

                {/* Main Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Activity - 2 columns */}
                    <div className="lg:col-span-2">
                        <RecentActivity />
                    </div>

                    {/* Right Column */}
                    <div className="space-y-6">
                        <FPLevelDistribution levels={fpLevels} />
                        <RecentlySaved companies={recentCompanies} />
                    </div>
                </div>
            </div>
        </div>
    );
}
