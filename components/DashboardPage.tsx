import React from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { Sidebar } from './Sidebar';
import { Card } from './ui/Card';
import { TrendingUp, Users, Globe, Activity, ArrowUpRight } from 'lucide-react';

const dataLocation = [
    { name: 'NY', leads: 40 },
    { name: 'CA', leads: 30 },
    { name: 'UK', leads: 20 },
    { name: 'TX', leads: 10 },
];

const dataIndustry = [
    { name: 'Tech', value: 400 },
    { name: 'Finance', value: 300 },
    { name: 'Health', value: 300 },
    { name: 'Retail', value: 200 },
];

const COLORS = ['#f97316', '#ea580c', '#c2410c', '#9a3412'];

const StatCard = ({ title, value, icon: Icon, trend }: any) => (
    <Card hoverEffect className="flex flex-col gap-4">
        <div className="flex justify-between items-start">
            <div className="p-3 bg-orange-500/10 rounded-2xl border border-orange-500/20">
                <Icon className="w-6 h-6 text-orange-500" />
            </div>
            {trend && (
                <span className="text-xs font-bold text-green-500 bg-green-500/10 border border-green-500/20 px-2 py-1 rounded-full flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" /> {trend}
                </span>
            )}
        </div>
        <div>
            <p className="text-zinc-500 text-sm font-medium">{title}</p>
            <h3 className="text-3xl font-bold text-white mt-1 tracking-tight">{value}</h3>
        </div>
    </Card>
);

export const DashboardPage = () => {
    return (
        <div className="flex h-full gap-6">
            <Sidebar title="Analytics Overview">
                <div className="h-full flex flex-col justify-center items-center text-center space-y-8">
                    <div className="relative">
                        <div className="absolute inset-0 bg-orange-500 blur-[40px] opacity-20 rounded-full" />
                        <div className="relative w-24 h-24 rounded-3xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-2xl shadow-orange-500/30 border border-white/10">
                            <Activity className="w-10 h-10 text-white" />
                        </div>
                    </div>

                    <div>
                        <h2 className="text-2xl font-bold text-white tracking-tight">Performance</h2>
                        <p className="text-zinc-500 text-sm mt-2 max-w-[200px] mx-auto leading-relaxed">
                            Real-time insights into your lead generation performance.
                        </p>
                    </div>

                    <div className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

                    <div className="grid grid-cols-2 gap-4 w-full">
                        <div className="bg-zinc-900/40 p-4 rounded-2xl border border-white/5">
                            <p className="text-2xl font-bold text-white">1.2k</p>
                            <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">Total Leads</p>
                        </div>
                        <div className="bg-zinc-900/40 p-4 rounded-2xl border border-white/5">
                            <p className="text-2xl font-bold text-green-500">98%</p>
                            <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">Valid Email</p>
                        </div>
                    </div>

                    <button className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-sm font-medium text-zinc-400 hover:text-white transition-all flex items-center justify-center gap-2 group">
                        View Full Report <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </button>
                </div>
            </Sidebar>

            <div className="flex-1 glass-panel rounded-[32px] p-8 overflow-y-auto custom-scrollbar">
                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-3xl font-bold text-white tracking-tight">Dashboard</h1>
                    <div className="flex gap-2">
                        <select className="bg-zinc-900/50 border border-white/10 text-zinc-400 text-sm rounded-xl px-4 py-2 outline-none focus:border-orange-500/50">
                            <option>Last 7 Days</option>
                            <option>Last 30 Days</option>
                            <option>This Year</option>
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <StatCard title="Total Enriched" value="1,234" icon={Users} trend="+12.5%" />
                    <StatCard title="Active Campaigns" value="8" icon={Globe} trend="+5%" />
                    <StatCard title="Avg. Lead Score" value="85" icon={Activity} trend="+2.1%" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="p-6">
                        <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                            <Globe className="w-5 h-5 text-zinc-500" /> Leads by Location
                        </h3>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={dataLocation}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                    <XAxis dataKey="name" stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                                    <YAxis stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} dx={-10} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#09090b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.5)' }}
                                        itemStyle={{ color: '#fff' }}
                                        cursor={{ fill: 'rgba(255,255,255,0.05)', radius: 4 }}
                                    />
                                    <Bar dataKey="leads" fill="#f97316" radius={[6, 6, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>

                    <Card className="p-6">
                        <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                            <Users className="w-5 h-5 text-zinc-500" /> Industry Distribution
                        </h3>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={dataIndustry}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={80}
                                        outerRadius={110}
                                        paddingAngle={4}
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        {dataIndustry.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#09090b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.5)' }}
                                        itemStyle={{ color: '#fff' }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};
