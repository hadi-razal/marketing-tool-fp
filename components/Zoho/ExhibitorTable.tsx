import React, { useState, useEffect, useCallback } from 'react';
import { zohoApi } from '@/lib/zoho';
import { RefreshCw, Trash2, Edit2, Plus, Search, ChevronDown } from 'lucide-react';
import { ExhibitorFormModal } from './ExhibitorFormModal';
import { ExhibitorDetailsModal } from './ExhibitorDetailsModal';
import { Button } from '../ui/Button';
import { SoftInput } from '../ui/Input';
import { Skeleton } from '../ui/Skeleton';
import { motion, AnimatePresence } from 'framer-motion';
import { useDebounce } from '@/hooks/useDebounce'; // Assuming this exists or I'll create it

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
    const LIMIT = 100;
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);

    // Debounce search manually since hook might not exist
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
            // Construct criteria for search if exists
            const criteria = searchTerm ? `(Company.contains("${searchTerm}"))` : undefined;

            const res = await zohoApi.getRecords('Exhibitor_List', criteria, from, LIMIT);

            if (res.code === 3000) {
                if (reset) {
                    setData(res.data);
                    setPage(1);
                } else {
                    setData(prev => [...prev, ...res.data]);
                    setPage(prev => prev + 1);
                }
                // If we got fewer items than limit, no more data
                setHasMore(res.data.length === LIMIT);
            } else if (res.code === 3001 || res.message?.includes('No data')) {
                // No data found
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
    }, [page]);

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

    const handleRowClick = (item: any) => {
        setSelectedItem(item);
        setIsDetailsOpen(true);
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

            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/5 backdrop-blur-sm">
                <div className="w-full md:w-96 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <input
                        type="text"
                        placeholder="Search exhibitors..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all placeholder:text-zinc-500"
                    />
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                    <Button variant="secondary" onClick={() => fetchData(true, debouncedSearch)} isLoading={loading} className="glass-button">
                        <RefreshCw className="w-4 h-4" />
                    </Button>
                    <Button onClick={handleAdd} leftIcon={<Plus className="w-4 h-4" />} className="bg-primary hover:bg-primary-dark text-white border-0 shadow-lg shadow-primary/20">
                        Add Exhibitor
                    </Button>
                </div>
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl text-sm flex items-center gap-2 animate-fade-in">
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    {error}
                </div>
            )}

            <div className="flex-1 glass-panel rounded-2xl overflow-hidden flex flex-col border border-white/5 bg-black/40">
                <div className="overflow-x-auto custom-scrollbar flex-1">
                    <table className="w-full text-left text-sm text-zinc-400">
                        <thead className="bg-white/5 text-zinc-200 uppercase text-xs font-bold sticky top-0 z-10 backdrop-blur-md border-b border-white/5">
                            <tr>
                                <th className="px-6 py-4">Company</th>
                                <th className="px-6 py-4 hidden xl:table-cell">World Area</th>
                                <th className="px-6 py-4 hidden lg:table-cell">City</th>
                                <th className="px-6 py-4 hidden md:table-cell">Country</th>
                                <th className="px-6 py-4">FP Level</th>
                                <th className="px-6 py-4 text-right">Action</th>
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
                                    <motion.tr
                                        key={item.ID}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.02 }} // Faster stagger
                                        onClick={() => handleRowClick(item)}
                                        className="hover:bg-white/[0.03] transition-colors group cursor-pointer"
                                    >
                                        <td className="px-6 py-4 font-medium text-white">{item.Company}</td>
                                        <td className="px-6 py-4 hidden xl:table-cell">{item.World_Area}</td>
                                        <td className="px-6 py-4 hidden lg:table-cell">{item.City}</td>
                                        <td className="px-6 py-4 hidden md:table-cell">{item.Country}</td>
                                        <td className="px-6 py-4">
                                            <div className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-bold border min-w-[80px] ${item.FP_Level === '1' ? 'bg-red-500/10 text-red-400 border-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.1)]' :
                                                    item.FP_Level === '2' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20 shadow-[0_0_10px_rgba(249,115,22,0.1)]' :
                                                        item.FP_Level === '3' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20 shadow-[0_0_10px_rgba(234,179,8,0.1)]' :
                                                            'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]'
                                                }`}>
                                                Level {item.FP_Level}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right flex justify-end gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                                            <button onClick={() => handleAddToLeads(item)} className="p-2 hover:bg-green-500/20 rounded-lg text-zinc-400 hover:text-green-500 transition-colors" title="Add to Leads"><Plus className="w-3.5 h-3.5" /></button>
                                            <button onClick={() => handleEdit(item)} className="p-2 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-white transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                                            <button onClick={() => handleDelete(item.ID)} className="p-2 hover:bg-red-500/20 rounded-lg text-zinc-400 hover:text-red-500 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                                        </td>
                                    </motion.tr>
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
        </div>
    );
};
