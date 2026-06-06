'use client';
import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { StatsGrid, type DashboardStats } from '@/components/Dashboard/StatsGrid';
import { DashboardPipelineSummary } from '@/components/Dashboard/DashboardPipelineSummary';
import { RecentActivity } from '@/components/Dashboard/RecentActivity';
import { createClient } from '@/lib/supabase';
import {
    LayoutDashboard,
    Search,
    Database,
    CheckSquare,
    Calendar,
    ArrowRight,
    Users,
    AlertCircle,
} from 'lucide-react';
import { format } from 'date-fns';

const QUICK_ACTIONS = [
    { href: '/search', label: 'Search', description: 'Find new leads', icon: Search },
    { href: '/database', label: 'Database', description: 'Pipeline & people', icon: Database },
    { href: '/tasks', label: 'Tasks', description: 'Your to-dos', icon: CheckSquare },
    { href: '/shows', label: 'Shows', description: 'Events & exhibitors', icon: Calendar },
] as const;

const emptyStats: DashboardStats = {
    totalGoodLeads: 0,
    contacted: 0,
    needToContact: 0,
    followupNeeded: 0,
};

export default function DashboardPage() {
    const [stats, setStats] = useState<DashboardStats>(emptyStats);
    const [statsLoading, setStatsLoading] = useState(true);
    const [userName, setUserName] = useState<string>('');

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good morning';
        if (hour < 18) return 'Good afternoon';
        return 'Good evening';
    };

    const firstName = userName.trim().split(/\s+/)[0] || 'there';
    const todayLabel = format(new Date(), 'EEEE, MMMM d');

    const pipelineTotal = useMemo(
        () => stats.totalGoodLeads + stats.contacted + stats.needToContact + stats.followupNeeded,
        [stats]
    );

    useEffect(() => {
        const fetchStats = async () => {
            setStatsLoading(true);
            try {
                const supabase = createClient();

                const { count: goodLeadsCount } = await supabase
                    .from('people')
                    .select('*', { count: 'exact', head: true })
                    .eq('contact_status', 'Good Lead');

                const { count: contactedCount } = await supabase
                    .from('people')
                    .select('*', { count: 'exact', head: true })
                    .eq('contact_status', 'Contacted');

                const { count: needToContactCount } = await supabase
                    .from('people')
                    .select('*', { count: 'exact', head: true })
                    .eq('contact_status', 'Need to Contact');

                const { count: inProgressCount } = await supabase
                    .from('people')
                    .select('*', { count: 'exact', head: true })
                    .eq('contact_status', 'In Progress');

                setStats({
                    totalGoodLeads: goodLeadsCount || 0,
                    contacted: contactedCount || 0,
                    needToContact: needToContactCount || 0,
                    followupNeeded: inProgressCount || 0,
                });
            } catch (err) {
                console.error('Failed to fetch dashboard stats', err);
            } finally {
                setStatsLoading(false);
            }
        };

        const fetchUser = async () => {
            const supabase = createClient();
            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (user) {
                const { data: userData } = await supabase.from('users').select('name').eq('uid', user.id).single();

                if (userData?.name) {
                    setUserName(userData.name);
                }
            }
        };

        fetchStats();
        fetchUser();
    }, []);

    return (
        <div className="relative h-full overflow-y-auto custom-scrollbar">
            <div
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(251,146,60,0.14),transparent)]"
                aria-hidden
            />

            <div className="relative mx-auto max-w-7xl space-y-6 pb-10 sm:space-y-8">
                {/* Hero */}
                <header className="relative overflow-hidden rounded-3xl border border-zinc-200/90 bg-white/95 p-5 shadow-sm shadow-zinc-950/5 backdrop-blur-sm sm:p-7 lg:p-8">
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_100%_0%,rgba(251,146,60,0.14),transparent)]" />
                    <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex min-w-0 gap-4 sm:gap-5">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/25 sm:h-14 sm:w-14 sm:rounded-2xl">
                                <LayoutDashboard className="h-6 w-6 sm:h-7 sm:w-7" aria-hidden />
                            </div>
                            <div className="min-w-0 space-y-1.5">
                                <p className="text-xs font-medium text-zinc-500 sm:text-sm">{todayLabel}</p>
                                <p className="text-sm text-zinc-600">
                                    {getGreeting()},{' '}
                                    <span className="font-semibold text-zinc-950">{firstName}</span>
                                </p>
                                <h1 className="text-balance text-2xl font-bold tracking-tight text-zinc-950 sm:text-3xl lg:text-4xl">
                                    Your marketing hub
                                </h1>
                                <p className="max-w-lg text-pretty text-sm leading-relaxed text-zinc-500">
                                    Track pipeline health, jump to your tools, and see what you did recently—all in one place.
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 lg:max-w-xs lg:flex-col lg:items-stretch">
                            {statsLoading ? (
                                <div className="h-[72px] w-full min-w-[200px] animate-pulse rounded-2xl bg-zinc-100 lg:min-w-[220px]" />
                            ) : (
                                <div className="flex min-w-0 flex-1 flex-col gap-2 rounded-2xl border border-zinc-200/90 bg-zinc-50/80 px-4 py-3 sm:flex-none sm:min-w-[200px]">
                                    <div className="flex items-center gap-2 text-zinc-600">
                                        <Users className="h-4 w-4 shrink-0 text-orange-600" aria-hidden />
                                        <span className="text-xs font-semibold uppercase tracking-wide">In pipeline</span>
                                    </div>
                                    <p className="text-2xl font-bold tabular-nums tracking-tight text-zinc-950">
                                        {pipelineTotal.toLocaleString()}
                                    </p>
                                    <p className="text-[11px] leading-snug text-zinc-500">Across good lead, contacted, need to contact & in progress</p>
                                </div>
                            )}
                            {!statsLoading && stats.needToContact > 0 && (
                                <Link
                                    href="/database"
                                    className="inline-flex w-full items-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-3 py-2.5 text-xs font-semibold text-orange-900 transition hover:bg-orange-100"
                                >
                                    <AlertCircle className="h-4 w-4 shrink-0 text-orange-600" aria-hidden />
                                    <span className="min-w-0 flex-1 text-left">
                                        {stats.needToContact.toLocaleString()} need first contact
                                    </span>
                                    <ArrowRight className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
                                </Link>
                            )}
                        </div>
                    </div>
                </header>

                {/* Quick actions */}
                <section aria-label="Quick actions">
                    <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-zinc-400">Jump to</h2>
                    <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
                        {QUICK_ACTIONS.map(({ href, label, description, icon: Icon }) => (
                            <Link
                                key={href}
                                href={href}
                                className="group flex min-h-[88px] flex-col justify-between rounded-2xl border border-zinc-200/90 bg-white p-3.5 shadow-sm transition hover:border-orange-200 hover:shadow-md hover:shadow-zinc-950/8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#f7f5f2] sm:min-h-[96px] sm:p-4"
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-100 text-zinc-700 transition group-hover:bg-orange-50 group-hover:text-orange-600">
                                        <Icon className="h-4 w-4" aria-hidden />
                                    </div>
                                    <ArrowRight className="h-4 w-4 shrink-0 text-zinc-300 transition group-hover:translate-x-0.5 group-hover:text-orange-500" aria-hidden />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-zinc-950">{label}</p>
                                    <p className="mt-0.5 text-[11px] leading-snug text-zinc-500">{description}</p>
                                </div>
                            </Link>
                        ))}
                    </div>
                </section>

                {/* Stats + activity */}
                <div className="grid gap-6 xl:grid-cols-[1fr_minmax(300px,380px)] xl:items-start xl:gap-8">
                    <div className="flex min-w-0 flex-col gap-6">
                        <StatsGrid stats={stats} loading={statsLoading} />
                        <DashboardPipelineSummary stats={stats} loading={statsLoading} />
                    </div>

                    <aside className="min-h-[280px] xl:sticky xl:top-2 xl:self-start">
                        <RecentActivity />
                    </aside>
                </div>
            </div>
        </div>
    );
}
