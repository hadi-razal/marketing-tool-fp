import React, { useEffect, useState } from 'react';
import { HardDrive, Clock, Star, Trash2, Cloud, Users, Share2, Folder, ChevronRight, Loader2 } from 'lucide-react';
import { cn } from '@/components/ui/Button';
import { workDriveApi } from '@/lib/zoho';

interface DriveSidebarProps {
    activeSection?: string;
    onNavigate?: (section: string, folderId?: string) => void;
}

export const DriveSidebar: React.FC<DriveSidebarProps> = ({ activeSection = 'my-files', onNavigate }) => {
    const [teamFolders, setTeamFolders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTeamFolders = async () => {
            try {
                const res = await workDriveApi.getTeamFolders();
                if (res.data) {
                    setTeamFolders(res.data);
                }
            } catch (error) {
                console.error('Failed to fetch team folders:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchTeamFolders();
    }, []);

    const mainItems = [
        { id: 'my-files', label: 'My Files', icon: HardDrive },
        { id: 'shared', label: 'Shared with Me', icon: Share2 },
    ];

    return (
        <div className="w-64 flex-shrink-0 border-r border-white/10 p-4 hidden md:flex flex-col gap-6 overflow-y-auto custom-scrollbar">
            <div className="px-2">
                <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4">Drive</h2>
                <div className="flex flex-col gap-1">
                    {mainItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => onNavigate?.(item.id)}
                            className={cn(
                                "flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 text-left",
                                activeSection === item.id
                                    ? "bg-orange-500/10 text-orange-500"
                                    : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                            )}
                        >
                            <item.icon className="w-4 h-4" />
                            {item.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="px-2">
                <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4 flex items-center justify-between">
                    Team Folders
                    {loading && <Loader2 className="w-3 h-3 animate-spin" />}
                </h2>
                <div className="flex flex-col gap-1">
                    {teamFolders.map((folder) => (
                        <button
                            key={folder.id}
                            onClick={() => onNavigate?.('team-folder', folder.id)}
                            className={cn(
                                "flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 text-left truncate",
                                activeSection === folder.id
                                    ? "bg-orange-500/10 text-orange-500"
                                    : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                            )}
                            title={folder.attributes.name}
                        >
                            <Users className="w-4 h-4 flex-shrink-0" />
                            <span className="truncate">{folder.attributes.name}</span>
                        </button>
                    ))}
                    {!loading && teamFolders.length === 0 && (
                        <p className="text-xs text-zinc-600 px-3">No team folders found</p>
                    )}
                </div>
            </div>

            {/* Storage Widget */}
            <div className="mt-auto p-4 rounded-2xl bg-gradient-to-br from-zinc-800/50 to-zinc-900/50 border border-white/5">
                <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-500">
                        <Cloud className="w-4 h-4" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-white">Storage</p>
                        <p className="text-xs text-zinc-500">Zoho WorkDrive</p>
                    </div>
                </div>
                <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden mb-2">
                    <div className="w-[45%] h-full bg-blue-500 rounded-full" />
                </div>
                <p className="text-xs text-zinc-400">4.2 GB of 10 GB used</p>
            </div>
        </div>
    );
};
