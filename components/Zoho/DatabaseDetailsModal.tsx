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
                            <a href={value} target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300 hover:underline flex items-center gap-1.5 transition-colors truncate">
                                {value} <LinkIcon className="w-3 h-3" />
                            </a>
                        ) : (
                            value
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export const DatabaseDetailsModal: React.FC<DatabaseDetailsModalProps> = ({ isOpen, onClose, data, onEdit, onDelete, onAddToLeads }) => {
    if (!data) return null;

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

    // Fields configuration based on user request
    // ID, City, Country, Event, Event_logo, Event_Type, Exhibition_Size, Exhibitor_List_FILE, Exhibitor_List_Link, Floorplan, Floorplan_Link, Frequency, Industry, Last_edition_n_Exhibitors, Level, Modified_Time, Modified_User, Note1, Organiser, Starting_Date, Website, World_Area

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Record Details" maxWidth="max-w-4xl">
            <div className="flex flex-col h-[80vh]">
                {/* Header */}
                <div className="p-6 border-b border-white/5 bg-zinc-900/50">
                    <h2 className="text-2xl font-bold text-white tracking-tight mb-2">
                        {data.Event || data.Show || 'Unknown Event'}
                    </h2>
                    <div className="flex flex-wrap items-center gap-3">
                        <span className="text-zinc-400 text-xs font-medium flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-full border border-white/5">
                            <Hash className="w-3 h-3" /> {data.ID}
                        </span>
                        {data.City && (
                            <span className="text-zinc-400 text-xs font-medium flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-full border border-white/5">
                                <MapPin className="w-3 h-3" /> {data.City}, {data.Country}
                            </span>
                        )}
                        {data.Starting_Date && (
                            <span className="text-zinc-400 text-xs font-medium flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-full border border-white/5">
                                <Calendar className="w-3 h-3" /> {data.Starting_Date}
                            </span>
                        )}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-black/20">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {/* Primary Info */}
                        <DetailItem label="Event Type" value={data.Event_Type} icon={Layers} />
                        <DetailItem label="Exhibition Size" value={data.Exhibition_Size} icon={Building2} />
                        <DetailItem label="Industry" value={data.Industry} icon={Briefcase} />
                        <DetailItem label="Frequency" value={data.Frequency} icon={Clock} />
                        <DetailItem label="Level" value={data.Level} icon={Flag} />
                        <DetailItem label="World Area" value={data.World_Area} icon={Globe} />
                        <DetailItem label="Organiser" value={data.Organiser} icon={User} />
                        <DetailItem label="Last Edition Exhibitors" value={data.Last_edition_n_Exhibitors} icon={User} />

                        {/* Links & Files */}
                        <DetailItem label="Website" value={data.Website} icon={Globe} isLink fullWidth />
                        <DetailItem label="Exhibitor List Link" value={data.Exhibitor_List_Link} icon={LinkIcon} isLink fullWidth />
                        <DetailItem label="Floorplan Link" value={data.Floorplan_Link} icon={LinkIcon} isLink fullWidth />
                        <DetailItem label="Exhibitor List File" value={data.Exhibitor_List_FILE} icon={FileText} fullWidth />
                        <DetailItem label="Floorplan File" value={data.Floorplan} icon={FileText} fullWidth />
                        <DetailItem label="Event Logo" value={data.Event_logo} icon={FileText} fullWidth />

                        {/* Metadata */}
                        <DetailItem label="Note" value={data.Note1} icon={Info} fullWidth />
                        <DetailItem label="Modified User" value={data.Modified_User} icon={User} />
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
