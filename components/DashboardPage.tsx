import React from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { Sidebar } from './Sidebar';
import { Card } from './ui/Card';
import { TrendingUp, Users, Globe, Activity, ArrowUpRight, Zap, Target, DollarSign } from 'lucide-react';
import { motion } from 'framer-motion';

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

const dataTrend = [
    { name: 'Mon', value: 400 },
    { name: 'Tue', value: 300 },
    { name: 'Wed', value: 500 },
    { name: 'Thu', value: 280 },
    { name: 'Fri', value: 590 },
    { name: 'Sat', value: 320 },
    { name: 'Sun', value: 450 },
];

const COLORS = ['#f97316', '#ea580c', '#c2410c', '#9a3412'];

const StatCard = ({ title, value, icon: Icon, trend, color = "orange" }: any) => (
    <Card hoverEffect className="flex flex-col gap-4 relative overflow-hidden group">
        <div className={`absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity`}>
            <Icon className="w-24 h-24" />
        </div>
        <div className="flex justify-between items-start z-10">
            <div className={`p-3 rounded-2xl border ${color === 'orange' ? 'bg-orange-500/10 border-orange-500/20 text-orange-500' : color === 'blue' ? 'bg-blue-500/10 border-blue-500/20 text-blue-500' : 'bg-green-500/10 border-green-500/20 text-green-500'}`}>
                <Icon className="w-6 h-6" />
            </div>
            {trend && (
                <span className="text-xs font-bold text-green-500 bg-green-500/10 border border-green-500/20 px-2 py-1 rounded-full flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" /> {trend}
                </span>
            )}
        </div>
        <div className="z-10">
            <p className="text-zinc-500 text-sm font-medium">{title}</p>
            <h3 className="text-3xl font-bold text-white mt-1 tracking-tight">{value}</h3>
        </div>
    </Card>
);

export const DashboardPage = () => {
    return (
        <div className="flex flex-col xl:flex-row h-full gap-6">
            {/* Analytics Sidebar */}
            <div className="w-full xl:w-80 flex-shrink-0 flex flex-col bg-zinc-900/50 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-xl">
                <div className="h-full flex flex-col justify-center items-center text-center space-y-8 py-8 xl:py-0">
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
                        <div className="bg-zinc-950/50 p-4 rounded-2xl border border-white/5">
                            <p className="text-2xl font-bold text-white">1.2k</p>
                            <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">Total Leads</p>
                        </div>
                        <div className="bg-zinc-950/50 p-4 rounded-2xl border border-white/5">
                            <p className="text-2xl font-bold text-green-500">98%</p>
                            <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">Valid Email</p>
                        </div>
                    </div>

                    <button className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-sm font-medium text-zinc-400 hover:text-white transition-all flex items-center justify-center gap-2 group">
                        View Full Report <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </button>
                </div>
            </div>

            {/* Main Dashboard Content */}
            <div className="flex-1 bg-zinc-900/50 backdrop-blur-xl border border-white/10 rounded-3xl p-6 lg:p-8 overflow-y-auto custom-scrollbar shadow-xl">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-white tracking-tight">Dashboard</h1>
                        <p className="text-zinc-400 text-sm mt-1">Welcome back, here's what's happening today.</p>
                    </div>
                    <div className="flex gap-2">
                        <select className="bg-zinc-950/50 border border-white/10 text-zinc-400 text-sm rounded-xl px-4 py-2 outline-none focus:border-orange-500/50 transition-colors">
                            <option>Last 7 Days</option>
                            <option>Last 30 Days</option>
                            <option>This Year</option>
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                        <StatCard title="Total Enriched" value="1,234" icon={Users} trend="+12.5%" color="orange" />
                    </motion.div>
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                        <StatCard title="Active Campaigns" value="8" icon={Target} trend="+5%" color="blue" />
                    </motion.div>
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                        <StatCard title="Avg. Lead Score" value="85" icon={Zap} trend="+2.1%" color="green" />
                    </motion.div>
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                        <StatCard title="Est. Value" value="$45k" icon={DollarSign} trend="+8.4%" color="orange" />
                    </motion.div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    <Card className="p-6">
                        <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                            <Activity className="w-5 h-5 text-zinc-500" /> Lead Acquisition Trend
                        </h3>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={dataTrend}>
                                    <defs>
                                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                    <XAxis dataKey="name" stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                                    <YAxis stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} dx={-10} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#09090b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.5)' }}
                                        itemStyle={{ color: '#fff' }}
                                        cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 2 }}
                                    />
                                    <Area type="monotone" dataKey="value" stroke="#f97316" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>

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
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <Card className="p-6 lg:col-span-1">
                        <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                            <Users className="w-5 h-5 text-zinc-500" /> Industry Distribution
                        </h3>
                        <div className="h-[250px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={dataIndustry}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
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
                        <div className="flex flex-wrap justify-center gap-4 mt-4">
                            {dataIndustry.map((entry, index) => (
                                <div key={entry.name} className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                                    <span className="text-xs text-zinc-400">{entry.name}</span>
                                </div>
                            ))}
                        </div>
                    </Card>

                    <Card className="p-6 lg:col-span-2">
                        <h3 className="text-lg font-bold text-white mb-4">Recent Activity</h3>
                        <div className="space-y-4">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/5">
                                    <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400">
                                        <User className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-white">New lead enriched: <span className="text-orange-500">Sarah Connor</span></p>
                                        <p className="text-xs text-zinc-500">Cyberdyne Systems • CEO</p>
                                    </div>
                                    <span className="text-xs text-zinc-600">2m ago</span>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};

// Helper icon
const User = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
)
