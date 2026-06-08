'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { format, isToday, isTomorrow } from 'date-fns';
import { ArrowRight, CalendarClock, ChevronLeft, ChevronRight, MapPin } from 'lucide-react';
import { Skeleton } from '@/components/ui/Skeleton';

export type UpcomingShowItem = {
    id: string;
    name: string;
    date: Date;
    location: string;
    industry?: string;
};

type UpcomingShowsPanelProps = {
    shows: UpcomingShowItem[];
    loading?: boolean;
    onShowClick: (id: string) => void;
};

const CARD_SCROLL_STEP = 296;

const formatUpcomingLabel = (date: Date) => {
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'MMM d');
};

export const UpcomingShowsPanel: React.FC<UpcomingShowsPanelProps> = ({
    shows,
    loading,
    onShowClick,
}) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [hasOverflow, setHasOverflow] = useState(false);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

    const updateScrollState = useCallback(() => {
        const el = scrollRef.current;
        if (!el) return;
        const overflow = el.scrollWidth > el.clientWidth + 1;
        setHasOverflow(overflow);
        setCanScrollLeft(el.scrollLeft > 1);
        setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
    }, []);

    const scroll = (direction: 'left' | 'right') => {
        const el = scrollRef.current;
        if (!el) return;
        el.scrollBy({
            left: direction === 'left' ? -CARD_SCROLL_STEP : CARD_SCROLL_STEP,
            behavior: 'smooth',
        });
    };

    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;
        updateScrollState();
        el.addEventListener('scroll', updateScrollState, { passive: true });
        const observer = new ResizeObserver(updateScrollState);
        observer.observe(el);
        window.addEventListener('resize', updateScrollState);
        return () => {
            el.removeEventListener('scroll', updateScrollState);
            observer.disconnect();
            window.removeEventListener('resize', updateScrollState);
        };
    }, [updateScrollState, loading, shows.length]);

    return (
        <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm shadow-zinc-950/5">
            <div className="flex items-center justify-between gap-3 border-b border-zinc-100 px-4 py-2.5 sm:px-5">
                <div className="flex items-center gap-2">
                    <CalendarClock className="h-4 w-4 text-orange-600" />
                    <p className="text-sm font-semibold text-zinc-900">Middle East upcoming shows</p>
                </div>
                {!loading && shows.length > 0 && (
                    <span className="shrink-0 rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[10px] font-semibold text-zinc-600">
                        {shows.length} upcoming show{shows.length === 1 ? '' : 's'}
                    </span>
                )}
            </div>

            <div className="py-3 pl-1 pr-3 sm:pl-1.5 sm:pr-4">
                {loading ? (
                    <div className="relative">
                        <div className="flex gap-2.5 overflow-hidden">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <Skeleton key={i} className="h-[88px] w-36 shrink-0 rounded-xl" />
                            ))}
                        </div>
                    </div>
                ) : shows.length === 0 ? (
                    <div className="flex items-center gap-2 rounded-xl border border-dashed border-zinc-200 bg-zinc-50/60 px-3 py-4 text-zinc-500">
                        <CalendarClock className="h-4 w-4 shrink-0 text-zinc-300" />
                        <p className="text-xs">No upcoming Middle East shows — add start dates to see them here.</p>
                    </div>
                ) : (
                    <div className="relative flex items-center">
                        {hasOverflow && (
                            <button
                                type="button"
                                onClick={() => scroll('left')}
                                disabled={!canScrollLeft}
                                aria-label="Scroll upcoming shows left"
                                className={`absolute left-0 z-10 flex h-[88px] w-8 shrink-0 items-center justify-center rounded-l-xl border border-r-0 border-zinc-200 bg-white/95 text-zinc-600 shadow-[8px_0_12px_-4px_rgba(255,255,255,0.95)] backdrop-blur-sm transition-opacity ${
                                    canScrollLeft ? 'opacity-100' : 'pointer-events-none opacity-0'
                                }`}
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </button>
                        )}
                        <div
                            ref={scrollRef}
                            className="flex min-w-0 flex-1 gap-2.5 overflow-x-auto pb-1 scrollbar-hide [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                        >
                            {shows.map((show) => {
                                const urgent = isToday(show.date) || isTomorrow(show.date);
                                return (
                                    <button
                                        key={show.id}
                                        type="button"
                                        onClick={() => onShowClick(show.id)}
                                        className={`group flex w-36 shrink-0 cursor-pointer flex-col rounded-xl border p-2.5 text-left transition-all hover:border-orange-200 hover:bg-orange-50/50 hover:shadow-sm ${
                                            urgent ? 'border-orange-200 bg-orange-50/40' : 'border-zinc-200 bg-white'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between gap-1">
                                            <span
                                                className={`rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
                                                    urgent ? 'bg-orange-100 text-orange-700' : 'bg-zinc-100 text-zinc-600'
                                                }`}
                                            >
                                                {formatUpcomingLabel(show.date)}
                                            </span>
                                            <ArrowRight className="h-3 w-3 shrink-0 text-zinc-300 transition-colors group-hover:text-orange-500" />
                                        </div>
                                        <p className="mt-2 line-clamp-2 text-xs font-semibold leading-snug text-zinc-900 group-hover:text-orange-800">
                                            {show.name}
                                        </p>
                                        <p className="mt-1 flex items-start gap-1 text-[10px] leading-snug text-zinc-500">
                                            <MapPin className="mt-0.5 h-2.5 w-2.5 shrink-0 text-orange-500" />
                                            <span className="line-clamp-2">{show.location || 'Location TBC'}</span>
                                        </p>
                                    </button>
                                );
                            })}
                        </div>
                        {hasOverflow && (
                            <button
                                type="button"
                                onClick={() => scroll('right')}
                                disabled={!canScrollRight}
                                aria-label="Scroll upcoming shows right"
                                className={`absolute right-0 z-10 flex h-[88px] w-8 shrink-0 items-center justify-center rounded-r-xl border border-l-0 border-zinc-200 bg-white/95 text-zinc-600 shadow-[-8px_0_12px_-4px_rgba(255,255,255,0.95)] backdrop-blur-sm transition-opacity ${
                                    canScrollRight ? 'opacity-100' : 'pointer-events-none opacity-0'
                                }`}
                            >
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                )}
            </div>
        </section>
    );
};
