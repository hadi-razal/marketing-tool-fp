import React, { useState, useEffect, useCallback } from 'react';
import { zohoApi } from '@/lib/zoho';
import { RefreshCw, Trash2, Edit2, Plus, Search, Filter } from 'lucide-react';
import { FilterPopover } from './FilterPopover';
import { DatabaseFormModal } from './DatabaseFormModal';
import { DatabaseDetailsModal } from './DatabaseDetailsModal';
import { Button } from '../ui/Button';
import { SoftInput } from '../ui/Input';
import { Skeleton } from '../ui/Skeleton';
import { motion } from 'framer-motion';

export const DatabaseTable = () => {
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
    const LIMIT = 100;
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);

    // Filters
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [availableCountries, setAvailableCountries] = useState<string[]>([]);
    const [selectedCountries, setSelectedCountries] = useState<string[]>([]);

    // Filter logic disabled for now as Country is not a direct field in the new report
    useEffect(() => {
        // const fetchFilters = async () => { ... }
        // fetchFilters();
        setAvailableCountries([]);
    }, []);

    // Manual debounce
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
        }, 500);
        return () => clearTimeout(timer);
    }, [search]);

    const fetchData = useCallback(async (reset = false, searchTerm = '') => {
        setLoading(true);
        setError('');
        try {
            const from = reset ? 0 : page * LIMIT;

            // Construct criteria
            let criteriaParts = [];

            // Search
            if (searchTerm) {
                // Use display_value for lookup fields to avoid 404 or invalid criteria
                criteriaParts.push(`(Show.display_value.contains("${searchTerm}") || Company.display_value.contains("${searchTerm}"))`);
            }

            // Filters - Disabled for now
            // if (selectedCountries.length > 0) { ... }

            const criteria = criteriaParts.length > 0 ? criteriaParts.join(' && ') : undefined;

            const res = await zohoApi.getRecords('Event_and_Exhibitor_Admin_Only_Report', criteria, from, LIMIT);

            console.log('Event and Exhibitor Admin Only Report Response:', res);

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
    }, [page]);

    useEffect(() => {
        fetchData(true, debouncedSearch);
        if (debouncedSearch) setPage(0);
    }, [debouncedSearch, selectedCountries]);

    const handleApplyFilters = (countries: string[], continents: string[]) => {
        setSelectedCountries(countries);
    };

    const handleClearFilters = () => {
        setSelectedCountries([]);
    };

    const loadMore = () => {
        if (!loading && hasMore) {
            fetchData(false, debouncedSearch);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure?')) return;
        try {
            await zohoApi.deleteRecord('Event_and_Exhibitor_Admin_Only_Report', id);
            setData(prev => prev.filter(item => item.ID !== id));
           
        } catch (err: any) {
            alert(err.message);
        }
    };

    const handleEdit = (item: any) => {
        setSelectedItem(item);
        setIsModalOpen(true);
    };

    const handleAdd = () => {
        setSelectedItem(null);
        setIsModalOpen(true);
    };

    const handleRowClick = (item: any) => {
        setSelectedItem(item);
        setIsDetailsOpen(true);
    };

    // Helper to extract display value from object or return string
    const getDisplayValue = (val: any) => {
        if (!val) return '-';
        if (typeof val === 'object') return val.display_value || val.value || JSON.stringify(val);
        return val;
    };

    return (
        <div className="h-full flex flex-col gap-6">
            <DatabaseFormModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={() => fetchData(true, debouncedSearch)}
                initialData={selectedItem}
            />

            <DatabaseDetailsModal
                isOpen={isDetailsOpen}
                onClose={() => setIsDetailsOpen(false)}
                data={selectedItem}
                onEdit={(item) => {
                    setIsDetailsOpen(false);
                    handleEdit(item);
                }}
                onDelete={handleDelete}
                onAddToLeads={(item) => alert(`Added ${item.Company?.display_value || item.Company} to leads (Simulation)`)}
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
                            placeholder="Search by Company or Show..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-black/20 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm text-white focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 transition-all placeholder:text-zinc-600 hover:border-white/20"
                        />
                    </div>
                </div>

                {/* Actions Group */}
                <div className="flex items-center gap-3">
                    {/* Filter - Hidden/Disabled for now */}
                    {/* 
                    <div className="relative">
                        <Button
                            variant="secondary"
                            onClick={() => setIsFilterOpen(!isFilterOpen)}
                            className={`glass-button h-11 px-5 border-white/10 hover:border-white/20 ${selectedCountries.length > 0 ? 'border-orange-500/50 text-orange-500 bg-orange-500/10 hover:bg-orange-500/20' : 'text-zinc-400 hover:text-white'}`}
                            leftIcon={<Filter className="w-4 h-4" />}
                        >
                            Filters {selectedCountries.length > 0 && `(${selectedCountries.length})`}
                        </Button>
                         // ... Popover ...
                    </div>
                    <div className="w-px h-8 bg-white/10 mx-1 hidden md:block" />
                    */}

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
                        Add Record
                    </Button>
                </div>
            </div>


            <div className="flex-1 glass-panel rounded-2xl overflow-hidden flex flex-col border border-white/5 bg-black/40">
                <div className="overflow-x-auto custom-scrollbar flex-1">
                    <table className="w-full text-left text-sm text-zinc-400">
                        <thead className="bg-zinc-900/80 text-zinc-400 uppercase text-[10px] font-bold sticky top-0 z-10 backdrop-blur-md border-b border-white/5 tracking-wider">
                            <tr>
                                <th className="px-6 py-3">Company</th>
                                <th className="px-6 py-3">Show</th>
                                <th className="px-6 py-3 hidden md:table-cell">Booth No</th>
                                <th className="px-6 py-3 hidden lg:table-cell">Year</th>
                                <th className="px-6 py-3 hidden xl:table-cell">Size (Sqm)</th>
                                <th className="px-6 py-3 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading && data.length === 0 ? (
                                Array.from({ length: 10 }).map((_, i) => (
                                    <tr key={i}>
                                        <td className="px-6 py-4"><Skeleton className="h-5 w-40" /></td>
                                        <td className="px-6 py-4"><Skeleton className="h-5 w-32" /></td>
                                        <td className="px-6 py-4 hidden md:table-cell"><Skeleton className="h-5 w-16" /></td>
                                        <td className="px-6 py-4 hidden lg:table-cell"><Skeleton className="h-5 w-16" /></td>
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
                                        <td className="px-6 py-3 font-medium text-zinc-200 text-sm">{getDisplayValue(item.Company)}</td>
                                        <td className="px-6 py-3 text-sm text-zinc-300">{getDisplayValue(item.Show)}</td>
                                        <td className="px-6 py-3 hidden md:table-cell text-sm text-zinc-400">{getDisplayValue(item.Booth_No)}</td>
                                        <td className="px-6 py-3 hidden lg:table-cell text-sm text-zinc-400">{getDisplayValue(item.Attended_year1)}</td>
                                        <td className="px-6 py-3 hidden xl:table-cell text-sm text-zinc-400">{getDisplayValue(item.last_edition_booth_sqm)}</td>
                                        <td className="px-6 py-3 text-right flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                                            <button onClick={() => handleEdit(item)} className="p-1.5 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-white transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>

                    {loading && data.length > 0 && (
                        <div className="p-4 space-y-2">
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
                    </div>
                )}
            </div>
        </div>
    );
};
