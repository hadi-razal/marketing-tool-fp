import React, { useState, useMemo } from 'react';
import {
    FolderOpen, Search, Database, Trash2, Users, Building2, Plus, Download
} from 'lucide-react';
import { motion } from 'framer-motion';

import { ProfileCard } from './ProfileCard';
import { CompanyCard, Company } from './CompanyCard';
import { CreatePersonModal } from './CreatePersonModal';
import { CreateCompanyModal } from './CreateCompanyModal';

// Mock Data for People
const MOCK_PEOPLE = [
    {
        id: 'lead_1',
        name: 'Sarah Connor',
        title: 'Chief Technology Officer',
        company: 'Skynet Systems',
        email: 'sarah@skynet.com',
        phone: '+1 (555) 123-4567',
        location: 'Los Angeles, CA',
        image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
        group_name: 'Tech Leaders'
    },
    {
        id: 'lead_2',
        name: 'John Smith',
        title: 'VP of Sales',
        company: 'Global Corp',
        email: 'john.smith@globalcorp.com',
        phone: '+1 (555) 987-6543',
        location: 'New York, NY',
        image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
        group_name: 'Sales Prospects'
    },
    {
        id: 'lead_3',
        name: 'Emily Chen',
        title: 'Product Manager',
        company: 'Innovate Inc',
        email: 'emily@innovate.com',
        phone: '+1 (555) 456-7890',
        location: 'San Francisco, CA',
        image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
        group_name: 'Tech Leaders'
    }
];

// Mock Data for Companies
const MOCK_COMPANIES: Company[] = [
    {
        id: 'comp_1',
        name: 'Skynet Systems',
        industry: 'Artificial Intelligence',
        website: 'https://skynet.com',
        location: 'Los Angeles, CA',
        size: '500+',
        description: 'Leading the way in autonomous defense systems and AI research.',
        logo: 'https://ui-avatars.com/api/?name=Skynet+Systems&background=0D8ABC&color=fff'
    },
    {
        id: 'comp_2',
        name: 'Global Corp',
        industry: 'Conglomerate',
        website: 'https://globalcorp.com',
        location: 'New York, NY',
        size: '1000+',
        description: 'A multinational corporation with diverse interests in various sectors.',
        logo: 'https://ui-avatars.com/api/?name=Global+Corp&background=ff5722&color=fff'
    },
    {
        id: 'comp_3',
        name: 'Innovate Inc',
        industry: 'Software',
        website: 'https://innovate.com',
        location: 'San Francisco, CA',
        size: '51-200',
        description: 'Creating the next generation of productivity tools for teams.',
        logo: 'https://ui-avatars.com/api/?name=Innovate+Inc&background=4caf50&color=fff'
    }
];

interface DatabasePageProps {
    notify: (msg: string, type?: string) => void;
}

export const DatabasePage: React.FC<DatabasePageProps> = ({ notify }) => {
    const [activeView, setActiveView] = useState<'people' | 'companies'>('people');
    const [people, setPeople] = useState<any[]>(MOCK_PEOPLE);
    const [companies, setCompanies] = useState<Company[]>(MOCK_COMPANIES);
    const [dbSearch, setDbSearch] = useState<string>('');

    // Modal States
    const [isCreatePersonOpen, setIsCreatePersonOpen] = useState(false);
    const [isCreateCompanyOpen, setIsCreateCompanyOpen] = useState(false);

    const handleDeletePerson = (id: string) => {
        setPeople(prev => prev.filter(p => p.id !== id));
        notify('Person removed', 'success');
    };

    const handleDeleteCompany = (id: string) => {
        setCompanies(prev => prev.filter(c => c.id !== id));
        notify('Company removed', 'success');
    };

    const handleCreatePerson = (newPerson: any) => {
        setPeople(prev => [newPerson, ...prev]);
        notify('Person created successfully', 'success');
    };

    const handleCreateCompany = (newCompany: any) => {
        setCompanies(prev => [newCompany, ...prev]);
        notify('Company created successfully', 'success');
    };

    const filteredData = useMemo(() => {
        const query = dbSearch.toLowerCase();
        if (activeView === 'people') {
            return people.filter(p =>
                p.name.toLowerCase().includes(query) ||
                p.company.toLowerCase().includes(query) ||
                p.email.toLowerCase().includes(query)
            );
        } else {
            return companies.filter(c =>
                c.name.toLowerCase().includes(query) ||
                c.industry.toLowerCase().includes(query)
            );
        }
    }, [people, companies, activeView, dbSearch]);

    return (
        <div className="flex flex-col lg:flex-row h-full gap-6">
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
                                onClick={() => activeView === 'people' ? setIsCreatePersonOpen(true) : setIsCreateCompanyOpen(true)}
                                className="bg-white hover:bg-zinc-200 text-black px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-white/5"
                            >
                                <Plus className="w-3.5 h-3.5" /> Add {activeView === 'people' ? 'Person' : 'Company'}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                    {filteredData.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center opacity-40">
                            <div className="w-24 h-24 rounded-full bg-zinc-900 flex items-center justify-center mb-4 border border-white/5">
                                <Database className="w-10 h-10 text-zinc-600" />
                            </div>
                            <p className="text-zinc-500 font-medium text-sm">No {activeView} found</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pb-20">
                            {activeView === 'people' ? (
                                filteredData.map((person, idx) => (
                                    <motion.div
                                        key={person.id}
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: idx * 0.05 }}
                                    >
                                        <ProfileCard
                                            lead={person}
                                            actionIcon={Trash2}
                                            onAction={() => handleDeletePerson(person.id)}
                                        />
                                    </motion.div>
                                ))
                            ) : (
                                filteredData.map((company, idx) => (
                                    <motion.div
                                        key={company.id}
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: idx * 0.05 }}
                                    >
                                        <CompanyCard
                                            company={company}
                                            actionIcon={Trash2}
                                            onAction={() => handleDeleteCompany(company.id)}
                                        />
                                    </motion.div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Modals */}
            <CreatePersonModal
                isOpen={isCreatePersonOpen}
                onClose={() => setIsCreatePersonOpen(false)}
                onSubmit={handleCreatePerson}
            />
            <CreateCompanyModal
                isOpen={isCreateCompanyOpen}
                onClose={() => setIsCreateCompanyOpen(false)}
                onSubmit={handleCreateCompany}
            />
        </div>
    );
};
