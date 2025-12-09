import React, { useState, useEffect, useCallback } from 'react';
import { zohoApi } from '@/lib/zoho';
import { RefreshCw, Trash2, Edit2, Plus, Search, ChevronDown, Filter } from 'lucide-react';
import { ExhibitorFormModal } from './ExhibitorFormModal';
import { ExhibitorDetailsModal } from './ExhibitorDetailsModal';
import { FilterPopover } from './FilterPopover';
import { Button } from '../ui/Button';
import { SoftInput } from '../ui/Input';
import { Skeleton } from '../ui/Skeleton';

export const ExhibitorTable = () => {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<any>(null);
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');

    // Pagination
    const [hasMore, setHasMore] = useState(true);
    const [page, setPage] = useState(0);
    const LIMIT = 200;
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);


    // Debounce search manually since hook might not exist
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
        }, 500);
        return () => clearTimeout(timer);
    }, [search]);



    // Initial load and search change
    useEffect(() => {
        fetchData(true, debouncedSearch);
        // Reset page on search change
        if (debouncedSearch) setPage(0);
    }, [debouncedSearch]);

    const loadMore = () => {
        if (!loading && hasMore) {
            fetchData(false, debouncedSearch);
        }
    };



    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure?')) return;
        try {
            await zohoApi.deleteRecord('Exhibitor_List', id);
            // Remove locally to avoid refetch
            setData(prev => prev.filter(item => item.ID !== id));
        } catch (err: any) {
            alert(err.message);
        }
    };

    const handleAddToLeads = (item: any) => {
        // Placeholder for adding to leads functionality
        console.log('Adding to leads:', item);
        alert(`Added ${item.Company} to leads (Simulation)`);
    };

    const handleEdit = (item: any) => {
        setSelectedItem(item);
        setIsModalOpen(true);
    };

    const handleAdd = () => {
        setSelectedItem(null);
        setIsModalOpen(true);
    };

    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [availableCountries, setAvailableCountries] = useState<string[]>([]);
    const [availableContinents, setAvailableContinents] = useState<string[]>([]);
    const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
    const [selectedContinents, setSelectedContinents] = useState<string[]>([]);

    // Fetch unique values for filters
    useEffect(() => {
        const fetchFilters = async () => {
            try {
                const countries = new Set<string>();
                const continents = new Set<string>();

                // Fetch up to 5 pages (1000 records) to get a good sample of countries
                // In a real production app, you'd want a dedicated "get unique values" API endpoint
                const MAX_PAGES = 5;
                const BATCH_SIZE = 200;

                for (let i = 0; i < MAX_PAGES; i++) {
                    const res = await zohoApi.getRecords('Exhibitor_List', undefined, i * BATCH_SIZE, BATCH_SIZE);
                    if (res.data && Array.isArray(res.data)) {
                        res.data.forEach((item: any) => {
                            if (item.Country) countries.add(item.Country);
                            if (item.World_Area) continents.add(item.World_Area);
                        });

                        // Stop if we got less than full batch, meaning end of data
                        if (res.data.length < BATCH_SIZE) break;
                    } else {
                        break;
                    }
                }

                setAvailableCountries(Array.from(countries).sort());
                setAvailableContinents(Array.from(continents).sort());
            } catch (err) {
                console.error('Failed to fetch filter values', err);
            }
        };
        fetchFilters();
    }, []);

    const fetchData = useCallback(async (reset = false, searchTerm = '') => {
        setLoading(true);
        setError('');
        try {
            const from = reset ? 0 : page * LIMIT;

            // Construct criteria
            let criteriaParts = [];

            // Search
            if (searchTerm) {
                criteriaParts.push(`(Company.contains("${searchTerm}"))`);
            }

            // Filters
            if (selectedCountries.length > 0) {
                const countryCriteria = selectedCountries.map(c => `Country == "${c}"`).join(' || ');
                criteriaParts.push(`(${countryCriteria})`);
            }

            if (selectedContinents.length > 0) {
                const continentCriteria = selectedContinents.map(c => `World_Area == "${c}"`).join(' || ');
                criteriaParts.push(`(${continentCriteria})`);
            }

            const criteria = criteriaParts.length > 0 ? criteriaParts.join(' && ') : undefined;

            const res = await zohoApi.getRecords('Exhibitor_List', criteria, from, LIMIT);
            console.log('Exhibitor Response:', res);

            if (res.code === 3000) {
                if (reset) {
                    setData(res.data);
                    setPage(1);
                } else {
                    setData(prev => {
                        const newItems = res.data;
                        const uniqueItems = new Map(prev.map(item => [item.ID, item]));
                        newItems.forEach((item: any) => uniqueItems.set(item.ID, item));
                        return Array.from(uniqueItems.values());
                    });
                    setPage(prev => prev + 1);
                }
                setHasMore(res.data.length === LIMIT);
            } else if (res.code === 3001 || res.message?.includes('No data')) {
                if (reset) setData([]);
                setHasMore(false);
            } else {
                setError('Failed to fetch data. Check API connection.');
            }
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'An error occurred');
        } finally {
            setLoading(false);
        }
    }, [page, selectedCountries, selectedContinents]);

    // Re-fetch when filters change
    useEffect(() => {
        fetchData(true, debouncedSearch);
    }, [selectedCountries, selectedContinents]);

    const handleApplyFilters = (countries: string[], continents: string[]) => {
        setSelectedCountries(countries);
        setSelectedContinents(continents);
        // fetchData is triggered by useEffect
    };

    const handleClearFilters = () => {
        setSelectedCountries([]);
        setSelectedContinents([]);
    };

    const [loadingDetails, setLoadingDetails] = useState(false);

    const handleRowClick = async (item: any) => {
        setSelectedItem(item);
        setIsDetailsOpen(true);
        setLoadingDetails(true);
        try {
            const res = await zohoApi.getRecordById('Exhibitor_List', item.ID);
            console.log('Detail Fetch Response:', res);
            if (res.code === 3000) {
                const fetchedData = Array.isArray(res.data) ? res.data[0] : res.data;
                setSelectedItem((prev: any) => ({ ...prev, ...fetchedData }));
            }
        } catch (err) {
            console.error('Failed to fetch details:', err);
        } finally {
            setLoadingDetails(false);
        }
    };

    return (
        <div className="h-full flex flex-col gap-6">
            <ExhibitorFormModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={() => fetchData(true, debouncedSearch)}
                initialData={selectedItem}
            />

            <ExhibitorDetailsModal
                isOpen={isDetailsOpen}
                onClose={() => setIsDetailsOpen(false)}
                data={selectedItem}
                onEdit={(item) => {
                    setIsDetailsOpen(false);
                    handleEdit(item);
                }}
                onDelete={handleDelete}
                onAddToLeads={handleAddToLeads}
            />

            {/* Controls Toolbar */}
            <div className="relative z-30 flex flex-col lg:flex-row gap-4 p-4 bg-zinc-900/50 border border-white/5 rounded-2xl backdrop-blur-xl shadow-xl">
                {/* Search */}
                <div className="relative flex-1 group">
                    <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 to-purple-500/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="relative flex items-center">
                        <Search className="absolute left-4 w-4 h-4 text-zinc-400 group-hover:text-orange-400 transition-colors" />
                        <input
                            type="text"
                            placeholder="Search exhibitors..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-black/20 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm text-white focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 transition-all placeholder:text-zinc-600 hover:border-white/20"
                        />
                    </div>
                </div>

                {/* Actions Group */}
                <div className="flex items-center gap-3">
                    {/* Filter */}
                    <div className="relative">
                        <Button
                            variant="secondary"
                            onClick={() => setIsFilterOpen(!isFilterOpen)}
                            className={`glass-button h-11 px-5 border-white/10 hover:border-white/20 ${selectedCountries.length > 0 || selectedContinents.length > 0 ? 'border-orange-500/50 text-orange-500 bg-orange-500/10 hover:bg-orange-500/20' : 'text-zinc-400 hover:text-white'}`}
                            leftIcon={<Filter className="w-4 h-4" />}
                        >
                            Filters {(selectedCountries.length + selectedContinents.length) > 0 && `(${selectedCountries.length + selectedContinents.length})`}
                        </Button>

                        <FilterPopover
                            isOpen={isFilterOpen}
                            onClose={() => setIsFilterOpen(false)}
                            availableCountries={availableCountries}
                            availableContinents={availableContinents}
                            selectedCountries={selectedCountries}
                            selectedContinents={selectedContinents}
                            onApply={handleApplyFilters}
                            onClear={handleClearFilters}
                        />
                    </div>

                    <div className="w-px h-8 bg-white/10 mx-1 hidden md:block" />

                    {/* Refresh */}
                    <Button
                        variant="secondary"
                        onClick={() => fetchData(true, debouncedSearch)}
                        isLoading={loading}
                        className="glass-button h-11 w-11 p-0 flex items-center justify-center border-white/10 hover:border-white/20 text-zinc-400 hover:text-white"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </Button>

                    {/* Add Button */}
                    <Button
                        onClick={handleAdd}
                        leftIcon={<Plus className="w-4 h-4" />}
                        className="h-11 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white border-0 shadow-lg shadow-orange-500/20 px-6 font-medium"
                    >
                        Add Exhibitor
                    </Button>
                </div>
            </div>

            {
                error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl text-sm flex items-center gap-2 animate-fade-in">
                        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                        {error}
                    </div>
                )
            }

            <div className="flex-1 glass-panel rounded-2xl overflow-hidden flex flex-col border border-white/5 bg-black/40">
                <div className="overflow-x-auto custom-scrollbar flex-1">
                    <table className="w-full text-left text-sm text-zinc-400">
                        <thead className="bg-zinc-900/80 text-zinc-400 uppercase text-[10px] font-bold sticky top-0 z-10 backdrop-blur-md border-b border-white/5 tracking-wider">
                            <tr>
                                <th className="px-6 py-3">Company</th>
                                <th className="px-6 py-3 hidden xl:table-cell">World Area</th>
                                <th className="px-6 py-3 hidden lg:table-cell">City</th>
                                <th className="px-6 py-3 hidden md:table-cell">Country</th>
                                <th className="px-6 py-3">FP Level</th>
                                <th className="px-6 py-3 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading && data.length === 0 ? (
                                // Skeleton Loading for initial load
                                Array.from({ length: 10 }).map((_, i) => (
                                    <tr key={i}>
                                        <td className="px-6 py-4"><Skeleton className="h-5 w-32" /></td>
                                        <td className="px-6 py-4 hidden xl:table-cell"><Skeleton className="h-5 w-24" /></td>
                                        <td className="px-6 py-4 hidden lg:table-cell"><Skeleton className="h-5 w-20" /></td>
                                        <td className="px-6 py-4 hidden md:table-cell"><Skeleton className="h-5 w-20" /></td>
                                        <td className="px-6 py-4"><Skeleton className="h-6 w-16 rounded-full" /></td>
                                        <td className="px-6 py-4 text-right"><Skeleton className="h-8 w-24 ml-auto" /></td>
                                    </tr>
                                ))
                            ) : (
                                data.map((item, i) => (
                                    <tr
                                        key={item.ID}
                                        onClick={() => handleRowClick(item)}
                                        className="hover:bg-white/[0.02] transition-colors group cursor-pointer border-b border-white/[0.02] last:border-0"
                                    >
                                        <td className="px-6 py-3 font-medium text-zinc-200 text-sm">{item.Company}</td>
                                        <td className="px-6 py-3 hidden xl:table-cell text-sm text-zinc-400">{item.World_Area}</td>
                                        <td className="px-6 py-3 hidden lg:table-cell text-sm text-zinc-400">{item.City}</td>
                                        <td className="px-6 py-3 hidden md:table-cell text-sm text-zinc-400">{item.Country}</td>
                                        <td className="px-6 py-3">
                                            <div className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border min-w-[70px] ${item.FP_Level === '1' ? 'bg-red-500/10 text-red-400 border-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.1)]' :
                                                item.FP_Level === '2' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20 shadow-[0_0_10px_rgba(249,115,22,0.1)]' :
                                                    item.FP_Level === '3' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20 shadow-[0_0_10px_rgba(234,179,8,0.1)]' :
                                                        'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
                                                }`}>
                                                Level {item.FP_Level}
                                            </div>
                                        </td>
                                        <td className="px-6 py-3 text-right flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                                            <button onClick={() => handleAddToLeads(item)} className="p-1.5 hover:bg-green-500/20 rounded-lg text-zinc-400 hover:text-green-500 transition-colors" title="Add to Leads"><Plus className="w-3.5 h-3.5" /></button>
                                            <button onClick={() => handleEdit(item)} className="p-1.5 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-white transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                                            <button onClick={() => handleDelete(item.ID)} className="p-1.5 hover:bg-red-500/20 rounded-lg text-zinc-400 hover:text-red-500 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>

                    {loading && data.length > 0 && (
                        <div className="p-4 space-y-2">
                            <Skeleton className="h-12 w-full" />
                            <Skeleton className="h-12 w-full" />
                        </div>
                    )}

                    {hasMore && !loading && data.length > 0 && (
                        <div className="p-4 flex justify-center border-t border-white/5">
                            <Button variant="secondary" onClick={loadMore} className="glass-button w-full md:w-auto">
                                Load More Records
                            </Button>
                        </div>
                    )}
                </div>
                {!loading && data.length === 0 && (
                    <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 gap-4 min-h-[300px]">
                        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
                            <Search className="w-8 h-8 opacity-40" />
                        </div>
                        <p className="text-lg font-medium">No records found</p>
                        <p className="text-sm opacity-60">Try adjusting your search terms</p>
                    </div>
                )}
            </div>
        </div >
    );
};
