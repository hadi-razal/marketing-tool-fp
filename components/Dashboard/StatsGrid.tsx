import React from 'react';
import { Building2, Users, Sparkles, Phone, Clock, ListTodo } from 'lucide-react';

interface StatsGridProps {
    stats: {
        totalCompanies: number;
        totalPeople: number;
        totalGoodLeads: number;
        contacted: number;
        needToContact: number;
        followupNeeded: number;
        pendingTasks: number;
    };
}

const StatCard = ({ label, value, icon: Icon, accent }: { label: string; value: string | number; icon: any; accent: string }) => (
    <div className="group relative overflow-hidden bg-zinc-900/40 backdrop-blur-sm rounded-md p-5 border border-white/5 hover:border-white/10 transition-all duration-300 hover:bg-zinc-900/60 shadow-lg shadow-black/20">
        <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full bg-gradient-to-br ${accent} opacity-5 group-hover:opacity-10 transition-opacity blur-2xl`} />

        <div className="relative flex items-start justify-between">
            <div className="space-y-4">
                <div className={`w-10 h-10 rounded-md bg-gradient-to-br ${accent} bg-opacity-10 border border-white/5 flex items-center justify-center`}>
                    <Icon className="w-5 h-5 text-white/90" />
                </div>
                <div>
                    <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-1">{label}</p>
                    <p className="text-2xl font-bold text-white tracking-tight">{value}</p>
                </div>
            </div>
            {/* Optional sparkline or indicator could go here */}
        </div>
    </div>
);

export const StatsGrid: React.FC<StatsGridProps> = ({ stats }) => {
    return (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard
                label="Total Companies"
                value={stats.totalCompanies.toLocaleString()}
                icon={Building2}
                accent="from-blue-500 to-indigo-500"
            />
            <StatCard
                label="Saved People"
                value={stats.totalPeople.toLocaleString()}
                icon={Users}
                accent="from-violet-500 to-purple-500"
            />
            <StatCard
                label="Good Leads"
                value={stats.totalGoodLeads}
                icon={Sparkles}
                accent="from-emerald-500 to-teal-500"
            />
            <StatCard
                label="Need to Contact"
                value={stats.needToContact.toLocaleString()}
                icon={Phone}
                accent="from-orange-500 to-amber-500"
            />
            <StatCard
                label="Followup Needed"
                value={stats.followupNeeded.toLocaleString()}
                icon={Clock}
                accent="from-yellow-500 to-orange-500"
            />
            <StatCard
                label="Total Tasks"
                value={stats.pendingTasks.toLocaleString()}
                icon={ListTodo}
                accent="from-cyan-500 to-blue-500"
            />
        </div>
    );
};
