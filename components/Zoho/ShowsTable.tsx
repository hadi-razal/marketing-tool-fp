import React, { useState, useEffect } from 'react';
import { zohoApi } from '@/lib/zoho';
import { RefreshCw, Trash2, Edit2, Plus, Search } from 'lucide-react';
import { ShowFormModal } from './ShowFormModal';
import { ShowDetailsModal } from './ShowDetailsModal';
import { Button } from '../ui/Button';
import { SoftInput } from '../ui/Input';
import { motion } from 'framer-motion';

export const ShowsTable = () => {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<any>(null);
    const [search, setSearch] = useState('');

    const [hasMore, setHasMore] = useState(true);
    const [page, setPage] = useState(0);
    const LIMIT = 200;

    const fetchData = async (reset = false) => {
        setLoading(true);
        setError('');
        try {
            const from = reset ? 0 : page * LIMIT;
            const res = await zohoApi.getRecords('Show_List', undefined, from, LIMIT);
            if (res.code === 3000) {
                if (reset) {
                    setData(res.data);
                    setPage(1);
                } else {
                    setData(prev => [...prev, ...res.data]);
                    setPage(prev => prev + 1);
                }
                setHasMore(res.data.length === LIMIT);
            } else {
                setError('Failed to fetch data. Check API connection.');
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(true); }, []);

    const loadMore = () => {
        if (!loading && hasMore) {
            fetchData();
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure?')) return;
        try {
            await zohoApi.deleteRecord('Show_List', id);
            fetchData(true);
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

    const filteredData = data.filter(item =>
        (item.Event || item.Name || item.Event_Name)?.toLowerCase().includes(search.toLowerCase()) ||
        item.City?.toLowerCase().includes(search.toLowerCase())
    );

    const [isDetailsOpen, setIsDetailsOpen] = useState(false);

    const handleRowClick = (item: any) => {
        setSelectedItem(item);
        setIsDetailsOpen(true);
    };

    return (
        <div className="h-full flex flex-col gap-4">
            <ShowFormModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={() => fetchData(true)}
                initialData={selectedItem}
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

            <div className="flex justify-between items-center gap-4">
                <div className="w-72">
                    <SoftInput
                        placeholder="Search shows..."
                        icon={<Search className="w-4 h-4" />}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="bg-zinc-900/50"
                    />
                </div>
                <div className="flex gap-2">
                    <Button variant="secondary" onClick={() => fetchData(true)} isLoading={loading}>
                        <RefreshCw className="w-4 h-4" />
                    </Button>
                    <Button onClick={handleAdd} leftIcon={<Plus className="w-4 h-4" />}>
                        Add Show
                    </Button>
                </div>
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl text-sm flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    {error}
                </div>
            )}

            <div className="flex-1 bg-zinc-900/40 border border-white/5 rounded-2xl overflow-hidden flex flex-col">
                <div className="overflow-x-auto custom-scrollbar flex-1">
                    <table className="w-full text-left text-sm text-zinc-400">
                        <thead className="bg-zinc-900/80 text-zinc-200 uppercase text-xs font-bold sticky top-0 z-10 backdrop-blur-md">
                            <tr>
                                <th className="px-6 py-4">Name</th>
                                <th className="px-6 py-4 hidden md:table-cell">Event Type</th>
                                <th className="px-6 py-4 hidden lg:table-cell">City</th>
                                <th className="px-6 py-4 hidden xl:table-cell">Country</th>
                                <th className="px-6 py-4 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredData.map((item, i) => (
                                <motion.tr
                                    key={item.ID}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                    onClick={() => handleRowClick(item)}
                                    className="hover:bg-white/[0.02] transition-colors group cursor-pointer"
                                >
                                    <td className="px-6 py-4 font-medium text-white">{item.Event || item.Event_Name || item.Name}</td>
                                    <td className="px-6 py-4 hidden md:table-cell">{item.Event_Type}</td>
                                    <td className="px-6 py-4 hidden lg:table-cell">{item.City}</td>
                                    <td className="px-6 py-4 hidden xl:table-cell">{item.Country}</td>
                                    <td className="px-6 py-4 text-right flex justify-end gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                                        <button onClick={() => handleEdit(item)} className="p-2 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-white transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                                        <button onClick={() => handleDelete(item.ID)} className="p-2 hover:bg-red-500/20 rounded-lg text-zinc-400 hover:text-red-500 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                                    </td>
                                </motion.tr>
                            ))}
                        </tbody>
                    </table>

                    {hasMore && !loading && filteredData.length > 0 && (
                        <div className="p-4 flex justify-center">
                            <Button variant="secondary" onClick={loadMore}>Load More</Button>
                        </div>
                    )}

                    {loading && (
                        <div className="p-4 text-center text-zinc-500">Loading...</div>
                    )}
                </div>
                {!loading && filteredData.length === 0 && (
                    <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 gap-2">
                        <Search className="w-8 h-8 opacity-20" />
                        <p>No records found</p>
                    </div>
                )}
            </div>
        </div>
    );
};
