import React from 'react';
import { Users, Target, Zap, DollarSign, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';

interface StatsGridProps {
    stats: {
        totalEnriched: number;
        activeCampaigns: number;
        avgLeadScore: number;
        estValue: number;
    };
}

const StatCard = ({ label, value, icon: Icon, trend, color }: any) => (
    <motion.div
        whileHover={{ y: -2 }}
        className="bg-zinc-900/50 backdrop-blur-xl border border-white/5 p-6 rounded-2xl relative overflow-hidden group"
    >
        <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity ${color}`}>
            <Icon className="w-16 h-16" />
        </div>
        <div className="relative z-10">
            <div className={`w-10 h-10 rounded-xl ${color.replace('text-', 'bg-')}/10 flex items-center justify-center mb-4 ${color}`}>
                <Icon className="w-5 h-5" />
            </div>
            <div className="flex items-end justify-between">
                <div>
                    <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-1">{label}</p>
                    <h3 className="text-2xl font-bold text-white">{value}</h3>
                </div>
                {trend && (
                    <div className="flex items-center gap-1 text-green-500 bg-green-500/10 px-2 py-1 rounded-lg text-xs font-bold">
                        <TrendingUp className="w-3 h-3" />
                        {trend}
                    </div>
                )}
            </div>
        </div>
    </motion.div>
);

export const StatsGrid: React.FC<StatsGridProps> = ({ stats }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
                label="Total Enriched"
                value={stats.totalEnriched.toLocaleString()}
                icon={Users}
                trend="+12.5%"
                color="text-orange-500"
            />
            <StatCard
                label="Active Campaigns"
                value={stats.activeCampaigns}
                icon={Target}
                trend="+5%"
                color="text-blue-500"
            />
            <StatCard
                label="Avg. Lead Score"
                value={stats.avgLeadScore}
                icon={Zap}
                trend="+2.1%"
                color="text-green-500"
            />
            <StatCard
                label="Est. Value"
                value={`$${(stats.estValue / 1000).toFixed(0)}k`}
                icon={DollarSign}
                trend="+8.4%"
                color="text-yellow-500"
            />
        </div>
    );
};
