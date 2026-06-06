import React, { useMemo } from 'react';
import Link from 'next/link';
import { ArrowRight, Lightbulb, Database } from 'lucide-react';
import type { DashboardStats } from '@/components/Dashboard/StatsGrid';

interface DashboardPipelineSummaryProps {
    stats: DashboardStats;
    loading?: boolean;
}

const SEGMENTS = [
    { key: 'good', label: 'Good leads', color: 'bg-emerald-500', ring: 'ring-emerald-500/30' },
    { key: 'contacted', label: 'Contacted', color: 'bg-zinc-500', ring: 'ring-zinc-400/30' },
    { key: 'need', label: 'Need to contact', color: 'bg-orange-500', ring: 'ring-orange-400/30' },
    { key: 'progress', label: 'In progress', color: 'bg-amber-500', ring: 'ring-amber-400/30' },
] as const;

export function DashboardPipelineSummary({ stats, loading }: DashboardPipelineSummaryProps) {
    const { total, segments, nextHint } = useMemo(() => {
        const good = stats.totalGoodLeads;
        const contacted = stats.contacted;
        const need = stats.needToContact;
        const progress = stats.followupNeeded;
        const sum = good + contacted + need + progress;

        const values = [good, contacted, need, progress];
        const segmentsData = SEGMENTS.map((s, i) => ({
            ...s,
            value: values[i],
            pct: sum === 0 ? 0 : Math.round((values[i] / sum) * 100),
        }));

        let hint: { title: string; body: string } | null = null;
        if (sum === 0) {
            hint = {
                title: 'No pipeline data yet',
                body: 'Save people from Search or add them in the database to see status mix here.',
            };
        } else if (need > 0) {
            hint = {
                title: 'Prioritize first touch',
                body: `${need.toLocaleString()} ${need === 1 ? 'person still needs' : 'people still need'} a first contact—open the database and work the queue.`,
            };
        } else if (progress > 0) {
            hint = {
                title: 'Follow-ups in motion',
                body: `${progress.toLocaleString()} in progress keep statuses and notes current as you move deals forward.`,
            };
        } else if (good > 0) {
            hint = {
                title: 'Strong leads on file',
                body: `${good.toLocaleString()} marked good lead${good === 1 ? '' : 's'}—review and advance them when you are ready.`,
            };
        } else {
            hint = {
                title: 'Pipeline in good shape',
                body: 'No urgent “need to contact” queue right now. Keep contacted records warm and add new leads from Search when needed.',
            };
        }

        return { total: sum, segments: segmentsData, nextHint: hint };
    }, [stats]);

    if (loading) {
        return (
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="h-4 w-40 animate-pulse rounded bg-zinc-200" />
                <div className="mt-4 h-3 w-full animate-pulse rounded-full bg-zinc-100" />
                <div className="mt-6 h-16 w-full animate-pulse rounded-xl bg-zinc-50" />
            </div>
        );
    }

    return (
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h2 className="text-sm font-bold text-zinc-950">Pipeline snapshot</h2>
                    <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                        People in good lead, contacted, need to contact, or in progress—
                        <span className="font-medium text-zinc-600"> {total.toLocaleString()} total</span>
                    </p>
                </div>
                <Link
                    href="/database"
                    className="inline-flex shrink-0 items-center gap-2 self-start rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-semibold text-zinc-800 transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-900"
                >
                    <Database className="h-3.5 w-3.5 text-zinc-500" aria-hidden />
                    Database
                    <ArrowRight className="h-3.5 w-3.5 text-zinc-400" aria-hidden />
                </Link>
            </div>

            {total > 0 ? (
                <>
                    <div
                        className="mt-5 flex h-3 overflow-hidden rounded-full bg-zinc-100 ring-1 ring-zinc-200/80"
                        role="img"
                        aria-label="Pipeline mix by status"
                    >
                        {segments.map((s) =>
                            s.value > 0 ? (
                                <div
                                    key={s.key}
                                    title={`${s.label}: ${s.value} (${s.pct}%)`}
                                    className={`${s.color} min-w-px transition-[flex-grow] duration-500`}
                                    style={{ flexGrow: s.value }}
                                />
                            ) : null
                        )}
                    </div>
                    <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                        {segments.map((s) => (
                            <li
                                key={s.key}
                                className="flex items-center justify-between gap-2 rounded-xl border border-zinc-100 bg-zinc-50/60 px-3 py-2 text-[11px]"
                            >
                                <span className="inline-flex min-w-0 items-center gap-2">
                                    <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${s.color}`} aria-hidden />
                                    <span className="truncate font-medium text-zinc-700">{s.label}</span>
                                </span>
                                <span className="shrink-0 tabular-nums text-zinc-500">
                                    <span className="font-semibold text-zinc-800">{s.value.toLocaleString()}</span>
                                    <span className="text-zinc-400"> · {s.pct}%</span>
                                </span>
                            </li>
                        ))}
                    </ul>
                </>
            ) : (
                <p className="mt-4 rounded-xl border border-dashed border-zinc-200 bg-zinc-50/80 px-4 py-3 text-sm text-zinc-600">
                    No people in these four stages yet. Open the database or add leads from Search.
                </p>
            )}

            {nextHint && (
                <div className="mt-5 flex gap-3 rounded-xl border border-orange-100 bg-orange-50/60 px-4 py-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-orange-600 shadow-sm ring-1 ring-orange-100">
                        <Lightbulb className="h-4 w-4" aria-hidden />
                    </div>
                    <div className="min-w-0">
                        <p className="text-sm font-semibold text-zinc-900">{nextHint.title}</p>
                        <p className="mt-0.5 text-xs leading-relaxed text-zinc-600">{nextHint.body}</p>
                    </div>
                </div>
            )}
        </div>
    );
}
