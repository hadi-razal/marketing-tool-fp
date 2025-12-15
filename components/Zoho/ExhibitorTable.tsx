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
        setIsDetailsOpen(false); // Close details modal when opening edit form
    };

    const handleUpdateSuccess = async () => {
        // Refresh the table data after successful update
        await fetchData(true, debouncedSearch);
        
        // Refresh the selected item data and reopen details modal
        if (selectedItem?.ID) {
            try {
                setLoadingDetails(true);
                const res = await zohoApi.getRecordById('Exhibitor_List', selectedItem.ID);
                if (res.code === 3000 && res.data) {
                    // Record exists - update with fresh data
                    const fetchedData = Array.isArray(res.data) ? res.data[0] : res.data;
                    setSelectedItem(fetchedData);
                    setIsDetailsOpen(true);
                } else if (res.code === 3001 || !res.data) {
                    // Record doesn't exist - close modal and remove from table
                    setIsDetailsOpen(false);
                    setSelectedItem(null);
                    setData(prev => prev.filter(item => item.ID !== selectedItem.ID));
                }
            } catch (err: any) {
                // If error indicates record not found, close modal and remove from table
                if (err?.message?.includes('404') || err?.message?.includes('not found') || err?.message?.includes('3001')) {
                    setIsDetailsOpen(false);
                    setSelectedItem(null);
                    setData(prev => prev.filter(item => item.ID !== selectedItem.ID));
                }
            } finally {
                setLoadingDetails(false);
            }
        }
    };

    const handleAdd = () => {
        setSelectedItem(null);
        setIsModalOpen(true);
    };

    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [availableCountries, setAvailableCountries] = useState<string[]>([]);
    
    // Import all countries
    useEffect(() => {
        import('@/lib/countries').then(({ COUNTRIES }) => {
            setAvailableCountries(COUNTRIES);
        });
    }, []);
    const [availableContinents, setAvailableContinents] = useState<string[]>([]);
    const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
    const [selectedContinents, setSelectedContinents] = useState<string[]>([]);

    // Fetch unique continents for filters (countries come from COUNTRIES constant)
    useEffect(() => {
        const fetchContinents = async () => {
            try {
                const continents = new Set<string>();

                // Fetch up to 5 pages (1000 records) to get a good sample of continents
                const MAX_PAGES = 5;
                const BATCH_SIZE = 200;

                for (let i = 0; i < MAX_PAGES; i++) {
                    const res = await zohoApi.getRecords('Exhibitor_List', undefined, i * BATCH_SIZE, BATCH_SIZE);
                    if (res.data && Array.isArray(res.data)) {
                        res.data.forEach((item: any) => {
                            if (item.World_Area) continents.add(item.World_Area);
                        });

                        // Stop if we got less than full batch, meaning end of data
                        if (res.data.length < BATCH_SIZE) break;
                    } else {
                        break;
                    }
                }

                setAvailableContinents(Array.from(continents).sort());
            } catch (err) {
                console.error('Failed to fetch filter values', err);
            }
        };
        fetchContinents();
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
            
            console.log('Exhibitor Fetch Criteria:', criteria);
            console.log('Selected Countries:', selectedCountries);
            console.log('Selected Continents:', selectedContinents);

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
            } else if (res.code === 3001 || res.message?.includes('No data') || res.message?.includes('Not Found')) {
                if (reset) setData([]);
                setHasMore(false);
                setError(''); // Clear error, show empty state instead
            } else {
                // For other errors, just show empty results
                if (reset) setData([]);
                setHasMore(false);
                setError('');
            }
        } catch (err: any) {
            console.error(err);
            // Don't show error, just show empty results
            if (reset) setData([]);
            setHasMore(false);
            setError('');
        } finally {
            setLoading(false);
        }
    }, [page, selectedCountries, selectedContinents]);

    // Re-fetch when filters change
    useEffect(() => {
        setPage(0); // Reset page when filters change
        fetchData(true, debouncedSearch);
    }, [selectedCountries, selectedContinents, debouncedSearch, fetchData]);

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
            if (res.code === 3000 && res.data) {
                // Record exists - update with fetched data
                const fetchedData = Array.isArray(res.data) ? res.data[0] : res.data;
                setSelectedItem((prev: any) => ({ ...prev, ...fetchedData }));
            } else if (res.code === 3001 || !res.data) {
                // Record doesn't exist - close modal and remove from table
                setIsDetailsOpen(false);
                setSelectedItem(null);
                setData(prev => prev.filter(record => record.ID !== item.ID));
            }
        } catch (err: any) {
            // If error indicates record not found, close modal and remove from table
            if (err?.message?.includes('404') || err?.message?.includes('not found') || err?.message?.includes('3001')) {
                setIsDetailsOpen(false);
                setSelectedItem(null);
                setData(prev => prev.filter(record => record.ID !== item.ID));
            }
        } finally {
            setLoadingDetails(false);
        }
    };

    return (
        <div className="h-full flex flex-col gap-6">
            <ExhibitorFormModal
                key={selectedItem?.ID || 'new'} // Force re-render when item changes
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    // Small delay before clearing to ensure modal closes properly
                    setTimeout(() => {
                        if (!isDetailsOpen) {
                            setSelectedItem(null);
                        }
                    }, 100);
                }}
                onSuccess={handleUpdateSuccess}
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
                        {!loading && <RefreshCw className="w-4 h-4" />}
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
                                    </tr>
                                ))
                            ) : data.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8">
                                        <div className="flex flex-col items-center justify-start text-zinc-500 gap-4">
                                            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
                                                <Search className="w-8 h-8 opacity-40" />
                                            </div>
                                            <p className="text-lg font-medium">No records found</p>
                                            <p className="text-sm opacity-60">Try adjusting your search terms</p>
                                        </div>
                                    </td>
                                </tr>
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
            </div>
        </div >
    );
};
