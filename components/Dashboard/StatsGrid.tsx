import React from 'react';
import Link from 'next/link';
import { Sparkles, Phone, Clock, UserCheck, type LucideIcon } from 'lucide-react';

export interface DashboardStats {
    totalGoodLeads: number;
    contacted: number;
    needToContact: number;
    followupNeeded: number;
}

interface StatsGridProps {
    stats: DashboardStats;
    loading?: boolean;
}

type Accent = 'orange' | 'zinc' | 'emerald' | 'amber';

const accentStyles: Record<Accent, { blob: string; iconBg: string; iconFg: string; ring: string }> = {
    orange: {
        blob: 'from-orange-400/25 to-amber-400/10',
        iconBg: 'bg-linear-to-br from-orange-500 to-amber-500',
        iconFg: 'text-white',
        ring: 'focus-visible:ring-orange-400/40',
    },
    zinc: {
        blob: 'from-zinc-400/20 to-zinc-600/10',
        iconBg: 'bg-linear-to-br from-zinc-600 to-zinc-800',
        iconFg: 'text-white',
        ring: 'focus-visible:ring-zinc-400/40',
    },
    emerald: {
        blob: 'from-emerald-400/20 to-teal-400/10',
        iconBg: 'bg-linear-to-br from-emerald-500 to-teal-600',
        iconFg: 'text-white',
        ring: 'focus-visible:ring-emerald-400/40',
    },
    amber: {
        blob: 'from-amber-400/25 to-orange-300/10',
        iconBg: 'bg-linear-to-br from-amber-500 to-orange-500',
        iconFg: 'text-white',
        ring: 'focus-visible:ring-amber-400/40',
    },
};

function StatCardSkeleton() {
    return (
        <div className="min-h-[132px] animate-pulse rounded-2xl border border-zinc-100 bg-zinc-50/80 p-4 sm:min-h-[140px] sm:p-5">
            <div className="h-10 w-10 rounded-xl bg-zinc-200" />
            <div className="mt-4 h-3 w-24 rounded bg-zinc-200" />
            <div className="mt-2 h-8 w-16 rounded-lg bg-zinc-200" />
        </div>
    );
}

function StatCard({
    label,
    value,
    icon: Icon,
    accent,
    href,
    hint,
    highlight,
}: {
    label: string;
    value: string | number;
    icon: LucideIcon;
    accent: Accent;
    href: string;
    hint?: string;
    highlight?: boolean;
}) {
    const a = accentStyles[accent];
    return (
        <Link
            href={href}
            className={`group relative block min-h-[132px] overflow-hidden rounded-2xl border bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md hover:shadow-zinc-950/8 focus-visible:outline-none focus-visible:ring-2 sm:min-h-[140px] sm:p-5 ${a.ring} focus-visible:ring-offset-2 focus-visible:ring-offset-[#f7f5f2] ${
                highlight
                    ? 'border-orange-300/90 ring-1 ring-orange-200/60 hover:border-orange-300'
                    : 'border-zinc-200/90 hover:border-orange-200/90'
            }`}
        >
            <div
                className={`pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full bg-linear-to-br ${a.blob} opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-100`}
            />

            <div className="relative flex flex-col gap-4">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${a.iconBg} shadow-md shadow-zinc-950/10`}>
                    <Icon className={`h-5 w-5 ${a.iconFg}`} />
                </div>
                <div>
                    <p className="text-[11px] font-bold uppercase tracking-wide text-zinc-400">{label}</p>
                    <p className="mt-1 text-2xl font-bold tabular-nums tracking-tight text-zinc-950">{value}</p>
                    {hint && <p className="mt-1.5 text-xs leading-snug text-zinc-500">{hint}</p>}
                </div>
                <span className="text-xs font-semibold text-orange-600 opacity-0 transition-opacity group-hover:opacity-100">Open →</span>
            </div>
        </Link>
    );
}

export const StatsGrid: React.FC<StatsGridProps> = ({ stats, loading }) => {
    const showNeedToContactHighlight = !loading && stats.needToContact > 0;

    if (loading) {
        return (
            <div className="space-y-4">
                <div className="space-y-1.5">
                    <div className="h-3 w-28 animate-pulse rounded bg-zinc-200" />
                    <div className="h-3 w-48 animate-pulse rounded bg-zinc-100" />
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <StatCardSkeleton key={i} />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <section>
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-400">Pipeline</h2>
                    <p className="mt-1 text-sm text-zinc-500">Tap a card to open the database filtered by status.</p>
                </div>
                <Link
                    href="/database"
                    className="inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold text-orange-600 transition hover:text-orange-700"
                >
                    View database
                    <span aria-hidden>→</span>
                </Link>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
                <StatCard
                    label="Good leads"
                    value={stats.totalGoodLeads.toLocaleString()}
                    icon={Sparkles}
                    accent="emerald"
                    href="/database"
                    hint="Strong opportunities"
                />
                <StatCard
                    label="Contacted"
                    value={stats.contacted.toLocaleString()}
                    icon={UserCheck}
                    accent="zinc"
                    href="/database"
                    hint="Already reached out"
                />
                <StatCard
                    label="Need to contact"
                    value={stats.needToContact.toLocaleString()}
                    icon={Phone}
                    accent="orange"
                    href="/database"
                    hint="Waiting for first touch"
                    highlight={showNeedToContactHighlight}
                />
                <StatCard
                    label="In progress"
                    value={stats.followupNeeded.toLocaleString()}
                    icon={Clock}
                    accent="amber"
                    href="/database"
                    hint="Active follow-ups"
                />
            </div>
        </section>
    );
};
