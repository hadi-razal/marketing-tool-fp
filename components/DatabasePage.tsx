import React, { useState, useEffect, useMemo } from 'react';
import {
    FolderOpen, Clock, Check, X, Edit2, Search, Loader2, Download, Database, Trash2, Filter
} from 'lucide-react';

import { ProfileCard } from './ProfileCard';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';

const exportToCSV = (data: any[], filename: string) => {
    if (!data || !data.length) return;


    const headers = Object.keys(data[0]).sort((a, b) => a === 'id' ? -1 : b === 'id' ? 1 : 0);

    const csvRows = [
        headers.join(','),
        ...data.map(row =>
            headers.map(fieldName => {
                const val = row[fieldName] ? String(row[fieldName]).replace(/"/g, '""') : '';
                return `"${val}"`;
            }).join(',')
        )
    ];

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

interface DatabasePageProps {
    notify: (msg: string, type?: string) => void;
}

export const DatabasePage: React.FC<DatabasePageProps> = ({ notify }) => {
    const [leads, setLeads] = useState<any[]>([]);
    const [selectedGroup, setSelectedGroup] = useState<string>('All');
    const [dbSearch, setDbSearch] = useState<string>('');
    const [renamingGroup, setRenamingGroup] = useState<string | null>(null);
    const [newName, setNewName] = useState('');

    const fetchLeads = async () => {
        const { data }: any = await supabase.from('leads').select('*').order('created_at', { ascending: false });
        if (data) setLeads(data);
    };

    const deleteLead = async (id: string) => {
        await supabase.from('leads').delete().eq('id', id);
        fetchLeads();
        notify('Contact removed', 'success');
    }

    const renameGroup = async () => {
        if (!renamingGroup || !newName) return;

        await supabase.from('leads').update({ group_name: newName }).eq('group_name', renamingGroup);

        if (selectedGroup === renamingGroup) setSelectedGroup(newName);

        setRenamingGroup(null);
        setNewName('');
        fetchLeads();
        notify('Collection renamed successfully', 'success');
    }

    const handleExport = () => {
        if (filteredLeads.length === 0) return notify('No data to export', 'error');
        exportToCSV(filteredLeads, selectedGroup === 'All' ? 'Fairplatz_All_Leads' : `Fairplatz_${selectedGroup.replace(/ /g, '_')}`);
    };

    useEffect(() => { fetchLeads(); }, []);

    const groups = useMemo(() => {
        const uniqueGroups = [...new Set(leads.map(l => l.group_name || 'Uncategorized'))];
        return ['All', ...uniqueGroups];
    }, [leads]);

    const filteredLeads = useMemo(() => {
        let result = leads;
        if (selectedGroup !== 'All') result = result.filter(l => (l.group_name || 'Uncategorized') === selectedGroup);
        if (dbSearch.trim() !== '') {
            const query = dbSearch.toLowerCase();
            result = result.filter(l => l.name.toLowerCase().includes(query) || l.company.toLowerCase().includes(query) || l.email.toLowerCase().includes(query));
        }
        return result;
    }, [leads, selectedGroup, dbSearch]);

    return (
        <div className="flex flex-col lg:flex-row h-full gap-6">
            {/* Database Sidebar */}
            <div className="w-full lg:w-72 flex-shrink-0 flex flex-col h-full bg-[#09090b] border border-white/5 rounded-[32px] p-6">
                <h2 className="text-sm font-bold text-white mb-6 flex items-center gap-2.5">
                    <FolderOpen className="w-4 h-4 text-orange-500" /> Saved Batches
                </h2>

                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-1">
                    <button
                        onClick={() => setSelectedGroup('All')}
                        className={`w-full text-left px-4 py-3 rounded-xl text-xs font-medium transition-all flex items-center justify-between group ${selectedGroup === 'All' ? 'bg-zinc-900 text-white border border-white/5' : 'text-zinc-500 hover:text-white hover:bg-white/5 border border-transparent'}`}
                    >
                        <span>All</span>
                        {selectedGroup === 'All' && <div className="w-1.5 h-1.5 rounded-full bg-orange-500"></div>}
                    </button>

                    <div className="my-4 pt-4 border-t border-white/5">
                        <p className="px-4 text-[10px] font-bold text-zinc-600 uppercase tracking-wider mb-2">Collections</p>
                        {groups.filter(g => g !== 'All').map(group => (
                            <button key={group} onClick={() => setSelectedGroup(group)} className={`w-full text-left px-4 py-3 rounded-xl text-xs font-medium transition-all flex items-center justify-between group mb-1 ${selectedGroup === group ? 'bg-zinc-900 text-white border border-white/5' : 'text-zinc-500 hover:text-white hover:bg-white/5 border border-transparent'}`}>
                                <span className="truncate max-w-[140px]">{group}</span>
                                {selectedGroup === group && <div className="w-1.5 h-1.5 rounded-full bg-orange-500"></div>}
                            </button>
                        ))}
                    </div>

                    <div className="mt-auto pt-4 border-t border-white/5">
                        <p className="px-4 text-[10px] font-bold text-zinc-600 uppercase tracking-wider mb-2">Import History</p>
                        <div className="px-4 py-2 text-xs text-zinc-500 flex items-center gap-2">
                            <Clock className="w-3 h-3" /> Bulk Import (11/24/2025)
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 bg-[#09090b] border border-white/5 rounded-[32px] p-6 lg:p-8 flex flex-col overflow-hidden">
                <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-8 gap-6">
                    <div className="flex items-center gap-4">
                        {renamingGroup === selectedGroup && selectedGroup !== 'All' ? (
                            <div className="flex items-center gap-2 animate-in fade-in">
                                <input
                                    className="bg-black/50 border border-orange-500/50 rounded-lg px-3 py-1 text-xl font-bold text-white outline-none w-[200px]"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    autoFocus
                                />
                                <button onClick={renameGroup} className="p-2 bg-green-500/20 text-green-500 rounded-lg hover:bg-green-500/30"><Check className="w-4 h-4" /></button>
                                <button onClick={() => setRenamingGroup(null)} className="p-2 bg-red-500/20 text-red-500 rounded-lg hover:bg-red-500/30"><X className="w-4 h-4" /></button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-3 group">
                                <h1 className="text-2xl font-bold text-white tracking-tight">{selectedGroup === 'All' ? 'All Leads' : selectedGroup}</h1>
                                {selectedGroup !== 'All' && (
                                    <button
                                        onClick={() => { setRenamingGroup(selectedGroup); setNewName(selectedGroup); }}
                                        className="opacity-0 group-hover:opacity-100 transition-opacity p-2 text-zinc-500 hover:text-white"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">
                        <div className="relative flex-1 sm:flex-none">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                            <input
                                type="text"
                                placeholder="Search saved contacts..."
                                value={dbSearch}
                                onChange={(e) => setDbSearch(e.target.value)}
                                className="w-full sm:w-[300px] bg-zinc-900 text-white text-xs font-medium pl-10 pr-4 py-3 rounded-xl border border-white/5 focus:border-white/10 outline-none transition-all placeholder:text-zinc-600"
                            />
                        </div>

                        <div className="flex gap-3">
                            <button onClick={fetchLeads} className="w-10 h-10 rounded-xl bg-zinc-900 border border-white/5 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors">
                                <Loader2 className="w-4 h-4" />
                            </button>
                            <button onClick={handleExport} className="bg-white hover:bg-zinc-200 text-black px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-white/5">
                                <Download className="w-3.5 h-3.5" /> Export CSV
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                    {filteredLeads.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center opacity-40">
                            <div className="w-24 h-24 rounded-full bg-zinc-900 flex items-center justify-center mb-4 border border-white/5">
                                <Database className="w-10 h-10 text-zinc-600" />
                            </div>
                            <p className="text-zinc-500 font-medium text-sm">{dbSearch ? 'No matches found' : 'No leads in this group'}</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pb-20">
                            {filteredLeads.map((lead, idx) => (
                                <motion.div
                                    key={lead.id}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: idx * 0.05 }}
                                >
                                    <ProfileCard key={lead.id} lead={lead} actionIcon={Trash2} onAction={() => deleteLead(lead.id)} />
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
