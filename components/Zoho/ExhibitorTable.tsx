import React, { useState, useEffect, useCallback } from 'react';
import { zohoApi } from '@/lib/zoho';
import { RefreshCw, Plus, Search, Filter, Building2, Globe2, MapPin, Layers3, FileSpreadsheet } from 'lucide-react';
import { ExhibitorFormModal } from './ExhibitorFormModal';
import { ExhibitorDetailsModal } from './ExhibitorDetailsModal';
import { FilterPopover } from './FilterPopover';
import { Button } from '../ui/Button';
import { Skeleton } from '../ui/Skeleton';
import { toast } from 'sonner';
import { SpreadsheetImportModal, type SpreadsheetImportProgress } from '@/components/SpreadsheetImportModal';
import type { SpreadsheetRow } from '@/lib/importSpreadsheet';
import { fpMarketingImportDemoTemplates } from '@/lib/demoSpreadsheetTemplates';

/* eslint-disable @typescript-eslint/no-explicit-any */

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
    const [importOpen, setImportOpen] = useState(false);


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

    const handleExhibitorSpreadsheetImport = async (
        rows: SpreadsheetRow[],
        meta?: { comment?: string },
        onProgress?: (p: SpreadsheetImportProgress) => void,
    ) => {
        const { rowsToExhibitorZohoPayloads } = await import('@/lib/importSpreadsheet');
        const { logSpreadsheetImport } = await import('@/lib/logImportActivity');
        const payloads = rowsToExhibitorZohoPayloads(rows);
        if (payloads.length === 0) {
            toast.error('No valid rows. Each row needs a Company name.');
            return;
        }
        onProgress?.({ current: 0, total: payloads.length });
        let ok = 0;
        for (let i = 0; i < payloads.length; i++) {
            const payload = payloads[i];
            try {
                try {
                    const res = await zohoApi.addRecord('Exhibitor', payload);
                    if (res && res.code === 3000) ok++;
                } catch {
                    const res = await zohoApi.addRecord('Exhibitor_List', payload);
                    if (res && res.code === 3000) ok++;
                }
            } catch (e) {
                console.error(e);
            }
            onProgress?.({ current: i + 1, total: payloads.length });
        }
        await fetchData(true, debouncedSearch);
        await logSpreadsheetImport(`Created ${ok} of ${payloads.length} exhibitors in Zoho from spreadsheet.`, meta?.comment);
        toast.success(`Created ${ok} of ${payloads.length} exhibitors in Zoho${meta?.comment?.trim() ? ' · note saved' : ''}`);
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
            const criteriaParts = [];

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

    const handleApplyFilters = (selections: any) => {
        setSelectedCountries(selections.country || []);
        setSelectedContinents(selections.continent || []);
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

    const uniqueCountries = new Set(data.map(item => item.Country).filter(Boolean)).size;
    const uniqueAreas = new Set(data.map(item => item.World_Area).filter(Boolean)).size;
    const highPriorityCount = data.filter(item => item.FP_Level === '1' || item.FP_Level === '2').length;

    const metricCards = [
        { label: 'Loaded exhibitors', value: data.length, icon: Building2 },
        { label: 'Countries', value: uniqueCountries, icon: MapPin },
        { label: 'World areas', value: uniqueAreas, icon: Globe2 },
        { label: 'FP level 1-2', value: highPriorityCount, icon: Layers3 },
    ];

    return (
        <div className="h-full flex flex-col gap-6">
            {importOpen && (
                <SpreadsheetImportModal
                    isOpen
                    onClose={() => setImportOpen(false)}
                    title="Import exhibitors (CSV / Excel)"
                    columnHint={
                        <>
                            Required: <strong>Company</strong>. Optional: Website, Company_Type, City, Country, World_Area,
                            Contact_Details, Company_Linkedin, FP_Level, Events.
                        </>
                    }
                    demoCsvTemplate={fpMarketingImportDemoTemplates.exhibitorsZoho}
                    onImportRows={handleExhibitorSpreadsheetImport}
                />
            )}

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

            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
                {metricCards.map((card) => (
                    <div key={card.label} className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{card.label}</p>
                                <p className="mt-1 text-2xl font-bold text-zinc-950">{loading && data.length === 0 ? '-' : card.value}</p>
                            </div>
                            <div className="rounded-xl bg-orange-50 p-2 text-orange-600">
                                <card.icon className="h-5 w-5" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Controls Toolbar */}
            <div className="relative z-30 flex flex-col lg:flex-row gap-4 p-4 bg-white border border-zinc-200 rounded-2xl shadow-sm">
                {/* Search */}
                <div className="relative flex-1 group">
                    <div className="relative flex items-center">
                        <Search className="absolute left-4 w-4 h-4 text-zinc-400 group-focus-within:text-orange-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="Search exhibitors..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-zinc-50 border border-zinc-200 rounded-xl pl-11 pr-4 py-3 text-sm text-zinc-950 focus:outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100 transition-all placeholder:text-zinc-400 hover:border-zinc-300"
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
                            className={`h-11 px-5 ${selectedCountries.length > 0 || selectedContinents.length > 0 ? 'border-orange-300 text-orange-600 bg-orange-50 hover:bg-orange-100' : 'text-zinc-700'}`}
                            leftIcon={<Filter className="w-4 h-4" />}
                        >
                            Filters {(selectedCountries.length + selectedContinents.length) > 0 && `(${selectedCountries.length + selectedContinents.length})`}
                        </Button>

                        <FilterPopover
                            isOpen={isFilterOpen}
                            onClose={() => setIsFilterOpen(false)}
                            categories={[
                                { key: 'country', label: 'Country', icon: <MapPin className="h-3.5 w-3.5" />, options: availableCountries },
                                { key: 'continent', label: 'Continent', icon: <Globe2 className="h-3.5 w-3.5" />, options: availableContinents },
                            ].filter(c => c.options.length > 0)}
                            selections={{
                                country: selectedCountries,
                                continent: selectedContinents,
                            }}
                            onApply={handleApplyFilters}
                            onClear={handleClearFilters}
                        />
                    </div>

                    <div className="w-px h-8 bg-zinc-200 mx-1 hidden md:block" />

                    {/* Refresh */}
                    <Button
                        variant="secondary"
                        onClick={() => fetchData(true, debouncedSearch)}
                        isLoading={loading}
                        className="h-11 w-11 p-0 flex items-center justify-center text-zinc-700"
                    >
                        {!loading && <RefreshCw className="w-4 h-4" />}
                    </Button>

                    <Button
                        variant="secondary"
                        onClick={() => setImportOpen(true)}
                        leftIcon={<FileSpreadsheet className="w-4 h-4" />}
                        className="h-11 px-5"
                    >
                        Import
                    </Button>

                    {/* Add Button */}
                    <Button
                        onClick={handleAdd}
                        leftIcon={<Plus className="w-4 h-4" />}
                        className="h-11 bg-linear-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white border-0 shadow-lg shadow-orange-500/20 px-6 font-medium"
                    >
                        Add Exhibitor
                    </Button>
                </div>
            </div>


            <div className="flex-1 rounded-2xl overflow-hidden flex flex-col border border-zinc-200 bg-white shadow-sm">
                <div className="overflow-x-auto custom-scrollbar flex-1">
                    <table className="w-full text-left text-sm text-zinc-600">
                        <thead className="bg-zinc-50 text-zinc-500 uppercase text-[10px] font-bold sticky top-0 z-10 backdrop-blur-md border-b border-zinc-200 tracking-wider">
                            <tr>
                                <th className="px-6 py-3">Company</th>
                                <th className="px-6 py-3 hidden xl:table-cell">World Area</th>
                                <th className="px-6 py-3 hidden lg:table-cell">City</th>
                                <th className="px-6 py-3 hidden md:table-cell">Country</th>
                                <th className="px-6 py-3">FP Level</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100">
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
                                            <div className="w-16 h-16 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center">
                                                <Search className="w-8 h-8 opacity-40" />
                                            </div>
                                            <p className="text-lg font-medium">No records found</p>
                                            <p className="text-sm opacity-60">Try adjusting your search terms</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                data.map((item) => (
                                    <tr
                                        key={item.ID}
                                        onClick={() => handleRowClick(item)}
                                        className="hover:bg-orange-50/70 transition-colors group cursor-pointer border-b border-zinc-100 last:border-0"
                                    >
                                        <td className="px-6 py-3 font-semibold text-zinc-950 text-sm">{item.Company}</td>
                                        <td className="px-6 py-3 hidden xl:table-cell text-sm text-zinc-600">{item.World_Area}</td>
                                        <td className="px-6 py-3 hidden lg:table-cell text-sm text-zinc-600">{item.City}</td>
                                        <td className="px-6 py-3 hidden md:table-cell text-sm text-zinc-600">{item.Country}</td>
                                        <td className="px-6 py-3">
                                            <div className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border min-w-[70px] ${item.FP_Level === '1' ? 'bg-red-50 text-red-600 border-red-200' :
                                                item.FP_Level === '2' ? 'bg-orange-50 text-orange-600 border-orange-200' :
                                                    item.FP_Level === '3' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                                                        'bg-zinc-100 text-zinc-500 border-zinc-200'
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
                        <div className="p-4 flex justify-center border-t border-zinc-200 bg-zinc-50">
                            <Button variant="secondary" onClick={loadMore} className="w-full md:w-auto">
                                Load More Records
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div >
    );
};
