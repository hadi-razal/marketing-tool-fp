import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
    RefreshCw,
    Plus,
    Search,
    Filter,
    MapPin,
    Building2,
    Globe2,
} from 'lucide-react';
import { FilterPopover, type FilterSelections, type FilterCategory } from './FilterPopover';
import { Button } from '../ui/Button';
import { Skeleton } from '../ui/Skeleton';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase';
import { getBrandColor } from '@/lib/utils';
import { CreateCompanyModal } from '@/components/CreateCompanyModal';

const initialsFromName = (name: string) => {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export const CompaniesTable = () => {
    const router = useRouter();
    const supabase = useMemo(() => createClient(), []);
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [fetchError, setFetchError] = useState('');
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

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
        setIsCreateModalOpen(true);
    };

    const handleCreateCompany = async (formData: any) => {
        try {
            const location = String(formData?.location || '').trim();
            const locationParts = location.split(',').map((v: string) => v.trim()).filter(Boolean);
            const city = locationParts[0] || '';
            const country = locationParts.length > 1 ? locationParts[locationParts.length - 1] : '';
            const state = locationParts.length > 2 ? locationParts.slice(1, -1).join(', ') : '';
            const websiteInput = String(formData?.website || '').trim();
            const websiteUrl = websiteInput
                ? (/^https?:\/\//i.test(websiteInput) ? websiteInput : `https://${websiteInput}`)
                : '';
            const websiteHost = websiteUrl
                ? websiteUrl
                    .replace(/^https?:\/\//i, '')
                    .replace(/^www\./i, '')
                    .replace(/\/.*$/, '')
                    .trim()
                : '';
            const keywords = String(formData?.keywords || '')
                .split(',')
                .map((v: string) => v.trim())
                .filter(Boolean);
            const foundedYear = Number.parseInt(String(formData?.founded_year || '').trim(), 10);

            const row = {
                id: crypto.randomUUID(),
                name: String(formData?.name || '').trim(),
                industry: String(formData?.industry || '').trim(),
                website_url: websiteUrl || null,
                blog_url: null,
                linkedin_url: String(formData?.linkedin || '').trim() || null,
                twitter_url: String(formData?.twitter || '').trim() || null,
                facebook_url: String(formData?.facebook || '').trim() || null,
                logo_url: String(formData?.logo || '').trim() || null,
                primary_domain: websiteHost || null,
                keywords: keywords.length > 0 ? keywords : null,
                phone: String(formData?.phone || '').trim() || null,
                street_address: null,
                city,
                state: state || null,
                country,
                postal_code: null,
                founded_year: Number.isNaN(foundedYear) ? null : foundedYear,
                estimated_num_employees: null,
                saved_uid: null,
                desc: String(formData?.description || '').trim() || null,
            };

            if (!row.name) {
                toast.error('Company name is required.');
                return;
            }

            const { error } = await supabase.from('companies').insert(row);
            if (error) throw error;

            toast.success('Company created');
            setIsCreateModalOpen(false);
            setPage(0);
            await fetchData(true, debouncedSearch);
        } catch (err: any) {
            console.error('Create company error:', err);
            toast.error(err?.message || 'Failed to create company');
        }
    };

    const handleRowClick = (item: any) => {
        router.push(`/companies/${item.id}`);
    };

    const uniqueCountries = new Set(data.map(item => item.country).filter(Boolean)).size;

    return (
        <div className="h-full flex flex-col gap-6">
            <CreateCompanyModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSubmit={handleCreateCompany}
            />

            {/* Toolbar */}
            <div className="flex flex-col gap-2 rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm shadow-zinc-950/5">
                <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
                    {/* Search */}
                    <div className="relative lg:min-w-0 lg:flex-1">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                        <input
                            type="text"
                            placeholder="Search by company name or domain..."
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
                            onClick={handleAdd}
                            leftIcon={<Plus className="h-4 w-4" />}
                            className="h-9 rounded-xl bg-linear-to-r from-orange-600 to-orange-500 px-4 font-semibold text-white shadow-md shadow-orange-500/25 hover:from-orange-500 hover:to-orange-400"
                        >
                            Add Company
                        </Button>
                    </div>
                </div>

                {/* Region chips */}
                <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
                    <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-zinc-400">Region:</span>
                    {['All', 'UAE', 'KSA', 'Europe'].map((region) => {
                        const isSelected = quickRegion === region;
                        const label = region === 'All' ? 'All Companies' : region;
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
                                    <div className="space-y-4 p-5">
                                        <div className="flex items-start justify-between">
                                            <Skeleton className="h-12 w-12 rounded-xl" />
                                            <Skeleton className="h-5 w-28 rounded-md" />
                                        </div>
                                        <Skeleton className="h-6 w-5/6 rounded-md" />
                                        <div className="flex gap-2">
                                            <Skeleton className="h-5 w-24 rounded-md" />
                                        </div>
                                        <div className="space-y-2 border-t border-zinc-100 pt-3">
                                            <Skeleton className="h-4 w-3/4 rounded" />
                                            <Skeleton className="h-4 w-2/3 rounded" />
                                        </div>
                                        <div className="border-t border-zinc-100 pt-3">
                                            <Skeleton className="ml-auto h-4 w-20 rounded" />
                                        </div>
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
                                const logoUrl = item.logo_url || item.logo;
                                const domain = item.primary_domain || item.website_url || '';

                                return (
                                    <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => handleRowClick(item)}
                                        className="group flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white text-left shadow-sm shadow-zinc-950/5 outline-none transition-all duration-300 cursor-pointer hover:border-orange-200 hover:shadow-2xl hover:shadow-orange-950/15 focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2"
                                    >
                                        <div className="flex flex-1 flex-col gap-3 p-4">
                                            <div className="flex items-start gap-3">
                                                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-zinc-100 text-base font-bold tracking-tight text-zinc-900 ring-1 ring-zinc-200">
                                                    {logoUrl ? (
                                                        <img
                                                            src={logoUrl}
                                                            alt={`${name} logo`}
                                                            className="h-full w-full object-contain p-1"
                                                            loading="lazy"
                                                        />
                                                    ) : (
                                                        <div
                                                            className="flex h-full w-full items-center justify-center text-sm font-bold text-white"
                                                            style={{ backgroundColor: getBrandColor(name) }}
                                                        >
                                                            {initials}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <h3 className="line-clamp-2 text-[15px] font-bold leading-snug text-zinc-950 transition-colors group-hover:text-orange-700">
                                                        {name}
                                                    </h3>
                                                    {industry ? (
                                                        <p className="mt-0.5 truncate text-xs font-medium uppercase tracking-wide text-zinc-500">
                                                            {industry}
                                                        </p>
                                                    ) : null}
                                                </div>
                                            </div>

                                            <div className="mt-auto space-y-2 border-t border-zinc-100 pt-3">
                                                {domain ? (
                                                    <div className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 text-[11px] font-medium text-zinc-700">
                                                        <Globe2 className="h-3 w-3 shrink-0 text-zinc-500" />
                                                        <span className="truncate">{domain}</span>
                                                    </div>
                                                ) : null}
                                                {location ? (
                                                    <p className="truncate text-xs text-zinc-500">{location}</p>
                                                ) : null}
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
