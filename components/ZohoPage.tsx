import React, { useState } from 'react';
import { Sidebar, SidebarItem } from './Sidebar';
import { ExhibitorTable } from './Zoho/ExhibitorTable';
import { DatabaseTable } from './Zoho/DatabaseTable';
import { ShowsTable } from './Zoho/ShowsTable';
import { ZohoSettingsModal } from './Zoho/ZohoSettingsModal';
import { Settings, Database, Users, Calendar, CloudLightning } from 'lucide-react';
import { Button } from './ui/Button';

export const ZohoPage = () => {
    const [activeView, setActiveView] = useState('exhibitors');
    const [showSettings, setShowSettings] = useState(false);

    return (
        <div className="flex h-full gap-6">
            <ZohoSettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />

            <Sidebar title="Zoho Creator">
                <div className="space-y-2">
                    <SidebarItem active={activeView === 'exhibitors'} onClick={() => setActiveView('exhibitors')}>
                        <div className="flex items-center gap-3">
                            <Users className="w-5 h-5 text-zinc-400" />
                            <span className="font-medium text-zinc-200">Exhibitors</span>
                        </div>
                    </SidebarItem>

                    <SidebarItem active={activeView === 'shows'} onClick={() => setActiveView('shows')}>
                        <div className="flex items-center gap-3">
                            <Calendar className="w-5 h-5 text-zinc-400" />
                            <span className="font-medium text-zinc-200">Shows</span>
                        </div>
                    </SidebarItem>

                    <SidebarItem active={activeView === 'database'} onClick={() => setActiveView('database')}>
                        <div className="flex items-center gap-3">
                            <Database className="w-5 h-5 text-zinc-400" />
                            <span className="font-medium text-zinc-200">Database</span>
                        </div>
                    </SidebarItem>
                </div>

                <div className="mt-8 pt-6 border-t border-white/5">
                    <Button
                        variant="secondary"
                        className="w-full justify-start gap-3"
                        onClick={() => setShowSettings(true)}
                        leftIcon={<Settings className="w-4 h-4" />}
                    >
                        Connection Settings
                    </Button>
                </div>
            </Sidebar>

            <div className="flex-1 glass-panel rounded-[32px] p-8 overflow-hidden flex flex-col">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20">
                        <CloudLightning className="w-6 h-6 text-blue-500" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white tracking-tight">
                            {activeView === 'exhibitors' ? 'Exhibitor Management' :
                                activeView === 'shows' ? 'Show Management' : 'Database Records'}
                        </h1>
                        <p className="text-zinc-500 text-sm">Manage your Zoho Creator data directly.</p>
                    </div>
                </div>

                <div className="flex-1 overflow-hidden">
                    {activeView === 'exhibitors' && <ExhibitorTable />}
                    {activeView === 'shows' && <ShowsTable />}
                    {activeView === 'database' && <DatabaseTable />}
                </div>
            </div>
        </div>
    );
};
