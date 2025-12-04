import React, { useState, useEffect, useRef } from 'react';
import { Upload, Grid, List as ListIcon, Search, ChevronRight, Loader2, FolderPlus, File as FileIcon, Download, MoreVertical, Folder, Image as ImageIcon, FileText, Music, Video, Trash2, Share2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { workDriveApi, WorkDriveFile } from '@/lib/zoho';
import { cn } from '@/components/ui/Button';
import { FileCard } from './FileCard';

interface FileExplorerProps {
    viewType?: string;
    folderId?: string | null;
    onNavigate?: (folderId: string) => void;
    onViewChange?: (view: string) => void;
}

export const FileExplorer: React.FC<FileExplorerProps> = ({
    viewType: propViewType,
    folderId: propFolderId,
    onNavigate,
    onViewChange
}) => {
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [files, setFiles] = useState<WorkDriveFile[]>([]);
    const [loading, setLoading] = useState(true);
    const [breadcrumbs, setBreadcrumbs] = useState<{ id: string; name: string }[]>([]);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Internal state for uncontrolled mode
    const [internalViewType, setInternalViewType] = useState('my-files');
    const [internalFolderId, setInternalFolderId] = useState<string | null>(null);

    // Derived state
    const currentView = propViewType !== undefined ? propViewType : internalViewType;
    const currentFolderId = propFolderId !== undefined ? propFolderId : internalFolderId;

    // Reset internal folder state when view changes
    useEffect(() => {
        if (propFolderId === undefined) {
            setInternalFolderId(null);
        }
        setBreadcrumbs([]);
    }, [currentView]);

    const handleViewChange = (newView: string) => {
        if (onViewChange) {
            onViewChange(newView);
        } else {
            setInternalViewType(newView);
        }
    };

    const handleNavigateLocal = (targetFolderId: string, folderName?: string) => {
        if (onNavigate) {
            onNavigate(targetFolderId);
        } else {
            setInternalFolderId(targetFolderId);
        }

        // Update breadcrumbs
        const newCrumb = { id: targetFolderId, name: folderName || 'Folder' };
        const existingIndex = breadcrumbs.findIndex(b => b.id === targetFolderId);
        if (existingIndex >= 0) {
            setBreadcrumbs(breadcrumbs.slice(0, existingIndex + 1));
        } else {
            setBreadcrumbs([...breadcrumbs, newCrumb]);
        }
    };

    // Load initial view or folder
    useEffect(() => {
        const loadContent = async () => {
            setLoading(true);
            setError(null);
            setFiles([]);

            try {
                // If we have a specific folder ID, load it
                if (currentFolderId) {
                    const res = await workDriveApi.getFiles(currentFolderId);
                    if (res.data) {
                        setFiles(res.data);
                        if (breadcrumbs.length === 0) {
                            setBreadcrumbs([{ id: currentFolderId, name: 'Folder' }]);
                        }
                    }
                    setLoading(false);
                    return;
                }

                // Otherwise load based on currentView
                if (currentView === 'team-folders') {
                    const res = await workDriveApi.getTeamFolders();
                    if (res.data) {
                        setFiles(res.data);
                        setBreadcrumbs([{ id: 'root', name: 'Team Folders' }]);
                    }
                } else if (currentView === 'my-files') {
                    const userRes = await workDriveApi.getMe();
                    const privateSpaceUrl = userRes.data?.relationships?.privatespace?.links?.related;

                    if (privateSpaceUrl) {
                        const config = JSON.parse(localStorage.getItem('zoho_config') || '{}');
                        const token = config.accessToken;

                        const psRes = await fetch(privateSpaceUrl, {
                            headers: {
                                'Authorization': `Zoho-oauthtoken ${token}`,
                                'Accept': 'application/vnd.api+json'
                            }
                        });
                        const psData = await psRes.json();

                        if (psData.data) {
                            const myFolderId = psData.data.id;
                            if (onNavigate) {
                                // Don't trigger navigation, just load files
                                const filesRes = await workDriveApi.getFiles(myFolderId);
                                if (filesRes.data) setFiles(filesRes.data);
                                setBreadcrumbs([{ id: myFolderId, name: 'My Files' }]);
                            } else {
                                const filesRes = await workDriveApi.getFiles(myFolderId);
                                if (filesRes.data) setFiles(filesRes.data);
                                setBreadcrumbs([{ id: myFolderId, name: 'My Files' }]);
                                setInternalFolderId(myFolderId);
                            }
                            setLoading(false);
                            return;
                        }
                    }
                    setError("Could not locate 'My Files'.");

                } else if (currentView === 'shared') {
                    const res = await workDriveApi.getSharedFiles();
                    if (res.data) {
                        setFiles(res.data);
                        setBreadcrumbs([{ id: 'shared', name: 'Shared with Me' }]);
                    }
                }
            } catch (err: any) {
                console.error('Failed to load content:', err);
                setError(`Failed to load content: ${err.message}`);
            } finally {
                setLoading(false);
            }
        };

        loadContent();
    }, [currentView, currentFolderId]);

    const handleBreadcrumbClick = (index: number) => {
        const target = breadcrumbs[index];
        if (target.id === 'root' || target.id === 'shared') {
            if (onNavigate) onNavigate('');
            setInternalFolderId(null);
        } else {
            handleNavigateLocal(target.id, target.name);
        }
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const activeId = currentFolderId;
        if (!e.target.files || !e.target.files.length || !activeId) {
            if (!activeId) alert("Cannot upload here. Please navigate to a folder first.");
            return;
        }

        const file = e.target.files[0];
        setUploading(true);
        try {
            await workDriveApi.uploadFile(activeId, file);
            const res = await workDriveApi.getFiles(activeId);
            if (res.data) setFiles(res.data);
        } catch (error) {
            console.error('Upload failed:', error);
            alert('Upload failed');
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleDownload = async (file: WorkDriveFile) => {
        try {
            const url = await workDriveApi.getDownloadUrl(file.id);
            const config = JSON.parse(localStorage.getItem('zoho_config') || '{}');
            const token = config.accessToken;

            const res = await fetch(url, {
                headers: { 'Authorization': `Zoho-oauthtoken ${token}` }
            });

            if (!res.ok) throw new Error('Download failed');

            const blob = await res.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = file.attributes.name;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(downloadUrl);
            document.body.removeChild(a);
        } catch (error) {
            console.error('Download error:', error);
            alert('Download failed');
        }
    };

    const filteredFiles = files.filter(f =>
        f.attributes.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden">
            {/* Toolbar */}
            <div className="flex flex-col md:flex-row items-center justify-between p-4 border-b border-white/5 gap-4">
                <div className="flex items-center gap-2 overflow-hidden w-full md:w-auto">
                    {/* View Selector (Mobile/Compact) */}
                    <select
                        value={currentView}
                        onChange={(e) => handleViewChange(e.target.value)}
                        className="md:hidden bg-zinc-900 border border-zinc-700 text-white text-sm rounded-lg px-2 py-1 mr-2"
                    >
                        <option value="my-files">My Files</option>
                        <option value="team-folders">Team Folders</option>
                        <option value="shared">Shared</option>
                    </select>

                    {breadcrumbs.map((crumb, index) => (
                        <div key={crumb.id} className="flex items-center text-sm">
                            {index > 0 && <ChevronRight className="w-4 h-4 text-zinc-600 mx-1" />}
                            <button
                                onClick={() => handleBreadcrumbClick(index)}
                                className={cn(
                                    "hover:text-white transition-colors truncate max-w-[150px]",
                                    index === breadcrumbs.length - 1 ? "text-white font-medium" : "text-zinc-500"
                                )}
                            >
                                {crumb.name}
                            </button>
                        </div>
                    ))}
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                    {/* Desktop View Switcher */}
                    <div className="hidden md:flex bg-zinc-900/50 rounded-lg p-1 border border-white/5 mr-2">
                        <button onClick={() => handleViewChange('my-files')} className={cn("px-3 py-1.5 rounded-md text-xs font-medium transition-colors", currentView === 'my-files' ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-300")}>My Files</button>
                        <button onClick={() => handleViewChange('team-folders')} className={cn("px-3 py-1.5 rounded-md text-xs font-medium transition-colors", currentView === 'team-folders' ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-300")}>Team Folders</button>
                        <button onClick={() => handleViewChange('shared')} className={cn("px-3 py-1.5 rounded-md text-xs font-medium transition-colors", currentView === 'shared' ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-300")}>Shared</button>
                    </div>

                    <div className="relative group flex-1 md:flex-none">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-hover:text-zinc-400 transition-colors" />
                        <input
                            type="text"
                            placeholder="Search files..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full md:w-64 bg-black/20 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-orange-500/50 transition-all placeholder:text-zinc-600"
                        />
                    </div>

                    <div className="flex items-center bg-white/5 rounded-xl p-1 border border-white/10">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={cn("p-2 rounded-lg transition-all", viewMode === 'grid' ? "bg-white/10 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300")}
                        >
                            <Grid className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={cn("p-2 rounded-lg transition-all", viewMode === 'list' ? "bg-white/10 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300")}
                        >
                            <ListIcon className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="h-6 w-px bg-white/10 hidden md:block" />

                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        onChange={handleUpload}
                    />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading || (!currentFolderId && currentView !== 'my-files')}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white rounded-xl text-sm font-medium transition-all shadow-lg shadow-orange-500/20 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02]"
                    >
                        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                        <span className="hidden sm:inline">Upload File</span>
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                {error ? (
                    <div className="flex flex-col items-center justify-center h-full text-red-400 gap-4 p-4">
                        <div className="w-20 h-20 rounded-3xl bg-red-500/10 flex items-center justify-center border border-red-500/20">
                            <FolderPlus className="w-10 h-10 opacity-50" />
                        </div>
                        <p className="text-center max-w-md font-medium">{error}</p>

                        <div className="flex flex-col gap-2 w-full max-w-sm mt-4">
                            <label className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Manual Folder ID Override</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="e.g. smd3w..."
                                    className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:border-orange-500 focus:outline-none"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            const val = e.currentTarget.value.trim();
                                            if (val) {
                                                handleNavigateLocal(val, 'Manual Folder');
                                                setError(null);
                                            }
                                        }
                                    }}
                                />
                                <button
                                    onClick={() => window.location.reload()}
                                    className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm text-white transition-colors border border-white/10"
                                >
                                    Retry
                                </button>
                            </div>
                            <p className="text-xs text-zinc-600">
                                If auto-discovery fails, paste a Folder ID from your WorkDrive URL (the long alphanumeric string).
                            </p>
                        </div>
                    </div>
                ) : loading ? (
                    <div className="flex flex-col items-center justify-center h-full text-zinc-500 gap-4">
                        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                        <span className="text-sm font-medium">Loading your files...</span>
                    </div>
                ) : filteredFiles.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-zinc-500 gap-6">
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-white/5 to-transparent flex items-center justify-center border border-white/5 shadow-inner">
                            <FolderPlus className="w-10 h-10 opacity-30" />
                        </div>
                        <div className="text-center">
                            <p className="text-lg font-medium text-white mb-1">This folder is empty</p>
                            <p className="text-sm opacity-50">Upload files to get started</p>
                        </div>
                    </div>
                ) : (
                    <div className={cn(
                        "grid gap-4",
                        viewMode === 'grid' ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6" : "grid-cols-1"
                    )}>
                        <AnimatePresence mode='popLayout'>
                            {filteredFiles.map((file) => (
                                <FileCard
                                    key={file.id}
                                    file={file}
                                    viewMode={viewMode}
                                    onNavigate={(id) => handleNavigateLocal(id, file.attributes.name)}
                                    onDownload={handleDownload}
                                />
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </div>
        </div>
    );
};
