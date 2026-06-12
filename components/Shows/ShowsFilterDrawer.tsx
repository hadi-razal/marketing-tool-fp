'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Filter,
    X,
    Check,
    Calendar,
    MapPin,
    Building2,
    Users,
    ChevronDown,
    ChevronRight,
    Search,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { FilterCategory, FilterSelections } from '@/components/Zoho/FilterPopover';

export type ShowDateFilterPreset =
    | 'all'
    | 'upcoming'
    | 'past'
    | 'this_month'
    | 'next_3_months'
    | 'this_year'
    | 'custom';

export type ShowDateFilter = {
    preset: ShowDateFilterPreset;
    from: string;
    to: string;
};

export const EMPTY_SHOW_DATE_FILTER: ShowDateFilter = {
    preset: 'all',
    from: '',
    to: '',
};

export const SHOW_DATE_PRESET_LABELS: Record<ShowDateFilterPreset, string> = {
    all: 'All dates',
    upcoming: 'Upcoming',
    past: 'Past',
    this_month: 'This month',
    next_3_months: 'Next 3 months',
    this_year: 'This year',
    custom: 'Custom range',
};

const DATE_PRESETS: { id: ShowDateFilterPreset; label: string; hint: string }[] = [
    { id: 'all', label: 'All dates', hint: 'Every show' },
    { id: 'upcoming', label: 'Upcoming', hint: 'Today and later' },
    { id: 'past', label: 'Past', hint: 'Already happened' },
    { id: 'this_month', label: 'This month', hint: 'Current month' },
    { id: 'next_3_months', label: 'Next 3 months', hint: 'Near-term plan' },
    { id: 'this_year', label: 'This year', hint: 'Calendar year' },
    { id: 'custom', label: 'Custom range', hint: 'Pick start & end' },
];

type ShowsFilterDrawerProps = {
    isOpen: boolean;
    onClose: () => void;
    categories: FilterCategory[];
    selections: FilterSelections;
    dateFilter: ShowDateFilter;
    exhibitorsOnly: boolean;
    onApply: (selections: FilterSelections, dateFilter: ShowDateFilter, exhibitorsOnly: boolean) => void;
    onClear: () => void;
};

const CATEGORY_GROUPS: { title: string; keys: string[] }[] = [
    { title: 'Location', keys: ['country', 'city', 'world_area'] },
    { title: 'Event details', keys: ['event_type', 'industry', 'level', 'frequency'] },
];

const FilterOptionSection: React.FC<{
    category: FilterCategory;
    selected: string[];
    onToggle: (value: string) => void;
    onClear: () => void;
}> = ({ category, selected, onToggle, onClear }) => {
    const [expanded, setExpanded] = useState(selected.length > 0 || category.options.length <= 4);
    const [search, setSearch] = useState('');

    const filtered = useMemo(() => {
        if (!search.trim()) return category.options;
        const q = search.toLowerCase();
        return category.options.filter((o) => o.toLowerCase().includes(q));
    }, [category.options, search]);

    return (
        <div className="rounded-xl border border-zinc-200 bg-zinc-50/50">
            <button
                type="button"
                onClick={() => setExpanded((e) => !e)}
                className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left"
            >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white text-zinc-500 shadow-sm">
                    {category.icon}
                </span>
                <span className="flex-1 text-xs font-bold uppercase tracking-wider text-zinc-600">
                    {category.label}
                </span>
                {selected.length > 0 && (
                    <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-700">
                        {selected.length}
                    </span>
                )}
                {expanded ? <ChevronDown className="h-3.5 w-3.5 text-zinc-400" /> : <ChevronRight className="h-3.5 w-3.5 text-zinc-400" />}
            </button>

            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.18 }}
                        className="overflow-hidden"
                    >
                        <div className="space-y-2 border-t border-zinc-200/80 px-3 pb-3 pt-2">
                            {category.options.length === 0 ? (
                                <p className="py-2 text-center text-xs text-zinc-400">No options in your shows yet</p>
                            ) : (
                                <>
                                    {category.options.length > 5 && (
                                        <div className="relative">
                                            <Search className="absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-zinc-400" />
                                            <input
                                                type="text"
                                                placeholder={`Search ${category.label.toLowerCase()}...`}
                                                value={search}
                                                onChange={(e) => setSearch(e.target.value)}
                                                className="w-full rounded-lg border border-zinc-200 bg-white py-1.5 pl-7 pr-3 text-xs text-zinc-950 outline-none placeholder:text-zinc-400 focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                                            />
                                        </div>
                                    )}
                                    <div className="max-h-36 space-y-0.5 overflow-y-auto custom-scrollbar pr-0.5">
                                        {filtered.map((option) => {
                                            const isChecked = selected.includes(option);
                                            return (
                                                <label
                                                    key={option}
                                                    className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-white"
                                                >
                                                    <div
                                                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                                                            isChecked ? 'border-orange-500 bg-orange-500' : 'border-zinc-300'
                                                        }`}
                                                    >
                                                        {isChecked && <Check className="h-3 w-3 text-white" />}
                                                    </div>
                                                    <span className={`truncate text-sm ${isChecked ? 'font-medium text-zinc-950' : 'text-zinc-600'}`}>
                                                        {option}
                                                    </span>
                                                    <input
                                                        type="checkbox"
                                                        className="hidden"
                                                        checked={isChecked}
                                                        onChange={() => onToggle(option)}
                                                    />
                                                </label>
                                            );
                                        })}
                                        {filtered.length === 0 && (
                                            <p className="py-2 text-center text-xs text-zinc-400">No matches</p>
                                        )}
                                    </div>
                                    {selected.length > 0 && (
                                        <button
                                            type="button"
                                            onClick={onClear}
                                            className="text-[10px] font-semibold text-orange-600 hover:text-orange-700"
                                        >
                                            Clear {category.label.toLowerCase()}
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export const ShowsFilterDrawer: React.FC<ShowsFilterDrawerProps> = ({
    isOpen,
    onClose,
    categories,
    selections,
    dateFilter,
    exhibitorsOnly,
    onApply,
    onClear,
}) => {
    const [tempSelections, setTempSelections] = useState<FilterSelections>(selections);
    const [tempDateFilter, setTempDateFilter] = useState<ShowDateFilter>(dateFilter);
    const [tempExhibitorsOnly, setTempExhibitorsOnly] = useState(exhibitorsOnly);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!isOpen) return;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, [isOpen]);

    useEffect(() => {
        if (isOpen) {
            setTempSelections(selections);
            setTempDateFilter(dateFilter);
            setTempExhibitorsOnly(exhibitorsOnly);
        }
    }, [isOpen, selections, dateFilter, exhibitorsOnly]);

    const categoryMap = useMemo(
        () => new Map(categories.map((c) => [c.key, c])),
        [categories],
    );

    const toggleOption = (key: string, value: string) => {
        setTempSelections((prev) => {
            const current = prev[key] || [];
            const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
            return { ...prev, [key]: next };
        });
    };

    const clearCategory = (key: string) => {
        setTempSelections((prev) => ({ ...prev, [key]: [] }));
    };

    const categoryCount = Object.values(tempSelections).reduce((sum, arr) => sum + arr.length, 0);
    const dateActive = tempDateFilter.preset !== 'all' || !!tempDateFilter.from || !!tempDateFilter.to;
    const totalActive = categoryCount + (dateActive ? 1 : 0) + (tempExhibitorsOnly ? 1 : 0);

    const handleApply = () => {
        onApply(tempSelections, tempDateFilter, tempExhibitorsOnly);
        onClose();
    };

    const handleClear = () => {
        setTempSelections(
            Object.fromEntries(categories.map((c) => [c.key, []])) as FilterSelections,
        );
        setTempDateFilter(EMPTY_SHOW_DATE_FILTER);
        setTempExhibitorsOnly(false);
        onClear();
        onClose();
    };

    if (!mounted) return null;

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-100 bg-zinc-950/20 backdrop-blur-[2px]"
                        onClick={onClose}
                    />
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed top-0 right-0 bottom-0 z-101 flex w-[min(400px,92vw)] flex-col overflow-hidden border-l border-zinc-200 bg-white shadow-2xl"
                    >
                        <div className="border-b border-zinc-200 px-5 py-4">
                            <div className="flex items-center justify-between">
                                <h3 className="flex items-center gap-2 text-base font-bold text-zinc-950">
                                    <Filter className="h-4 w-4 text-orange-500" />
                                    Filter shows
                                    {totalActive > 0 && (
                                        <span className="rounded-full bg-orange-500 px-2 py-0.5 text-[10px] font-bold text-white">
                                            {totalActive}
                                        </span>
                                    )}
                                </h3>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-100"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                            <p className="mt-1 text-xs text-zinc-500">Narrow by date, location, event type, or exhibitor data.</p>
                        </div>

                        <div className="flex-1 space-y-5 overflow-y-auto custom-scrollbar px-5 py-4">
                            <section>
                                <div className="mb-2.5 flex items-center gap-2">
                                    <Users className="h-3.5 w-3.5 text-orange-500" />
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500">Exhibitors</h4>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setTempExhibitorsOnly((prev) => !prev)}
                                    className={`flex w-full items-center justify-between rounded-xl border px-3.5 py-3 text-left transition-all ${
                                        tempExhibitorsOnly
                                            ? 'border-emerald-300 bg-emerald-50 shadow-sm shadow-emerald-500/10'
                                            : 'border-zinc-200 bg-white hover:border-emerald-200 hover:bg-emerald-50/40'
                                    }`}
                                >
                                    <div>
                                        <p className={`text-xs font-semibold ${tempExhibitorsOnly ? 'text-emerald-800' : 'text-zinc-800'}`}>
                                            Exhibitor list available
                                        </p>
                                        <p className="mt-0.5 text-[10px] text-zinc-500">
                                            Shows with exhibitors in participation data
                                        </p>
                                    </div>
                                    {tempExhibitorsOnly ? (
                                        <Check className="h-4 w-4 shrink-0 text-emerald-600" />
                                    ) : null}
                                </button>
                            </section>

                            <section>
                                <div className="mb-2.5 flex items-center gap-2">
                                    <Calendar className="h-3.5 w-3.5 text-orange-500" />
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500">When</h4>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    {DATE_PRESETS.map((preset) => {
                                        const active = tempDateFilter.preset === preset.id;
                                        return (
                                            <button
                                                key={preset.id}
                                                type="button"
                                                onClick={() =>
                                                    setTempDateFilter((prev) => ({
                                                        ...prev,
                                                        preset: preset.id,
                                                        from: preset.id === 'custom' ? prev.from : '',
                                                        to: preset.id === 'custom' ? prev.to : '',
                                                    }))
                                                }
                                                className={`rounded-xl border px-3 py-2.5 text-left transition-all ${
                                                    active
                                                        ? 'border-orange-300 bg-orange-50 shadow-sm shadow-orange-500/10'
                                                        : 'border-zinc-200 bg-white hover:border-orange-200 hover:bg-orange-50/40'
                                                }`}
                                            >
                                                <p className={`text-xs font-semibold ${active ? 'text-orange-800' : 'text-zinc-800'}`}>
                                                    {preset.label}
                                                </p>
                                                <p className="mt-0.5 text-[10px] text-zinc-500">{preset.hint}</p>
                                            </button>
                                        );
                                    })}
                                </div>

                                {tempDateFilter.preset === 'custom' && (
                                    <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl border border-zinc-200 bg-zinc-50/80 p-3">
                                        <label className="space-y-1">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">From</span>
                                            <input
                                                type="date"
                                                value={tempDateFilter.from}
                                                onChange={(e) =>
                                                    setTempDateFilter((prev) => ({ ...prev, from: e.target.value }))
                                                }
                                                className="w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-2 text-xs text-zinc-900 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                                            />
                                        </label>
                                        <label className="space-y-1">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">To</span>
                                            <input
                                                type="date"
                                                value={tempDateFilter.to}
                                                onChange={(e) =>
                                                    setTempDateFilter((prev) => ({ ...prev, to: e.target.value }))
                                                }
                                                className="w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-2 text-xs text-zinc-900 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                                            />
                                        </label>
                                    </div>
                                )}
                            </section>

                            {CATEGORY_GROUPS.map((group) => {
                                const groupCategories = group.keys
                                    .map((key) => categoryMap.get(key))
                                    .filter(Boolean) as FilterCategory[];
                                if (groupCategories.length === 0) return null;

                                return (
                                    <section key={group.title}>
                                        <div className="mb-2.5 flex items-center gap-2">
                                            {group.title === 'Location' ? (
                                                <MapPin className="h-3.5 w-3.5 text-orange-500" />
                                            ) : (
                                                <Building2 className="h-3.5 w-3.5 text-orange-500" />
                                            )}
                                            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                                                {group.title}
                                            </h4>
                                        </div>
                                        <div className="space-y-2">
                                            {groupCategories.map((category) => (
                                                <FilterOptionSection
                                                    key={category.key}
                                                    category={category}
                                                    selected={tempSelections[category.key] || []}
                                                    onToggle={(value) => toggleOption(category.key, value)}
                                                    onClear={() => clearCategory(category.key)}
                                                />
                                            ))}
                                        </div>
                                    </section>
                                );
                            })}
                        </div>

                        <div className="flex gap-3 border-t border-zinc-200 bg-white p-5">
                            <Button variant="ghost" onClick={handleClear} className="h-11 flex-1 text-sm font-semibold text-zinc-600">
                                Clear all
                            </Button>
                            <Button onClick={handleApply} className="h-11 flex-1 border-0 bg-orange-500 text-sm font-bold text-white shadow-lg shadow-orange-500/20 hover:bg-orange-600">
                                Apply filters
                            </Button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>,
        document.body,
    );
};

export const countShowFilters = (
    selections: FilterSelections,
    dateFilter: ShowDateFilter,
    exhibitorsOnly = false,
) => {
    const categoryCount = Object.values(selections).reduce((sum, arr) => sum + arr.length, 0);
    const dateActive = dateFilter.preset !== 'all' || !!dateFilter.from || !!dateFilter.to;
    return categoryCount + (dateActive ? 1 : 0) + (exhibitorsOnly ? 1 : 0);
};

export const matchesShowDateFilter = (rawDate: string | null | undefined, dateFilter: ShowDateFilter) => {
    if (dateFilter.preset === 'all' && !dateFilter.from && !dateFilter.to) return true;

    if (!rawDate) return false;
    const parsed = new Date(rawDate);
    if (Number.isNaN(parsed.getTime())) return false;

    const showDate = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (dateFilter.preset === 'upcoming') return showDate >= today;
    if (dateFilter.preset === 'past') return showDate < today;

    if (dateFilter.preset === 'this_month') {
        return showDate.getMonth() === today.getMonth() && showDate.getFullYear() === today.getFullYear();
    }

    if (dateFilter.preset === 'next_3_months') {
        const end = new Date(today.getFullYear(), today.getMonth() + 3, 0);
        return showDate >= today && showDate <= end;
    }

    if (dateFilter.preset === 'this_year') {
        return showDate.getFullYear() === today.getFullYear();
    }

    if (dateFilter.preset === 'custom') {
        if (!dateFilter.from && !dateFilter.to) return true;
        if (dateFilter.from) {
            const from = new Date(`${dateFilter.from}T00:00:00`);
            if (showDate < from) return false;
        }
        if (dateFilter.to) {
            const to = new Date(`${dateFilter.to}T23:59:59`);
            if (showDate > to) return false;
        }
        return true;
    }

    return true;
};
