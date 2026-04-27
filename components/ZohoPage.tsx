import React, { useState } from 'react';

import { ExhibitorTable } from './Zoho/ExhibitorTable';
import { DatabaseTable } from './Zoho/DatabaseTable';
import { ShowsTable } from './Zoho/ShowsTable';
import { Database, Users, Calendar, CloudLightning, HardDrive, Sparkles } from 'lucide-react';
import { FileExplorer } from './Drive/FileExplorer';

export const ZohoPage = () => {
    const [activeView, setActiveView] = useState('exhibitors');

    return (
        <div className="flex flex-col lg:flex-row h-full relative gap-6">
            {/* Zoho Sidebar */}
            <div className="w-full lg:w-80 shrink-0 flex flex-col h-full bg-white/90 border border-zinc-200 rounded-[32px] p-6 overflow-hidden shadow-xl shadow-zinc-950/5">
                <div className="flex items-center gap-3 mb-8">
                    <div className="p-2 bg-linear-to-br from-orange-500 to-red-600 rounded-xl shadow-lg shadow-orange-500/20">
                        <CloudLightning className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-zinc-950">Zoho Creator</h2>
                        <p className="text-xs text-zinc-500">Exhibitor data workspace</p>
                    </div>
                </div>

                <div className="mb-6 rounded-2xl bg-zinc-950 text-white p-4 shadow-lg shadow-zinc-950/10">
                    <div className="flex items-center gap-2 text-orange-300 text-xs font-bold uppercase tracking-wider">
                        <Sparkles className="w-3.5 h-3.5" />
                        Focus area
                    </div>
                    <p className="mt-2 text-sm leading-5 text-zinc-200">
                        Find, filter, review, and update exhibitor records from one clean workspace.
                    </p>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-6">
                    {/* Management Group */}
                    <div className="space-y-2">
                        <p className="px-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Management</p>
                        <button
                            onClick={() => setActiveView('exhibitors')}
                            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-300 text-left group ${activeView === 'exhibitors' ? 'bg-linear-to-r from-orange-600 to-orange-500 text-white shadow-lg shadow-orange-500/20' : 'text-zinc-600 hover:bg-orange-50 hover:text-zinc-950'}`}
                        >
                            <Users className={`w-5 h-5 ${activeView === 'exhibitors' ? 'text-white' : 'text-zinc-500 group-hover:text-orange-500'}`} />
                            <span className="font-medium text-sm">Exhibitors</span>
                        </button>

                        <button
                            onClick={() => setActiveView('shows')}
                            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-300 text-left group ${activeView === 'shows' ? 'bg-linear-to-r from-orange-600 to-orange-500 text-white shadow-lg shadow-orange-500/20' : 'text-zinc-600 hover:bg-orange-50 hover:text-zinc-950'}`}
                        >
                            <Calendar className={`w-5 h-5 ${activeView === 'shows' ? 'text-white' : 'text-zinc-500 group-hover:text-orange-500'}`} />
                            <span className="font-medium text-sm">Shows</span>
                        </button>

                        {/* Event Participation - Hidden for now */}
                        <button
                            onClick={() => setActiveView('database')}
                            className={`hidden w-full items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-300 text-left group ${activeView === 'database' ? 'bg-linear-to-r from-orange-600 to-orange-500 text-white shadow-lg shadow-orange-500/20' : 'text-zinc-600 hover:bg-orange-50 hover:text-zinc-950'}`}
                        >
                            <Database className={`w-5 h-5 ${activeView === 'database' ? 'text-white' : 'text-zinc-500 group-hover:text-orange-500'}`} />
                            <span className="font-medium text-sm">Event Participation</span>
                        </button>
                    </div>

                    {/* Storage Group */}
                    <div className="space-y-2">
                        <p className="px-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Storage</p>
                        <button
                            onClick={() => setActiveView('drive')}
                            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-300 text-left group ${activeView === 'drive' ? 'bg-linear-to-r from-orange-600 to-orange-500 text-white shadow-lg shadow-orange-500/20' : 'text-zinc-600 hover:bg-orange-50 hover:text-zinc-950'}`}
                        >
                            <HardDrive className={`w-5 h-5 ${activeView === 'drive' ? 'text-white' : 'text-zinc-500 group-hover:text-orange-500'}`} />
                            <span className="font-medium text-sm">WorkDrive</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 bg-white/95 border border-zinc-200 rounded-[32px] p-6 lg:p-8 overflow-hidden flex flex-col shadow-xl shadow-zinc-950/5">
                <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-4 mb-6">
                    <div>
                        <p className="text-xs font-bold text-orange-600 uppercase tracking-[0.22em] mb-2">Fairplatz CRM</p>
                        <h1 className="text-2xl lg:text-4xl font-bold text-zinc-950 tracking-tight">
                            {activeView === 'exhibitors' ? 'Exhibitor Management' :
                                activeView === 'shows' ? 'Show Management' :
                                    activeView === 'database' ? 'Database Records' : 'Zoho WorkDrive'}
                        </h1>
                        <p className="text-zinc-500 text-sm mt-2 max-w-2xl">
                            {activeView === 'drive' ? 'Manage your files and folders.' : 'A cleaner, faster workspace for searching and maintaining Zoho Creator data.'}
                        </p>
                    </div>
                    <div className="rounded-2xl border border-orange-100 bg-orange-50 px-4 py-3 text-sm text-zinc-700">
                        <span className="font-semibold text-zinc-950">Theme:</span> white workspace, orange actions, black content.
                    </div>
                </div>

                <div className="flex-1 overflow-hidden relative rounded-3xl border border-zinc-200 bg-zinc-50/80">
                    {activeView === 'exhibitors' && <ExhibitorTable />}
                    {activeView === 'shows' && <ShowsTable />}
                    {activeView === 'database' && <DatabaseTable />}
                    {activeView === 'drive' && <FileExplorer folderId="smd3w0fc9f42374574bc893c6909fbf58c677" />}
                </div>
            </div>
        </div>
    );
};
