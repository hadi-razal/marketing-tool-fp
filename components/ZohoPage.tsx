import React, { useState } from 'react';

import { ExhibitorTable } from './Zoho/ExhibitorTable';
import { DatabaseTable } from './Zoho/DatabaseTable';
import { ShowsTable } from './Zoho/ShowsTable';
import { ZohoSettingsModal } from './Zoho/ZohoSettingsModal';
import { Settings, Database, Users, Calendar, CloudLightning, HardDrive } from 'lucide-react';
import { FileExplorer } from './Drive/FileExplorer';

export const ZohoPage = () => {
    const [activeView, setActiveView] = useState('exhibitors');
    const [showSettings, setShowSettings] = useState(false);

    return (
        <div className="flex flex-col lg:flex-row h-full relative gap-6">
            <ZohoSettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />

            {/* Zoho Sidebar */}
            <div className="w-full lg:w-80 flex-shrink-0 flex flex-col h-full bg-[#09090b] border border-white/5 rounded-[32px] p-6 overflow-hidden">
                <div className="flex items-center gap-3 mb-8">
                    <div className="p-2 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl shadow-lg shadow-orange-500/20">
                        <CloudLightning className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-white">Zoho Creator</h2>
                        <p className="text-xs text-zinc-400">Integration</p>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-6">
                    {/* Management Group */}
                    <div className="space-y-2">
                        <p className="px-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Management</p>
                        <button
                            onClick={() => setActiveView('exhibitors')}
                            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-300 text-left group ${activeView === 'exhibitors' ? 'bg-gradient-to-r from-orange-600 to-orange-500 text-white shadow-lg shadow-orange-500/20' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}
                        >
                            <Users className={`w-5 h-5 ${activeView === 'exhibitors' ? 'text-white' : 'text-zinc-500 group-hover:text-zinc-300'}`} />
                            <span className="font-medium text-sm">Exhibitors</span>
                        </button>

                        <button
                            onClick={() => setActiveView('shows')}
                            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-300 text-left group ${activeView === 'shows' ? 'bg-gradient-to-r from-orange-600 to-orange-500 text-white shadow-lg shadow-orange-500/20' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}
                        >
                            <Calendar className={`w-5 h-5 ${activeView === 'shows' ? 'text-white' : 'text-zinc-500 group-hover:text-zinc-300'}`} />
                            <span className="font-medium text-sm">Shows</span>
                        </button>

                        <button
                            onClick={() => setActiveView('database')}
                            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-300 text-left group ${activeView === 'database' ? 'bg-gradient-to-r from-orange-600 to-orange-500 text-white shadow-lg shadow-orange-500/20' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}
                        >
                            <Database className={`w-5 h-5 ${activeView === 'database' ? 'text-white' : 'text-zinc-500 group-hover:text-zinc-300'}`} />
                            <span className="font-medium text-sm">Event Participation</span>
                        </button>
                    </div>

                    {/* Storage Group */}
                    <div className="space-y-2">
                        <p className="px-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Storage</p>
                        <button
                            onClick={() => setActiveView('drive')}
                            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-300 text-left group ${activeView === 'drive' ? 'bg-gradient-to-r from-orange-600 to-orange-500 text-white shadow-lg shadow-orange-500/20' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}
                        >
                            <HardDrive className={`w-5 h-5 ${activeView === 'drive' ? 'text-white' : 'text-zinc-500 group-hover:text-zinc-300'}`} />
                            <span className="font-medium text-sm">WorkDrive</span>
                        </button>
                    </div>
                </div>

                <div className="mt-auto pt-6 border-t border-white/5">
                    <button
                        onClick={() => setShowSettings(true)}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-zinc-400 hover:bg-white/5 hover:text-white transition-all duration-300 text-left"
                    >
                        <Settings className="w-5 h-5 text-zinc-500 group-hover:text-zinc-300" />
                        <span className="font-medium text-sm">Connection Settings</span>
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 bg-[#09090b] border border-white/5 rounded-[32px] p-6 lg:p-8 overflow-hidden flex flex-col">
                <div className="flex items-center gap-4 mb-6">
                    <div>
                        <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
                            {activeView === 'exhibitors' ? 'Exhibitor Management' :
                                activeView === 'shows' ? 'Show Management' :
                                    activeView === 'database' ? 'Database Records' : 'Zoho WorkDrive'}
                        </h1>
                        <p className="text-zinc-400 text-sm mt-1">
                            {activeView === 'drive' ? 'Manage your files and folders.' : 'Manage your Zoho Creator data directly.'}
                        </p>
                    </div>
                </div>

                <div className="flex-1 overflow-hidden relative rounded-2xl border border-white/5 bg-zinc-950/30">
                    {activeView === 'exhibitors' && <ExhibitorTable />}
                    {activeView === 'shows' && <ShowsTable />}
                    {activeView === 'database' && <DatabaseTable />}
                    {activeView === 'drive' && <FileExplorer folderId="smd3w0fc9f42374574bc893c6909fbf58c677" />}
                </div>
            </div>
        </div>
    );
};
