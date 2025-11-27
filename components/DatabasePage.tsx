import React, { useState, useEffect, useMemo } from 'react';
import {
    FolderOpen, Clock, Check, X, Edit2, Search, Loader2, Download, Database, Trash2, Filter
} from 'lucide-react';
import { SidebarContainer } from './Sidebar';
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
            <div className="w-full lg:w-80 flex-shrink-0 flex flex-col h-full overflow-hidden bg-zinc-900/50 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-xl">
                <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                    <FolderOpen className="w-5 h-5 text-orange-500" /> Saved Batches
                </h2>
                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-2">
                    {groups.map(group => (
                        <button key={group} onClick={() => setSelectedGroup(group)} className={`w-full text-left px-4 py-3.5 rounded-xl text-xs font-medium transition-all border ${selectedGroup === group ? 'bg-gradient-to-r from-zinc-800 to-zinc-900 text-white border-zinc-700 shadow-lg' : 'text-zinc-500 hover:text-white hover:bg-white/5 border-transparent'}`}>
                            <div className="flex justify-between items-center mb-1">
                                <span className="truncate max-w-[180px] font-bold">{group}</span>
                                {selectedGroup === group && <div className="w-1.5 h-1.5 rounded-full bg-orange-500"></div>}
                            </div>
                            {group !== 'All' && <span className="text-[10px] opacity-60 flex items-center gap-1"><Clock className="w-3 h-3" /> {leads.filter(l => l.group_name === group).length} items</span>}
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 bg-zinc-900/50 backdrop-blur-xl border border-white/10 rounded-3xl p-6 lg:p-8 flex flex-col shadow-xl overflow-hidden">
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
                                <h1 className="text-3xl font-bold text-white tracking-tight">{selectedGroup === 'All' ? 'All Leads' : selectedGroup}</h1>
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
                            <input type="text" placeholder="Search saved contacts..." value={dbSearch} onChange={(e) => setDbSearch(e.target.value)} className="w-full sm:w-[300px] bg-zinc-950/50 text-white text-sm pl-10 pr-4 py-3 rounded-xl border border-white/10 focus:border-orange-500 outline-none transition-all" />
                        </div>

                        <div className="flex gap-3">
                            <button onClick={fetchLeads} className="w-12 h-12 rounded-xl bg-zinc-800/50 border border-white/5 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors">
                                <Loader2 className="w-5 h-5" />
                            </button>
                            <button onClick={handleExport} className="bg-white hover:bg-zinc-200 text-black px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-white/10">
                                <Download className="w-4 h-4" /> Export CSV
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                    {filteredLeads.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center opacity-40">
                            <div className="w-24 h-24 rounded-full bg-zinc-800/50 flex items-center justify-center mb-4">
                                <Database className="w-10 h-10 text-white" />
                            </div>
                            <p className="text-zinc-400 font-medium">{dbSearch ? 'No matches found' : 'No leads in this group'}</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 pb-20">
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
