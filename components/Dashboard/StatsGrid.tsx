import React from 'react';
import { Users, Phone, CheckSquare, BarChart2, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';

interface StatsGridProps {
    stats: {
        totalCompanies: number;
        contacted: number;
        pendingTasks: number;
        avgLevel: number;
    };
}

const StatCard = ({ label, value, icon: Icon, trend, color }: any) => (
    <motion.div
        whileHover={{ y: -2 }}
        className="bg-[#09090b] border border-white/5 p-6 rounded-[32px] relative overflow-hidden group"
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
                label="Total Companies"
                value={stats.totalCompanies.toLocaleString()}
                icon={Users}
                trend="+12.5%"
                color="text-blue-500"
            />
            <StatCard
                label="Contacted"
                value={stats.contacted.toLocaleString()}
                icon={Phone}
                trend="+5%"
                color="text-green-500"
            />
            <StatCard
                label="Pending Tasks"
                value={stats.pendingTasks}
                icon={CheckSquare}
                trend="-2"
                color="text-orange-500"
            />
            <StatCard
                label="Avg. FP Level"
                value={stats.avgLevel.toFixed(1)}
                icon={BarChart2}
                trend="+0.4"
                color="text-purple-500"
            />
        </div>
    );
};
