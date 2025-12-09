import React from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Hash, Trash2, Edit2, Plus, Building2, MapPin, Calendar, Layers, User, Clock, Globe, Info, FileText, Link as LinkIcon, Briefcase, Flag } from 'lucide-react';
import { motion } from 'framer-motion';

interface DatabaseDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    data: any;
    onEdit: (item: any) => void;
    onDelete: (id: string) => void;
    onAddToLeads: (item: any) => void;
}

const DetailItem = ({ label, value, icon: Icon, isLink = false, fullWidth = false }: any) => {
    if (!value) return null;

    let displayValue = value;
    let href = value;

    // Handle Zoho object structure
    if (typeof value === 'object' && value !== null) {
        if ('url' in value) {
            displayValue = value.url;
            href = value.url;
        } else if ('display_value' in value) {
            displayValue = value.display_value;
        } else if ('value' in value) {
            displayValue = value.value;
        } else {
            // Fallback for unknown objects to prevent crash
            displayValue = JSON.stringify(value);
        }
    }

    return (
        <div className={`group relative overflow-hidden bg-white/5 hover:bg-white/10 p-3 rounded-xl border border-white/5 hover:border-white/10 transition-all duration-300 ${fullWidth ? 'md:col-span-2 lg:col-span-3' : ''}`}>
            <div className="flex items-start gap-3">
                <div className="mt-0.5 min-w-[16px]">
                    {Icon && <Icon className="w-4 h-4 text-zinc-500 group-hover:text-purple-400 transition-colors" />}
                </div>
                <div className="flex-1 overflow-hidden">
                    <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">{label}</div>
                    <div className="text-zinc-200 font-medium break-words text-sm leading-relaxed">
                        {isLink ? (
                            <a href={href} target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300 hover:underline flex items-center gap-1.5 transition-colors truncate">
                                {displayValue} <LinkIcon className="w-3 h-3" />
                            </a>
                        ) : (
                            displayValue
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export const DatabaseDetailsModal: React.FC<DatabaseDetailsModalProps> = ({ isOpen, onClose, data, onEdit, onDelete, onAddToLeads }) => {
    if (!data) return null;

    // Helper to extract display value safely
    const getSafely = (val: any) => {
        if (!val) return '';
        if (typeof val === 'object') return val.display_value || val.value || val.url || '';
        return val;
    };

    // Helper to format date
    const formatDate = (dateStr: string) => {
        if (!dateStr) return null;
        return new Date(dateStr).toLocaleString(undefined, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Participation Details" maxWidth="max-w-4xl">
            <div className="flex flex-col h-[80vh]">
                {/* Header */}
                <div className="p-6 border-b border-white/5 bg-zinc-900/50">
                    <h2 className="text-2xl font-bold text-white tracking-tight mb-2">
                        {getSafely(data.Company) || 'Unknown Company'}
                    </h2>
                    <div className="flex flex-wrap items-center gap-3">
                        <span className="text-zinc-400 text-xs font-medium flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-full border border-white/5">
                            <Hash className="w-3 h-3" /> {data.ID}
                        </span>
                        {/* Show Name in Header Subtitle */}
                        <span className="text-zinc-400 text-xs font-medium flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-full border border-white/5">
                            <Layers className="w-3 h-3" /> {getSafely(data.Show)}
                        </span>
                        {data.Attended_year1 && (
                            <span className="text-zinc-400 text-xs font-medium flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-full border border-white/5">
                                <Calendar className="w-3 h-3" /> {data.Attended_year1}
                            </span>
                        )}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-black/20">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {/* Primary Info */}
                        <DetailItem label="Company" value={data.Company} icon={Building2} />
                        <DetailItem label="Show" value={data.Show} icon={Layers} />
                        <DetailItem label="Booth No" value={data.Booth_No} icon={MapPin} />
                        <DetailItem label="Size (Sqm)" value={data.last_edition_booth_sqm} icon={Building2} />
                        <DetailItem label="Attended Year" value={data.Attended_year1} icon={Calendar} />

                        {/* Additional fields if available in the new report */}
                        <DetailItem label="Added Time" value={formatDate(data.Added_Time)} icon={Clock} />
                        <DetailItem label="Modified Time" value={formatDate(data.Modified_Time)} icon={Clock} />
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-white/5 bg-zinc-900/80 backdrop-blur-xl flex gap-3 justify-end">
                    <Button
                        onClick={() => {
                            if (confirm('Are you sure you want to delete this record?')) {
                                onDelete(data.ID);
                                onClose();
                            }
                        }}
                        className="h-10 px-4 text-sm font-medium bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 hover:border-red-500/30"
                        leftIcon={<Trash2 className="w-4 h-4" />}
                    >
                        Delete
                    </Button>
                    <Button
                        onClick={() => onEdit(data)}
                        variant="secondary"
                        className="h-10 px-4 text-sm font-medium glass-button"
                        leftIcon={<Edit2 className="w-4 h-4" />}
                    >
                        Edit
                    </Button>
                    <Button
                        onClick={() => onAddToLeads(data)}
                        className="h-10 px-6 text-sm font-medium bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-900/20"
                        leftIcon={<Plus className="w-4 h-4" />}
                    >
                        Add to Leads
                    </Button>
                </div>
            </div>
        </Modal>
    );
};
