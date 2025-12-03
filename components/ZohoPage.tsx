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
            <div className="w-full lg:w-80 flex-shrink-0 flex flex-col h-full bg-zinc-900/50 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-xl overflow-hidden">
                <div className="flex items-center gap-3 mb-8">
                    <div className="p-2 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl shadow-lg shadow-orange-500/20">
                        <CloudLightning className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-white">Zoho Creator</h2>
                        <p className="text-xs text-zinc-400">Integration</p>
                    </div>
                </div>

                <div className="space-y-2 flex-1 overflow-y-auto custom-scrollbar">
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
                        <span className="font-medium text-sm">Database</span>
                    </button>

                    <button
                        onClick={() => setActiveView('drive')}
                        className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-300 text-left group ${activeView === 'drive' ? 'bg-gradient-to-r from-orange-600 to-orange-500 text-white shadow-lg shadow-orange-500/20' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}
                    >
                        <HardDrive className={`w-5 h-5 ${activeView === 'drive' ? 'text-white' : 'text-zinc-500 group-hover:text-zinc-300'}`} />
                        <span className="font-medium text-sm">WorkDrive</span>
                    </button>
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
            <div className="flex-1 bg-zinc-900/50 backdrop-blur-xl border border-white/10 rounded-3xl p-6 lg:p-8 overflow-hidden flex flex-col shadow-xl">
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
                    {activeView === 'drive' && <FileExplorer />}
                </div>
            </div>
        </div>
    );
};
