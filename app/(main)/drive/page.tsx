'use client';
import React from 'react';
import { DriveSidebar } from '@/components/Drive/DriveSidebar';
import { FileExplorer } from '@/components/Drive/FileExplorer';

export default function DrivePage() {
    const [activeSection, setActiveSection] = React.useState('my-files');
    const [currentFolderId, setCurrentFolderId] = React.useState<string | null>(null);

    const handleNavigate = (section: string, folderId?: string) => {
        setActiveSection(section);
        if (folderId) {
            setCurrentFolderId(folderId);
        } else {
            setCurrentFolderId(null);
        }
    };

    return (
        <div className="flex h-full rounded-3xl bg-zinc-900/50 backdrop-blur-xl border border-white/5 overflow-hidden shadow-2xl">
            <DriveSidebar activeSection={activeSection} onNavigate={handleNavigate} />
            <FileExplorer
                viewType={activeSection}
                folderId={currentFolderId}
                onNavigate={(id: string) => setCurrentFolderId(id)}
                onViewChange={(view: string) => {
                    setActiveSection(view);
                    setCurrentFolderId(null);
                }}
            />
        </div>
    );
}
