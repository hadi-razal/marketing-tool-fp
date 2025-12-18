import React, { useState, useRef, useEffect } from 'react';
import {
    User, Sliders, Loader2, Zap, UploadCloud, Save, LayoutGrid, Search, Filter, Building2, Users, Download, X, ChevronDown
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

// Common job titles for multi-select
const JOB_TITLES = [
    'CEO', 'CTO', 'CFO', 'CMO', 'COO', 'President', 'Founder', 'Co-Founder',
    'VP of Sales', 'VP of Marketing', 'VP of Engineering', 'VP of Product',
    'Director of Sales', 'Director of Marketing', 'Director of Engineering',
    'Sales Manager', 'Marketing Manager', 'Product Manager', 'Engineering Manager',
    'Head of Sales', 'Head of Marketing', 'Head of Product', 'Head of Engineering',
    'Senior Sales', 'Senior Marketing', 'Senior Engineer', 'Senior Product Manager',
    'Business Development Manager', 'Account Manager', 'Sales Representative',
    'Marketing Director', 'Product Director', 'Engineering Director',
    'Chief Revenue Officer', 'Chief Technology Officer', 'Chief Marketing Officer',
    'Managing Director', 'General Manager', 'Operations Manager'
];

export const SearchPage: React.FC<SearchPageProps> = ({ onSave }) => {
    // NOTE: mode state kept for future bulk import feature, but UI only shows 'search' mode
    const [mode, setMode] = useState<'search' | 'import'>('search');
    const [searchType, setSearchType] = useState<'people' | 'companies'>('people');
    const [filters, setFilters] = useState({ company: '', website: '', titles: [] as string[], location: '', keywords: '', quantity: 9 });
    const [isJobTitleDropdownOpen, setIsJobTitleDropdownOpen] = useState(false);
    const jobTitleDropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (jobTitleDropdownRef.current && !jobTitleDropdownRef.current.contains(event.target as Node)) {
                setIsJobTitleDropdownOpen(false);
            }
        };

        if (isJobTitleDropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isJobTitleDropdownOpen]);

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
            // Convert titles array to comma-separated string for API
            const apiFilters = {
                ...filters,
                title: filters.titles.join(','), // Convert array to comma-separated string
                page: 1
            };
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(apiFilters),
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
            // Show "No results" instead of API error
            setResults([]);
            setHasMore(false);
            // Don't show error toast, just show empty results
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
            // Just stop loading more instead of showing error
            setHasMore(false);
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
        let loadingToastId: string | number | undefined;

        try {
            // First, fetch full person data if we have limited data
            let fullPersonData = person;

            // Check if we need to fetch full data (has obfuscated name or unlock messages)
            const needsFullData = person.last_name_obfuscated ||
                person.email === 'Available (Unlock)' ||
                person.phone === 'Available (Unlock)' ||
                (!person.email || person.email === 'N/A') ||
                (!person.phone || person.phone === 'N/A');

            if (needsFullData) {
                loadingToastId = toast.loading('Fetching full person data...');

                try {
                    // Fetch full data using enrich endpoint with timeout
                    const enrichController = new AbortController();
                    const timeoutId = setTimeout(() => enrichController.abort(), 30000); // 30 second timeout

                    const enrichResponse = await fetch('/api/apollo/enrich', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            id: person.id,
                            reveal_email: true,
                            reveal_phone: true
                        }),
                        signal: enrichController.signal
                    });

                    clearTimeout(timeoutId);

                    if (enrichResponse.ok) {
                        const enrichData = await enrichResponse.json();
                        fullPersonData = { ...person, ...enrichData.lead };
                    } else {
                        // If enrich fails, try to save with available data
                        console.warn('Failed to enrich person, saving with available data');
                    }
                } catch (enrichError: any) {
                    if (enrichError.name === 'AbortError') {
                        console.warn('Enrich request timed out, saving with available data');
                    } else {
                        console.warn('Failed to enrich person, saving with available data:', enrichError);
                    }
                } finally {
                    // Dismiss loading toast
                    if (loadingToastId) {
                        toast.dismiss(loadingToastId);
                    }
                }
            }

            // Save to database
            await databaseService.savePerson(fullPersonData);

            // Update local state to reflect saved status with full data
            const updatedPerson = { ...fullPersonData, isSaved: true };
            setResults(prev => prev.map(p => p.id === person.id ? updatedPerson : p));
            if (selectedLead && selectedLead.id === person.id) {
                setSelectedLead(updatedPerson);
            }

            toast.success('Person saved to database');
        } catch (error) {
            console.error('Failed to save person:', error);
            // Dismiss loading toast if still showing
            if (loadingToastId) {
                toast.dismiss(loadingToastId);
            }
            toast.error('Failed to save person');
        }
    };

    // NOTE: Bulk Import functionality - kept for future use but not currently active in UI
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
        const loadingToastId = toast.loading(`Saving ${results.length} people...`);

        try {
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

            // Dismiss loading toast
            toast.dismiss(loadingToastId);

            if (savedCount > 0) {
                toast.success(`Successfully saved ${savedCount} people`);
            } else {
                toast.info('All visible people are already saved');
            }
        } catch (error) {
            // Dismiss loading toast on error
            toast.dismiss(loadingToastId);
            toast.error('Failed to save some people');
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
            <div className="w-full lg:w-80 shrink-0 flex flex-col gap-6">
                <div className="bg-gradient-to-br from-[#09090b] via-[#0a0a0d] to-[#09090b] border border-white/10 rounded-2xl p-6 shadow-2xl shadow-black/50 backdrop-blur-sm">
                    {/* NOTE: Bulk Import mode removed from UI - code kept below for future use */}
                    {/* Mode toggle removed - only Manual Search is available now */}

                    {/* Manual Search Mode - Always Active */}
                    {mode === 'search' ? (
                        <div className="space-y-5">
                            {/* Search Type Toggle - Redesigned */}
                            <div className="grid grid-cols-2 gap-2.5 p-1 bg-zinc-950/60 rounded-xl border border-white/10">
                                <button
                                    onClick={() => { setSearchType('people'); setResults([]); }}
                                    className={`relative py-3 px-4 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 ${searchType === 'people'
                                        ? 'bg-gradient-to-br from-orange-500/20 to-red-600/20 border-2 border-orange-500/50 text-orange-400 shadow-lg shadow-orange-500/20'
                                        : 'bg-transparent border-2 border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
                                        }`}
                                >
                                    <Users className={`w-4 h-4 ${searchType === 'people' ? 'text-orange-400' : ''}`} />
                                    <span>People</span>
                                </button>
                                <button
                                    onClick={() => { setSearchType('companies'); setResults([]); }}
                                    className={`relative py-3 px-4 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 ${searchType === 'companies'
                                        ? 'bg-gradient-to-br from-blue-500/20 to-cyan-600/20 border-2 border-blue-500/50 text-blue-400 shadow-lg shadow-blue-500/20'
                                        : 'bg-transparent border-2 border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
                                        }`}
                                >
                                    <Building2 className={`w-4 h-4 ${searchType === 'companies' ? 'text-blue-400' : ''}`} />
                                    <span>Companies</span>
                                </button>
                            </div>

                            {/* Search Button - Enhanced - Moved to Top */}
                            <div>
                                <button
                                    onClick={handleSearch}
                                    disabled={loading}
                                    className="group relative w-full py-4 rounded-xl bg-gradient-to-r from-orange-500 via-orange-600 to-red-600 text-white font-bold text-sm shadow-2xl shadow-orange-500/30 hover:shadow-orange-500/50 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 overflow-hidden"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                                    {loading ? (
                                        <>
                                            <Loader2 className="animate-spin w-5 h-5 relative z-10" />
                                            <span className="relative z-10">Searching...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Zap className="w-5 h-5 fill-white relative z-10 group-hover:rotate-12 transition-transform" />
                                            <span className="relative z-10">{searchType === 'people' ? 'Find People' : 'Find Companies'}</span>
                                        </>
                                    )}
                                </button>
                            </div>

                            {/* Form Fields - Enhanced */}
                            <div className="space-y-4">
                                <div className="relative">
                                    <SoftInput
                                        label="Company Name"
                                        placeholder="e.g. Acme Inc"
                                        value={filters.company}
                                        onChange={(e: any) => setFilters({ ...filters, company: e.target.value })}
                                        icon={<Building2 className="w-4 h-4" />}
                                    />
                                </div>

                                <div className="relative">
                                    <SoftInput
                                        label="Website Domain"
                                        placeholder="e.g. acme.com"
                                        value={filters.website}
                                        onChange={(e: any) => setFilters({ ...filters, website: e.target.value })}
                                        icon={<LayoutGrid className="w-4 h-4" />}
                                    />
                                </div>

                                {searchType === 'people' && (
                                    <>
                                        <div className="relative my-4">
                                            <div className="absolute inset-0 flex items-center">
                                                <div className="w-full border-t border-white/10"></div>
                                            </div>
                                            <div className="relative flex justify-center">
                                                <span className="bg-[#09090b] px-3 text-xs text-zinc-500 font-medium">Additional Filters</span>
                                            </div>
                                        </div>
                                        <div className="relative">
                                            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider ml-1 mb-2 block">
                                                Job Title
                                            </label>
                                            <div className="relative" ref={jobTitleDropdownRef}>
                                                <button
                                                    type="button"
                                                    onClick={() => setIsJobTitleDropdownOpen(!isJobTitleDropdownOpen)}
                                                    className="w-full bg-zinc-900/50 border border-zinc-800 text-white rounded-xl px-4 py-3.5 pl-11 pr-10 outline-none transition-all duration-200 placeholder:text-zinc-600 focus:border-orange-500/50 focus:bg-zinc-900 focus:shadow-[0_0_20px_-5px_rgba(249,115,22,0.3)] hover:border-zinc-700 flex items-center justify-between min-h-[55px]"
                                                >
                                                    <div className="flex items-center gap-2 flex-wrap flex-1">
                                                        {filters.titles.length === 0 ? (
                                                            <span className="text-zinc-600">Select job titles...</span>
                                                        ) : (
                                                            filters.titles.map((title) => (
                                                                <span
                                                                    key={title}
                                                                    className="inline-flex items-center gap-1.5 bg-orange-500/20 text-orange-400 px-2.5 py-1 rounded-lg text-xs font-medium border border-orange-500/30"
                                                                >
                                                                    {title}
                                                                    <button
                                                                        type="button"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setFilters({
                                                                                ...filters,
                                                                                titles: filters.titles.filter(t => t !== title)
                                                                            });
                                                                        }}
                                                                        className="hover:bg-orange-500/30 rounded-full p-0.5 transition-colors"
                                                                    >
                                                                        <X className="w-3 h-3" />
                                                                    </button>
                                                                </span>
                                                            ))
                                                        )}
                                                    </div>
                                                    <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform duration-200 shrink-0 ${isJobTitleDropdownOpen ? 'rotate-180' : ''}`} />
                                                </button>
                                                <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">
                                                    <User className="w-4 h-4" />
                                                </div>

                                                {isJobTitleDropdownOpen && (
                                                    <div className="absolute z-50 w-full mt-2 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl max-h-64 overflow-y-auto custom-scrollbar">
                                                        <div className="p-2">
                                                            {JOB_TITLES.map((title) => {
                                                                const isSelected = filters.titles.includes(title);
                                                                return (
                                                                    <button
                                                                        key={title}
                                                                        type="button"
                                                                        onClick={() => {
                                                                            if (isSelected) {
                                                                                setFilters({
                                                                                    ...filters,
                                                                                    titles: filters.titles.filter(t => t !== title)
                                                                                });
                                                                            } else {
                                                                                setFilters({
                                                                                    ...filters,
                                                                                    titles: [...filters.titles, title]
                                                                                });
                                                                            }
                                                                        }}
                                                                        className={`w-full text-left px-4 py-2.5 rounded-lg text-sm transition-all duration-200 ${isSelected
                                                                            ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                                                                            : 'text-zinc-300 hover:bg-zinc-800 hover:text-white'
                                                                            }`}
                                                                    >
                                                                        <div className="flex items-center justify-between">
                                                                            <span>{title}</span>
                                                                            {isSelected && (
                                                                                <div className="w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center">
                                                                                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                                                                    </svg>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </>
                                )}

                                <div className="relative">
                                    <SoftInput
                                        label="Location"
                                        placeholder="e.g. New York, San Francisco"
                                        value={filters.location}
                                        onChange={(e: any) => setFilters({ ...filters, location: e.target.value })}
                                        icon={<Filter className="w-4 h-4" />}
                                    />
                                </div>

                                {searchType === 'people' && (
                                    <div className="relative bg-gradient-to-br from-zinc-950/80 to-zinc-900/40 p-5 rounded-xl border border-white/10 shadow-inner">
                                        <div className="flex justify-between items-center mb-3">
                                            <span className="text-xs font-bold text-zinc-300 flex items-center gap-2 uppercase tracking-wider">
                                                <User className="w-3.5 h-3.5 text-orange-500" />
                                                Max Results
                                            </span>
                                            <span className="bg-gradient-to-r from-orange-500/20 to-red-600/20 text-orange-400 px-3 py-1 rounded-full text-xs font-bold border border-orange-500/30">
                                                {filters.quantity}
                                            </span>
                                        </div>
                                        <input
                                            type="range"
                                            min="1"
                                            max="12"
                                            value={filters.quantity}
                                            onChange={(e) => setFilters({ ...filters, quantity: parseInt(e.target.value) })}
                                            className="w-full h-2 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-orange-500 hover:accent-orange-400 transition-all [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-orange-500 [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-orange-500/50 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white/20 [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-orange-500 [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white/20 [&::-moz-range-thumb]:cursor-pointer"
                                        />
                                        <p className="text-[10px] text-zinc-500 mt-2">Adjust the maximum number of results to fetch</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : null}

                    {/* BULK IMPORT MODE - NOT CURRENTLY IN USE */}
                    {/* Code kept below for future implementation */}
                    {false && mode === 'import' && (
                        <div className="flex flex-col gap-6">
                            {/* Quantity Slider - Enhanced */}
                            <div className="relative bg-gradient-to-br from-zinc-950/80 to-zinc-900/40 p-5 rounded-xl border border-white/10 shadow-inner">
                                <div className="flex justify-between items-center mb-3">
                                    <span className="text-xs font-bold text-zinc-300 flex items-center gap-2 uppercase tracking-wider">
                                        <Sliders className="w-3.5 h-3.5 text-orange-500" />
                                        People Per Company
                                    </span>
                                    <span className="bg-gradient-to-r from-orange-500/20 to-red-600/20 text-orange-400 px-3 py-1 rounded-full text-xs font-bold border border-orange-500/30">
                                        {filters.quantity}
                                    </span>
                                </div>
                                <input
                                    type="range"
                                    min="1"
                                    max="12"
                                    value={filters.quantity}
                                    onChange={(e) => setFilters({ ...filters, quantity: parseInt(e.target.value) })}
                                    className="w-full h-2 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-orange-500 hover:accent-orange-400 transition-all [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-orange-500 [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-orange-500/50 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white/20 [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-orange-500 [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white/20 [&::-moz-range-thumb]:cursor-pointer"
                                />
                                <p className="text-[10px] text-zinc-500 mt-2">
                                    If you upload <span className="text-orange-400 font-semibold">10 companies</span>, we will fetch <span className="text-orange-400 font-semibold">{filters.quantity * 10} leads</span> total.
                                </p>
                            </div>

                            {/* Upload Area - Enhanced */}
                            {loading ? (
                                <div className="flex flex-col items-center justify-center text-center space-y-5 py-12">
                                    <div className="relative">
                                        <div className="absolute inset-0 bg-orange-500/20 blur-2xl rounded-full animate-pulse" />
                                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-zinc-900 to-zinc-950 border-2 border-orange-500/30 flex items-center justify-center relative z-10 shadow-2xl">
                                            <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-white font-bold text-base mb-1">{processingStatus}</p>
                                        <p className="text-zinc-500 text-xs">Processing your file...</p>
                                    </div>
                                </div>
                            ) : (
                                <div
                                    className={`group relative border-2 border-dashed rounded-2xl flex flex-col items-center justify-center text-center p-10 transition-all duration-300 cursor-pointer overflow-hidden ${dragActive
                                        ? 'border-orange-500 bg-gradient-to-br from-orange-500/20 to-red-600/20 shadow-2xl shadow-orange-500/20 scale-[1.02]'
                                        : 'border-zinc-700/50 bg-gradient-to-br from-zinc-900/40 to-zinc-950/40 hover:border-orange-500/50 hover:bg-zinc-900/60 hover:shadow-xl hover:shadow-orange-500/10'
                                        }`}
                                    onDragOver={(e) => { e.preventDefault(); setDragActive(true) }}
                                    onDragLeave={() => setDragActive(false)}
                                    onDrop={(e) => { e.preventDefault(); setDragActive(false); if (e.dataTransfer.files[0]) processFile(e.dataTransfer.files[0]); }}
                                >
                                    <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                    <div className="relative z-10">
                                        <div className={`mb-4 transition-all duration-300 ${dragActive ? 'scale-110 text-orange-500' : 'text-zinc-500 group-hover:text-orange-500/70'}`}>
                                            <UploadCloud className="w-12 h-12 mx-auto" />
                                        </div>
                                        <p className="text-white font-bold text-base mb-2">Drop Company List</p>
                                        <p className="text-zinc-500 text-xs mb-6 max-w-xs">
                                            Upload a CSV or Excel file with <span className="text-orange-400 font-semibold">'Company'</span> and <span className="text-orange-400 font-semibold">'Domain'</span> columns
                                        </p>
                                        <label className="inline-flex items-center gap-2 bg-gradient-to-r from-white to-zinc-100 text-black px-6 py-3 rounded-xl font-bold text-sm cursor-pointer hover:from-zinc-100 hover:to-zinc-200 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95">
                                            <UploadCloud className="w-4 h-4" />
                                            <span>Browse Files</span>
                                            <input
                                                type="file"
                                                className="hidden"
                                                accept=".csv,.xlsx"
                                                onChange={(e: any) => e.target.files[0] && processFile(e.target.files[0])}
                                            />
                                        </label>
                                    </div>
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
