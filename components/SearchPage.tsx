import React, { useState } from 'react';
import {
    User, Sliders, Loader2, Zap, UploadCloud, Save, LayoutGrid
} from 'lucide-react';
import { SidebarContainer } from './Sidebar';
import { SoftInput } from './ui/Input';
import { ProfileCard } from './ProfileCard';
import { SaveBatchModal } from './SaveBatchModal';
import { LeadDetailModal } from './LeadDetailModal';

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

const fetchApolloData = async (params: any) => {
    await new Promise(resolve => setTimeout(resolve, 1500));
    return Array.from({ length: params.quantity || 6 }).map((_, i) => ({
        ...params,
        id: `lead_${Date.now()}_${i}`,
        name: ['Emma Wilson', 'James Bond', 'Lara Croft', 'Bruce Wayne', 'Tony Stark', 'Natasha Romanoff'][i % 6],
        title: params.titles?.[0] || 'Executive',
        company: params.company || 'Tech Corp',
        website: params.website || 'tech.com',
        location: params.location || 'Remote',
        email: `user${i}@${params.website || 'tech.com'}`,
        phone: '+1 555 0199',
        image: `https://randomuser.me/api/portraits/lego/${i}.jpg`,
        status: 'Verified',
        score: Math.floor(Math.random() * 60) + 40, // Mock Score 40-100
    }));
};

interface SearchPageProps {
    onSave: (leads: any[]) => void;
    notify: (msg: string, type?: string) => void;
}

export const SearchPage: React.FC<SearchPageProps> = ({ onSave, notify }) => {
    const [mode, setMode] = useState<'search' | 'import'>('search');
    const [filters, setFilters] = useState({ company: '', website: '', title: '', location: '', quantity: 5 });
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<any[]>([]);
    const [dragActive, setDragActive] = useState(false);
    const [processingStatus, setProcessingStatus] = useState('');
    const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
    const [selectedLead, setSelectedLead] = useState<any>(null);

    const handleSearch = async () => {
        if (!filters.company || !filters.website) return notify('Company & Website required', 'error');
        setLoading(true);
        setResults([]);
        const data = await fetchApolloData({ ...filters, titles: [filters.title] });
        setResults(data);
        setLoading(false);
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
            notify(`Bulk Search complete: Found ${allEnriched.length} total leads`, 'success');
        }, 1500);
    };

    const initiateSave = () => {
        setIsSaveModalOpen(true);
    };

    const confirmSave = (batchName: string) => {
        const leadsToSave = results.map(r => ({ ...r, group_name: batchName || 'Untitled Batch' }));
        onSave(leadsToSave);
        setResults([]);
        setIsSaveModalOpen(false);
    };

    const defaultBatchName = mode === 'search'
        ? `Search: ${filters.company}`
        : `Bulk Import (${new Date().toLocaleDateString()})`;

    return (
        <div className="flex h-full gap-6">
            <SaveBatchModal
                isOpen={isSaveModalOpen}
                onClose={() => setIsSaveModalOpen(false)}
                onConfirm={confirmSave}
                defaultName={defaultBatchName}
            />

            {selectedLead && (
                <LeadDetailModal lead={selectedLead} onClose={() => setSelectedLead(null)} />
            )}

            <SidebarContainer>
                <div className="flex bg-zinc-950 p-1 rounded-2xl mb-8 border border-zinc-800">
                    <button onClick={() => setMode('search')} className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${mode === 'search' ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500 hover:text-white'}`}>Manual</button>
                    <button onClick={() => setMode('import')} className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${mode === 'import' ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500 hover:text-white'}`}>Bulk Search</button>
                </div>
                {mode === 'search' ? (
                    <>
                        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-6">
                            <SoftInput label="Company Name" placeholder="e.g. Acme Inc" value={filters.company} onChange={(e: any) => setFilters({ ...filters, company: e.target.value })} />
                            <SoftInput label="Website Domain" placeholder="e.g. acme.com" value={filters.website} onChange={(e: any) => setFilters({ ...filters, website: e.target.value })} />
                            <div className="w-full h-px bg-zinc-800/50 my-2"></div>
                            <SoftInput label="Job Title" placeholder="e.g. Founder" value={filters.title} onChange={(e: any) => setFilters({ ...filters, title: e.target.value })} />
                            <SoftInput label="Location" placeholder="e.g. New York" value={filters.location} onChange={(e: any) => setFilters({ ...filters, location: e.target.value })} />
                            <div className="space-y-3 pt-2 bg-zinc-900/50 p-4 rounded-2xl border border-white/5">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-semibold text-zinc-400 flex items-center gap-2"><User className="w-3 h-3" /> Max People</span>
                                    <span className="bg-orange-500/10 text-orange-500 px-2 py-0.5 rounded-full text-[10px] font-bold">{filters.quantity}</span>
                                </div>
                                <input type="range" min="1" max="20" value={filters.quantity} onChange={(e) => setFilters({ ...filters, quantity: parseInt(e.target.value) })} className="w-full h-1.5 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-orange-500" />
                            </div>
                        </div>
                        <div className="pt-6 mt-4">
                            <button onClick={handleSearch} disabled={loading} className="w-full py-4 rounded-2xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold text-sm shadow-lg shadow-orange-500/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                                {loading ? <Loader2 className="animate-spin w-5 h-5" /> : <Zap className="w-5 h-5 fill-white" />}
                                {loading ? 'Searching...' : 'Find Prospects'}
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col justify-start space-y-6">
                        <div className="space-y-3 pt-2 bg-zinc-900/50 p-4 rounded-2xl border border-white/5">
                            <div className="flex justify-between items-center">
                                <span className="text-xs font-semibold text-zinc-400 flex items-center gap-2"><Sliders className="w-3 h-3" /> People Per Company</span>
                                <span className="bg-orange-500/10 text-orange-500 px-2 py-0.5 rounded-full text-[10px] font-bold">{filters.quantity}</span>
                            </div>
                            <p className="text-[10px] text-zinc-500">If you upload 10 companies, we will fetch {filters.quantity * 10} leads total.</p>
                            <input type="range" min="1" max="20" value={filters.quantity} onChange={(e) => setFilters({ ...filters, quantity: parseInt(e.target.value) })} className="w-full h-1.5 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-orange-500" />
                        </div>
                        {loading ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
                                <div className="w-16 h-16 rounded-full border-4 border-zinc-800 border-t-orange-500 animate-spin"></div>
                                <div>
                                    <p className="text-white font-bold">{processingStatus}</p>
                                    <p className="text-zinc-500 text-xs mt-1">Simulating API lookup...</p>
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col">
                                <div className={`flex-1 border-3 border-dashed rounded-[32px] flex flex-col items-center justify-center text-center p-8 transition-all ${dragActive ? 'border-orange-500 bg-orange-500/10' : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-700'}`} onDragOver={(e) => { e.preventDefault(); setDragActive(true) }} onDragLeave={() => setDragActive(false)} onDrop={(e) => { e.preventDefault(); setDragActive(false); if (e.dataTransfer.files[0]) processFile(e.dataTransfer.files[0]); }}>
                                    <UploadCloud className={`w-12 h-12 mb-4 ${dragActive ? 'text-orange-500' : 'text-zinc-600'}`} />
                                    <p className="text-white font-bold text-sm mb-2">Drop Company List</p>
                                    <p className="text-zinc-500 text-xs mb-6">CSV with 'Company', 'Domain'</p>
                                    <label className="bg-white text-black px-6 py-3 rounded-xl font-bold text-xs cursor-pointer hover:bg-zinc-200 transition-colors">
                                        Browse Files
                                        <input type="file" className="hidden" accept=".csv,.xlsx" onChange={(e: any) => e.target.files[0] && processFile(e.target.files[0])} />
                                    </label>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </SidebarContainer>

            <div className="flex-1 bg-zinc-900/30 border border-white/5 rounded-[32px] p-8 overflow-hidden flex flex-col relative">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-white">Live Results</h1>
                        <p className="text-zinc-500 text-sm">{results.length > 0 ? `Found ${results.length} enriched profiles` : 'Waiting for input...'}</p>
                    </div>
                    {results.length > 0 && (
                        <button onClick={initiateSave} className="bg-zinc-800 hover:bg-zinc-700 text-white px-6 py-3 rounded-xl font-medium text-sm flex items-center gap-2 transition-all">
                            <Save className="w-4 h-4" /> Save Batch to DB
                        </button>
                    )}
                </div>
                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                    {loading && results.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center gap-4">
                            <p className="text-zinc-500 text-sm font-medium animate-pulse">Initializing Search...</p>
                        </div>
                    ) : results.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center gap-4 text-zinc-600">
                            <LayoutGrid className="w-16 h-16 opacity-20" />
                            <p className="font-medium">Enter details or upload list</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5 pb-20">
                            {results.map((lead) => (
                                <ProfileCard
                                    key={lead.id}
                                    lead={lead}
                                    actionIcon={Save}
                                    onAction={() => onSave([lead])}
                                    onClick={() => setSelectedLead(lead)}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
