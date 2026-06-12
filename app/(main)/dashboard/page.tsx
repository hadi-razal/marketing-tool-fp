'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { RecentActivity } from '@/components/Dashboard/RecentActivity';
import { createClient } from '@/lib/supabase';
import {
    Calendar,
    ArrowRight,
    Sparkles,
    CalendarDays,
    Building2,
    Users,
    ClipboardList,
    Layers,
    MapPin,
    Database,
    TrendingUp,
    type LucideIcon,
} from 'lucide-react';
import { format, startOfDay } from 'date-fns';

type DbStats = {
    totalShows: number;
    showsWithExhibitors: number;
    upcomingShows: number;
    totalCompanies: number;
    totalPeople: number;
    exhibitorRecords: number;
};

type PipelineCounts = {
    status: string;
    count: number;
}[];

type UpcomingShow = {
    id: string;
    name: string;
    starting_date: string;
    city: string | null;
    country: string | null;
};

const PIPELINE_STATUSES = [
    'New',
    'Need to Contact',
    'Contacted',
    'In Progress',
    'Need a Follow Up',
    'Good Lead',
] as const;

const PIPELINE_COLORS: Record<string, { bar: string; dot: string }> = {
    'New': { bar: 'bg-sky-400', dot: 'bg-sky-400' },
    'Need to Contact': { bar: 'bg-orange-400', dot: 'bg-orange-400' },
    'Contacted': { bar: 'bg-zinc-400', dot: 'bg-zinc-400' },
    'In Progress': { bar: 'bg-amber-400', dot: 'bg-amber-400' },
    'Need a Follow Up': { bar: 'bg-violet-400', dot: 'bg-violet-400' },
    'Good Lead': { bar: 'bg-emerald-500', dot: 'bg-emerald-500' },
};

type Accent = 'orange' | 'emerald' | 'sky' | 'zinc' | 'amber' | 'violet';

const ACCENTS: Record<Accent, { iconBg: string; blob: string }> = {
    orange: { iconBg: 'bg-linear-to-br from-orange-500 to-amber-500', blob: 'from-orange-400/25 to-amber-400/10' },
    emerald: { iconBg: 'bg-linear-to-br from-emerald-500 to-teal-600', blob: 'from-emerald-400/20 to-teal-400/10' },
    sky: { iconBg: 'bg-linear-to-br from-sky-500 to-blue-600', blob: 'from-sky-400/20 to-blue-400/10' },
    zinc: { iconBg: 'bg-linear-to-br from-zinc-600 to-zinc-800', blob: 'from-zinc-400/20 to-zinc-600/10' },
    amber: { iconBg: 'bg-linear-to-br from-amber-500 to-orange-500', blob: 'from-amber-400/25 to-orange-300/10' },
    violet: { iconBg: 'bg-linear-to-br from-violet-500 to-purple-600', blob: 'from-violet-400/20 to-purple-400/10' },
};

function StatCard({
    label,
    value,
    hint,
    icon: Icon,
    accent,
    href,
    loading,
}: {
    label: string;
    value: number;
    hint?: string;
    icon: LucideIcon;
    accent: Accent;
    href: string;
    loading: boolean;
}) {
    const a = ACCENTS[accent];
    return (
        <Link
            href={href}
            className="group relative block overflow-hidden rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-sm shadow-zinc-950/5 transition-all duration-300 hover:border-orange-200/90 hover:shadow-md hover:shadow-zinc-950/8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#f7f5f2] sm:p-5"
        >
            <div
                className={`pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full bg-linear-to-br ${a.blob} opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-100`}
            />
            <div className="relative flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-zinc-400">{label}</p>
                    {loading ? (
                        <div className="mt-2 h-8 w-20 animate-pulse rounded-lg bg-zinc-100" />
                    ) : (
                        <p className="mt-1 text-2xl font-bold tabular-nums tracking-tight text-zinc-950 sm:text-3xl">
                            {value.toLocaleString()}
                        </p>
                    )}
                    {hint && <p className="mt-1.5 text-xs leading-snug text-zinc-500">{hint}</p>}
                </div>
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${a.iconBg} shadow-md shadow-zinc-950/10`}>
                    <Icon className="h-5 w-5 text-white" />
                </div>
            </div>
        </Link>
    );
}

export default function DashboardPage() {
    const [userName, setUserName] = useState('');
    const [userProfileUrl, setUserProfileUrl] = useState<string | null>(null);
    const [loadingUser, setLoadingUser] = useState(true);

    const [stats, setStats] = useState<DbStats>({
        totalShows: 0,
        showsWithExhibitors: 0,
        upcomingShows: 0,
        totalCompanies: 0,
        totalPeople: 0,
        exhibitorRecords: 0,
    });
    const [loadingStats, setLoadingStats] = useState(true);

    const [pipeline, setPipeline] = useState<PipelineCounts>([]);
    const [loadingPipeline, setLoadingPipeline] = useState(true);

    const [upcoming, setUpcoming] = useState<UpcomingShow[]>([]);
    const [loadingUpcoming, setLoadingUpcoming] = useState(true);

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good morning';
        if (hour < 18) return 'Good afternoon';
        return 'Good evening';
    };

    const firstName = userName.trim().split(/\s+/)[0] || 'there';
    const todayLabel = format(new Date(), 'EEEE, MMMM d, yyyy');
    const initials = userName
        .trim()
        .split(/\s+/)
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase() || 'FP';

    useEffect(() => {
        const supabase = createClient();

        const fetchUser = async () => {
            try {
                const {
                    data: { user },
                } = await supabase.auth.getUser();

                if (user) {
                    const { data: userData } = await supabase
                        .from('users')
                        .select('name, profile_url')
                        .eq('uid', user.id)
                        .single();

                    if (userData?.name) setUserName(userData.name);
                    if (userData?.profile_url) setUserProfileUrl(userData.profile_url);
                }
            } catch (err) {
                console.error('Failed to fetch user', err);
            } finally {
                setLoadingUser(false);
            }
        };

        const fetchExhibitorShowIds = async (): Promise<{ distinctShows: number; records: number }> => {
            const withExhibitors = new Set<string>();
            let records = 0;
            const pageSize = 1000;
            let offset = 0;

            while (true) {
                const { data: rows, error } = await supabase
                    .from('show_participation')
                    .select('show_id')
                    .range(offset, offset + pageSize - 1);

                if (error) {
                    console.error('Failed to fetch show participation', error);
                    break;
                }

                for (const row of rows || []) {
                    records += 1;
                    const showId = String(row.show_id ?? '').trim();
                    if (showId) withExhibitors.add(showId);
                }

                if (!rows || rows.length < pageSize) break;
                offset += pageSize;
            }

            return { distinctShows: withExhibitors.size, records };
        };

        const fetchStats = async () => {
            try {
                const today = format(startOfDay(new Date()), 'yyyy-MM-dd');

                const [showsRes, upcomingRes, companiesRes, peopleRes, exhibitorData] = await Promise.all([
                    supabase.from('shows').select('*', { count: 'exact', head: true }),
                    supabase
                        .from('shows')
                        .select('*', { count: 'exact', head: true })
                        .not('starting_date', 'is', null)
                        .gte('starting_date', today),
                    supabase.from('companies').select('*', { count: 'exact', head: true }),
                    supabase.from('people').select('*', { count: 'exact', head: true }),
                    fetchExhibitorShowIds(),
                ]);

                setStats({
                    totalShows: showsRes.count ?? 0,
                    upcomingShows: upcomingRes.count ?? 0,
                    totalCompanies: companiesRes.count ?? 0,
                    totalPeople: peopleRes.count ?? 0,
                    showsWithExhibitors: exhibitorData.distinctShows,
                    exhibitorRecords: exhibitorData.records,
                });
            } catch (err) {
                console.error('Failed to fetch dashboard stats', err);
            } finally {
                setLoadingStats(false);
            }
        };

        const fetchPipeline = async () => {
            try {
                const results = await Promise.all(
                    PIPELINE_STATUSES.map((status) =>
                        supabase
                            .from('people')
                            .select('*', { count: 'exact', head: true })
                            .eq('contact_status', status),
                    ),
                );
                setPipeline(
                    PIPELINE_STATUSES.map((status, i) => ({
                        status,
                        count: results[i].count ?? 0,
                    })),
                );
            } catch (err) {
                console.error('Failed to fetch pipeline stats', err);
            } finally {
                setLoadingPipeline(false);
            }
        };

        const fetchUpcoming = async () => {
            try {
                const today = format(startOfDay(new Date()), 'yyyy-MM-dd');
                const { data: rows, error } = await supabase
                    .from('shows')
                    .select('id, name, starting_date, city, country')
                    .not('starting_date', 'is', null)
                    .gte('starting_date', today)
                    .order('starting_date', { ascending: true })
                    .limit(6);

                if (error) throw error;
                setUpcoming(
                    (rows || []).map((r) => ({
                        id: String(r.id),
                        name: String(r.name ?? 'Untitled show'),
                        starting_date: String(r.starting_date),
                        city: r.city ? String(r.city) : null,
                        country: r.country ? String(r.country) : null,
                    })),
                );
            } catch (err) {
                console.error('Failed to fetch upcoming shows', err);
            } finally {
                setLoadingUpcoming(false);
            }
        };

        fetchUser();
        fetchStats();
        fetchPipeline();
        fetchUpcoming();
    }, []);

    const pipelineTotal = pipeline.reduce((sum, p) => sum + p.count, 0);
    const pipelineMax = Math.max(1, ...pipeline.map((p) => p.count));
    const exhibitorCoverage =
        stats.totalShows > 0 ? Math.round((stats.showsWithExhibitors / stats.totalShows) * 100) : 0;

    return (
        <div className="relative h-full overflow-y-auto custom-scrollbar">
            <div
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_45%_at_50%_-10%,rgba(251,146,60,0.12),transparent)]"
                aria-hidden
            />

            <div className="relative mx-auto flex min-h-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-10">
                {/* Welcome */}
                <header>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-600/80">
                        {todayLabel}
                    </p>

                    <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-4">
                            <div className="relative shrink-0">
                                <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border-2 border-white bg-linear-to-br from-orange-500 to-amber-500 text-lg font-bold text-white shadow-lg shadow-orange-500/25">
                                    {loadingUser ? (
                                        <div className="h-full w-full animate-pulse bg-white/20" />
                                    ) : userProfileUrl ? (
                                        <img src={userProfileUrl} alt={userName} className="h-full w-full object-cover" />
                                    ) : (
                                        initials
                                    )}
                                </div>
                                <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-lg border border-white bg-white text-orange-500 shadow-sm">
                                    <Sparkles className="h-3 w-3" />
                                </span>
                            </div>
                            <div className="min-w-0">
                                <p className="text-sm text-zinc-500">
                                    {getGreeting()},{' '}
                                    <span className="font-semibold text-zinc-800">{loadingUser ? '…' : firstName}</span>
                                </p>
                                <h1 className="text-2xl font-bold tracking-tight text-zinc-950 sm:text-3xl">
                                    Your database at a glance
                                </h1>
                            </div>
                        </div>

                        <Link
                            href="/shows"
                            className="inline-flex shrink-0 items-center gap-2 self-start rounded-xl bg-linear-to-r from-orange-600 to-orange-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-500/25 transition hover:from-orange-500 hover:to-orange-400 sm:self-auto"
                        >
                            <Calendar className="h-4 w-4" />
                            Browse shows
                            <ArrowRight className="h-4 w-4 opacity-80" />
                        </Link>
                    </div>
                </header>

                {/* Database overview */}
                <section aria-label="Database overview">
                    <div className="mb-4 flex items-center gap-2">
                        <Database className="h-3.5 w-3.5 text-orange-500" />
                        <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-400">Database overview</h2>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
                        <StatCard
                            label="Total shows"
                            value={stats.totalShows}
                            hint="Trade shows in the database"
                            icon={CalendarDays}
                            accent="orange"
                            href="/shows"
                            loading={loadingStats}
                        />
                        <StatCard
                            label="Shows with exhibitor list"
                            value={stats.showsWithExhibitors}
                            hint={loadingStats ? undefined : `${exhibitorCoverage}% of all shows covered`}
                            icon={ClipboardList}
                            accent="emerald"
                            href="/shows"
                            loading={loadingStats}
                        />
                        <StatCard
                            label="Upcoming shows"
                            value={stats.upcomingShows}
                            hint="Starting today or later"
                            icon={Calendar}
                            accent="amber"
                            href="/shows"
                            loading={loadingStats}
                        />
                        <StatCard
                            label="Companies"
                            value={stats.totalCompanies}
                            hint="Organisations saved"
                            icon={Building2}
                            accent="sky"
                            href="/companies"
                            loading={loadingStats}
                        />
                        <StatCard
                            label="Contacts"
                            value={stats.totalPeople}
                            hint="People in your database"
                            icon={Users}
                            accent="violet"
                            href="/database"
                            loading={loadingStats}
                        />
                        <StatCard
                            label="Exhibitor records"
                            value={stats.exhibitorRecords}
                            hint="Show participation entries"
                            icon={Layers}
                            accent="zinc"
                            href="/shows"
                            loading={loadingStats}
                        />
                    </div>
                </section>

                {/* Pipeline + upcoming shows */}
                <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    {/* Contact pipeline */}
                    <div className="flex flex-col overflow-hidden rounded-3xl border border-zinc-200/90 bg-white shadow-sm shadow-zinc-950/5">
                        <div className="border-b border-zinc-100 px-5 py-4">
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-600 ring-1 ring-orange-100">
                                        <TrendingUp className="h-4 w-4" aria-hidden />
                                    </div>
                                    <div>
                                        <h2 className="text-base font-bold text-zinc-950">Contact pipeline</h2>
                                        <p className="text-xs text-zinc-500">Contacts grouped by status</p>
                                    </div>
                                </div>
                                <Link
                                    href="/database"
                                    className="shrink-0 text-xs font-semibold text-orange-600 transition hover:text-orange-700"
                                >
                                    Open database →
                                </Link>
                            </div>
                        </div>

                        <div className="flex-1 space-y-3.5 px-5 py-5">
                            {loadingPipeline ? (
                                Array.from({ length: 6 }).map((_, i) => (
                                    <div key={i} className="space-y-1.5 animate-pulse">
                                        <div className="h-3 w-28 rounded bg-zinc-100" />
                                        <div className="h-2.5 w-full rounded-full bg-zinc-100" />
                                    </div>
                                ))
                            ) : pipelineTotal === 0 ? (
                                <p className="py-8 text-center text-sm text-zinc-500">No contacts with a status yet.</p>
                            ) : (
                                pipeline.map(({ status, count }) => {
                                    const colors = PIPELINE_COLORS[status] ?? PIPELINE_COLORS['Contacted'];
                                    const pct = Math.round((count / pipelineMax) * 100);
                                    return (
                                        <div key={status}>
                                            <div className="mb-1.5 flex items-center justify-between gap-2">
                                                <span className="flex items-center gap-2 text-xs font-semibold text-zinc-700">
                                                    <span className={`h-2 w-2 rounded-full ${colors.dot}`} />
                                                    {status}
                                                </span>
                                                <span className="text-xs font-bold tabular-nums text-zinc-950">
                                                    {count.toLocaleString()}
                                                </span>
                                            </div>
                                            <div className="h-2.5 w-full overflow-hidden rounded-full bg-zinc-100">
                                                <div
                                                    className={`h-full rounded-full ${colors.bar} transition-all duration-700`}
                                                    style={{ width: `${Math.max(pct, count > 0 ? 3 : 0)}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* Upcoming shows */}
                    <div className="flex flex-col overflow-hidden rounded-3xl border border-zinc-200/90 bg-white shadow-sm shadow-zinc-950/5">
                        <div className="border-b border-zinc-100 px-5 py-4">
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 ring-1 ring-amber-100">
                                        <CalendarDays className="h-4 w-4" aria-hidden />
                                    </div>
                                    <div>
                                        <h2 className="text-base font-bold text-zinc-950">Upcoming shows</h2>
                                        <p className="text-xs text-zinc-500">Next events on the calendar</p>
                                    </div>
                                </div>
                                <Link
                                    href="/shows"
                                    className="shrink-0 text-xs font-semibold text-orange-600 transition hover:text-orange-700"
                                >
                                    All shows →
                                </Link>
                            </div>
                        </div>

                        <div className="flex-1 px-3 py-3 sm:px-4">
                            {loadingUpcoming ? (
                                <div className="space-y-2 p-1">
                                    {Array.from({ length: 5 }).map((_, i) => (
                                        <div key={i} className="flex gap-3 rounded-2xl border border-zinc-100 p-3 animate-pulse">
                                            <div className="h-11 w-11 shrink-0 rounded-xl bg-zinc-100" />
                                            <div className="min-w-0 flex-1 space-y-2 pt-1">
                                                <div className="h-3.5 w-3/4 rounded bg-zinc-100" />
                                                <div className="h-3 w-24 rounded bg-zinc-50" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : upcoming.length === 0 ? (
                                <p className="py-10 text-center text-sm text-zinc-500">No upcoming shows scheduled.</p>
                            ) : (
                                <ul className="space-y-1">
                                    {upcoming.map((show) => {
                                        const date = new Date(show.starting_date);
                                        const validDate = !Number.isNaN(date.getTime());
                                        const location = [show.city, show.country].filter(Boolean).join(', ');
                                        return (
                                            <li key={show.id}>
                                                <Link
                                                    href={`/shows/${show.id}`}
                                                    className="group flex items-center gap-3 rounded-2xl border border-transparent p-3 transition-colors hover:border-zinc-100 hover:bg-zinc-50/80"
                                                >
                                                    <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl border border-amber-100 bg-amber-50 text-amber-700">
                                                        <span className="text-[9px] font-bold uppercase leading-none">
                                                            {validDate ? format(date, 'MMM') : '—'}
                                                        </span>
                                                        <span className="mt-0.5 text-base font-bold leading-none tabular-nums">
                                                            {validDate ? format(date, 'd') : '?'}
                                                        </span>
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="truncate text-sm font-semibold text-zinc-800 group-hover:text-zinc-950">
                                                            {show.name}
                                                        </p>
                                                        <p className="mt-0.5 flex items-center gap-1 text-xs text-zinc-500">
                                                            {location ? (
                                                                <>
                                                                    <MapPin className="h-3 w-3 shrink-0 text-zinc-400" />
                                                                    <span className="truncate">{location}</span>
                                                                </>
                                                            ) : validDate ? (
                                                                format(date, 'EEEE, MMM d, yyyy')
                                                            ) : (
                                                                'Date TBC'
                                                            )}
                                                        </p>
                                                    </div>
                                                    <ArrowRight className="h-4 w-4 shrink-0 text-zinc-300 transition group-hover:text-orange-500" />
                                                </Link>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </div>
                    </div>
                </section>

                {/* Recent activity */}
                <section aria-label="Recent activity" className="flex min-h-0 flex-1 flex-col">
                    <RecentActivity />
                </section>
            </div>
        </div>
    );
}
