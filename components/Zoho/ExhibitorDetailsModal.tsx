import React from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Globe, MapPin, Hash, ExternalLink, Trash2, Edit2, Plus, User, Clock, Layers, Info } from 'lucide-react';
import { motion } from 'framer-motion';

interface ExhibitorDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    data: any;
    onEdit: (item: any) => void;
    onDelete: (id: string) => void;
    onAddToLeads: (item: any) => void;
}

const Section = ({ title, children, delay = 0 }: { title: string, children: React.ReactNode, delay?: number }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay, duration: 0.4 }}
        className="space-y-4"
    >
        <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500/50"></span>
            {title}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {children}
        </div>
    </motion.div>
);

const DetailItem = ({ label, value, icon: Icon, isLink = false, fullWidth = false }: any) => {
    if (!value) return null;
    return (
        <div className={`group relative overflow-hidden bg-zinc-900/40 hover:bg-zinc-900/60 p-4 rounded-2xl border border-white/5 hover:border-white/10 transition-all duration-300 ${fullWidth ? 'md:col-span-2 lg:col-span-3' : ''}`}>
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2 text-zinc-500 text-xs font-bold uppercase tracking-wider">
                    {Icon && <Icon className="w-3.5 h-3.5 text-zinc-600 group-hover:text-blue-500/70 transition-colors" />}
                    {label}
                </div>
                <div className="text-zinc-100 font-medium break-words text-sm leading-relaxed">
                    {isLink ? (
                        <a href={value} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 hover:underline flex items-center gap-1.5 transition-colors">
                            {value} <ExternalLink className="w-3 h-3 opacity-70" />
                        </a>
                    ) : (
                        value
                    )}
                </div>
            </div>
        </div>
    );
};

export const ExhibitorDetailsModal: React.FC<ExhibitorDetailsModalProps> = ({ isOpen, onClose, data, onEdit, onDelete, onAddToLeads }) => {
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

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Exhibitor Details" maxWidth="max-w-5xl">
            <div className="relative">
                {/* Hero Header */}
                <div className="relative bg-zinc-900/80 border-b border-white/5 p-8 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-transparent opacity-50" />
                    <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl" />

                    <div className="relative z-10">
                        <motion.h2
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-4xl md:text-5xl font-bold text-white mb-3 tracking-tight"
                        >
                            {data.Company}
                        </motion.h2>
                        <div className="flex flex-wrap items-center gap-3">
                            {data.FP_Level && (
                                <span className={`px-3 py-1 rounded-full text-xs font-bold border shadow-lg ${data.FP_Level === '1' ? 'bg-red-500/10 text-red-500 border-red-500/20 shadow-red-500/5' :
                                        data.FP_Level === '2' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20 shadow-yellow-500/5' :
                                            'bg-green-500/10 text-green-500 border-green-500/20 shadow-green-500/5'
                                    }`}>
                                    Level {data.FP_Level}
                                </span>
                            )}
                            <span className="text-zinc-400 text-xs font-medium flex items-center gap-1.5 bg-white/5 px-3 py-1 rounded-full border border-white/5">
                                <Hash className="w-3 h-3" /> {data.ID}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Content Scroll Area */}
                <div className="p-8 space-y-10 max-h-[65vh] overflow-y-auto custom-scrollbar bg-black/20">

                    {/* General Info */}
                    <Section title="General Information" delay={0.1}>
                        <DetailItem label="Website" value={data.Website} icon={Globe} isLink />
                        <DetailItem label="Events" value={data.Events} icon={Layers} />
                        <DetailItem label="Type" value={data.Type} icon={Layers} />
                    </Section>

                    {/* Location */}
                    <Section title="Location" delay={0.2}>
                        <DetailItem label="City" value={data.City} icon={MapPin} />
                        <DetailItem label="Country" value={data.Country} icon={MapPin} />
                        <DetailItem label="World Area" value={data.World_Area} icon={Globe} />
                    </Section>

                    {/* System Info */}
                    <Section title="System Metadata" delay={0.3}>
                        <DetailItem label="Added User" value={data.Added_User} icon={User} />
                        <DetailItem label="Added Time" value={formatDate(data.Added_Time)} icon={Clock} />
                        <DetailItem label="Modified User" value={data.Modified_User} icon={User} />
                        <DetailItem label="Modified Time" value={formatDate(data.Modified_Time)} icon={Clock} />
                    </Section>

                    {/* Additional Data */}
                    <Section title="Additional Data" delay={0.4}>
                        {Object.entries(data).map(([key, value]) => {
                            if (['ID', 'Company', 'FP_Level', 'Website', 'Events', 'Type', 'City', 'Country', 'World_Area', 'Added_User', 'Added_Time', 'Modified_User', 'Modified_Time'].includes(key)) return null;
                            if (typeof value === 'object' && value !== null) return null;
                            return <DetailItem key={key} label={key.replace(/_/g, ' ')} value={String(value)} icon={Info} />;
                        })}
                    </Section>
                </div>

                {/* Actions Footer */}
                <div className="p-6 border-t border-white/5 bg-zinc-900/90 backdrop-blur-xl flex gap-4 sticky bottom-0 z-20">
                    <Button
                        onClick={() => onAddToLeads(data)}
                        className="flex-1 h-12 text-base font-medium bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-900/20"
                        leftIcon={<Plus className="w-4 h-4" />}
                    >
                        Add to Leads
                    </Button>
                    <Button
                        onClick={() => onEdit(data)}
                        variant="secondary"
                        className="flex-1 h-12 text-base font-medium bg-white/5 hover:bg-white/10 border-white/5"
                        leftIcon={<Edit2 className="w-4 h-4" />}
                    >
                        Edit Record
                    </Button>
                    <Button
                        onClick={() => {
                            if (confirm('Are you sure you want to delete this record?')) {
                                onDelete(data.ID);
                                onClose();
                            }
                        }}
                        className="flex-1 h-12 text-base font-medium bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 hover:border-red-500/30"
                        leftIcon={<Trash2 className="w-4 h-4" />}
                    >
                        Delete
                    </Button>
                </div>
            </div>
        </Modal>
    );
};
