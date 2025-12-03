import React, { useState, useEffect, useCallback } from 'react';
import { zohoApi } from '@/lib/zoho';
import { RefreshCw, Trash2, Edit2, Plus, Search, Settings } from 'lucide-react';
import { ShowFormModal } from './ShowFormModal';
import { ShowDetailsModal } from './ShowDetailsModal';
import { ZohoSettingsModal } from './ZohoSettingsModal';
import { Button } from '../ui/Button';
import { SoftInput } from '../ui/Input';
import { Skeleton } from '../ui/Skeleton';
import { motion } from 'framer-motion';

export const ShowsTable = () => {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<any>(null);
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');

    // Pagination
    const [hasMore, setHasMore] = useState(true);
    const [page, setPage] = useState(0);
    const LIMIT = 100;

    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [totalRecords, setTotalRecords] = useState<number | null>(null);
    const [loadingTotal, setLoadingTotal] = useState(false);

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
            // Try searching by Event name
            const criteria = searchTerm ? `(Event.contains("${searchTerm}"))` : undefined;

            const res = await zohoApi.getRecords('Event_and_Exhibitor_Admin_Only_Report', criteria, from, LIMIT);

            if (res.code === 3000) {
                if (reset) {
                    console.log('Shows Data:', res.data); // Debugging
                    setData(res.data);
                    setPage(1);
                } else {
                    setData(prev => [...prev, ...res.data]);
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
    }, [page]);

    useEffect(() => {
        fetchData(true, debouncedSearch);
        if (debouncedSearch) setPage(0);
    }, [debouncedSearch]);

    const loadMore = () => {
        if (!loading && hasMore) {
            fetchData(false, debouncedSearch);
        }
    };

    const fetchTotalRecords = async () => {
        setLoadingTotal(true);
        try {
            const res = await zohoApi.getRecords('Event_and_Exhibitor_Admin_Only_Report', undefined, 0, 1);
            if (res.result_count) {
                setTotalRecords(res.result_count);
            } else {
                setTotalRecords(9999); // Placeholder
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingTotal(false);
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

    return (
        <div className="h-full flex flex-col gap-6">
            <ShowFormModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={() => fetchData(true, debouncedSearch)}
                initialData={selectedItem}
            />

            <ZohoSettingsModal
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
            />

            <ShowDetailsModal
                isOpen={isDetailsOpen}
                onClose={() => setIsDetailsOpen(false)}
                data={selectedItem}
                onEdit={(item) => {
                    setIsDetailsOpen(false);
                    handleEdit(item);
                }}
                onDelete={handleDelete}
            />

            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-zinc-900/50 p-4 rounded-2xl border border-white/5 backdrop-blur-sm">
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="text-sm text-zinc-400 font-medium flex items-center gap-2">
                        <span>Total Records:</span>
                        {totalRecords !== null ? (
                            <span className="text-white font-bold">{totalRecords}</span>
                        ) : (
                            <button
                                onClick={fetchTotalRecords}
                                disabled={loadingTotal}
                                className="px-2 py-0.5 bg-white/5 hover:bg-white/10 rounded text-xs text-zinc-300 border border-white/5 transition-colors flex items-center gap-1"
                            >
                                {loadingTotal ? 'Loading...' : '# Load'}
                            </button>
                        )}
                    </div>
                    <div className="h-4 w-px bg-white/10" />
                    <div className="text-sm text-zinc-400">
                        Loaded: <span className="text-white font-bold">{data.length}</span>
                    </div>
                </div>

                <div className="w-full md:w-96 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <input
                        type="text"
                        placeholder="Search shows..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all placeholder:text-zinc-600"
                    />
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                    <Button variant="secondary" onClick={() => setIsSettingsOpen(true)} className="glass-button h-9 w-9 p-0 flex items-center justify-center">
                        <Settings className="w-4 h-4" />
                    </Button>
                    <Button variant="secondary" onClick={() => fetchData(true, debouncedSearch)} isLoading={loading} className="glass-button h-9">
                        <RefreshCw className="w-4 h-4" />
                    </Button>
                    <Button onClick={handleAdd} leftIcon={<Plus className="w-4 h-4" />} className="bg-primary hover:bg-primary-dark text-white border-0 shadow-lg shadow-primary/20 h-9 text-sm">
                        Add Show
                    </Button>
                </div>
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl text-sm flex items-center gap-2 animate-fade-in">
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    {error}
                    <button onClick={() => setIsSettingsOpen(true)} className="ml-auto text-xs underline hover:text-red-400">
                        Reconnect
                    </button>
                </div>
            )}

            <div className="flex-1 glass-panel rounded-2xl overflow-hidden flex flex-col border border-white/5 bg-black/40">
                <div className="overflow-x-auto custom-scrollbar flex-1">
                    <table className="w-full text-left text-sm text-zinc-400">
                        <thead className="bg-zinc-900/80 text-zinc-400 uppercase text-[10px] font-bold sticky top-0 z-10 backdrop-blur-md border-b border-white/5 tracking-wider">
                            <tr>
                                <th className="px-6 py-3">Name</th>
                                <th className="px-6 py-3 hidden md:table-cell">Event Type</th>
                                <th className="px-6 py-3 hidden lg:table-cell">City</th>
                                <th className="px-6 py-3 hidden xl:table-cell">Country</th>
                                <th className="px-6 py-3 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading && data.length === 0 ? (
                                Array.from({ length: 10 }).map((_, i) => (
                                    <tr key={i}>
                                        <td className="px-6 py-4"><Skeleton className="h-5 w-40" /></td>
                                        <td className="px-6 py-4 hidden md:table-cell"><Skeleton className="h-5 w-24" /></td>
                                        <td className="px-6 py-4 hidden lg:table-cell"><Skeleton className="h-5 w-20" /></td>
                                        <td className="px-6 py-4 hidden xl:table-cell"><Skeleton className="h-5 w-20" /></td>
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
                                        <td className="px-6 py-3 font-medium text-zinc-200 text-sm">{item.Event || item.Event_Name || item.Name}</td>
                                        <td className="px-6 py-3 hidden md:table-cell text-sm text-zinc-400">{item.Event_Type}</td>
                                        <td className="px-6 py-3 hidden lg:table-cell text-sm text-zinc-400">{item.City}</td>
                                        <td className="px-6 py-3 hidden xl:table-cell text-sm text-zinc-400">{item.Country}</td>
                                        <td className="px-6 py-3 text-right flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
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
