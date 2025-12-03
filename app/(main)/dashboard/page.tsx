'use client';
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { StatsGrid } from '@/components/Dashboard/StatsGrid';
import { PendingTodos } from '@/components/Dashboard/PendingTodos';
import { RecentActivity } from '@/components/Dashboard/RecentActivity';
import { zohoApi } from '@/lib/zoho';

export default function DashboardPage() {
    const [stats, setStats] = useState({
        totalEnriched: 0,
        activeCampaigns: 8, // Mock
        avgLeadScore: 85, // Mock
        estValue: 45000 // Mock
    });

    useEffect(() => {
        const fetchStats = async () => {
            try {
                // Fetch real count for Total Enriched (Exhibitors)
                const res = await zohoApi.getRecordCount('Exhibitor_List');
                if (res.code === 3000) {
                    setStats(prev => ({ ...prev, totalEnriched: parseInt(res.count) || 0 }));
                }
            } catch (err) {
                console.error('Failed to fetch dashboard stats', err);
            }
        };
        fetchStats();
    }, []);

    return (
        <div className="h-full overflow-y-auto custom-scrollbar p-8 space-y-8">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold text-white tracking-tight">Dashboard</h1>
                <p className="text-zinc-400">Overview of your marketing activities.</p>
            </div>

            {/* Top Stats Row - Compact */}
            <StatsGrid stats={stats} />

            {/* Main Content - Minimal Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
                {/* Recent Activity - Prominent */}
                <div className="lg:col-span-2 h-full">
                    <RecentActivity />
                </div>

                {/* Quick Tasks - Side */}
                <div className="lg:col-span-1 h-full">
                    <PendingTodos />
                </div>
            </div>
        </div>
    );
}
