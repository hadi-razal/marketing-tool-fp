import React from 'react';
import { Building2, Phone, ListTodo, TrendingUp } from 'lucide-react';

interface StatsGridProps {
    stats: {
        totalCompanies: number;
        contacted: number;
        pendingTasks: number;
        avgLevel: number;
    };
}

const StatCard = ({ label, value, icon: Icon, accent }: { label: string; value: string | number; icon: any; accent: string }) => (
    <div className="group relative bg-zinc-900/50 hover:bg-zinc-900 rounded-2xl p-5 transition-all duration-200 border border-white/[0.04] hover:border-white/[0.08]">
        <div className="flex items-start justify-between">
            <div className="space-y-3">
                <p className="text-zinc-500 text-xs font-medium uppercase tracking-wide">{label}</p>
                <p className="text-2xl font-semibold text-white">{value}</p>
            </div>
            <div className={`p-2.5 rounded-xl ${accent}`}>
                <Icon className="w-4 h-4" />
            </div>
        </div>
    </div>
);

export const StatsGrid: React.FC<StatsGridProps> = ({ stats }) => {
    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
                label="Companies"
                value={stats.totalCompanies.toLocaleString()}
                icon={Building2}
                accent="bg-blue-500/10 text-blue-400"
            />
            <StatCard
                label="Contacted"
                value={stats.contacted.toLocaleString()}
                icon={Phone}
                accent="bg-emerald-500/10 text-emerald-400"
            />
            <StatCard
                label="Pending Tasks"
                value={stats.pendingTasks}
                icon={ListTodo}
                accent="bg-amber-500/10 text-amber-400"
            />
            <StatCard
                label="Avg. Level"
                value={stats.avgLevel.toFixed(1)}
                icon={TrendingUp}
                accent="bg-violet-500/10 text-violet-400"
            />
        </div>
    );
};
