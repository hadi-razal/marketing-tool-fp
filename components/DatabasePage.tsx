import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
    FolderOpen, Search, Database, Trash2, Users, Building2, Plus, Filter, MapPin, Calendar, Globe, LayoutGrid, ArrowUpDown, ChevronDown, RefreshCw, FileSpreadsheet, ImagePlus
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { ProfileCard } from './ProfileCard';
import { CompanyCard, Company } from './CompanyCard';
import { CreatePersonModal } from './CreatePersonModal';
import { CreateCompanyModal } from './CreateCompanyModal';
import { LeadDetailModal } from './LeadDetailModal';
import { CompanyCardSkeleton } from './CompanyCardSkeleton';
import { ConfirmModal } from './ui/ConfirmModal';
import { databaseService, SavedPerson } from '@/services/databaseService';
import { createClient } from '@/lib/supabase';
import { DatabaseShowDetailModal } from './DatabaseShowDetailModal';
import { SpreadsheetImportModal, type SpreadsheetImportProgress } from './SpreadsheetImportModal';
import type { SpreadsheetRow } from '@/lib/importSpreadsheet';
import { fpMarketingImportDemoTemplates } from '@/lib/demoSpreadsheetTemplates';

interface DatabasePageProps {
    notify: (msg: string, type?: string) => void;
}

export const DatabasePage: React.FC<DatabasePageProps> = ({ notify }) => {
    const router = useRouter();
    const supabase = createClient();
    const [activeView, setActiveView] = useState<'people' | 'shows'>('people');
    const [people, setPeople] = useState<SavedPerson[]>([]);
    const [companies, setCompanies] = useState<Company[]>([]);
    const [shows, setShows] = useState<any[]>([]);
    const [showLocalImages, setShowLocalImages] = useState<Record<string, string>>({});
    const [showsLoading, setShowsLoading] = useState(false);
    const [showsView, setShowsView] = useState<'grid' | 'calendar'>('grid');
    const [showsSort, setShowsSort] = useState<'name' | 'date' | 'country'>('name');
    const [dbSearch, setDbSearch] = useState<string>('');
    const [loading, setLoading] = useState(false);

    // Filter State
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState({
        industry: '',
        location: '',
        employees: '',
        contactStatus: [] as string[],
        showCountry: '',
        showWorldArea: '',
        showExhibitorsOnly: false,
        showFloorplanOnly: false
    });

    // Modal States
    const [isCreatePersonOpen, setIsCreatePersonOpen] = useState(false);
    const [isCreateCompanyOpen, setIsCreateCompanyOpen] = useState(false);
    const [selectedPerson, setSelectedPerson] = useState<SavedPerson | null>(null);

    const [selectedShow, setSelectedShow] = useState<any | null>(null);
    const [isShowDetailsOpen, setIsShowDetailsOpen] = useState(false);

    // Confirmation modal state
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        type: 'company' | 'person' | null;
        id: string | null;
        name: string;
    }>({ isOpen: false, type: null, id: null, name: '' });

    const [spreadsheetImport, setSpreadsheetImport] = useState<null | 'people' | 'companies' | 'shows'>(null);

    useEffect(() => {
        return () => {
            Object.values(showLocalImages).forEach((url) => {
                try {
                    URL.revokeObjectURL(url);
                } catch {
                    // ignore local URL cleanup errors
                }
            });
        };
    }, [showLocalImages]);

    // Fetch data on mount
    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const [savedCompanies, savedPeople] = await Promise.all([
                    databaseService.getSavedCompanies(),
                    databaseService.getSavedPeople()
                ]);
                setCompanies(savedCompanies);
                setPeople(savedPeople);
            } catch (error) {
                console.error('Failed to fetch data:', error);
                notify('Failed to load data', 'error');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [notify]);

    const fetchShows = useCallback(async () => {
        setShowsLoading(true);
        try {
            const [{ data, error }, { data: floorplanRows }] = await Promise.all([
                supabase
                    .from('shows')
                    .select('*')
                    .order('id', { ascending: false }),
                supabase
                    .from('floorplans')
                    .select('id, link')
                    .not('link', 'is', null),
            ]);
            if (error) throw error;
            const floorplanByShowId = new Map(
                (floorplanRows || []).map((row: { id: string; link: string | null }) => [String(row.id), row]),
            );
            const normalized = (data || []).map((row: any) => ({
                ...row,
                id: row.id ?? row.ID,
                name: row.name ?? row.Event_Name ?? row.Event ?? row.Name ?? '',
                event_type: row.event_type ?? row.Event_Type ?? '',
                starting_date: row.starting_date ?? row.Starting_Date ?? null,
                industry: row.industry ?? row.Industry ?? '',
                level: row.level ?? row.Level ?? '',
                world_area: row.world_area ?? row.World_Area ?? '',
                country: row.country ?? row.Country ?? '',
                city: row.city ?? row.City ?? '',
                frequency: row.frequency ?? row.Frequency ?? '',
                exhibitor_list: row.exhibitor_list ?? row.Exhibitor_List ?? null,
                exhibitor_list_link: row.exhibitor_list_link ?? row.Exhibitor_List_Link ?? null,
                has_floorplan: floorplanByShowId.has(String(row.id ?? row.ID)),
                floorplan_link: floorplanByShowId.get(String(row.id ?? row.ID))?.link ?? null,
                organiser: row.organiser ?? row.Organiser ?? '',
                note: row.note ?? row.Note ?? row.Note1 ?? '',
                tags: row.tags ?? row.Tags ?? '',
            }));
            setShows(normalized);
        } catch (error) {
            console.error('Failed to fetch shows:', error);
            setShows([]);
            notify('Failed to load shows from Supabase', 'error');
        } finally {
            setShowsLoading(false);
        }
    }, [supabase, notify]);

    useEffect(() => {
        if (activeView === 'shows') {
            fetchShows();
        }
    }, [activeView, fetchShows]);

    const filteredShows = useMemo(() => {
        let result = shows;
        if (dbSearch) {
            const q = dbSearch.toLowerCase();
            result = result.filter((s: any) =>
                (s.name || '').toLowerCase().includes(q) ||
                (s.city || '').toLowerCase().includes(q) ||
                (s.country || '').toLowerCase().includes(q) ||
                (s.industry || '').toLowerCase().includes(q)
            );
        }
        if (filters.showCountry) {
            result = result.filter((s: any) => s.country === filters.showCountry);
        }
        if (filters.showWorldArea) {
            result = result.filter((s: any) => s.world_area === filters.showWorldArea);
        }
        if (filters.showExhibitorsOnly) {
            result = result.filter((s: any) => Boolean(s.exhibitor_list_link) || Boolean(s.exhibitor_list));
        }
        if (filters.showFloorplanOnly) {
            result = result.filter((s: any) => Boolean(s.has_floorplan));
        }

        return [...result].sort((a: any, b: any) => {
            if (showsSort === 'name') return (a.name || '').localeCompare(b.name || '');
            if (showsSort === 'date') return (a.starting_date || '').localeCompare(b.starting_date || '');
            if (showsSort === 'country') return (a.country || '').localeCompare(b.country || '');
            return 0;
        });
    }, [shows, dbSearch, showsSort, filters]);

    const filteredData = useMemo(() => {
        const query = dbSearch.toLowerCase();

        if (activeView === 'people') {
            return people.filter(p => {
                const matchesSearch =
                    (p.name || '').toLowerCase().includes(query) ||
                    (p.company || '').toLowerCase().includes(query) ||
                    (p.email || '').toLowerCase().includes(query);

                const matchesStatus = filters.contactStatus.length === 0 || filters.contactStatus.includes(p.contact_status || '');

                return matchesSearch && matchesStatus;
            });
        } else {
            return companies.filter(c => {
                const matchesSearch =
                    c.name.toLowerCase().includes(query) ||
                    (c.industry || '').toLowerCase().includes(query);

                const matchesIndustry = !filters.industry || c.industry === filters.industry;

                const matchesLocation = !filters.location ||
                    (c.location || '').toLowerCase().includes(filters.location.toLowerCase());

                let matchesEmployees = true;
                if (filters.employees && c.employees) {
                    const count = c.employees;
                    switch (filters.employees) {
                        case '1-10': matchesEmployees = count >= 1 && count <= 10; break;
                        case '11-50': matchesEmployees = count >= 11 && count <= 50; break;
                        case '51-200': matchesEmployees = count >= 51 && count <= 200; break;
                        case '201-500': matchesEmployees = count >= 201 && count <= 500; break;
                        case '501-1000': matchesEmployees = count >= 501 && count <= 1000; break;
                        case '1000+': matchesEmployees = count > 1000; break;
                    }
                } else if (filters.employees && !c.employees) {
                    matchesEmployees = false;
                }

                return matchesSearch && matchesIndustry && matchesLocation && matchesEmployees;
            });
        }
    }, [people, companies, activeView, dbSearch, filters]);

    // ... (rest of code)

    const handleDeletePersonClick = (person: SavedPerson) => {
        setConfirmModal({
            isOpen: true,
            type: 'person',
            id: person.id,
            name: person.name || 'this person'
        });
    };

    const handleDeleteCompanyClick = (company: Company) => {
        setConfirmModal({
            isOpen: true,
            type: 'company',
            id: company.id,
            name: company.name
        });
    };

    const confirmDelete = async () => {
        if (!confirmModal.id || !confirmModal.type) return;

        try {
            if (confirmModal.type === 'person') {
                await databaseService.deletePerson(confirmModal.id);
                setPeople(prev => prev.filter(p => p.id !== confirmModal.id));
                toast.success('Person removed successfully');
            } else if (confirmModal.type === 'company') {
                await databaseService.deleteCompany(confirmModal.id);
                setCompanies(prev => prev.filter(c => c.id !== confirmModal.id));
                toast.success('Company removed successfully');
            }
        } catch (error) {
            console.error(`Failed to delete ${confirmModal.type}:`, error);
            toast.error(`Failed to delete ${confirmModal.type}. Please try again.`);
        }
    };

    const handleCreatePerson = async (personData: any) => {
        try {
            // Save the person to the database
            await databaseService.savePerson(personData);

            // Refresh list after creation
            const savedPeople = await databaseService.getSavedPeople();
            setPeople(savedPeople);
            notify('Person created and saved successfully', 'success');
        } catch (error) {
            console.error('Failed to create person:', error);
            notify('Failed to create person', 'error');
        }
    };

    const handleCreateCompany = async () => {
        const savedCompanies = await databaseService.getSavedCompanies();
        setCompanies(savedCompanies);
        notify('Company created successfully', 'success');
    };

    const openShowDetails = (show: any) => {
        setSelectedShow(show);
        setIsShowDetailsOpen(true);
    };

    const setLocalShowImage = (showId: string, file: File | null) => {
        if (!file) return;
        const objectUrl = URL.createObjectURL(file);
        setShowLocalImages((prev) => {
            const existing = prev[showId];
            if (existing) {
                try {
                    URL.revokeObjectURL(existing);
                } catch {
                    // ignore
                }
            }
            return { ...prev, [showId]: objectUrl };
        });
    };

    const uniqueIndustries = useMemo(() => {
        const industries = new Set(companies.map(c => c.industry).filter(Boolean));
        return Array.from(industries).sort();
    }, [companies]);

    const uniqueCountries = useMemo(() => {
        const countries = new Set(shows.map((s: any) => s.country).filter(Boolean));
        return Array.from(countries).sort();
    }, [shows]);

    const uniqueWorldAreas = useMemo(() => {
        const areas = new Set(shows.map((s: any) => s.world_area).filter(Boolean));
        return Array.from(areas).sort();
    }, [shows]);

    const handleUnlock = async (lead: SavedPerson, type: 'email' | 'phone') => {
        try {
            const response = await fetch('/api/apollo/enrich', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: lead.id,
                    reveal_email: type === 'email',
                    reveal_phone: type === 'phone'
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to unlock contact info');
            }

            const unlockedLead = { ...lead, ...data.lead, isSaved: true, saved_from: lead.saved_from };

            // Save to database automatically
            await databaseService.savePerson(unlockedLead);

            // Update local state
            setPeople(prev => prev.map(p => p.id === lead.id ? unlockedLead : p));
            if (selectedPerson && selectedPerson.id === lead.id) {
                setSelectedPerson(unlockedLead);
            }

            notify(`Contact ${type} unlocked and saved!`, 'success');
            return unlockedLead;
        } catch (error) {
            console.error('Unlock failed:', error);
            notify((error as Error).message || 'Failed to unlock contact info', 'error');
            return null;
        }
    };

    const handleSpreadsheetPeopleImport = async (
        rows: SpreadsheetRow[],
        meta?: { comment?: string },
        onProgress?: (p: SpreadsheetImportProgress) => void,
    ) => {
        const { rowsToImportedPeople } = await import('@/lib/importSpreadsheet');
        const { logSpreadsheetImport } = await import('@/lib/logImportActivity');
        const list = rowsToImportedPeople(rows, 'db_import');
        onProgress?.({ current: 0, total: list.length });
        let ok = 0;
        for (let i = 0; i < list.length; i++) {
            const p = list[i];
            try {
                await databaseService.savePerson(p);
                ok++;
            } catch (e) {
                console.error(e);
            }
            onProgress?.({ current: i + 1, total: list.length });
        }
        const savedPeople = await databaseService.getSavedPeople();
        setPeople(savedPeople);
        await logSpreadsheetImport(`Imported ${ok} of ${list.length} people into the database.`, meta?.comment);
        toast.success(`Imported ${ok} of ${list.length} people${meta?.comment?.trim() ? ' · note saved' : ''}`);
    };

    const handleSpreadsheetCompaniesImport = async (
        rows: SpreadsheetRow[],
        meta?: { comment?: string },
        onProgress?: (p: SpreadsheetImportProgress) => void,
    ) => {
        const { rowsToImportedCompanies } = await import('@/lib/importSpreadsheet');
        const { logSpreadsheetImport } = await import('@/lib/logImportActivity');
        const list = rowsToImportedCompanies(rows, 'db_import');
        onProgress?.({ current: 0, total: list.length });
        let ok = 0;
        for (let i = 0; i < list.length; i++) {
            const c = list[i];
            try {
                await databaseService.saveCompany(c);
                ok++;
            } catch (e) {
                console.error(e);
            }
            onProgress?.({ current: i + 1, total: list.length });
        }
        const savedCompanies = await databaseService.getSavedCompanies();
        setCompanies(savedCompanies);
        await logSpreadsheetImport(`Imported ${ok} of ${list.length} companies into the database.`, meta?.comment);
        toast.success(`Imported ${ok} of ${list.length} companies${meta?.comment?.trim() ? ' · note saved' : ''}`);
    };

    const handleSpreadsheetShowsImport = async (
        rows: SpreadsheetRow[],
        meta?: { comment?: string },
        onProgress?: (p: SpreadsheetImportProgress) => void,
    ) => {
        const { rowsToShowZohoPayloads } = await import('@/lib/importSpreadsheet');
        const { logSpreadsheetImport } = await import('@/lib/logImportActivity');
        const payloads = rowsToShowZohoPayloads(rows);
        if (payloads.length === 0) {
            toast.error('No valid rows. Each row needs an event name (Event_Name, Event, Name, or Show).');
            return;
        }
        onProgress?.({ current: 0, total: payloads.length });
        let ok = 0;
        const { data: maxIdRows } = await supabase
            .from('shows')
            .select('id')
            .order('id', { ascending: false })
            .limit(1);
        let nextId = Number(maxIdRows?.[0]?.id || 0);
        for (let i = 0; i < payloads.length; i++) {
            const payload = payloads[i];
            try {
                nextId += 1;
                const row = {
                    id: nextId,
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
                const { error } = await supabase.from('shows').insert(row);
                if (!error) ok++;
            } catch (e) {
                console.error(e);
            }
            onProgress?.({ current: i + 1, total: payloads.length });
        }
        await fetchShows();
        await logSpreadsheetImport(`Created ${ok} of ${payloads.length} shows in Supabase from spreadsheet.`, meta?.comment);
        toast.success(`Created ${ok} of ${payloads.length} shows in Supabase${meta?.comment?.trim() ? ' · note saved' : ''}`);
    };

    return (
        <div className="flex flex-col lg:flex-row h-full gap-6">
            {selectedPerson && (
                <LeadDetailModal
                    lead={selectedPerson}
                    personSaveOrigin="manual_entry"
                    onClose={() => {
                        setSelectedPerson(null);
                    }}
                    onUnlock={handleUnlock}
                    onPersonUpdated={(updated) => {
                        setPeople((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
                        setSelectedPerson(updated);
                    }}
                />
            )}

            <DatabaseShowDetailModal
                isOpen={isShowDetailsOpen}
                onClose={() => {
                    setIsShowDetailsOpen(false);
                    setSelectedShow(null);
                }}
                show={selectedShow}
            />


            {/* Main Content */}
            <div className="flex-1 bg-white/95 border border-zinc-200 rounded-2xl p-6 lg:p-8 flex flex-col overflow-hidden shadow-xl shadow-zinc-950/5">
                <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-8 gap-6">
                    <div>
                        <p className="text-xs font-bold text-orange-600 uppercase tracking-[0.22em] mb-1">CRM</p>
                        <h1 className="text-2xl lg:text-3xl font-bold text-zinc-950 tracking-tight mb-1">
                            {activeView === 'people' ? 'People' : 'Shows'}
                        </h1>
                        <p className="text-zinc-500 text-xs font-medium">
                            {activeView === 'shows'
                                ? 'Trade shows and exhibitions — grid or calendar.'
                                : `Manage your ${activeView} database`}
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">
                        <div className="relative flex-1 sm:flex-none">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                            <input
                                type="text"
                                placeholder={`Search ${activeView}...`}
                                value={dbSearch}
                                onChange={(e) => setDbSearch(e.target.value)}
                                className="w-full sm:w-[300px] bg-white text-zinc-950 text-xs font-medium pl-10 pr-4 py-3 rounded-xl border border-zinc-200 focus:border-orange-400 focus:ring-4 focus:ring-orange-100 outline-none transition-all placeholder:text-zinc-400 shadow-sm"
                            />
                        </div>

                        {activeView === 'shows' ? (
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setShowFilters(!showFilters)}
                                    className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all active:scale-95 border ${showFilters ? 'bg-orange-50 text-orange-600 border-orange-300' : 'bg-white text-zinc-700 border-zinc-200 hover:text-zinc-950 hover:bg-orange-50 hover:border-orange-200 shadow-sm'}`}
                                >
                                    <Filter className="w-3.5 h-3.5" /> Filters
                                </button>
                                <div className="flex bg-zinc-100 rounded-xl p-0.5 shadow-inner">
                                    <button
                                        type="button"
                                        onClick={() => setShowsView('grid')}
                                        className={`p-2 rounded-lg transition-all ${showsView === 'grid' ? 'bg-white text-zinc-950 shadow-sm' : 'text-zinc-400 hover:text-zinc-700'}`}
                                        title="Grid view"
                                    >
                                        <LayoutGrid className="w-4 h-4" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowsView('calendar')}
                                        className={`p-2 rounded-lg transition-all ${showsView === 'calendar' ? 'bg-white text-zinc-950 shadow-sm' : 'text-zinc-400 hover:text-zinc-700'}`}
                                        title="Calendar view"
                                    >
                                        <Calendar className="w-4 h-4" />
                                    </button>
                                </div>
                                <button
                                    onClick={fetchShows}
                                    disabled={showsLoading}
                                    className="h-10 w-10 flex items-center justify-center rounded-xl bg-white border border-zinc-200 text-zinc-500 hover:text-zinc-950 hover:border-orange-200 hover:bg-orange-50 transition-all disabled:opacity-50 shadow-sm"
                                >
                                    <RefreshCw className={`w-3.5 h-3.5 ${showsLoading ? 'animate-spin' : ''}`} />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSpreadsheetImport('shows')}
                                    className="px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all active:scale-95 border border-zinc-200 bg-white text-zinc-700 hover:text-zinc-950 hover:bg-orange-50 hover:border-orange-200 shadow-sm"
                                >
                                    <FileSpreadsheet className="w-3.5 h-3.5" /> Import
                                </button>
                            </div>
                        ) : (
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowFilters(!showFilters)}
                                    className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all active:scale-95 border ${showFilters ? 'bg-orange-50 text-orange-600 border-orange-300' : 'bg-white text-zinc-700 border-zinc-200 hover:text-zinc-950 hover:bg-orange-50 hover:border-orange-200 shadow-sm'}`}
                                >
                                    <Filter className="w-3.5 h-3.5" /> Filters
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSpreadsheetImport('people')}
                                    className="px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all active:scale-95 border border-zinc-200 bg-white text-zinc-700 hover:text-zinc-950 hover:bg-orange-50 hover:border-orange-200 shadow-sm"
                                >
                                    <FileSpreadsheet className="w-3.5 h-3.5" /> Import
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsCreatePersonOpen(true)}
                                    className="bg-zinc-950 hover:bg-zinc-800 text-white px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-zinc-950/15"
                                >
                                    <Plus className="w-3.5 h-3.5" /> Add Person
                                </button>
                            </div>
                        )}
                    </div >
                </div >

                {/* Filters Panel */}
                <AnimatePresence>
                    {
                        showFilters && activeView !== 'shows' && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden mb-6"
                            >
                                <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {activeView === 'people' ? (
                                        <div className="space-y-3 md:col-span-3">
                                            <div className="flex flex-wrap gap-2">
                                                {['Need to Contact', 'Good Lead', 'Not Interested', 'Need a Follow Up'].map((status) => {
                                                    const isActive = filters.contactStatus.includes(status);
                                                    return (
                                                        <button
                                                            key={status}
                                                            onClick={() => {
                                                                setFilters(prev => {
                                                                    const current = prev.contactStatus;
                                                                    const isSelected = current.includes(status);
                                                                    const newStatus = isSelected
                                                                        ? current.filter(s => s !== status)
                                                                        : [...current, status];
                                                                    return { ...prev, contactStatus: newStatus };
                                                                });
                                                            }}
                                                            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all border ${isActive
                                                                ? 'bg-zinc-950 text-white border-zinc-950'
                                                                : 'bg-white text-zinc-600 border-zinc-200 hover:border-orange-300 hover:text-zinc-950'
                                                                }`}
                                                        >
                                                            {status}
                                                        </button>
                                                    );
                                                })}
                                                {filters.contactStatus.length > 0 && (
                                                    <button
                                                        onClick={() => setFilters(prev => ({ ...prev, contactStatus: [] }))}
                                                        className="px-3 py-1.5 text-xs font-medium text-red-600 hover:text-red-500 transition-colors"
                                                    >
                                                        Clear
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ) : activeView === 'shows' ? (
                                        <>
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Country</label>
                                                <div className="relative">
                                                    <select
                                                        value={filters.showCountry}
                                                        onChange={(e) => setFilters(prev => ({ ...prev, showCountry: e.target.value }))}
                                                        className="w-full bg-white border border-zinc-200 rounded-xl px-4 py-2.5 text-sm text-zinc-950 focus:outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100 appearance-none cursor-pointer shadow-sm"
                                                    >
                                                        <option value="">All Countries</option>
                                                        {uniqueCountries.map(c => (
                                                            <option key={c} value={c}>{c}</option>
                                                        ))}
                                                    </select>
                                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                                                        <svg className="w-3 h-3 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">World Area</label>
                                                <div className="relative">
                                                    <select
                                                        value={filters.showWorldArea}
                                                        onChange={(e) => setFilters(prev => ({ ...prev, showWorldArea: e.target.value }))}
                                                        className="w-full bg-white border border-zinc-200 rounded-xl px-4 py-2.5 text-sm text-zinc-950 focus:outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100 appearance-none cursor-pointer shadow-sm"
                                                    >
                                                        <option value="">All Areas</option>
                                                        {uniqueWorldAreas.map(a => (
                                                            <option key={a} value={a}>{a}</option>
                                                        ))}
                                                    </select>
                                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                                                        <svg className="w-3 h-3 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-3">
                                                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Features</label>
                                                <div className="flex flex-wrap gap-2">
                                                    <button
                                                        onClick={() => setFilters(prev => ({ ...prev, showExhibitorsOnly: !prev.showExhibitorsOnly }))}
                                                        className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all border ${filters.showExhibitorsOnly
                                                            ? 'bg-zinc-950 text-white border-zinc-950 shadow-sm'
                                                            : 'bg-white text-zinc-600 border-zinc-200 hover:border-orange-300 hover:text-zinc-950'
                                                            }`}
                                                    >
                                                        Exhibitors List
                                                    </button>
                                                    <button
                                                        onClick={() => setFilters(prev => ({ ...prev, showFloorplanOnly: !prev.showFloorplanOnly }))}
                                                        className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all border ${filters.showFloorplanOnly
                                                            ? 'bg-zinc-950 text-white border-zinc-950 shadow-sm'
                                                            : 'bg-white text-zinc-600 border-zinc-200 hover:border-orange-300 hover:text-zinc-950'
                                                            }`}
                                                    >
                                                        Floorplan
                                                    </button>
                                                    {(filters.showExhibitorsOnly || filters.showFloorplanOnly) && (
                                                        <button
                                                            onClick={() => setFilters(prev => ({ ...prev, showExhibitorsOnly: false, showFloorplanOnly: false }))}
                                                            className="px-3 py-1.5 text-xs font-medium text-red-600 hover:text-red-500 transition-colors"
                                                        >
                                                            Clear
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </>
                                    ) : null}
                                </div>
                            </motion.div>
                        )
                    }
                </AnimatePresence>

                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                    {activeView === 'shows' ? (
                        showsLoading ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pb-20">
                                {[...Array(6)].map((_, i) => (
                                    <CompanyCardSkeleton key={i} />
                                ))}
                            </div>
                        ) : filteredShows.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center">
                                <div className="w-24 h-24 rounded-full bg-orange-50 flex items-center justify-center mb-4">
                                    <Calendar className="w-10 h-10 text-orange-500" />
                                </div>
                                <p className="text-zinc-700 font-medium text-sm">No shows found</p>
                                <p className="text-zinc-500 text-xs mt-1">Try refreshing or broadening your search.</p>
                            </div>
                        ) : showsView === 'grid' ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 pb-20">
                                {filteredShows.map((show: any, idx: number) => {
                                    const showId = String(show.id ?? idx);
                                    const showName = show.name || 'Unnamed Show';
                                    const city = show.city || '';
                                    const country = show.country || '';
                                    const industry = show.industry || '';
                                    const eventType = show.event_type || '';
                                    const organiser = show.organiser || '';
                                    const note = show.note || '';
                                    const startDate = show.starting_date || '';
                                    const location = [city, country].filter(Boolean).join(', ');
                                    const coverImage = showLocalImages[showId];
                                    let dateShort = '';
                                    if (startDate) {
                                        try {
                                            const d = new Date(startDate);
                                            if (!Number.isNaN(d.getTime())) {
                                                dateShort = d.toLocaleDateString(undefined, {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    year: 'numeric',
                                                });
                                            }
                                        } catch { /* */ }
                                    }

                                    return (
                                        <motion.div
                                            key={show.id || idx}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: Math.min(idx * 0.04, 0.3) }}
                                            className="h-full"
                                        >
                                            <div
                                                role="button"
                                                tabIndex={0}
                                                onClick={() => openShowDetails(show)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' || e.key === ' ') {
                                                        e.preventDefault();
                                                        openShowDetails(show);
                                                    }
                                                }}
                                                className="flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm outline-none transition-all duration-200 hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-lg hover:shadow-zinc-950/8 focus-visible:ring-2 focus-visible:ring-orange-400/35 focus-visible:ring-offset-2"
                                            >
                                                <div className="relative h-36 w-full overflow-hidden border-b border-zinc-200 bg-linear-to-br from-zinc-100 via-zinc-50 to-orange-50">
                                                    {coverImage ? (
                                                        <img
                                                            src={coverImage}
                                                            alt={showName}
                                                            className="h-full w-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="flex h-full items-center justify-center px-6 text-center text-[11px] font-semibold text-zinc-400">
                                                            Add a local image preview for this show
                                                        </div>
                                                    )}
                                                    <label
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="absolute right-3 top-3 inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-zinc-200 bg-white/90 px-2.5 py-1.5 text-[10px] font-bold text-zinc-700 shadow-sm transition-colors hover:bg-white"
                                                    >
                                                        <ImagePlus className="h-3.5 w-3.5" />
                                                        Image
                                                        <input
                                                            type="file"
                                                            accept="image/*"
                                                            className="hidden"
                                                            onChange={(e) => {
                                                                e.stopPropagation();
                                                                const file = e.target.files?.[0] || null;
                                                                setLocalShowImage(showId, file);
                                                                e.currentTarget.value = '';
                                                            }}
                                                        />
                                                    </label>
                                                </div>
                                                <div className="flex flex-1 flex-col p-5">
                                                    <div className="mb-3 flex items-start justify-between gap-2">
                                                        {dateShort ? (
                                                            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-zinc-500">
                                                                <Calendar className="h-3 w-3 text-zinc-400" />
                                                                {dateShort}
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-zinc-400">
                                                                <Calendar className="h-3 w-3 text-zinc-300" />
                                                                Date TBC
                                                            </span>
                                                        )}
                                                    </div>
                                                    <h3 className="line-clamp-2 min-h-10 text-base font-semibold leading-snug text-zinc-950">
                                                        {showName}
                                                    </h3>
                                                    <div className="mt-2 flex flex-wrap gap-1.5">
                                                        {industry && (
                                                            <span className="inline-flex rounded-md border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[10px] font-semibold text-zinc-600">
                                                                {industry}
                                                            </span>
                                                        )}
                                                        {eventType && (
                                                            <span className="inline-flex rounded-md border border-orange-200 bg-orange-50 px-2 py-0.5 text-[10px] font-semibold text-orange-700">
                                                                {eventType}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {location && (
                                                        <p className="mt-2 flex items-center gap-1.5 text-xs text-zinc-500">
                                                            <MapPin className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
                                                            <span className="line-clamp-2">{location}</span>
                                                        </p>
                                                    )}
                                                    {organiser && (
                                                        <p className="mt-2 text-xs text-zinc-500">
                                                            Organizer: <span className="font-medium text-zinc-700">{organiser}</span>
                                                        </p>
                                                    )}
                                                    {note && (
                                                        <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-zinc-500">
                                                            {note}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="space-y-10 pb-20">
                                {(() => {
                                    const months: Record<string, any[]> = {};
                                    filteredShows.forEach((show: any) => {
                                        const raw = show.starting_date || '';
                                        let key = 'No Date';
                                        if (raw) {
                                            try {
                                                const d = new Date(raw);
                                                if (!isNaN(d.getTime())) {
                                                    key = d.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
                                                }
                                            } catch { /* keep 'No Date' */ }
                                        }
                                        if (!months[key]) months[key] = [];
                                        months[key].push(show);
                                    });

                                    const currentMonthKey = new Date().toLocaleDateString('en-US', {
                                        year: 'numeric',
                                        month: 'long',
                                    });
                                    const monthKeyToSortTime = (key: string): number => {
                                        if (key === 'No Date') return Number.MAX_SAFE_INTEGER;
                                        const m = key.match(/^(\S+)\s+(\d{4})$/);
                                        if (!m) return Number.MAX_SAFE_INTEGER - 1;
                                        const t = new Date(`${m[1]} 1, ${m[2]}`).getTime();
                                        return isNaN(t) ? Number.MAX_SAFE_INTEGER - 1 : t;
                                    };
                                    const currentMonthTime = monthKeyToSortTime(currentMonthKey);
                                    const sortedMonthEntries = Object.entries(months).sort((a, b) => {
                                        const [keyA, keyB] = [a[0], b[0]];
                                        // Current month always first
                                        if (keyA === currentMonthKey && keyB !== currentMonthKey) return -1;
                                        if (keyB === currentMonthKey && keyA !== currentMonthKey) return 1;

                                        const timeA = monthKeyToSortTime(keyA);
                                        const timeB = monthKeyToSortTime(keyB);
                                        const aIsFuture = timeA >= currentMonthTime;
                                        const bIsFuture = timeB >= currentMonthTime;

                                        // Future months come before past months
                                        if (aIsFuture && !bIsFuture) return -1;
                                        if (!aIsFuture && bIsFuture) return 1;

                                        // Among future months: ascending (nearest first)
                                        if (aIsFuture && bIsFuture) return timeA - timeB;

                                        // Among past months: descending (most recent first)
                                        return timeB - timeA;
                                    });

                                    return sortedMonthEntries.map(([month, items]) => {
                                        const sortedItems = [...items].sort((a: any, b: any) => {
                                            const ta = a.starting_date ? new Date(a.starting_date).getTime() : 0;
                                            const tb = b.starting_date ? new Date(b.starting_date).getTime() : 0;
                                            return ta - tb;
                                        });
                                        const isThisMonth = month === currentMonthKey;
                                        const isPast = month !== 'No Date' && monthKeyToSortTime(month) < currentMonthTime;
                                        return (
                                            <div
                                                key={month}
                                                className={`relative overflow-hidden rounded-3xl border border-zinc-200 bg-white ${isPast ? 'opacity-60 bg-zinc-50/50' : ''}`}
                                            >
                                                <div className="p-5 pl-6 sm:p-6 sm:pl-8">
                                                    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                                                        <div>
                                                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">Month</p>
                                                            <div className="mt-1 flex flex-wrap items-center gap-2">
                                                                <h3 className="text-xl font-semibold tracking-tight text-zinc-900 sm:text-2xl">{month}</h3>
                                                                {isThisMonth && (
                                                                    <span className="rounded-full border border-zinc-200 bg-zinc-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-zinc-700">
                                                                        This month
                                                                    </span>
                                                                )}
                                                                {isPast && (
                                                                    <span className="rounded-full border border-zinc-200 bg-zinc-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-zinc-500">
                                                                        Past
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-zinc-100 bg-zinc-50">
                                                                <Calendar className="h-5 w-5 text-zinc-400" />
                                                            </span>
                                                            <div className="text-right">
                                                                <p className="text-2xl font-bold leading-none text-zinc-950">{items.length}</p>
                                                                <p className="text-[10px] font-medium uppercase text-zinc-500">event{items.length !== 1 ? 's' : ''}</p>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="relative space-y-2">
                                                        <div className="pointer-events-none absolute left-[22px] top-2 bottom-2 w-px bg-zinc-100 sm:left-[26px]" />
                                                        {sortedItems.map((show: any, i: number) => {
                                                            const showName = show.name || 'Unnamed Show';
                                                            const city = show.city || '';
                                                            const country = show.country || '';
                                                            const industry = show.industry || '';
                                                            const startDate = show.starting_date || '';
                                                            const location = [city, country].filter(Boolean).join(', ');
                                                            let dayNum = '';
                                                            let weekDay = '';
                                                            if (startDate) {
                                                                try {
                                                                    const d = new Date(startDate);
                                                                    if (!Number.isNaN(d.getTime())) {
                                                                        dayNum = String(d.getDate());
                                                                        weekDay = d.toLocaleDateString(undefined, { weekday: 'short' });
                                                                    }
                                                                } catch { /* */ }
                                                            }

                                                            return (
                                                                <div
                                                                    key={show.id || i}
                                                                    className="group relative flex gap-3 pl-0 sm:gap-4"
                                                                >
                                                                    <div className="relative z-10 flex w-12 shrink-0 flex-col items-center sm:w-14">
                                                                        {dayNum ? (
                                                                            <div className="flex h-12 w-12 flex-col items-center justify-center rounded-2xl border border-zinc-200 bg-white shadow-sm sm:h-14 sm:w-14">
                                                                                <span className="text-[9px] font-bold uppercase text-zinc-400">{weekDay}</span>
                                                                                <span className="text-lg font-bold leading-none text-zinc-900">{dayNum}</span>
                                                                            </div>
                                                                        ) : (
                                                                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border-2 border-dashed border-zinc-200 bg-zinc-50 text-zinc-400 sm:h-14 sm:w-14">
                                                                                <span className="text-[10px] font-bold">—</span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    <div
                                                                        role="button"
                                                                        tabIndex={0}
                                                                        onClick={() => openShowDetails(show)}
                                                                        onKeyDown={(e) => {
                                                                            if (e.key === 'Enter' || e.key === ' ') {
                                                                                e.preventDefault();
                                                                                openShowDetails(show);
                                                                            }
                                                                        }}
                                                                        className="min-w-0 flex-1 cursor-pointer rounded-2xl border border-zinc-200 bg-white p-3.5 transition-all duration-200 hover:border-zinc-300 hover:shadow-md sm:p-4"
                                                                    >
                                                                        <h4 className="text-sm font-semibold text-zinc-900 transition-colors group-hover:text-zinc-600 sm:text-base">
                                                                            {showName}
                                                                        </h4>
                                                                        {location && (
                                                                            <p className="mt-1 flex items-center gap-1.5 text-xs text-zinc-500">
                                                                                <MapPin className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
                                                                                <span className="truncate">{location}</span>
                                                                            </p>
                                                                        )}
                                                                        {industry && (
                                                                            <span className="mt-2 inline-flex rounded-md border border-zinc-100 bg-zinc-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-zinc-600">
                                                                                {industry}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    });
                                })()}
                            </div>
                        )
                    ) : loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pb-20">
                            {[...Array(6)].map((_, i) => (
                                <CompanyCardSkeleton key={i} />
                            ))}
                        </div>
                    ) : filteredData.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center">
                            <div className="w-24 h-24 rounded-full bg-orange-50 flex items-center justify-center mb-4">
                                <Database className="w-10 h-10 text-orange-500" />
                            </div>
                            <p className="text-zinc-700 font-medium text-sm">No {activeView} found</p>
                            <p className="text-zinc-500 text-xs mt-1">Try adjusting your filters or add a new record.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pb-20">
                            {(filteredData as SavedPerson[]).map((person, idx) => (
                                <motion.div
                                    key={person.id}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: idx * 0.05 }}
                                >
                                    <ProfileCard
                                        lead={person}
                                        actionIcon={Trash2}
                                        onAction={() => handleDeletePersonClick(person)}
                                        onClick={() => {
                                            setSelectedPerson(person);
                                        }}
                                        actionType="delete"
                                        isSaved={true}
                                    />
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>
            </div >

            {/* Modals */}
            < CreatePersonModal
                isOpen={isCreatePersonOpen}
                onClose={() => setIsCreatePersonOpen(false)}
                onSubmit={handleCreatePerson}
            />
            <CreateCompanyModal
                isOpen={isCreateCompanyOpen}
                onClose={() => setIsCreateCompanyOpen(false)}
                onSubmit={handleCreateCompany}
            />
            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ isOpen: false, type: null, id: null, name: '' })}
                onConfirm={confirmDelete}
                title={`Delete ${confirmModal.type === 'company' ? 'Company' : 'Person'}`}
                message={`Are you sure you want to delete "${confirmModal.name}"? This action cannot be undone.`}
                confirmText="Delete"
                isDestructive
            />

            {spreadsheetImport === 'people' && (
                <SpreadsheetImportModal
                    isOpen
                    onClose={() => setSpreadsheetImport(null)}
                    title="Import people (CSV / Excel)"
                    columnHint={
                        <>
                            Use columns such as: <strong>Name</strong> (or First Name + Last Name), <strong>Email</strong>,{' '}
                            <strong>Title</strong>, <strong>Company</strong>, <strong>LinkedIn</strong>, <strong>Phone</strong>,{' '}
                            <strong>Location</strong>, <strong>Website</strong>.
                        </>
                    }
                    demoCsvTemplate={fpMarketingImportDemoTemplates.people}
                    onImportRows={handleSpreadsheetPeopleImport}
                />
            )}
            {spreadsheetImport === 'companies' && (
                <SpreadsheetImportModal
                    isOpen
                    onClose={() => setSpreadsheetImport(null)}
                    title="Import companies (CSV / Excel)"
                    columnHint={
                        <>
                            Use columns such as: <strong>Company</strong> (or Company Name), <strong>Website</strong> / Domain,{' '}
                            <strong>Industry</strong>, <strong>Location</strong>, <strong>Employees</strong>, <strong>Revenue</strong>,{' '}
                            <strong>Founded</strong>, <strong>Description</strong>, <strong>LinkedIn</strong>.
                        </>
                    }
                    demoCsvTemplate={fpMarketingImportDemoTemplates.companies}
                    onImportRows={handleSpreadsheetCompaniesImport}
                />
            )}
            {spreadsheetImport === 'shows' && (
                <SpreadsheetImportModal
                    isOpen
                    onClose={() => setSpreadsheetImport(null)}
                    title="Import shows (CSV / Excel)"
                    columnHint={
                        <>
                            Required: <strong>Event_Name</strong> (or Event / Name / Show). Optional: Event_Type, Starting_Date
                            (YYYY-MM-DD), Industry, Level, World_Area, Country, City, Frequency.
                        </>
                    }
                    demoCsvTemplate={fpMarketingImportDemoTemplates.showsZoho}
                    onImportRows={handleSpreadsheetShowsImport}
                />
            )}
        </div >
    );
};
