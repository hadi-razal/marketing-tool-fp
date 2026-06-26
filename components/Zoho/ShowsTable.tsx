import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
    RefreshCw,
    Plus,
    Search,
    Filter,
    FileSpreadsheet,
    FilePenLine,
    MapPin,
    Calendar,
    Layers,
    CalendarDays,
    Globe2,
    Building2,
    ArrowUpDown,
    ChevronDown,
    ChevronRight,
    LayoutGrid,
    CalendarRange,
    PencilLine,
    X,
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
import { Modal } from '../ui/Modal';
import { Skeleton } from '../ui/Skeleton';
import { toast } from 'sonner';
import { SpreadsheetImportModal, type SpreadsheetImportProgress } from '@/components/SpreadsheetImportModal';
import type { SpreadsheetRow } from '@/lib/importSpreadsheet';
import { fpMarketingImportDemoTemplates } from '@/lib/demoSpreadsheetTemplates';
import { createClient } from '@/lib/supabase';
import { ShowsCalendar } from '@/components/Shows/ShowsCalendar';

type ShowViewMode = 'grid' | 'calendar';

type ShowSortKey =
    | 'recent'
    | 'name_asc'
    | 'name_desc'
    | 'tier_asc'
    | 'tier_desc'
    | 'date_asc'
    | 'date_desc';

const SHOW_SORT_OPTIONS: { key: ShowSortKey; label: string; column: string; ascending: boolean }[] = [
    { key: 'recent', label: 'Newest added', column: 'id', ascending: false },
    { key: 'name_asc', label: 'Name (A → Z)', column: 'name', ascending: true },
    { key: 'name_desc', label: 'Name (Z → A)', column: 'name', ascending: false },
    { key: 'tier_asc', label: 'Tier (low → high)', column: 'level', ascending: true },
    { key: 'tier_desc', label: 'Tier (high → low)', column: 'level', ascending: false },
    { key: 'date_asc', label: 'Start date (soonest)', column: 'starting_date', ascending: true },
    { key: 'date_desc', label: 'Start date (latest)', column: 'starting_date', ascending: false },
];

const SHOW_SORT_MAP = Object.fromEntries(SHOW_SORT_OPTIONS.map((o) => [o.key, o])) as Record<
    ShowSortKey,
    (typeof SHOW_SORT_OPTIONS)[number]
>;

// Persist the active filters/search/sort/view so they survive navigating into a
// show detail page and back (kept per-tab via sessionStorage).
const SHOWS_FILTERS_STORAGE_KEY = 'fp:shows:filters';

type PersistedShowFilters = {
    search: string;
    sortBy: ShowSortKey;
    viewMode: ShowViewMode;
    showExhibitorsOnly: boolean;
    filterSelections: FilterSelections;
    dateFilter: ShowDateFilter;
};

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

    const [totalShowsCount, setTotalShowsCount] = useState<number | null>(null);

    const [importOpen, setImportOpen] = useState(false);
    const [bulkUpdateOpen, setBulkUpdateOpen] = useState(false);
    const [addMenuOpen, setAddMenuOpen] = useState(false);
    const [sortBy, setSortBy] = useState<ShowSortKey>('recent');
    const [viewMode, setViewMode] = useState<ShowViewMode>('grid');

    // Becomes true once persisted filters have been restored from sessionStorage.
    // The initial data fetch waits for this so it runs with the restored filters.
    const [hydrated, setHydrated] = useState(false);

    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [allFetchedData, setAllFetchedData] = useState<any[]>([]);

    const [exhibitorShowIds, setExhibitorShowIds] = useState<Set<string>>(new Set());
    const exhibitorShowIdsRef = useRef<Set<string>>(new Set());
    const exhibitorIdsLoadedRef = useRef(false);
    const exhibitorIdsInFlightRef = useRef<Promise<Set<string>> | null>(null);
    const [showExhibitorsOnly, setShowExhibitorsOnly] = useState(false);

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

    const totalActiveFilters = countShowFilters(filterSelections, dateFilter, showExhibitorsOnly);

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

    const fetchAllExhibitorShowIds = useCallback(async (force = false): Promise<Set<string>> => {
        // Reuse the cached set unless a refresh is explicitly requested.
        if (!force && exhibitorIdsLoadedRef.current) {
            return exhibitorShowIdsRef.current;
        }
        // De-dupe concurrent callers so we never run this query more than once
        // at a time (fetchData + the mount effect can race on first load).
        if (!force && exhibitorIdsInFlightRef.current) {
            return exhibitorIdsInFlightRef.current;
        }

        const load = (async (): Promise<Set<string>> => {
            const withExhibitors = new Set<string>();

            // Fast path: a single DISTINCT query in the database.
            const { data: rpcRows, error: rpcError } = await supabase.rpc('get_exhibitor_show_ids');

            if (!rpcError && Array.isArray(rpcRows)) {
                for (const row of rpcRows) {
                    const showId = String((typeof row === 'string' ? row : row?.show_id) ?? '').trim();
                    if (showId) withExhibitors.add(showId);
                }
                exhibitorShowIdsRef.current = withExhibitors;
                exhibitorIdsLoadedRef.current = true;
                setExhibitorShowIds(withExhibitors);
                return withExhibitors;
            }

            // Fallback: paginate the table (used only if the RPC is not deployed).
            const pageSize = 1000;
            let offset = 0;
            while (true) {
                const { data: rows, error } = await supabase
                    .from('show_participation')
                    .select('show_id')
                    .range(offset, offset + pageSize - 1);

                if (error) {
                    console.error('Failed to load exhibitor participation:', error);
                    return exhibitorShowIdsRef.current;
                }

                for (const row of rows || []) {
                    const showId = String(row.show_id ?? '').trim();
                    if (showId) withExhibitors.add(showId);
                }

                if (!rows || rows.length < pageSize) break;
                offset += pageSize;
            }

            exhibitorShowIdsRef.current = withExhibitors;
            exhibitorIdsLoadedRef.current = true;
            setExhibitorShowIds(withExhibitors);
            return withExhibitors;
        })();

        exhibitorIdsInFlightRef.current = load;
        try {
            return await load;
        } finally {
            exhibitorIdsInFlightRef.current = null;
        }
    }, [supabase]);

    useEffect(() => {
        void fetchAllExhibitorShowIds();
    }, [fetchAllExhibitorShowIds]);

    const fetchData = useCallback(async (reset = false, searchTerm = '') => {
        setLoading(true);
        setFetchError('');
        try {
            const from = reset ? 0 : page * LIMIT;
            const trimmedSearch = searchTerm.trim();
            const sort = SHOW_SORT_MAP[sortBy] ?? SHOW_SORT_MAP.recent;

            let rows: any[] | null = null;

            if (showExhibitorsOnly) {
                // Server-side EXISTS join: returns only this page of shows that
                // have exhibitors, so we never ship thousands of ids over the wire.
                const { data: rpcRows, error: rpcError } = await supabase.rpc('get_shows_with_exhibitors', {
                    p_search: trimmedSearch || null,
                    p_limit: LIMIT,
                    p_offset: from,
                    p_sort: sort.column,
                    p_asc: sort.ascending,
                });

                if (rpcError) {
                    // Fallback (RPC not deployed yet): filter by the cached id set.
                    const ids = await fetchAllExhibitorShowIds();
                    const exhibitorIds = [...ids];
                    if (exhibitorIds.length === 0) {
                        setData([]);
                        setHasMore(false);
                        if (reset) setPage(1);
                        return;
                    }
                    let fbQuery = supabase
                        .from('shows')
                        .select('*')
                        .order(sort.column, { ascending: sort.ascending, nullsFirst: false })
                        .in('id', exhibitorIds);
                    if (trimmedSearch) fbQuery = fbQuery.ilike('name', `%${trimmedSearch}%`);
                    const { data: fbRows, error: fbErr } = await fbQuery.range(from, from + LIMIT - 1);
                    if (fbErr) throw fbErr;
                    rows = fbRows;
                } else {
                    rows = rpcRows;
                }
            } else {
                let query = supabase
                    .from('shows')
                    .select('*')
                    .order(sort.column, { ascending: sort.ascending, nullsFirst: false });

                if (trimmedSearch) {
                    query = query.ilike('name', `%${trimmedSearch}%`);
                }

                const { data: queryRows, error: fetchErr } = await query.range(from, from + LIMIT - 1);
                if (fetchErr) throw fetchErr;
                rows = queryRows;
            }

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
    }, [page, filterSelections, dateFilter, showExhibitorsOnly, sortBy, supabase, fetchTotalShowsCount, fetchAllExhibitorShowIds]);

    // Restore persisted filters once on mount (e.g. after going into a show and
    // coming back). Done in an effect (not a lazy initializer) to avoid SSR
    // hydration mismatches; the fetch waits on `hydrated`.
    useEffect(() => {
        try {
            const raw = sessionStorage.getItem(SHOWS_FILTERS_STORAGE_KEY);
            if (raw) {
                const saved = JSON.parse(raw) as Partial<PersistedShowFilters>;
                if (typeof saved.search === 'string') {
                    setSearch(saved.search);
                    setAppliedSearch(saved.search);
                }
                if (saved.sortBy) setSortBy(saved.sortBy);
                if (saved.viewMode) setViewMode(saved.viewMode);
                if (typeof saved.showExhibitorsOnly === 'boolean') setShowExhibitorsOnly(saved.showExhibitorsOnly);
                if (saved.filterSelections) {
                    setFilterSelections((prev) => ({ ...prev, ...saved.filterSelections }));
                }
                if (saved.dateFilter) setDateFilter(saved.dateFilter);
            }
        } catch {
            // Ignore malformed/unavailable storage and fall back to defaults.
        }
        setHydrated(true);
    }, []);

    // Save filters whenever they change (only after restore, so we never clobber
    // the saved values with the initial defaults).
    useEffect(() => {
        if (!hydrated) return;
        try {
            const payload: PersistedShowFilters = {
                search: appliedSearch,
                sortBy,
                viewMode,
                showExhibitorsOnly,
                filterSelections,
                dateFilter,
            };
            sessionStorage.setItem(SHOWS_FILTERS_STORAGE_KEY, JSON.stringify(payload));
        } catch {
            // Ignore quota/serialization errors.
        }
    }, [hydrated, appliedSearch, sortBy, viewMode, showExhibitorsOnly, filterSelections, dateFilter]);

    useEffect(() => {
        if (!hydrated) return;
        setPage(0);
        fetchData(true, appliedSearch);
    }, [hydrated, appliedSearch, filterSelections, dateFilter, showExhibitorsOnly, sortBy]);

    const handleSearch = () => {
        const term = search.trim();
        if (term === appliedSearch) {
            setPage(0);
            fetchData(true, term);
            return;
        }
        setAppliedSearch(term);
    };

    const handleApplyFilters = (
        selections: FilterSelections,
        nextDateFilter: ShowDateFilter,
        exhibitorsOnly: boolean,
    ) => {
        setFilterSelections(selections);
        setDateFilter(nextDateFilter);
        setShowExhibitorsOnly(exhibitorsOnly);
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
        setShowExhibitorsOnly(false);
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

    const hasListFilters = useMemo(
        () => Boolean(appliedSearch.trim()) || totalActiveFilters > 0,
        [appliedSearch, totalActiveFilters],
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
        const { parseShowImportRows } = await import('@/lib/importSpreadsheet');
        const { logSpreadsheetImport } = await import('@/lib/logImportActivity');
        const { entries, invalid } = parseShowImportRows(rows);
        if (entries.length === 0 && invalid.length === 0) {
            toast.error('No data rows found. Use a header row and at least one data row.');
            return;
        }

        const errors = invalid.map((iv) => ({ label: iv.label, reason: iv.reason }));
        const total = entries.length + invalid.length;
        onProgress?.({ current: invalid.length, total });
        let ok = 0;

        const CHUNK = 100;
        for (let i = 0; i < entries.length; i += CHUNK) {
            const chunk = entries.slice(i, i + CHUNK);
            const payload = chunk.map((e) => ({ id: crypto.randomUUID(), ...e.data }));
            const { error: insertError } = await supabase.from('shows').insert(payload);
            if (insertError) {
                // Fall back to per-row inserts so one bad row doesn't drop the batch.
                for (const e of chunk) {
                    const { error: rowError } = await supabase.from('shows').insert({ id: crypto.randomUUID(), ...e.data });
                    if (rowError) {
                        errors.push({ label: `Row ${e.row} (${e.data.name})`, reason: rowError.message });
                    } else {
                        ok++;
                    }
                }
            } else {
                ok += chunk.length;
            }
            onProgress?.({ current: invalid.length + Math.min(i + CHUNK, entries.length), total });
        }
        await fetchData(true, appliedSearch);
        await logSpreadsheetImport(`Created ${ok} of ${total} shows in Supabase from spreadsheet.`, meta?.comment);
        return { total, successCount: ok, errors, verb: 'imported' };
    };

    const handleShowsBulkUpdate = async (
        rows: SpreadsheetRow[],
        meta?: { comment?: string },
        onProgress?: (p: SpreadsheetImportProgress) => void,
    ) => {
        const { parseShowUpdateRows } = await import('@/lib/importSpreadsheet');
        const { logSpreadsheetImport } = await import('@/lib/logImportActivity');
        const { entries, invalid } = parseShowUpdateRows(rows);
        if (entries.length === 0 && invalid.length === 0) {
            toast.error('No data rows found. Use a header row and at least one data row.');
            return;
        }

        const errors = invalid.map((iv) => ({ label: iv.label, reason: iv.reason }));
        const total = entries.length + invalid.length;
        onProgress?.({ current: invalid.length, total });
        let ok = 0;

        const CHUNK = 25;
        for (let i = 0; i < entries.length; i += CHUNK) {
            const chunk = entries.slice(i, i + CHUNK);
            await Promise.all(
                chunk.map(async (e) => {
                    const { data, error } = await supabase
                        .from('shows')
                        .update(e.fields)
                        .eq('id', e.id)
                        .select('id');
                    if (error) {
                        errors.push({ label: `Row ${e.row} (id ${e.id})`, reason: error.message });
                    } else if ((data?.length ?? 0) === 0) {
                        errors.push({ label: `Row ${e.row} (id ${e.id})`, reason: 'No show found with this id' });
                    } else {
                        ok++;
                    }
                }),
            );
            onProgress?.({ current: invalid.length + Math.min(i + CHUNK, entries.length), total });
        }
        await fetchData(true, appliedSearch);
        await logSpreadsheetImport(`Updated ${ok} of ${total} shows in Supabase from spreadsheet.`, meta?.comment);
        return { total, successCount: ok, errors, verb: 'updated' };
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
        <div className="flex h-full min-h-0 flex-col">
            <div className="shrink-0 flex flex-col gap-3 border-b border-zinc-200 bg-white px-4 py-4 shadow-sm shadow-zinc-950/5 lg:flex-row lg:items-center lg:justify-between lg:px-6">
                <div className="space-y-1">
                    <h1 className="text-2xl font-bold tracking-tight text-zinc-950 sm:text-3xl">Shows</h1>
                    <p className="text-sm text-zinc-500">Browse and manage your full show library.</p>
                </div>

                {/* Compact search + actions — top-right, opposite the title */}
                <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                    <div className="relative w-full min-w-0 sm:w-56">
                        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
                        <input
                            type="text"
                            placeholder="Search shows..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleSearch();
                                }
                            }}
                            className="h-9 w-full rounded-xl border border-zinc-200 bg-white py-2 pl-8 pr-8 text-sm font-medium text-zinc-950 outline-none transition-colors placeholder:text-zinc-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                        />
                        <button
                            type="button"
                            onClick={handleSearch}
                            aria-label="Search"
                            className="absolute right-1.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-orange-50 hover:text-orange-600"
                        >
                            {loading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                        </button>
                    </div>

                    <div className="flex h-9 shrink-0 items-center rounded-xl border border-zinc-200 bg-white p-0.5">
                        <button
                            type="button"
                            onClick={() => setViewMode('grid')}
                            aria-label="Grid view"
                            title="Grid view"
                            className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                                viewMode === 'grid' ? 'bg-orange-500 text-white shadow-sm' : 'text-zinc-500 hover:bg-zinc-100'
                            }`}
                        >
                            <LayoutGrid className="h-4 w-4" />
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode('calendar')}
                            aria-label="Calendar view"
                            title="Calendar view"
                            className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                                viewMode === 'calendar' ? 'bg-orange-500 text-white shadow-sm' : 'text-zinc-500 hover:bg-zinc-100'
                            }`}
                        >
                            <CalendarRange className="h-4 w-4" />
                        </button>
                    </div>

                    <Button
                        variant="secondary"
                        onClick={() => setIsFilterOpen(!isFilterOpen)}
                        className={`h-9 rounded-xl border px-3 ${totalActiveFilters > 0 ? 'border-orange-300 bg-orange-50 text-orange-700' : 'border-zinc-200 bg-white text-zinc-700'}`}
                        leftIcon={<Filter className="h-4 w-4" />}
                    >
                        <span className="hidden sm:inline">Filters</span>
                        {totalActiveFilters > 0 && <span className="ml-1">({totalActiveFilters})</span>}
                    </Button>
                    <Button
                        variant="secondary"
                        onClick={() => {
                            fetchData(true, appliedSearch);
                        }}
                        isLoading={loading}
                        className="h-9 w-9 shrink-0 rounded-xl border border-zinc-200 bg-white p-0 text-zinc-600 hover:border-orange-200 hover:bg-orange-50"
                    >
                        {!loading && <RefreshCw className="h-4 w-4" />}
                    </Button>
                    <Button
                        onClick={() => setAddMenuOpen(true)}
                        leftIcon={<Plus className="h-4 w-4" />}
                        className="h-9 rounded-xl bg-linear-to-r from-orange-600 to-orange-500 px-4 font-semibold text-white shadow-md shadow-orange-500/25 hover:from-orange-500 hover:to-orange-400"
                    >
                        Add shows
                    </Button>
                </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto custom-scrollbar">
            <div className="mx-auto w-full max-w-9xl px-4 py-6 lg:px-6">
            <div className="flex flex-col gap-6">

            <Modal
                isOpen={addMenuOpen}
                onClose={() => setAddMenuOpen(false)}
                maxWidth="max-w-lg"
                hideHeader
            >
                <div className="relative">
                    <button
                        type="button"
                        onClick={() => setAddMenuOpen(false)}
                        aria-label="Close"
                        className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
                    >
                        <X className="h-4 w-4" />
                    </button>

                    <div className="px-6 pb-5 pt-7">
                        <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-linear-to-br from-orange-500 to-orange-400 text-white shadow-lg shadow-orange-500/25">
                            <Plus className="h-5 w-5" />
                        </div>
                        <h2 className="text-lg font-bold tracking-tight text-zinc-950">Add shows</h2>
                        <p className="mt-1 text-sm text-zinc-500">Choose how you&apos;d like to add shows to your library.</p>
                    </div>

                    <div className="space-y-2 px-4 pb-5">
                        {[
                            {
                                key: 'manual',
                                icon: <PencilLine className="h-5 w-5" />,
                                accent: 'bg-blue-50 text-blue-600',
                                title: 'Manual entry',
                                description: 'Add a single show with a form.',
                                onClick: () => {
                                    setAddMenuOpen(false);
                                    handleAdd();
                                },
                            },
                            {
                                key: 'import',
                                icon: <FileSpreadsheet className="h-5 w-5" />,
                                accent: 'bg-emerald-50 text-emerald-600',
                                title: 'Import from spreadsheet',
                                description: 'Create many shows at once from a CSV / Excel file.',
                                onClick: () => {
                                    setAddMenuOpen(false);
                                    setImportOpen(true);
                                },
                            },
                            {
                                key: 'bulk',
                                icon: <FilePenLine className="h-5 w-5" />,
                                accent: 'bg-violet-50 text-violet-600',
                                title: 'Bulk update',
                                description: 'Update existing shows by id from a CSV / Excel file.',
                                onClick: () => {
                                    setAddMenuOpen(false);
                                    setBulkUpdateOpen(true);
                                },
                            },
                        ].map((option) => (
                            <button
                                key={option.key}
                                type="button"
                                onClick={option.onClick}
                                className="group flex w-full items-center gap-4 rounded-2xl border border-zinc-200 bg-white p-3.5 text-left transition-all hover:border-orange-300 hover:bg-orange-50/40 hover:shadow-sm"
                            >
                                <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-105 ${option.accent}`}>
                                    {option.icon}
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className="block text-sm font-semibold text-zinc-900">{option.title}</span>
                                    <span className="mt-0.5 block text-xs leading-relaxed text-zinc-500">{option.description}</span>
                                </span>
                                <ChevronRight className="h-4 w-4 shrink-0 text-zinc-300 transition-all group-hover:translate-x-0.5 group-hover:text-orange-500" />
                            </button>
                        ))}
                    </div>
                </div>
            </Modal>

            {importOpen && (
                <SpreadsheetImportModal
                    isOpen
                    onClose={() => setImportOpen(false)}
                    title="Import shows (CSV / Excel)"
                    columnHint={
                        <>
                            Required: <strong>name</strong> (or Event_Name / Event / Show). Optional: starting_date, event_type,
                            industry, level, world_area, country, city, frequency, organiser, website, tags, note,
                            exhibitor_list_link.
                        </>
                    }
                    demoCsvTemplate={fpMarketingImportDemoTemplates.shows}
                    onImportRows={handleShowsSpreadsheetImport}
                />
            )}

            {bulkUpdateOpen && (
                <SpreadsheetImportModal
                    isOpen
                    onClose={() => setBulkUpdateOpen(false)}
                    title="Bulk update shows (CSV / Excel)"
                    columnHint={
                        <>
                            Required: <strong>id</strong> (an existing show id). Editable: name, starting_date, event_type,
                            industry, level, world_area, country, city, frequency, organiser, website, tags, note,
                            exhibitor_list_link. <strong>Blank cells are kept</strong> — only filled cells overwrite existing
                            values. Rows whose id isn&apos;t found are skipped.
                        </>
                    }
                    demoCsvTemplate={fpMarketingImportDemoTemplates.showsUpdate}
                    onImportRows={handleShowsBulkUpdate}
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

            {/* Active filters summary */}
            {viewMode === 'grid' && totalActiveFilters > 0 && (
                <div className="rounded-2xl border border-zinc-200 bg-white/95 p-3 shadow-sm shadow-zinc-950/5">
                    <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Active filters:</span>
                        {showExhibitorsOnly && (
                            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                                Exhibitor list available
                            </span>
                        )}
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
                </div>
            )}

            {/* Calendar view */}
            {viewMode === 'calendar' && (
                <ShowsCalendar onShowClick={(id) => router.push(`/shows/${id}`)} search={appliedSearch} />
            )}

            {/* Card grid */}
            {viewMode === 'grid' && (
            <section className="overflow-hidden rounded-2xl bg-white">
                <div className="flex flex-col gap-3 border-b border-zinc-100 bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                    <div>
                        <h2 className="text-base font-semibold text-zinc-900">All exhibitions</h2>
                        <p className="mt-0.5 text-xs text-zinc-500">
                            {exhibitionsCountLabel}
                        </p>
                    </div>
                    <label className="flex shrink-0 items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Sort</span>
                        <div className="relative">
                            <ArrowUpDown className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value as ShowSortKey)}
                                className="h-9 cursor-pointer appearance-none rounded-xl border border-zinc-200 bg-white py-2 pl-8 pr-8 text-xs font-semibold text-zinc-700 outline-none transition-colors hover:border-orange-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                            >
                                {SHOW_SORT_OPTIONS.map((option) => (
                                    <option key={option.key} value={option.key}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
                        </div>
                    </label>
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
                                const hasExhibitorList = exhibitorShowIds.has(String(item.ID).trim());

                                return (
                                    <button
                                        key={item.ID}
                                        type="button"
                                        onClick={() => handleRowClick(item)}
                                        className={`group flex flex-col overflow-hidden rounded-2xl border bg-white text-left shadow-lg shadow-zinc-950/10 outline-none transition-all duration-300 cursor-pointer hover:-translate-y-0.5 hover:shadow-2xl focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 ${hasExhibitorList ? 'border-emerald-200 hover:border-emerald-300 hover:shadow-emerald-950/15' : 'border-zinc-200 hover:border-orange-200 hover:shadow-orange-950/20'}`}
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
                                                {hasExhibitorList ? (
                                                    <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                                                        <Building2 className="h-2.5 w-2.5" />
                                                        Exhibitor list available
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
            )}

            <ShowsFilterDrawer
                isOpen={isFilterOpen}
                onClose={() => setIsFilterOpen(false)}
                categories={filterCategories}
                selections={filterSelections}
                dateFilter={dateFilter}
                exhibitorsOnly={showExhibitorsOnly}
                onApply={handleApplyFilters}
                onClear={handleClearFilters}
            />
            </div>
            </div>
            </div>
        </div>
    );
};
