import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
    ArrowRight,
    CalendarDays,
    Globe2,
    Building2,
} from 'lucide-react';
import { FilterPopover, type FilterSelections, type FilterCategory } from './FilterPopover';
import { ShowFormModal } from './ShowFormModal';
import { Button } from '../ui/Button';
import { Skeleton } from '../ui/Skeleton';
import { toast } from 'sonner';
import { SpreadsheetImportModal, type SpreadsheetImportProgress } from '@/components/SpreadsheetImportModal';
import type { SpreadsheetRow } from '@/lib/importSpreadsheet';
import { fpMarketingImportDemoTemplates } from '@/lib/demoSpreadsheetTemplates';
import { createClient } from '@/lib/supabase';

export const ShowsTable = () => {
    const router = useRouter();
    const supabase = useMemo(() => createClient(), []);
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [fetchError, setFetchError] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<any>(null);
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');

    const [hasMore, setHasMore] = useState(true);
    const [page, setPage] = useState(0);
    const LIMIT = 100;

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

    const totalActiveFilters = Object.values(filterSelections).reduce((s, a) => s + a.length, 0);

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
            { key: 'event_type', label: 'Event Type', icon: <Calendar className="h-3.5 w-3.5" />, options: unique('Event_Type') },
            { key: 'industry', label: 'Industry', icon: <Building2 className="h-3.5 w-3.5" />, options: unique('Industry') },
            { key: 'level', label: 'Level', icon: <Layers className="h-3.5 w-3.5" />, options: unique('Level') },
            { key: 'world_area', label: 'World Area', icon: <Globe2 className="h-3.5 w-3.5" />, options: unique('World_Area') },
            { key: 'frequency', label: 'Frequency', icon: <RefreshCw className="h-3.5 w-3.5" />, options: unique('Frequency') },
        ].filter(c => c.options.length > 0);
    }, [allFetchedData]);

    const fetchData = useCallback(async (reset = false, searchTerm = '') => {
        setLoading(true);
        setFetchError('');
        try {
            const from = reset ? 0 : page * LIMIT;
            const { data: rows, error: fetchErr } = await supabase
                .from('shows')
                .select('*')
                .order('id', { ascending: false })
                .range(from, from + LIMIT - 1);

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

            const trimmedSearch = searchTerm.trim().toLowerCase();
            if (trimmedSearch) {
                normalized = normalized.filter((item) =>
                    String(item.Event_Name || '').toLowerCase().includes(trimmedSearch),
                );
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
    }, [page, filterSelections, quickRegion, supabase]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
        }, 500);
        return () => clearTimeout(timer);
    }, [search]);

    useEffect(() => {
        setPage(0);
        fetchData(true, debouncedSearch);
    }, [debouncedSearch, filterSelections, quickRegion]);

    const handleApplyFilters = (selections: FilterSelections) => {
        setFilterSelections(selections);
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
    };

    const loadMore = () => {
        if (!loading && hasMore) {
            fetchData(false, debouncedSearch);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure?')) return;
        try {
            const primaryDelete = await supabase.from('shows').delete().eq('id', id);
            if (primaryDelete.error) {
                const fallbackDelete = await supabase.from('shows').delete().eq('ID', id);
                if (fallbackDelete.error) throw fallbackDelete.error;
            }
            setData((prev) => prev.filter((item) => item.ID !== id));
            toast.success('Show deleted');
        } catch (err: any) {
            toast.error(err?.message || 'Failed to delete show');
        }
    };

    const handleEdit = (item: any) => {
        setSelectedItem(item);
        setIsModalOpen(true);
    };

    const handleUpdateSuccess = async () => {
        await fetchData(true, debouncedSearch);
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
        await fetchData(true, debouncedSearch);
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
        <div className="h-full flex flex-col gap-6">
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

            {/* Toolbar */}
            <div className="flex flex-col gap-2 rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm shadow-zinc-950/5">
                <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
                    {/* Search */}
                    <div className="relative lg:min-w-0 lg:flex-1">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                        <input
                            type="text"
                            placeholder="Search by show name..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="h-10 w-full rounded-xl border border-zinc-200 bg-zinc-50/80 py-2 pl-9 pr-3 text-sm font-medium text-zinc-950 outline-none transition-colors placeholder:text-zinc-400 focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-100"
                        />
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
                            <FilterPopover
                                isOpen={isFilterOpen}
                                onClose={() => setIsFilterOpen(false)}
                                categories={filterCategories}
                                selections={filterSelections}
                                onApply={handleApplyFilters}
                                onClear={handleClearFilters}
                            />
                        </div>
                        <Button
                            variant="secondary"
                            onClick={() => fetchData(true, debouncedSearch)}
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
            </div>

            {/* Card grid */}
            <div className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-zinc-200 bg-white/90 shadow-xl shadow-zinc-950/5">
                <div className="h-full overflow-y-auto custom-scrollbar p-4 md:p-6">
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
                                <p className="text-lg font-semibold text-zinc-900">No shows yet</p>
                                <p className="mt-1 max-w-md text-sm text-zinc-500">
                                    {fetchError ? fetchError : 'Add a show or import a spreadsheet to populate this list.'}
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
                                const initials = initialsFromName(name);
                                const isIbc = name.toLowerCase().includes('ibc');
                                const ibcImage = 'https://cdn.prod.website-files.com/686e72da8be0fd92280388b7/6970abf7af4eaf76f110b30a_689ca814a9cbd6ff03649c1a_Newsroom_events_template_IBC.webp';
                                const ibcCoverImage = 'https://cdn.prod.website-files.com/6641aa6384a3010ab6b735d7/679b179403837ff93b623af0_IBC2024-0915-Alex-105928-1-.webp';

                                return (
                                    <button
                                        key={item.ID}
                                        type="button"
                                        onClick={() => handleRowClick(item)}
                                        className="group flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white text-left shadow-sm shadow-zinc-950/5 outline-none transition-all duration-300 cursor-pointer hover:border-orange-200 hover:shadow-2xl hover:shadow-orange-950/15 focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2"
                                    >
                                        {/* Visual header */}
                                        <div className="relative h-36 overflow-hidden bg-gradient-to-br from-zinc-900 via-zinc-800 to-orange-950">
                                            {isIbc && (
                                                <>
                                                    <img
                                                        src={ibcCoverImage}
                                                        alt={`${name} cover`}
                                                        className="absolute inset-0 h-full w-full object-cover opacity-60"
                                                        loading="lazy"
                                                    />
                                                    <div className="pointer-events-none absolute inset-0 bg-black/40" />
                                                </>
                                            )}
                                            {/* Layered glows */}
                                            {!isIbc && <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_70%_at_90%_10%,rgba(251,146,60,0.5),transparent)]" />}
                                            {!isIbc && <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_50%_50%_at_10%_100%,rgba(251,146,60,0.2),transparent)]" />}
                                            {!isIbc && <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />}
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
                                                {/* Initials avatar */}
                                                <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-white text-base font-bold tracking-tight text-zinc-900 shadow-2xl ring-2 ring-white/25">
                                                    {isIbc ? (
                                                        <img
                                                            src={ibcImage}
                                                            alt={`${name} cover`}
                                                            className="h-full w-full object-cover"
                                                            loading="lazy"
                                                        />
                                                    ) : (
                                                        initials
                                                    )}
                                                </div>
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

                                            <div className="mt-auto flex items-center justify-end border-t border-zinc-100 pt-4">
                                                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-600 transition-all duration-200 group-hover:gap-2 group-hover:text-orange-500">
                                                    View details
                                                    <ArrowRight className="h-3.5 w-3.5" />
                                                </span>
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {loading && data.length > 0 && (
                    <div className="border-t border-zinc-100 px-4 py-3 md:px-6">
                        <Skeleton className="h-10 w-full rounded-xl" />
                    </div>
                )}

                {hasMore && !loading && data.length > 0 && (
                    <div className="border-t border-zinc-100 p-4 md:p-6">
                        <Button variant="secondary" onClick={loadMore} className="w-full rounded-xl border-zinc-200 md:w-auto md:min-w-[200px]">
                            Load more
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
};
