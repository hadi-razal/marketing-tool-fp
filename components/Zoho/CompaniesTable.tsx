import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
    RefreshCw,
    Plus,
    Search,
    Filter,
    MapPin,
    ArrowRight,
    Building2,
    Globe2,
    Users,
    Activity
} from 'lucide-react';
import { FilterPopover, type FilterSelections, type FilterCategory } from './FilterPopover';
import { Button } from '../ui/Button';
import { Skeleton } from '../ui/Skeleton';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase';
import { getBrandColor } from '@/lib/utils';

const initialsFromName = (name: string) => {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const formatMoney = (amount?: number) => {
    if (!amount) return '';
    if (amount >= 1e9) return `$${(amount / 1e9).toFixed(1)}B`;
    if (amount >= 1e6) return `$${(amount / 1e6).toFixed(1)}M`;
    if (amount >= 1e3) return `$${(amount / 1e3).toFixed(1)}K`;
    return `$${amount}`;
};

export const CompaniesTable = () => {
    const router = useRouter();
    const supabase = useMemo(() => createClient(), []);
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [fetchError, setFetchError] = useState('');
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');

    const [hasMore, setHasMore] = useState(true);
    const [page, setPage] = useState(0);
    const LIMIT = 100;

    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [allFetchedData, setAllFetchedData] = useState<any[]>([]);

    const [quickRegion, setQuickRegion] = useState<string>('All');

    const [filterSelections, setFilterSelections] = useState<FilterSelections>({
        country: [],
        city: [],
        industry: [],
    });

    const totalActiveFilters = Object.values(filterSelections).reduce((s, a) => s + a.length, 0);

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
            { key: 'country', label: 'Country', icon: <MapPin className="h-3.5 w-3.5" />, options: unique('country') },
            { key: 'city', label: 'City', icon: <MapPin className="h-3.5 w-3.5" />, options: unique('city') },
            { key: 'industry', label: 'Industry', icon: <Building2 className="h-3.5 w-3.5" />, options: unique('industry') },
        ].filter(c => c.options.length > 0);
    }, [allFetchedData]);

    const fetchData = useCallback(async (reset = false, searchTerm = '') => {
        setLoading(true);
        setFetchError('');
        try {
            const from = reset ? 0 : page * LIMIT;
            let query = supabase
                .from('companies')
                .select('*')
                .order('created_at', { ascending: false })
                .range(from, from + LIMIT - 1);

            const { data: rows, error: fetchErr } = await query;

            if (fetchErr) throw fetchErr;

            let normalized = rows || [];

            if (reset) {
                setAllFetchedData(normalized);
            } else {
                setAllFetchedData(prev => {
                    const uniqueItems = new Map(prev.map(item => [item.id, item]));
                    normalized.forEach(item => uniqueItems.set(item.id, item));
                    return Array.from(uniqueItems.values());
                });
            }

            const trimmedSearch = searchTerm.trim().toLowerCase();
            if (trimmedSearch) {
                normalized = normalized.filter((item) =>
                    String(item.name || '').toLowerCase().includes(trimmedSearch) ||
                    String(item.primary_domain || '').toLowerCase().includes(trimmedSearch)
                );
            }

            if (quickRegion !== 'All') {
                normalized = normalized.filter(item => {
                    const country = String(item.country || '').toLowerCase();
                    if (quickRegion === 'UAE') return country.includes('united arab emirates') || country === 'uae';
                    if (quickRegion === 'KSA') return country.includes('saudi arabia') || country === 'ksa';
                    if (quickRegion === 'Europe') return country.includes('uk') || country.includes('germany') || country.includes('france') || country.includes('italy') || country.includes('spain') || country.includes('netherlands');
                    return true;
                });
            }

            Object.entries(filterSelections).forEach(([key, selectedValues]) => {
                if (selectedValues && selectedValues.length > 0) {
                    normalized = normalized.filter(item => {
                        const val = String(item[key] || '');
                        return selectedValues.includes(val);
                    });
                }
            });

            if (reset) {
                setData(normalized);
                setPage(1);
            } else {
                setData(prev => {
                    const newItems = normalized;
                    const uniqueItems = new Map(prev.map(item => [item.id, item]));
                    newItems.forEach((item: any) => uniqueItems.set(item.id, item));
                    return Array.from(uniqueItems.values());
                });
                setPage(p => p + 1);
            }

            setHasMore(rows.length === LIMIT);
        } catch (err: any) {
            console.error('Fetch companies error:', err);
            setFetchError(err.message || 'Failed to fetch companies');
        } finally {
            setLoading(false);
        }
    }, [page, filterSelections, quickRegion, supabase]);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(search);
        }, 300);
        return () => clearTimeout(handler);
    }, [search]);

    useEffect(() => {
        setPage(0);
        fetchData(true, debouncedSearch);
    }, [debouncedSearch, filterSelections, quickRegion, fetchData]);

    const handleApplyFilters = (selections: FilterSelections) => {
        setFilterSelections(selections);
    };

    const handleClearFilters = () => {
        setFilterSelections({
            country: [],
            city: [],
            industry: [],
        });
    };

    const loadMore = () => {
        if (!loading && hasMore) {
            fetchData(false, debouncedSearch);
        }
    };

    const handleAdd = () => {
        toast.info('Add company functionality coming soon');
    };

    const handleRowClick = (item: any) => {
        router.push(`/companies/${item.id}`);
    };

    const uniqueCountries = new Set(data.map(item => item.country).filter(Boolean)).size;

    return (
        <div className="h-full flex flex-col gap-6">
            {/* Toolbar */}
            <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm shadow-zinc-950/5">
                {/* Search */}
                <div className="relative">
                    <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                    <input
                        type="text"
                        placeholder="Search by company name or domain..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full rounded-xl border border-zinc-200 bg-zinc-50/80 py-3 pl-10 pr-4 text-sm font-medium text-zinc-950 outline-none transition-colors placeholder:text-zinc-400 focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-100"
                    />
                </div>
                {/* Region chips — horizontal scroll on mobile */}
                <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
                    <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-zinc-400">Region:</span>
                    {['All', 'UAE', 'KSA', 'Europe'].map((region) => {
                        const isSelected = quickRegion === region;
                        const label = region === 'All' ? 'All Companies' : region;
                        return (
                            <button
                                key={region}
                                onClick={() => setQuickRegion(region)}
                                className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${isSelected ? 'bg-zinc-950 text-white border-zinc-950' : 'bg-white text-zinc-600 border-zinc-200 hover:border-orange-300 hover:text-zinc-950 hover:bg-orange-50'}`}
                            >
                                {label}
                            </button>
                        );
                    })}
                </div>
                {/* Actions — single row, Add Company pushed right */}
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Button
                            variant="secondary"
                            onClick={() => setIsFilterOpen(!isFilterOpen)}
                            className={`h-10 rounded-xl border px-3 ${totalActiveFilters > 0 ? 'border-orange-300 bg-orange-50 text-orange-700' : 'border-zinc-200 bg-white text-zinc-700'}`}
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
                        className="h-10 w-10 shrink-0 rounded-xl border border-zinc-200 bg-white p-0 text-zinc-600 hover:border-orange-200 hover:bg-orange-50"
                    >
                        {!loading && <RefreshCw className="h-4 w-4" />}
                    </Button>
                    <Button
                        onClick={handleAdd}
                        leftIcon={<Plus className="h-4 w-4" />}
                        className="ml-auto h-10 rounded-xl bg-linear-to-r from-orange-600 to-orange-500 px-4 font-semibold text-white shadow-md shadow-orange-500/25 hover:from-orange-500 hover:to-orange-400"
                    >
                        Add Company
                    </Button>
                </div>
            </div>

            {/* Card grid */}
            <div className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-zinc-200 bg-white/90 shadow-xl shadow-zinc-950/5">
                <div className="h-full overflow-y-auto custom-scrollbar p-4 md:p-6">
                    {loading && data.length === 0 ? (
                        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                            {Array.from({ length: 6 }).map((_, i) => (
                                <div key={i} className="overflow-hidden rounded-2xl border border-zinc-100 bg-zinc-50/80">
                                    <Skeleton className="h-28 w-full rounded-none" />
                                    <div className="space-y-3 p-5">
                                        <Skeleton className="h-6 w-4/5" />
                                        <Skeleton className="h-4 w-1/2" />
                                        <Skeleton className="h-4 w-2/3" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : data.length === 0 ? (
                        <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
                            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-orange-50 ring-1 ring-orange-100">
                                <Building2 className="h-9 w-9 text-orange-500" />
                            </div>
                            <div>
                                <p className="text-lg font-semibold text-zinc-900">No companies yet</p>
                                <p className="mt-1 max-w-md text-sm text-zinc-500">
                                    {fetchError ? fetchError : 'Add a company or adjust your filters.'}
                                </p>
                            </div>
                            <Button onClick={handleAdd} leftIcon={<Plus className="h-4 w-4" />} className="mt-2 rounded-xl">
                                Add your first company
                            </Button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                            {data.map((item) => {
                                const name = item.name || 'Unknown Company';
                                const industry = item.industry || '';
                                const city = item.city || '';
                                const country = item.country || '';
                                const location = [city, country].filter(Boolean).join(', ');
                                const initials = initialsFromName(name);
                                const employees = item.estimated_num_employees;
                                const revenue = item.organization_revenue_printed || formatMoney(item.organization_revenue);
                                const logoUrl = item.logo_url || item.logo;

                                return (
                                    <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => handleRowClick(item)}
                                        className="group flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white text-left shadow-sm shadow-zinc-950/5 outline-none transition-all duration-300 cursor-pointer hover:border-orange-200 hover:shadow-2xl hover:shadow-orange-950/15 focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2"
                                    >
                                        {/* Visual header */}
                                        <div className="relative h-36 overflow-hidden bg-gradient-to-br from-zinc-900 via-zinc-800 to-orange-950">
                                            {/* Layered glows */}
                                            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_70%_at_90%_10%,rgba(251,146,60,0.5),transparent)]" />
                                            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_50%_50%_at_10%_100%,rgba(251,146,60,0.2),transparent)]" />
                                            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                                            {/* Subtle grid pattern */}
                                            <div className="pointer-events-none absolute inset-0 opacity-[0.04]"
                                                style={{ backgroundImage: 'repeating-linear-gradient(0deg,#fff 0,#fff 1px,transparent 1px,transparent 32px),repeating-linear-gradient(90deg,#fff 0,#fff 1px,transparent 1px,transparent 32px)' }}
                                            />
                                            {/* Domain top label */}
                                            {item.primary_domain && (
                                                <div className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-semibold tracking-wide text-white/70 backdrop-blur-sm ring-1 ring-white/10">
                                                    <Globe2 className="h-2.5 w-2.5" />
                                                    {item.primary_domain}
                                                </div>
                                            )}
                                            <div className="relative flex h-full items-end justify-between px-4 pb-4">
                                                {/* Initials/Logo avatar */}
                                                <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-white text-base font-bold tracking-tight text-zinc-900 shadow-2xl ring-2 ring-white/25">
                                                    {logoUrl ? (
                                                        <img
                                                            src={logoUrl}
                                                            alt={`${name} logo`}
                                                            className="h-full w-full object-contain p-1"
                                                            loading="lazy"
                                                        />
                                                    ) : (
                                                        <div 
                                                            className="w-full h-full flex items-center justify-center text-xl text-white"
                                                            style={{ backgroundColor: getBrandColor(name) }}
                                                        >
                                                            {initials}
                                                        </div>
                                                    )}
                                                </div>
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
                                            </div>

                                            <div className="mt-4 space-y-2 border-t border-zinc-100 pt-4">
                                                <div className="flex items-center gap-2 text-sm text-zinc-500">
                                                    <MapPin className="h-3.5 w-3.5 shrink-0 text-orange-500" />
                                                    <span className="line-clamp-1 font-medium text-zinc-700">{location || 'Location TBC'}</span>
                                                </div>
                                                {(employees > 0 || revenue) && (
                                                    <div className="flex items-center gap-3 text-sm text-zinc-500">
                                                        {employees > 0 && (
                                                            <div className="flex items-center gap-1.5">
                                                                <Users className="h-3.5 w-3.5 shrink-0 text-orange-500" />
                                                                <span className="font-medium text-zinc-700">{employees.toLocaleString()} emp</span>
                                                            </div>
                                                        )}
                                                        {revenue && (
                                                            <div className="flex items-center gap-1.5">
                                                                <Activity className="h-3.5 w-3.5 shrink-0 text-orange-500" />
                                                                <span className="font-medium text-zinc-700">{revenue}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
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
