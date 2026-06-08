import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
    RefreshCw,
    Plus,
    Search,
    Filter,
    FileSpreadsheet,
    MapPin,
    Calendar,
    Layers,
    CalendarDays,
    Globe2,
    Building2,
} from 'lucide-react';
import { ShowCardLogo } from '@/components/Shows/ShowLogo';
import type { FilterSelections, FilterCategory } from './FilterPopover';
import {
    ShowsFilterDrawer,
    EMPTY_SHOW_DATE_FILTER,
    countShowFilters,
    matchesShowDateFilter,
    SHOW_DATE_PRESET_LABELS,
    type ShowDateFilter,
} from '@/components/Shows/ShowsFilterDrawer';
import { ShowFormModal } from './ShowFormModal';
import { Button } from '../ui/Button';
import { Skeleton } from '../ui/Skeleton';
import { toast } from 'sonner';
import { SpreadsheetImportModal, type SpreadsheetImportProgress } from '@/components/SpreadsheetImportModal';
import type { SpreadsheetRow } from '@/lib/importSpreadsheet';
import { fpMarketingImportDemoTemplates } from '@/lib/demoSpreadsheetTemplates';
import { createClient } from '@/lib/supabase';
import { startOfDay, isAfter, isSameDay, format } from 'date-fns';
import { UpcomingShowsPanel, type UpcomingShowItem } from '@/components/Shows/UpcomingShowsPanel';
import { isMiddleEastShow } from '@/lib/utils';

export const ShowsTable = () => {
    const router = useRouter();
    const supabase = useMemo(() => createClient(), []);
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [fetchError, setFetchError] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<any>(null);
    const [search, setSearch] = useState('');
    const [appliedSearch, setAppliedSearch] = useState('');

    const [hasMore, setHasMore] = useState(true);
    const [page, setPage] = useState(0);
    const LIMIT = 100;
    const UPCOMING_DISPLAY_LIMIT = 20;

    const [totalShowsCount, setTotalShowsCount] = useState<number | null>(null);
    const [upcomingShowsAll, setUpcomingShowsAll] = useState<UpcomingShowItem[]>([]);
    const [upcomingLoading, setUpcomingLoading] = useState(true);

    const [importOpen, setImportOpen] = useState(false);

    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [allFetchedData, setAllFetchedData] = useState<any[]>([]);

    const [quickRegion, setQuickRegion] = useState<string>('All');

    const [filterSelections, setFilterSelections] = useState<FilterSelections>({
        country: [],
        city: [],
        event_type: [],
        industry: [],
        level: [],
        world_area: [],
        frequency: [],
    });
    const [dateFilter, setDateFilter] = useState<ShowDateFilter>(EMPTY_SHOW_DATE_FILTER);

    const totalActiveFilters = countShowFilters(filterSelections, dateFilter);

    const normalizeShow = (row: any) => {
        const id = row?.id ?? row?.ID ?? row?.show_id ?? row?.showId;
        const eventName = row?.name ?? row?.event_name ?? row?.Event_Name ?? row?.event ?? row?.Event ?? row?.Name ?? '';
        const eventType = row?.event_type ?? row?.Event_Type ?? row?.type ?? row?.Type ?? '';
        const city = row?.city ?? row?.City ?? '';
        const country = row?.country ?? row?.Country ?? '';
        const industry = row?.industry ?? row?.Industry ?? '';
        const level = row?.level ?? row?.Level ?? '';
        const worldArea = row?.world_area ?? row?.World_Area ?? '';
        const frequency = row?.frequency ?? row?.Frequency ?? '';


        return {
            ...row,
            ID: String(id ?? ''),
            Event_Name: eventName,
            Event_Type: eventType,
            City: city,
            Country: country,
            Industry: industry,
            Level: level,
            World_Area: worldArea,
            Frequency: frequency,
            __source: 'supabase',
        };
    };

    /* ─── Extract unique filter options from all fetched data ── */
    const filterCategories: FilterCategory[] = useMemo(() => {
        const unique = (key: string) => {
            const set = new Set<string>();
            allFetchedData.forEach(item => {
                const val = String(item[key] || '').trim();
                if (val) set.add(val);
            });
            return Array.from(set).sort((a, b) => a.localeCompare(b));
        };

        return [
            { key: 'country', label: 'Country', icon: <MapPin className="h-3.5 w-3.5" />, options: unique('Country') },
            { key: 'city', label: 'City', icon: <MapPin className="h-3.5 w-3.5" />, options: unique('City') },
            { key: 'world_area', label: 'World Area', icon: <Globe2 className="h-3.5 w-3.5" />, options: unique('World_Area') },
            { key: 'event_type', label: 'Event Type', icon: <Calendar className="h-3.5 w-3.5" />, options: unique('Event_Type') },
            { key: 'industry', label: 'Industry', icon: <Building2 className="h-3.5 w-3.5" />, options: unique('Industry') },
            { key: 'level', label: 'Level', icon: <Layers className="h-3.5 w-3.5" />, options: unique('Level') },
            { key: 'frequency', label: 'Frequency', icon: <RefreshCw className="h-3.5 w-3.5" />, options: unique('Frequency') },
        ];
    }, [allFetchedData]);

    const fetchTotalShowsCount = useCallback(async () => {
        const { count, error } = await supabase
            .from('shows')
            .select('*', { count: 'exact', head: true });
        if (!error) setTotalShowsCount(count ?? 0);
    }, [supabase]);

    const fetchUpcomingShows = useCallback(async () => {
        setUpcomingLoading(true);
        try {
            const today = format(startOfDay(new Date()), 'yyyy-MM-dd');
            const { data: rows, error } = await supabase
                .from('shows')
                .select('id, name, starting_date, city, country, world_area, industry')
                .not('starting_date', 'is', null)
                .gte('starting_date', today)
                .order('starting_date', { ascending: true })
                .limit(500);

            if (error) throw error;

            const items = (rows || [])
                .filter((row) => isMiddleEastShow({
                    world_area: String(row.world_area || ''),
                    country: String(row.country || ''),
                }))
                .map((item) => {
                    const parsed = new Date(item.starting_date);
                    if (Number.isNaN(parsed.getTime())) return null;
                    return {
                        id: String(item.id),
                        name: String(item.name || 'Untitled show'),
                        date: parsed,
                        location: [item.city, item.country].filter(Boolean).join(', '),
                        industry: item.industry || '',
                    } satisfies UpcomingShowItem;
                })
                .filter((item): item is UpcomingShowItem => {
                    if (!item) return false;
                    return isAfter(item.date, startOfDay(new Date())) || isSameDay(item.date, startOfDay(new Date()));
                });

            setUpcomingShowsAll(items);
        } catch (err) {
            console.error('Failed to fetch upcoming shows', err);
            setUpcomingShowsAll([]);
        } finally {
            setUpcomingLoading(false);
        }
    }, [supabase]);

    const fetchData = useCallback(async (reset = false, searchTerm = '') => {
        setLoading(true);
        setFetchError('');
        try {
            const from = reset ? 0 : page * LIMIT;
            const trimmedSearch = searchTerm.trim();

            let query = supabase
                .from('shows')
                .select('*')
                .order('id', { ascending: false });

            if (trimmedSearch) {
                query = query.ilike('name', `%${trimmedSearch}%`);
            }

            const { data: rows, error: fetchErr } = await query.range(from, from + LIMIT - 1);

            if (fetchErr) throw fetchErr;

            let normalized = (rows || []).map(normalizeShow);

            // Store all fetched data for extracting filter options
            if (reset) {
                setAllFetchedData(normalized);
            } else {
                setAllFetchedData(prev => {
                    const uniqueItems = new Map(prev.map(item => [item.ID, item]));
                    normalized.forEach(item => uniqueItems.set(item.ID, item));
                    return Array.from(uniqueItems.values());
                });
            }

            /* Apply quick region filter */
            if (quickRegion !== 'All') {
                normalized = normalized.filter(item => {
                    const country = String(item.Country || '').toLowerCase();
                    const area = String(item.World_Area || '').toLowerCase();
                    if (quickRegion === 'UAE') return country.includes('united arab emirates') || country === 'uae';
                    if (quickRegion === 'KSA') return country.includes('saudi arabia') || country === 'ksa';
                    if (quickRegion === 'Europe') return area.includes('europe');
                    return true;
                });
            }

            /* Apply all active filters (AND across categories) */
            const filterFieldMap: Record<string, string> = {
                country: 'Country',
                city: 'City',
                event_type: 'Event_Type',
                industry: 'Industry',
                level: 'Level',
                world_area: 'World_Area',
                frequency: 'Frequency',
            };
            for (const [filterKey, selectedValues] of Object.entries(filterSelections)) {
                if (selectedValues.length > 0) {
                    const field = filterFieldMap[filterKey];
                    if (field) {
                        const selectedLower = selectedValues.map(v => v.toLowerCase());
                        normalized = normalized.filter(item =>
                            selectedLower.includes(String(item[field] || '').toLowerCase())
                        );
                    }
                }
            }

            normalized = normalized.filter((item) =>
                matchesShowDateFilter(item.starting_date || item.Starting_Date, dateFilter),
            );

            if (reset) {
                setData(normalized);
                setPage(1);
            } else {
                setData((prev) => {
                    const uniqueItems = new Map(prev.map((item) => [item.ID, item]));
                    normalized.forEach((item: any) => uniqueItems.set(item.ID, item));
                    return Array.from(uniqueItems.values());
                });
                setPage((prev) => prev + 1);
            }

            setHasMore((rows || []).length === LIMIT);

            if (reset) {
                void fetchTotalShowsCount();
                void fetchUpcomingShows();
            }
        } catch (err: any) {
            console.error(err);
            const message = err?.message || 'Failed to load shows from Supabase';
            setFetchError(message);
            if (reset) toast.error(message);
            if (reset) setData([]);
            setHasMore(false);
        } finally {
            setLoading(false);
        }
    }, [page, filterSelections, dateFilter, quickRegion, supabase, fetchTotalShowsCount, fetchUpcomingShows]);

    useEffect(() => {
        setPage(0);
        fetchData(true, appliedSearch);
    }, [appliedSearch, filterSelections, dateFilter, quickRegion]);

    const handleSearch = () => {
        const term = search.trim();
        if (term === appliedSearch) {
            setPage(0);
            fetchData(true, term);
            return;
        }
        setAppliedSearch(term);
    };

    const handleApplyFilters = (selections: FilterSelections, nextDateFilter: ShowDateFilter) => {
        setFilterSelections(selections);
        setDateFilter(nextDateFilter);
    };

    const handleClearFilters = () => {
        setFilterSelections({
            country: [],
            city: [],
            event_type: [],
            industry: [],
            level: [],
            world_area: [],
            frequency: [],
        });
        setDateFilter(EMPTY_SHOW_DATE_FILTER);
    };

    const loadMoreSentinelRef = useRef<HTMLDivElement>(null);
    const loadingRef = useRef(loading);
    const hasMoreRef = useRef(hasMore);

    useEffect(() => {
        loadingRef.current = loading;
    }, [loading]);

    useEffect(() => {
        hasMoreRef.current = hasMore;
    }, [hasMore]);

    const loadMore = useCallback(() => {
        if (!loadingRef.current && hasMoreRef.current) {
            fetchData(false, appliedSearch);
        }
    }, [fetchData, appliedSearch]);

    useEffect(() => {
        const sentinel = loadMoreSentinelRef.current;
        if (!sentinel || !hasMore || data.length === 0) return;

        let scrollRoot: HTMLElement | null = sentinel.parentElement;
        while (scrollRoot) {
            const { overflowY } = window.getComputedStyle(scrollRoot);
            if (overflowY === 'auto' || overflowY === 'scroll') break;
            scrollRoot = scrollRoot.parentElement;
        }

        const observer = new IntersectionObserver(
            (entries) => {
                if (!entries[0]?.isIntersecting) return;
                loadMore();
            },
            { root: scrollRoot, rootMargin: '320px 0px', threshold: 0 },
        );

        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [hasMore, data.length, loadMore]);

    const upcomingShows = useMemo(
        () => upcomingShowsAll.slice(0, UPCOMING_DISPLAY_LIMIT),
        [upcomingShowsAll],
    );

    const hasListFilters = useMemo(
        () =>
            Boolean(appliedSearch.trim()) ||
            totalActiveFilters > 0 ||
            quickRegion !== 'All',
        [appliedSearch, totalActiveFilters, quickRegion],
    );

    const exhibitionsCountLabel = useMemo(() => {
        const showing = data.length;
        if (loading && showing === 0) return 'Loading shows…';

        const plus = hasMore ? '+' : '';
        const total = totalShowsCount;
        const matching = hasListFilters ? ' matching' : '';

        if (total == null) {
            return `Showing ${showing}${plus}${matching} show${showing === 1 ? '' : 's'}`;
        }

        return `Showing ${showing}${plus}${matching} of ${total.toLocaleString()} show${total === 1 ? '' : 's'}`;
    }, [data.length, loading, hasListFilters, hasMore, totalShowsCount]);

    const handleEdit = (item: any) => {
        setSelectedItem(item);
        setIsModalOpen(true);
    };

    const handleUpdateSuccess = async () => {
        await fetchData(true, appliedSearch);
    };

    const handleAdd = () => {
        setSelectedItem(null);
        setIsModalOpen(true);
    };

    const handleShowsSpreadsheetImport = async (
        rows: SpreadsheetRow[],
        meta?: { comment?: string },
        onProgress?: (p: SpreadsheetImportProgress) => void,
    ) => {
        const { rowsToShowZohoPayloads } = await import('@/lib/importSpreadsheet');
        const { logSpreadsheetImport } = await import('@/lib/logImportActivity');
        const payloads = rowsToShowZohoPayloads(rows);
        if (payloads.length === 0) {
            toast.error('No valid rows. Include Event Name (Event_Name, Event, Name, or Show).');
            return;
        }
        onProgress?.({ current: 0, total: payloads.length });
        let ok = 0;

        for (let i = 0; i < payloads.length; i++) {
            const payload = payloads[i];
            try {
                const row = {
                    id: crypto.randomUUID(),
                    name: payload.Event_Name || payload.Event || payload.Name || '',
                    event_type: payload.Event_Type || '',
                    starting_date: payload.Starting_Date || null,
                    industry: payload.Industry || '',
                    level: payload.Level || '',
                    world_area: payload.World_Area || '',
                    country: payload.Country || '',
                    city: payload.City || '',
                    frequency: payload.Frequency || '',
                };
                const { error: insertError } = await supabase.from('shows').insert(row);
                if (!insertError) ok++;
            } catch (e) {
                console.error(e);
            }
            onProgress?.({ current: i + 1, total: payloads.length });
        }
        await fetchData(true, appliedSearch);
        await logSpreadsheetImport(`Created ${ok} of ${payloads.length} shows in Supabase from spreadsheet.`, meta?.comment);
        toast.success(`Created ${ok} of ${payloads.length} shows in Supabase${meta?.comment?.trim() ? ' · note saved' : ''}`);
    };

    const handleRowClick = (item: any) => {
        router.push(`/shows/${item.ID}`);
    };

    const formatCardDate = (raw: string) => {
        if (!raw) return 'Date TBC';
        const parsed = new Date(raw);
        return Number.isNaN(parsed.getTime())
            ? raw
            : parsed.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    };

    const initialsFromName = (name: string) => {
        const parts = name.trim().split(/\s+/).filter(Boolean);
        if (parts.length === 0) return '?';
        if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    };

    return (
        <div className="flex flex-col gap-6">
            <div className="space-y-1">
                <h1 className="text-2xl font-bold tracking-tight text-zinc-950 sm:text-3xl">Shows</h1>
                <p className="text-sm text-zinc-500">Upcoming exhibitions at a glance, then your full show library.</p>
            </div>

            <UpcomingShowsPanel
                shows={upcomingShows}
                loading={upcomingLoading}
                onShowClick={(id) => router.push(`/shows/${id}`)}
            />

            {importOpen && (
                <SpreadsheetImportModal
                    isOpen
                    onClose={() => setImportOpen(false)}
                    title="Import shows (CSV / Excel)"
                    columnHint={
                        <>
                            Required: <strong>Event_Name</strong> (or Event / Name / Show). Optional: Event_Type, Starting_Date,
                            Industry, Level, World_Area, Country, City, Frequency.
                        </>
                    }
                    demoCsvTemplate={fpMarketingImportDemoTemplates.showsZoho}
                    onImportRows={handleShowsSpreadsheetImport}
                />
            )}

            <ShowFormModal
                key={selectedItem?.ID || 'new'}
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setTimeout(() => setSelectedItem(null), 100);
                }}
                onSuccess={handleUpdateSuccess}
                initialData={selectedItem}
            />

            {/* Toolbar — sticks below header/upcoming panel while scrolling exhibitions */}
            <div className="sticky top-0 z-20 flex flex-col gap-2 rounded-2xl border border-zinc-200 bg-white/95 p-3 shadow-sm shadow-zinc-950/5 backdrop-blur-md">
                <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
                    {/* Search */}
                    <div className="flex gap-2 lg:min-w-0 lg:flex-1">
                        <div className="relative min-w-0 flex-1">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                            <input
                                type="text"
                                placeholder="Search by show name..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleSearch();
                                    }
                                }}
                                className="h-10 w-full rounded-xl border border-zinc-200 bg-zinc-50/80 py-2 pl-9 pr-3 text-sm font-medium text-zinc-950 outline-none transition-colors placeholder:text-zinc-400 focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-100"
                            />
                        </div>
                        <Button
                            type="button"
                            onClick={handleSearch}
                            isLoading={loading}
                            className="h-10 shrink-0 rounded-xl bg-linear-to-r from-orange-600 to-orange-500 px-4 font-semibold text-white shadow-md shadow-orange-500/25 hover:from-orange-500 hover:to-orange-400"
                            leftIcon={<Search className="h-4 w-4" />}
                        >
                            Search
                        </Button>
                    </div>
                    {/* Actions */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-0.5 lg:overflow-visible">
                        <div className="relative">
                            <Button
                                variant="secondary"
                                onClick={() => setIsFilterOpen(!isFilterOpen)}
                                className={`h-9 rounded-xl border px-3 ${totalActiveFilters > 0 ? 'border-orange-300 bg-orange-50 text-orange-700' : 'border-zinc-200 bg-white text-zinc-700'}`}
                                leftIcon={<Filter className="h-4 w-4" />}
                            >
                                <span className="hidden sm:inline">Filters</span>
                                {totalActiveFilters > 0 && <span className="ml-1">({totalActiveFilters})</span>}
                            </Button>
                        </div>
                        <Button
                            variant="secondary"
                            onClick={() => fetchData(true, appliedSearch)}
                            isLoading={loading}
                            className="h-9 w-9 shrink-0 rounded-xl border border-zinc-200 bg-white p-0 text-zinc-600 hover:border-orange-200 hover:bg-orange-50"
                        >
                            {!loading && <RefreshCw className="h-4 w-4" />}
                        </Button>
                        <Button
                            variant="secondary"
                            onClick={() => setImportOpen(true)}
                            leftIcon={<FileSpreadsheet className="h-4 w-4" />}
                            className="h-9 rounded-xl border border-zinc-200 bg-white px-3 text-zinc-700 hover:border-orange-200 hover:bg-orange-50"
                        >
                            <span className="hidden sm:inline">Import</span>
                        </Button>
                        <Button
                            onClick={handleAdd}
                            leftIcon={<Plus className="h-4 w-4" />}
                            className="h-9 rounded-xl bg-linear-to-r from-orange-600 to-orange-500 px-4 font-semibold text-white shadow-md shadow-orange-500/25 hover:from-orange-500 hover:to-orange-400"
                        >
                            Add Show
                        </Button>
                    </div>
                </div>

                {/* Region chips */}
                <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
                    <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-zinc-400">Region:</span>
                    {['All', 'UAE', 'KSA', 'Europe'].map((region) => {
                        const isSelected = quickRegion === region;
                        const label = region === 'All' ? 'All Shows' : region;
                        return (
                            <button
                                key={region}
                                onClick={() => setQuickRegion(region)}
                                className={`shrink-0 rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors ${isSelected ? 'border-zinc-950 bg-zinc-950 text-white' : 'border-zinc-200 bg-white text-zinc-600 hover:border-orange-300 hover:bg-orange-50 hover:text-zinc-950'}`}
                            >
                                {label}
                            </button>
                        );
                    })}
                </div>

                {totalActiveFilters > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 border-t border-zinc-100 pt-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Active filters:</span>
                        {dateFilter.preset !== 'all' && (
                            <span className="rounded-full border border-orange-200 bg-orange-50 px-2.5 py-0.5 text-[10px] font-semibold text-orange-700">
                                {dateFilter.preset === 'custom'
                                    ? `${SHOW_DATE_PRESET_LABELS.custom}${dateFilter.from || dateFilter.to ? ` · ${dateFilter.from || '…'} → ${dateFilter.to || '…'}` : ''}`
                                    : SHOW_DATE_PRESET_LABELS[dateFilter.preset]}
                            </span>
                        )}
                        {Object.entries(filterSelections).flatMap(([key, values]) =>
                            values.map((value) => (
                                <span
                                    key={`${key}-${value}`}
                                    className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-0.5 text-[10px] font-semibold text-zinc-700"
                                >
                                    {value}
                                </span>
                            )),
                        )}
                        <button
                            type="button"
                            onClick={handleClearFilters}
                            className="cursor-pointer text-[10px] font-semibold text-orange-600 hover:text-orange-700"
                        >
                            Clear all
                        </button>
                    </div>
                )}
            </div>

            {/* Card grid */}
            <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm shadow-zinc-950/5">
                <div className="flex flex-col gap-3 border-b border-zinc-100 bg-linear-to-r from-zinc-50/80 to-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                    <div>
                        <h2 className="text-base font-semibold text-zinc-900">All exhibitions</h2>
                        <p className="mt-0.5 text-xs text-zinc-500">
                            {exhibitionsCountLabel}
                        </p>
                    </div>
                </div>
                <div className="p-4 md:p-6">
                    {loading && data.length === 0 ? (
                        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                            {Array.from({ length: 6 }).map((_, i) => (
                                <div key={i} className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
                                    <Skeleton className="h-32 w-full rounded-none" />
                                    <div className="space-y-4 p-5">
                                        <div className="flex items-center justify-between">
                                            <Skeleton className="h-6 w-14 rounded-xl" />
                                            <Skeleton className="h-5 w-16 rounded-full" />
                                        </div>
                                        <Skeleton className="h-6 w-5/6 rounded-md" />
                                        <div className="flex gap-2">
                                            <Skeleton className="h-5 w-20 rounded-md" />
                                            <Skeleton className="h-5 w-24 rounded-md" />
                                        </div>
                                        <div className="space-y-2 border-t border-zinc-100 pt-3">
                                            <Skeleton className="h-4 w-3/4 rounded" />
                                            <Skeleton className="h-4 w-2/3 rounded" />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : data.length === 0 ? (
                        <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
                            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-orange-50 ring-1 ring-orange-100">
                                <CalendarDays className="h-9 w-9 text-orange-500" />
                            </div>
                            <div>
                                <p className="text-lg font-semibold text-zinc-900">
                                    {appliedSearch.trim() ? 'No matching shows' : 'No shows yet'}
                                </p>
                                <p className="mt-1 max-w-md text-sm text-zinc-500">
                                    {fetchError
                                        ? fetchError
                                        : appliedSearch.trim()
                                            ? `No shows found for "${appliedSearch}". Try a different name or clear the search.`
                                            : 'Add a show or import a spreadsheet to populate this list.'}
                                </p>
                            </div>
                            <Button onClick={handleAdd} leftIcon={<Plus className="h-4 w-4" />} className="mt-2 rounded-xl">
                                Add your first show
                            </Button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                            {data.map((item) => {
                                const name = item.name || item.Event_Name || item.Name || 'Untitled show';
                                const eventType = item.Event_Type || item.event_type || '';
                                const industry = item.industry || item.Industry || '';
                                const level = item.level || item.Level || '';
                                const worldArea = item.world_area || item.World_Area || '';
                                const city = item.City || '';
                                const country = item.Country || '';
                                const date = item.starting_date || item.Starting_Date || '';
                                const location = [city, country].filter(Boolean).join(', ');
                                const cover_img_link = item.cover_img_link;

                                const RANDOM_COVERS = [
                                    'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&q=80&w=800',
                                    'https://images.unsplash.com/photo-1551818255-e6e10975bc17?auto=format&fit=crop&q=80&w=800',
                                    'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&q=80&w=800',
                                    'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&q=80&w=800',
                                    'https://images.unsplash.com/photo-1587825140708-dfaf72ae4b04?auto=format&fit=crop&q=80&w=800',
                                    'https://images.unsplash.com/photo-1561489413-985b06da5bee?auto=format&fit=crop&q=80&w=800',
                                    'https://images.unsplash.com/photo-1475721025592-7156fb1525f0?auto=format&fit=crop&q=80&w=800',
                                    'https://images.unsplash.com/photo-1558008258-3256797b43f3?auto=format&fit=crop&q=80&w=800',
                                    'https://images.unsplash.com/photo-1559136555-e4616d80c057?auto=format&fit=crop&q=80&w=800',
                                    'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&q=80&w=800'
                                ];
                                const nameSum = name.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
                                const randomCover = RANDOM_COVERS[nameSum % RANDOM_COVERS.length];

                                const coverImage = cover_img_link || randomCover;

                                return (
                                    <button
                                        key={item.ID}
                                        type="button"
                                        onClick={() => handleRowClick(item)}
                                        className="group flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white text-left shadow-sm shadow-zinc-950/5 outline-none transition-all duration-300 cursor-pointer hover:border-orange-200 hover:shadow-2xl hover:shadow-orange-950/15 focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2"
                                    >
                                        {/* Visual header */}
                                        <div className="relative h-36 overflow-hidden bg-gradient-to-br from-zinc-900 via-zinc-800 to-orange-950">
                                            <img
                                                src={coverImage}
                                                alt={`${name} cover`}
                                                className="absolute inset-0 h-full w-full object-cover opacity-60"
                                                loading="lazy"
                                            />
                                            <div className="pointer-events-none absolute inset-0 bg-black/40" />
                                            {/* Layered glows */}
                                            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_70%_at_90%_10%,rgba(251,146,60,0.5),transparent)]" />
                                            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_50%_50%_at_10%_100%,rgba(251,146,60,0.2),transparent)]" />
                                            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                                            {/* Subtle grid pattern */}
                                            <div className="pointer-events-none absolute inset-0 opacity-[0.04]"
                                                style={{ backgroundImage: 'repeating-linear-gradient(0deg,#fff 0,#fff 1px,transparent 1px,transparent 32px),repeating-linear-gradient(90deg,#fff 0,#fff 1px,transparent 1px,transparent 32px)' }}
                                            />
                                            {/* World area top label */}
                                            {worldArea && (
                                                <div className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-semibold tracking-wide text-white/70 backdrop-blur-sm ring-1 ring-white/10">
                                                    <Globe2 className="h-2.5 w-2.5" />
                                                    {worldArea}
                                                </div>
                                            )}
                                            <div className="relative flex h-full items-end justify-between px-4 pb-4">
                                                <ShowCardLogo show={item} name={name} />
                                                {eventType ? (
                                                    <span className="rounded-full bg-orange-500/25 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-orange-100 ring-1 ring-orange-400/30 backdrop-blur-sm">
                                                        {eventType}
                                                    </span>
                                                ) : null}
                                            </div>
                                        </div>

                                        <div className="flex flex-1 flex-col p-5">
                                            <h3 className="line-clamp-2 text-base font-bold leading-snug tracking-tight text-zinc-950 transition-colors group-hover:text-orange-700">
                                                {name}
                                            </h3>

                                            <div className="mt-2.5 flex flex-wrap gap-1.5">
                                                {industry ? (
                                                    <span className="inline-flex items-center rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                                                        {industry}
                                                    </span>
                                                ) : null}
                                                {level ? (
                                                    <span className="inline-flex items-center gap-1 rounded-lg border border-orange-100 bg-orange-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-orange-700">
                                                        <Layers className="h-2.5 w-2.5" />
                                                        {level}
                                                    </span>
                                                ) : null}
                                            </div>

                                            <div className="mt-4 space-y-2 border-t border-zinc-100 pt-4">
                                                <div className="flex items-center gap-2 text-sm text-zinc-500">
                                                    <MapPin className="h-3.5 w-3.5 shrink-0 text-orange-500" />
                                                    <span className="line-clamp-1 font-medium text-zinc-700">{location || 'Location TBC'}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-sm text-zinc-500">
                                                    <Calendar className="h-3.5 w-3.5 shrink-0 text-orange-500" />
                                                    <span className="font-medium text-zinc-700">{formatCardDate(date)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {loading && data.length > 0 && (
                    <div className="border-t border-zinc-100 px-4 py-4 md:px-6">
                        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                            {Array.from({ length: 3 }).map((_, i) => (
                                <div key={i} className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
                                    <Skeleton className="h-36 w-full rounded-none" />
                                    <div className="space-y-3 p-5">
                                        <Skeleton className="h-6 w-5/6 rounded-md" />
                                        <Skeleton className="h-4 w-2/3 rounded" />
                                        <Skeleton className="h-4 w-1/2 rounded" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {hasMore && data.length > 0 && (
                    <div
                        ref={loadMoreSentinelRef}
                        className="h-px w-full"
                        aria-hidden
                    />
                )}
            </section>

            <ShowsFilterDrawer
                isOpen={isFilterOpen}
                onClose={() => setIsFilterOpen(false)}
                categories={filterCategories}
                selections={filterSelections}
                dateFilter={dateFilter}
                onApply={handleApplyFilters}
                onClear={handleClearFilters}
            />
        </div>
    );
};
