import React from 'react';
import { File as FileIcon, Folder, Image as ImageIcon, FileText, Music, Video, Download, MoreVertical, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';
import { WorkDriveFile } from '@/lib/zoho';
import { cn } from '@/components/ui/Button';

interface FileCardProps {
    file: WorkDriveFile;
    viewMode?: 'grid' | 'list';
    onNavigate: (id: string) => void;
    onDownload: (file: WorkDriveFile) => void;
}

export const FileCard: React.FC<FileCardProps> = ({ file, viewMode = 'grid', onNavigate, onDownload }) => {
    const isFolder = file.attributes.is_folder;
    const name = file.attributes.name;
    const size = file.attributes.size ? (file.attributes.size / 1024 / 1024).toFixed(2) + ' MB' : '';
    const date = file.attributes.modified_time_in_millisecond
        ? new Date(file.attributes.modified_time_in_millisecond).toLocaleDateString()
        : '';

    const getIcon = () => {
        if (isFolder) return <Folder className="w-full h-full text-orange-400" fill="currentColor" fillOpacity={0.2} />;
        const ext = name.split('.').pop()?.toLowerCase();
        if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) return <ImageIcon className="w-full h-full text-purple-400" />;
        if (['pdf', 'doc', 'docx', 'txt'].includes(ext || '')) return <FileText className="w-full h-full text-blue-400" />;
        if (['mp3', 'wav'].includes(ext || '')) return <Music className="w-full h-full text-pink-400" />;
        if (['mp4', 'mov', 'avi'].includes(ext || '')) return <Video className="w-full h-full text-green-400" />;
        return <FileIcon className="w-full h-full text-zinc-400" />;
    };

    if (viewMode === 'list') {
        return (
            <motion.div
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="group flex items-center gap-4 p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 transition-all cursor-pointer"
                onDoubleClick={() => isFolder && onNavigate(file.id)}
            >
                <div className="w-10 h-10 p-2 bg-black/20 rounded-lg flex items-center justify-center">
                    {getIcon()}
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-zinc-200 truncate group-hover:text-white transition-colors">{name}</h3>
                    <div className="flex items-center gap-2 text-xs text-zinc-500">
                        <span>{date}</span>
                        {size && <span>• {size}</span>}
                    </div>
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!isFolder && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onDownload(file); }}
                            className="p-2 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-white transition-colors"
                            title="Download"
                        >
                            <Download className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </motion.div>
        );
    }

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="group relative flex flex-col p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 transition-all cursor-pointer hover:-translate-y-1 hover:shadow-xl hover:shadow-black/20"
            onDoubleClick={() => isFolder && onNavigate(file.id)}
        >
            <div className="aspect-square mb-3 rounded-xl bg-black/20 flex items-center justify-center p-6 group-hover:scale-105 transition-transform duration-300">
                {getIcon()}
            </div>

            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                    <h3 className="text-sm font-medium text-zinc-200 truncate group-hover:text-white transition-colors" title={name}>
                        {name}
                    </h3>
                    <p className="text-xs text-zinc-500 mt-0.5">{size || (isFolder ? 'Folder' : '')}</p>
                </div>

                {!isFolder && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onDownload(file); }}
                        className="p-1.5 hover:bg-white/10 rounded-lg text-zinc-500 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
                        title="Download"
                    >
                        <Download className="w-4 h-4" />
                    </button>
                )}
            </div>
        </motion.div>
    );
};
