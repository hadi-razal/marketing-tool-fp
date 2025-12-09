import React, { useState } from 'react';
import {
    User, Sliders, Loader2, Zap, UploadCloud, Save, LayoutGrid, Search, Filter, Building2, Users, Download
} from 'lucide-react';
import { SoftInput } from './ui/Input';
import { ProfileCard } from './ProfileCard';
import { CompanyCard } from './CompanyCard';
import { CompanyDetailsModal } from './CompanyDetailsModal';
import { LeadDetailModal } from './LeadDetailModal';
import { motion } from 'framer-motion';
import { databaseService } from '@/services/databaseService';
import { toast } from 'sonner';

// Mock Data Services (Moved from page.tsx)
const enrichCompanyData = async (inputName: string, inputDomain: string, quantity: number) => {
    const cleanDomain = inputDomain ? inputDomain.replace(/^https?:\/\//, '').split('/')[0] : 'company.com';
    await new Promise(resolve => setTimeout(resolve, 200));

    return Array.from({ length: quantity }).map((_, i) => {
        const gender = Math.random() > 0.5 ? 'men' : 'women';
        const name = ['Alice', 'Bob', 'Charlie', 'David', 'Emma', 'Frank', 'Grace', 'Henry'][Math.floor(Math.random() * 8)] +
            ' ' + ['Johnson', 'Smith', 'Lee', 'Chen', 'Wilson', 'Bond'][Math.floor(Math.random() * 6)];

        return {
            id: `lead_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 5)}`,
            name: name,
            title: ['CEO', 'CTO', 'Marketing Director', 'Sales Manager', 'Developer'][i % 5],
            company: inputName || 'Unknown Corp',
            website: cleanDomain,
            location: ['New York, NY', 'San Francisco, CA', 'London, UK', 'Austin, TX'][i % 4],
            email: `${name.split(' ')[0].toLowerCase()}@${cleanDomain}`,
            phone: `+1 555.01${Math.floor(Math.random() * 90) + 10}`,
            linkedin: `linkedin.com/in/${name.replace(' ', '').toLowerCase()}`,
            image: `https://randomuser.me/api/portraits/${gender}/${Math.floor(Math.random() * 50)}.jpg`,
            status: 'Enriched',
            score: Math.floor(Math.random() * 60) + 40, // Mock Score 40-100
        };
    });
};

interface SearchPageProps {
    onSave: (leads: any[]) => void;
}

export const SearchPage: React.FC<SearchPageProps> = ({ onSave }) => {
    const [mode, setMode] = useState<'search' | 'import'>('search');
    const [searchType, setSearchType] = useState<'people' | 'companies'>('people');
    const [filters, setFilters] = useState({ company: '', website: '', title: '', location: '', keywords: '', quantity: 9 });
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [results, setResults] = useState<any[]>([]);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [selectedCompany, setSelectedCompany] = useState<any>(null);
    const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const [processingStatus, setProcessingStatus] = useState('');
    const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
    const [selectedLead, setSelectedLead] = useState<any>(null);

    const handleSearch = async () => {
        if (searchType === 'people' && (!filters.company && !filters.website && !filters.keywords)) return toast.error('Company, Website or Keywords required');
        if (searchType === 'companies' && (!filters.company && !filters.website && !filters.keywords)) return toast.error('Company Name, Website or Keywords required');

        setLoading(true);
        setResults([]);
        setPage(1); // Reset page
        setHasMore(true); // Reset hasMore

        try {
            const endpoint = searchType === 'people' ? '/api/apollo/search' : '/api/apollo/companies';
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...filters, page: 1 }), // Send page 1
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Search failed');
            }

            if (searchType === 'people') {
                // Check if people are already saved
                const leads = data.leads || [];
                const leadsWithStatus = await Promise.all(leads.map(async (lead: any) => {
                    const isSaved = await databaseService.checkPersonSaved(lead.id);
                    return { ...lead, isSaved };
                }));
                setResults(leadsWithStatus);
                if (leads.length === 0) toast.error('No people found matching criteria');
                else toast.success(`Found ${leads.length} people`);
            } else {
                // Check if companies are already saved
                const companies = data.companies || [];
                const companiesWithStatus = await Promise.all(companies.map(async (comp: any) => {
                    const isSaved = await databaseService.checkCompanySaved(comp.id);
                    return { ...comp, isSaved };
                }));

                setResults(companiesWithStatus);

                // Use pagination data if available, otherwise fallback to length check
                if (data.pagination) {
                    setHasMore(data.pagination.page < data.pagination.total_pages);
                } else {
                    // Fallback logic: if we got fewer results than requested, there are no more
                    setHasMore(companies.length >= filters.quantity);
                }

                if (companies.length === 0) {
                    toast.error('No companies found matching criteria');
                    setHasMore(false);
                }
                else toast.success(`Found ${companies.length} companies`);
            }
        } catch (error: any) {
            console.error('Search failed:', error);
            toast.error(error.message || 'Failed to fetch data');
        } finally {
            setLoading(false);
        }
    };

    const handleLoadMore = async () => {
        if (!hasMore || loadingMore) return;

        setLoadingMore(true);
        const nextPage = page + 1;

        try {
            const endpoint = '/api/apollo/companies'; // Only companies support pagination for now based on this context
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...filters, page: nextPage }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Load more failed');
            }

            const companies = data.companies || [];

            if (companies.length === 0) {
                setHasMore(false);
                toast.info('No more companies to load');
            } else {
                const companiesWithStatus = await Promise.all(companies.map(async (comp: any) => {
                    const isSaved = await databaseService.checkCompanySaved(comp.id);
                    return { ...comp, isSaved };
                }));

                setResults(prev => [...prev, ...companiesWithStatus]);
                setPage(nextPage);

                // Update hasMore based on pagination data
                if (data.pagination) {
                    setHasMore(data.pagination.page < data.pagination.total_pages);
                } else {
                    setHasMore(companies.length >= filters.quantity);
                }
            }

        } catch (error: any) {
            console.error('Load more failed:', error);
            toast.error(error.message || 'Failed to load more data');
        } finally {
            setLoadingMore(false);
        }
    };

    const handleSaveCompany = async (company: any) => {
        try {
            await databaseService.saveCompany(company);

            // Update local state to reflect saved status
            setResults(prev => prev.map(c => c.id === company.id ? { ...c, isSaved: true } : c));
            if (selectedCompany && selectedCompany.id === company.id) {
                setSelectedCompany({ ...selectedCompany, isSaved: true });
            }

            toast.success('Company saved to database');
        } catch (error) {
            console.error('Failed to save company:', error);
            toast.error('Failed to save company');
        }
    };

    const handleSavePerson = async (person: any) => {
        try {
            await databaseService.savePerson(person);

            // Update local state to reflect saved status
            setResults(prev => prev.map(p => p.id === person.id ? { ...p, isSaved: true } : p));
            if (selectedLead && selectedLead.id === person.id) {
                setSelectedLead({ ...selectedLead, isSaved: true });
            }

            toast.success('Person saved to database');
        } catch (error) {
            console.error('Failed to save person:', error);
            toast.error('Failed to save person');
        }
    };

    const processFile = async (file: File) => {
        setLoading(true);
        setProcessingStatus('Parsing file...');
        setTimeout(async () => {
            const mockRows = [
                { Company: 'Google', Domain: 'google.com' },
                { Company: 'Microsoft', Domain: 'microsoft.com' },
                { Company: 'Apple', Domain: 'apple.com' },
            ];
            setProcessingStatus(`Fetching ${filters.quantity} people from ${mockRows.length} companies...`);
            let allEnriched: any[] = [];
            for (const row of mockRows) {
                const enriched = await enrichCompanyData(row.Company, row.Domain, filters.quantity);
                allEnriched = [...allEnriched, ...enriched];
            }
            setResults(allEnriched);
            setLoading(false);
            setProcessingStatus('');
            toast.success(`Bulk Search complete: Found ${allEnriched.length} total leads`);
        }, 1500);
    };

    const handleSaveAll = async () => {
        if (results.length === 0) return;

        let savedCount = 0;
        toast.loading(`Saving ${results.length} people...`);

        for (const person of results) {
            if (person.isSaved) continue;
            try {
                await databaseService.savePerson(person);
                savedCount++;
                setResults(prev => prev.map(p => p.id === person.id ? { ...p, isSaved: true } : p));
            } catch (error) {
                console.error(`Failed to save ${person.name}:`, error);
            }
        }

        if (savedCount > 0) {
            toast.success(`Successfully saved ${savedCount} people`);
        } else {
            toast.info('All visible people are already saved');
        }
    };

    const handleUnlock = async (lead: any, type: 'email' | 'phone') => {
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
            setResults(prev => prev.map(p => p.id === lead.id ? unlockedLead : p));
            if (selectedLead && selectedLead.id === lead.id) {
                setSelectedLead(unlockedLead);
            }

            toast.success('Contact info unlocked and saved!');
            return unlockedLead;
        } catch (error: any) {
            console.error('Unlock failed:', error);
            toast.error(error.message || 'Failed to unlock contact info');
            return null;
        }
    };

    return (
        <div className="flex flex-col lg:flex-row h-full gap-6">
            {selectedLead && (
                <LeadDetailModal
                    lead={selectedLead}
                    onClose={() => setSelectedLead(null)}
                    onUnlock={handleUnlock}
                />
            )}

            {/* Search Sidebar / Panel */}
            <div className="w-full lg:w-80 flex-shrink-0 flex flex-col gap-6">
                <div className="bg-[#09090b] border border-white/5 rounded-md p-6">
                    <div className="flex gap-2 bg-zinc-900/50 p-1 rounded-md border border-white/5 mb-6">
                        <button
                            onClick={() => setMode('search')}
                            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-300 ${mode === 'search' ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}
                        >
                            Manual Search
                        </button>
                        <button
                            onClick={() => setMode('import')}
                            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-300 ${mode === 'import' ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}
                        >
                            Bulk Import
                        </button>
                    </div>

                    {mode === 'search' ? (
                        <div className="space-y-4">
                            <div className="flex gap-2 mb-6">
                                <button
                                    onClick={() => { setSearchType('people'); setResults([]); }}
                                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border ${searchType === 'people' ? 'bg-zinc-800 border-orange-500 text-orange-500' : 'bg-transparent border-white/10 text-zinc-500 hover:border-white/20'}`}
                                >
                                    <div className="flex items-center justify-center gap-2">
                                        <Users className="w-3 h-3" /> People
                                    </div>
                                </button>
                                <button
                                    onClick={() => { setSearchType('companies'); setResults([]); }}
                                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border ${searchType === 'companies' ? 'bg-zinc-800 border-blue-500 text-blue-500' : 'bg-transparent border-white/10 text-zinc-500 hover:border-white/20'}`}
                                >
                                    <div className="flex items-center justify-center gap-2">
                                        <Building2 className="w-3 h-3" /> Companies
                                    </div>
                                </button>
                            </div>

                            <div className="space-y-4">
                                <SoftInput label="Company Name" placeholder="e.g. Acme Inc" value={filters.company} onChange={(e: any) => setFilters({ ...filters, company: e.target.value })} />
                                <SoftInput label="Website Domain" placeholder="e.g. acme.com" value={filters.website} onChange={(e: any) => setFilters({ ...filters, website: e.target.value })} />

                                {searchType === 'people' && (
                                    <>
                                        <div className="w-full h-px bg-white/5 my-2"></div>
                                        <SoftInput label="Job Title" placeholder="e.g. Founder" value={filters.title} onChange={(e: any) => setFilters({ ...filters, title: e.target.value })} />
                                    </>
                                )}

                                <SoftInput label="Location" placeholder="e.g. New York" value={filters.location} onChange={(e: any) => setFilters({ ...filters, location: e.target.value })} />
                                <SoftInput label="Keywords" placeholder="e.g. SaaS, B2B, Marketing" value={filters.keywords} onChange={(e: any) => setFilters({ ...filters, keywords: e.target.value })} />

                                {searchType === 'people' && (
                                    <div className="space-y-3 pt-2 bg-zinc-950/30 p-4 rounded-md border border-white/5">
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs font-semibold text-zinc-400 flex items-center gap-2"><User className="w-3 h-3" /> Max People</span>
                                            <span className="bg-orange-500/10 text-orange-500 px-2 py-0.5 rounded-full text-[10px] font-bold">{filters.quantity}</span>
                                        </div>
                                        <input type="range" min="1" max="20" value={filters.quantity} onChange={(e) => setFilters({ ...filters, quantity: parseInt(e.target.value) })} className="w-full h-1.5 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-orange-500" />
                                    </div>
                                )}
                            </div>
                            <div className="pt-4">
                                <button onClick={handleSearch} disabled={loading} className="w-full py-3.5 rounded-md bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold text-sm shadow-lg shadow-orange-500/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                                    {loading ? <Loader2 className="animate-spin w-5 h-5" /> : <Zap className="w-5 h-5 fill-white" />}
                                    {loading ? 'Searching...' : 'Find Prospects'}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-6">
                            <div className="space-y-3 pt-2 bg-zinc-950/30 p-4 rounded-md border border-white/5">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-semibold text-zinc-400 flex items-center gap-2"><Sliders className="w-3 h-3" /> People Per Company</span>
                                    <span className="bg-orange-500/10 text-orange-500 px-2 py-0.5 rounded-full text-[10px] font-bold">{filters.quantity}</span>
                                </div>
                                <p className="text-[10px] text-zinc-500">If you upload 10 companies, we will fetch {filters.quantity * 10} leads total.</p>
                                <input type="range" min="1" max="20" value={filters.quantity} onChange={(e) => setFilters({ ...filters, quantity: parseInt(e.target.value) })} className="w-full h-1.5 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-orange-500" />
                            </div>
                            {loading ? (
                                <div className="flex flex-col items-center justify-center text-center space-y-4 py-8">
                                    <div className="w-12 h-12 rounded-full border-4 border-zinc-800 border-t-orange-500 animate-spin"></div>
                                    <div>
                                        <p className="text-white font-bold text-sm">{processingStatus}</p>
                                        <p className="text-zinc-500 text-xs mt-1">Simulating API lookup...</p>
                                    </div>
                                </div>
                            ) : (
                                <div className={`border-2 border-dashed rounded-2xl flex flex-col items-center justify-center text-center p-8 transition-all cursor-pointer ${dragActive ? 'border-orange-500 bg-orange-500/10' : 'border-zinc-700 bg-zinc-900/30 hover:border-zinc-600 hover:bg-zinc-800/50'}`} onDragOver={(e) => { e.preventDefault(); setDragActive(true) }} onDragLeave={() => setDragActive(false)} onDrop={(e) => { e.preventDefault(); setDragActive(false); if (e.dataTransfer.files[0]) processFile(e.dataTransfer.files[0]); }}>
                                    <UploadCloud className={`w-10 h-10 mb-3 ${dragActive ? 'text-orange-500' : 'text-zinc-500'}`} />
                                    <p className="text-white font-bold text-sm mb-1">Drop Company List</p>
                                    <p className="text-zinc-500 text-[10px] mb-4">CSV with 'Company', 'Domain'</p>
                                    <label className="bg-white text-black px-4 py-2 rounded-lg font-bold text-xs cursor-pointer hover:bg-zinc-200 transition-colors">
                                        Browse Files
                                        <input type="file" className="hidden" accept=".csv,.xlsx" onChange={(e: any) => e.target.files[0] && processFile(e.target.files[0])} />
                                    </label>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Results Area */}
            <div className="flex-1 bg-[#09090b] border border-white/5 rounded-md p-6 lg:p-8 overflow-hidden flex flex-col relative">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">Live Results</h1>
                        <p className="text-zinc-400 text-sm mt-1">{results.length > 0 ? `Found ${results.length} ${searchType === 'people' ? 'enriched profiles' : 'companies'}` : 'Start a search to see results'}</p>
                    </div>
                    {results.length > 0 && searchType === 'people' && (
                        <button onClick={handleSaveAll} className="bg-white hover:bg-zinc-200 text-black px-6 py-3 rounded-md font-bold text-sm flex items-center gap-2 transition-all shadow-lg shadow-white/10 active:scale-95">
                            <Save className="w-4 h-4" /> Save All Results
                        </button>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                    {loading && results.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center gap-8">
                            <div className="relative">
                                <div className="absolute inset-0 bg-orange-500/20 blur-3xl rounded-full animate-pulse" />
                                <div className="w-20 h-20 rounded-2xl bg-zinc-900 border border-white/10 flex items-center justify-center relative z-10 shadow-2xl">
                                    <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
                                </div>
                            </div>
                            <div className="text-center space-y-2">
                                <p className="text-white font-bold text-lg">Searching Apollo Database...</p>
                                <p className="text-zinc-500 text-sm">Finding the best contacts for you</p>
                            </div>
                        </div>
                    ) : results.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center gap-6 text-zinc-600">
                            <div className="relative">
                                <div className="absolute inset-0 bg-orange-500/20 blur-3xl rounded-full opacity-20 animate-pulse" />
                                <div className="w-32 h-32 rounded-3xl bg-zinc-900/50 flex items-center justify-center border border-white/5 shadow-2xl backdrop-blur-sm relative z-10">
                                    <Search className="w-12 h-12 text-zinc-700" />
                                </div>
                            </div>
                            <div className="text-center max-w-md">
                                <h3 className="font-bold text-xl text-white mb-2">Ready to Search</h3>
                                <p className="text-sm text-zinc-500 leading-relaxed">
                                    Enter criteria to find verified {searchType === 'people' ? 'professional contacts' : 'companies'} using Apollo's database.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="pb-20">
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 mb-8">
                                {searchType === 'people' ? (
                                    results.map((lead, idx) => (
                                        <motion.div
                                            key={lead.id}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: idx * 0.05 }}
                                        >
                                            <ProfileCard
                                                lead={lead}
                                                actionIcon={Save}
                                                onAction={() => handleSavePerson(lead)}
                                                onClick={() => setSelectedLead(lead)}
                                                isSaved={lead.isSaved}
                                            />
                                        </motion.div>
                                    ))
                                ) : (
                                    results.map((company, idx) => (
                                        <motion.div
                                            key={company.id}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: idx * 0.05 }}
                                        >
                                            <CompanyCard
                                                company={company}
                                                onClick={() => {
                                                    setSelectedCompany(company);
                                                    setIsCompanyModalOpen(true);
                                                }}
                                            />
                                        </motion.div>
                                    ))
                                )}
                            </div>

                            {/* Load More Button */}
                            {searchType === 'companies' && results.length > 0 && (
                                <div className="flex justify-center">
                                    {hasMore ? (
                                        <button
                                            onClick={handleLoadMore}
                                            disabled={loadingMore}
                                            className="px-6 py-3 rounded-md bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-sm transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {loadingMore ? <Loader2 className="animate-spin w-4 h-4" /> : null}
                                            {loadingMore ? 'Loading more...' : 'Load More Companies'}
                                        </button>
                                    ) : (
                                        <p className="text-zinc-500 text-sm font-medium">No more companies found.</p>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <CompanyDetailsModal
                company={selectedCompany}
                isOpen={isCompanyModalOpen}
                onClose={() => setIsCompanyModalOpen(false)}
                onSave={handleSaveCompany}
            />
        </div>
    );
};
