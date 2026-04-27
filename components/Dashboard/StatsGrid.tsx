import React from 'react';
import { Building2, Users, Sparkles, Phone, Clock, ListTodo, type LucideIcon } from 'lucide-react';

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

const StatCard = ({ label, value, icon: Icon, accent }: { label: string; value: string | number; icon: LucideIcon; accent: string }) => (
    <div className="group relative overflow-hidden bg-white rounded-2xl p-5 border border-zinc-200 hover:border-orange-200 transition-all duration-300 hover:bg-orange-50/30 shadow-sm hover:shadow-lg hover:shadow-zinc-950/5">
        <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full bg-linear-to-br ${accent} opacity-10 group-hover:opacity-20 transition-opacity blur-2xl`} />

        <div className="relative flex items-start justify-between">
            <div className="space-y-4">
                <div className={`w-10 h-10 rounded-xl bg-linear-to-br ${accent} flex items-center justify-center shadow-lg shadow-zinc-950/10`}>
                    <Icon className="w-5 h-5 text-white" />
                </div>
                <div>
                    <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-1">{label}</p>
                    <p className="text-2xl font-bold text-zinc-950 tracking-tight">{value}</p>
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
