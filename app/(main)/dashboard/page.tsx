'use client';
import React, { useEffect, useState } from 'react';
import { StatsGrid } from '@/components/Dashboard/StatsGrid';
import { RecentlySaved } from '@/components/Dashboard/RecentlySaved';
import { databaseService } from '@/services/databaseService';
import { RecentActivity } from '@/components/Dashboard/RecentActivity';
import { FPLevelDistribution } from '@/components/Dashboard/FPLevelDistribution';
import { zohoApi } from '@/lib/zoho';

export default function DashboardPage() {
    const [stats, setStats] = useState({
        totalCompanies: 0,
        contacted: 142, // Mock
        pendingTasks: 4, // Mock
        avgLevel: 2.4, // Mock
    });

    const [fpLevels, setFpLevels] = useState({
        level1: 45,
        level2: 32,
        level3: 18,
        level4: 12
    });

    const [recentCompanies, setRecentCompanies] = useState<any[]>([]);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                // Fetch real count for Total Companies (Exhibitors)
                const res = await zohoApi.getRecordCount('Exhibitor_List');
                if (res.code === 3000) {
                    setStats(prev => ({ ...prev, totalCompanies: parseInt(res.count) || 0 }));
                }
            } catch (err) {
                console.error('Failed to fetch dashboard stats', err);
            }
        };

        const fetchRecent = async () => {
            try {
                const companies = await databaseService.getRecentCompanies(5);
                setRecentCompanies(companies);
            } catch (err) {
                console.error('Failed to fetch recent companies', err);
            }
        };

        fetchStats();
        // fetchRecent();
    }, []);

    return (
        <div className="h-full overflow-y-auto custom-scrollbar p-8 space-y-8 bg-[#09090b] border border-white/5 rounded-[32px]">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold text-white tracking-tight">Dashboard</h1>
                <p className="text-zinc-400">Overview of your marketing activities.</p>
            </div>

            {/* Top Stats Row */}
            <StatsGrid stats={stats} />

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent Activity - Takes up 2 columns */}
                <div className="lg:col-span-2 space-y-6">
                    <RecentActivity />
                </div>

                {/* Right Column - FP Levels & Recently Saved */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="h-[400px]">
                        <FPLevelDistribution levels={fpLevels} />
                    </div>
                    <div className="h-[400px]">
                        <RecentlySaved companies={recentCompanies} />
                    </div>
                </div>
            </div>
        </div>
    );
}
