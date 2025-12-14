import React, { useState, useMemo, useEffect } from 'react';
import {
    FolderOpen, Search, Database, Trash2, Users, Building2, Plus, Filter, MapPin
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

import { ProfileCard } from './ProfileCard';
import { CompanyCard, Company } from './CompanyCard';
import { CreatePersonModal } from './CreatePersonModal';
import { CreateCompanyModal } from './CreateCompanyModal';
import { CompanyDetailsModal } from './CompanyDetailsModal';
import { LeadDetailModal } from './LeadDetailModal';
import { CompanyCardSkeleton } from './CompanyCardSkeleton';
import { ConfirmModal } from './ui/ConfirmModal';
import { databaseService, SavedPerson } from '@/services/databaseService';

interface DatabasePageProps {
    notify: (msg: string, type?: string) => void;
}

export const DatabasePage: React.FC<DatabasePageProps> = ({ notify }) => {
    const [activeView, setActiveView] = useState<'people' | 'companies'>('people');
    const [people, setPeople] = useState<SavedPerson[]>([]);
    const [companies, setCompanies] = useState<Company[]>([]);
    const [dbSearch, setDbSearch] = useState<string>('');
    const [loading, setLoading] = useState(false);

    // Filter State
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState({
        industry: '',
        location: '',
        employees: '',
        contactStatus: [] as string[]
    });

    // Modal States
    const [isCreatePersonOpen, setIsCreatePersonOpen] = useState(false);
    const [isCreateCompanyOpen, setIsCreateCompanyOpen] = useState(false);
    const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
    const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
    const [selectedPerson, setSelectedPerson] = useState<SavedPerson | null>(null);

    // Confirmation modal state
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        type: 'company' | 'person' | null;
        id: string | null;
        name: string;
    }>({ isOpen: false, type: null, id: null, name: '' });

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

    const uniqueIndustries = useMemo(() => {
        const industries = new Set(companies.map(c => c.industry).filter(Boolean));
        return Array.from(industries).sort();
    }, [companies]);

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

            const unlockedLead = { ...data.lead, isSaved: true };

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

    return (
        <div className="flex flex-col lg:flex-row h-full gap-6">
            {selectedPerson && (
                <LeadDetailModal
                    lead={selectedPerson}
                    onClose={() => {
                        setSelectedPerson(null);
                    }}
                    onUnlock={handleUnlock}
                />
            )}
            {/* Database Sidebar */}
            <div className="w-full lg:w-72 flex-shrink-0 flex flex-col h-full bg-[#09090b] border border-white/5 rounded-[32px] p-6">
                <h2 className="text-sm font-bold text-white mb-6 flex items-center gap-2.5">
                    <Database className="w-4 h-4 text-orange-500" /> Database
                </h2>

                <div className="space-y-2">
                    <button
                        onClick={() => setActiveView('people')}
                        className={`w-full text-left px-4 py-3 rounded-xl text-xs font-medium transition-all flex items-center gap-3 group ${activeView === 'people' ? 'bg-zinc-900 text-white border border-white/5' : 'text-zinc-500 hover:text-white hover:bg-white/5 border border-transparent'}`}
                    >
                        <Users className={`w-4 h-4 ${activeView === 'people' ? 'text-orange-500' : 'text-zinc-600 group-hover:text-zinc-400'}`} />
                        <span>People</span>
                        {activeView === 'people' && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-orange-500"></div>}
                    </button>

                    <button
                        onClick={() => setActiveView('companies')}
                        className={`w-full text-left px-4 py-3 rounded-xl text-xs font-medium transition-all flex items-center gap-3 group ${activeView === 'companies' ? 'bg-zinc-900 text-white border border-white/5' : 'text-zinc-500 hover:text-white hover:bg-white/5 border border-transparent'}`}
                    >
                        <Building2 className={`w-4 h-4 ${activeView === 'companies' ? 'text-orange-500' : 'text-zinc-600 group-hover:text-zinc-400'}`} />
                        <span>Companies</span>
                        {activeView === 'companies' && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-orange-500"></div>}
                    </button>
                </div>

                <div className="mt-auto pt-4 border-t border-white/5">
                    <div className="px-4 py-2 text-xs text-zinc-500 flex items-center gap-2">
                        <FolderOpen className="w-3 h-3" /> {activeView === 'people' ? `${people.length} People` : `${companies.length} Companies`}
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 bg-[#09090b] border border-white/5 rounded-[32px] p-6 lg:p-8 flex flex-col overflow-hidden">
                <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-8 gap-6">
                    <div>
                        <h1 className="text-2xl font-bold text-white tracking-tight mb-1">
                            {activeView === 'people' ? 'People' : 'Companies'}
                        </h1>
                        <p className="text-zinc-500 text-xs font-medium">
                            Manage your {activeView} database
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">
                        <div className="relative flex-1 sm:flex-none">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                            <input
                                type="text"
                                placeholder={`Search ${activeView}...`}
                                value={dbSearch}
                                onChange={(e) => setDbSearch(e.target.value)}
                                className="w-full sm:w-[300px] bg-zinc-900 text-white text-xs font-medium pl-10 pr-4 py-3 rounded-xl border border-white/5 focus:border-white/10 outline-none transition-all placeholder:text-zinc-600"
                            />
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all active:scale-95 border ${showFilters ? 'bg-zinc-800 text-white border-white/10' : 'bg-zinc-900 text-zinc-400 border-white/5 hover:text-white hover:bg-zinc-800'}`}
                            >
                                <Filter className="w-3.5 h-3.5" /> Filters
                            </button>
                            <button
                                onClick={() => activeView === 'people' ? setIsCreatePersonOpen(true) : setIsCreateCompanyOpen(true)}
                                className="bg-white hover:bg-zinc-200 text-black px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-white/5"
                            >
                                <Plus className="w-3.5 h-3.5" /> Add {activeView === 'people' ? 'Person' : 'Company'}
                            </button>
                        </div>
                    </div >
                </div >

                {/* Filters Panel */}
                <AnimatePresence>
                    {
                        showFilters && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden mb-6"
                            >
                                <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {activeView === 'companies' ? (
                                        <>
                                            {/* Industry Filter */}
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Industry</label>
                                                <div className="relative">
                                                    <select
                                                        value={filters.industry}
                                                        onChange={(e) => setFilters(prev => ({ ...prev, industry: e.target.value }))}
                                                        className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/50 appearance-none cursor-pointer"
                                                    >
                                                        <option value="">All Industries</option>
                                                        {uniqueIndustries.map(ind => (
                                                            <option key={ind} value={ind}>{ind}</option>
                                                        ))}
                                                    </select>
                                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                                                        <svg className="w-3 h-3 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Location Filter */}
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Location</label>
                                                <div className="relative">
                                                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                                                    <input
                                                        type="text"
                                                        placeholder="City, Country..."
                                                        value={filters.location}
                                                        onChange={(e) => setFilters(prev => ({ ...prev, location: e.target.value }))}
                                                        className="w-full bg-zinc-900 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/50 placeholder:text-zinc-600"
                                                    />
                                                </div>
                                            </div>

                                            {/* Employees Filter */}
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Employees</label>
                                                <div className="relative">
                                                    <select
                                                        value={filters.employees}
                                                        onChange={(e) => setFilters(prev => ({ ...prev, employees: e.target.value }))}
                                                        className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/50 appearance-none cursor-pointer"
                                                    >
                                                        <option value="">Any Size</option>
                                                        <option value="1-10">1-10 Employees</option>
                                                        <option value="11-50">11-50 Employees</option>
                                                        <option value="51-200">51-200 Employees</option>
                                                        <option value="201-500">201-500 Employees</option>
                                                        <option value="501-1000">501-1000 Employees</option>
                                                        <option value="1000+">1000+ Employees</option>
                                                    </select>
                                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                                                        <svg className="w-3 h-3 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                                    </div>
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        /* People Filters - Contact Status */
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
                                                            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${isActive
                                                                ? 'bg-zinc-100 text-black border border-transparent'
                                                                : 'bg-transparent text-zinc-500 border border-zinc-800 hover:border-zinc-700 hover:text-zinc-300'
                                                                }`}
                                                        >
                                                            {status}
                                                        </button>
                                                    );
                                                })}
                                                {filters.contactStatus.length > 0 && (
                                                    <button
                                                        onClick={() => setFilters(prev => ({ ...prev, contactStatus: [] }))}
                                                        className="px-3 py-1.5 text-xs font-medium text-red-400 hover:text-red-300 transition-colors"
                                                    >
                                                        Clear
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )
                    }
                </AnimatePresence >

                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pb-20">
                            {[...Array(6)].map((_, i) => (
                                <CompanyCardSkeleton key={i} />
                            ))}
                        </div>
                    ) : filteredData.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center opacity-40">
                            <div className="w-24 h-24 rounded-full bg-zinc-900 flex items-center justify-center mb-4 border border-white/5">
                                <Database className="w-10 h-10 text-zinc-600" />
                            </div>
                            <p className="text-zinc-500 font-medium text-sm">No {activeView} found</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pb-20">
                            {activeView === 'people' ? (
                                (filteredData as SavedPerson[]).map((person, idx) => (
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
                                        />
                                    </motion.div>
                                ))
                            ) : (
                                (filteredData as Company[]).map((company, idx) => (
                                    <motion.div
                                        key={company.id}
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: idx * 0.05 }}
                                    >
                                        <CompanyCard
                                            company={company}
                                            actionIcon={Trash2}
                                            onAction={() => handleDeleteCompanyClick(company)}
                                            onClick={() => {
                                                setSelectedCompany(company);
                                                setIsCompanyModalOpen(true);
                                            }}
                                        />
                                    </motion.div>
                                ))
                            )}
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
            <CompanyDetailsModal
                company={selectedCompany}
                isOpen={isCompanyModalOpen}
                onClose={() => setIsCompanyModalOpen(false)}
                onSave={async () => {
                    setIsCompanyModalOpen(false);
                }}
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
        </div >
    );
};
