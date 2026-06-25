'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
    addMonths,
    eachDayOfInterval,
    endOfMonth,
    endOfWeek,
    format,
    isSameDay,
    isSameMonth,
    startOfMonth,
    startOfWeek,
    subMonths,
} from 'date-fns';
import { ChevronLeft, ChevronRight, Loader2, CalendarDays } from 'lucide-react';
import { createClient } from '@/lib/supabase';

type CalendarShow = {
    id: string;
    name: string;
    date: string; // yyyy-MM-dd
    location: string;
};

type ShowsCalendarProps = {
    onShowClick: (id: string) => void;
    search?: string;
};

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MAX_VISIBLE_PER_DAY = 3;

export const ShowsCalendar: React.FC<ShowsCalendarProps> = ({ onShowClick, search }) => {
    const supabase = useMemo(() => createClient(), []);
    const [monthCursor, setMonthCursor] = useState<Date>(() => startOfMonth(new Date()));
    const [shows, setShows] = useState<CalendarShow[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const { gridStart, gridEnd, days } = useMemo(() => {
        const monthStart = startOfMonth(monthCursor);
        const monthEnd = endOfMonth(monthCursor);
        const gStart = startOfWeek(monthStart, { weekStartsOn: 0 });
        const gEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
        return {
            gridStart: gStart,
            gridEnd: gEnd,
            days: eachDayOfInterval({ start: gStart, end: gEnd }),
        };
    }, [monthCursor]);

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            setLoading(true);
            setError('');
            try {
                const fromDate = format(gridStart, 'yyyy-MM-dd');
                const toDate = format(gridEnd, 'yyyy-MM-dd');
                let query = supabase
                    .from('shows')
                    .select('id, name, starting_date, city, country')
                    .not('starting_date', 'is', null)
                    .gte('starting_date', fromDate)
                    .lte('starting_date', toDate)
                    .order('starting_date', { ascending: true })
                    .limit(1000);

                const term = (search || '').trim();
                if (term) query = query.ilike('name', `%${term}%`);

                const { data, error: fetchErr } = await query;
                if (fetchErr) throw fetchErr;
                if (cancelled) return;

                const mapped = (data || []).map((row: any) => ({
                    id: String(row.id),
                    name: String(row.name || 'Untitled show'),
                    date: String(row.starting_date || '').slice(0, 10),
                    location: [row.city, row.country].filter(Boolean).join(', '),
                }));
                setShows(mapped);
            } catch (err: any) {
                if (cancelled) return;
                console.error('Failed to load calendar shows', err);
                setError(err?.message || 'Failed to load shows');
                setShows([]);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        void load();
        return () => {
            cancelled = true;
        };
    }, [supabase, gridStart, gridEnd, search]);

    const showsByDay = useMemo(() => {
        const map = new Map<string, CalendarShow[]>();
        for (const show of shows) {
            if (!show.date) continue;
            const list = map.get(show.date);
            if (list) list.push(show);
            else map.set(show.date, [show]);
        }
        return map;
    }, [shows]);

    const monthTotal = useMemo(
        () => shows.filter((s) => isSameMonth(new Date(`${s.date}T00:00:00`), monthCursor)).length,
        [shows, monthCursor],
    );

    return (
        <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm shadow-zinc-950/5">
            {/* Header / navigation */}
            <div className="flex flex-col gap-3 border-b border-zinc-100 bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <div>
                    <h2 className="text-base font-semibold text-zinc-900">{format(monthCursor, 'MMMM yyyy')}</h2>
                    <p className="mt-0.5 text-xs text-zinc-500">
                        {loading ? 'Loading…' : `${monthTotal} show${monthTotal === 1 ? '' : 's'} this month`}
                    </p>
                </div>
                <div className="flex items-center gap-1.5">
                    <button
                        type="button"
                        onClick={() => setMonthCursor((m) => subMonths(m, 1))}
                        aria-label="Previous month"
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-600 transition-colors hover:border-orange-200 hover:bg-orange-50"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                        type="button"
                        onClick={() => setMonthCursor(startOfMonth(new Date()))}
                        className="h-9 rounded-xl border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-700 transition-colors hover:border-orange-200 hover:bg-orange-50"
                    >
                        Today
                    </button>
                    <button
                        type="button"
                        onClick={() => setMonthCursor((m) => addMonths(m, 1))}
                        aria-label="Next month"
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-600 transition-colors hover:border-orange-200 hover:bg-orange-50"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </button>
                </div>
            </div>

            <div className="relative p-3 sm:p-4">
                {loading && (
                    <div className="pointer-events-none absolute right-5 top-5 z-10 flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-orange-600 shadow-sm">
                        <Loader2 className="h-3 w-3 animate-spin" /> Updating
                    </div>
                )}

                {error ? (
                    <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
                        <CalendarDays className="h-8 w-8 text-zinc-300" />
                        <p className="text-sm text-zinc-500">{error}</p>
                    </div>
                ) : (
                    <>
                        {/* Weekday header */}
                        <div className="grid grid-cols-7 gap-1.5 pb-1.5">
                            {WEEKDAYS.map((d) => (
                                <div
                                    key={d}
                                    className="px-1 py-1 text-center text-[10px] font-bold uppercase tracking-wider text-zinc-400"
                                >
                                    {d}
                                </div>
                            ))}
                        </div>

                        {/* Day grid */}
                        <div className="grid grid-cols-7 gap-1.5">
                            {days.map((day) => {
                                const key = format(day, 'yyyy-MM-dd');
                                const dayShows = showsByDay.get(key) || [];
                                const inMonth = isSameMonth(day, monthCursor);
                                const today = isSameDay(day, new Date());
                                const overflow = dayShows.length - MAX_VISIBLE_PER_DAY;

                                return (
                                    <div
                                        key={key}
                                        className={`flex min-h-[96px] flex-col gap-1 rounded-xl border p-1.5 transition-colors ${
                                            inMonth ? 'border-zinc-200 bg-white' : 'border-zinc-100 bg-zinc-50/60'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between px-0.5">
                                            <span
                                                className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-semibold ${
                                                    today
                                                        ? 'bg-orange-500 text-white'
                                                        : inMonth
                                                            ? 'text-zinc-700'
                                                            : 'text-zinc-400'
                                                }`}
                                            >
                                                {format(day, 'd')}
                                            </span>
                                            {dayShows.length > 0 && (
                                                <span className="text-[9px] font-bold text-zinc-400">{dayShows.length}</span>
                                            )}
                                        </div>

                                        <div className="flex flex-1 flex-col gap-1">
                                            {dayShows.slice(0, MAX_VISIBLE_PER_DAY).map((show) => (
                                                <button
                                                    key={show.id}
                                                    type="button"
                                                    onClick={() => onShowClick(show.id)}
                                                    title={`${show.name}${show.location ? ` — ${show.location}` : ''}`}
                                                    className="truncate rounded-md border border-orange-100 bg-orange-50 px-1.5 py-1 text-left text-[10px] font-semibold leading-tight text-orange-800 transition-colors hover:border-orange-300 hover:bg-orange-100"
                                                >
                                                    {show.name}
                                                </button>
                                            ))}
                                            {overflow > 0 && (
                                                <span className="px-1 text-[10px] font-semibold text-zinc-400">
                                                    +{overflow} more
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}
            </div>
        </section>
    );
};
