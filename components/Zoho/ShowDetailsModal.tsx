import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Globe, MapPin, Calendar, Hash, ExternalLink, Trash2, Edit2, Link as LinkIcon, FileText, Layers, Users, Clock, User, Info, X, Building2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { zohoApi } from '@/lib/zoho';
import { Skeleton } from '../ui/Skeleton';

interface ShowDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    data: any;
    onEdit: (item: any) => void;
    onDelete: (id: string) => void;
}

const Section = ({ title, children, delay = 0 }: { title: string, children: React.ReactNode, delay?: number }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay, duration: 0.4 }}
        className="space-y-4"
    >
        <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500/50"></span>
            {title}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {children}
        </div>
    </motion.div>
);

const DetailItem = ({ label, value, icon: Icon, isLink = false, fullWidth = false }: any) => {
    if (!value) return null;

    let displayValue = value;
    let href = value;

    // Handle Zoho object structure (e.g., { url: "..." })
    if (typeof value === 'object' && value !== null) {
        if ('url' in value) {
            displayValue = value.url;
            href = value.url;
        } else {
            // Fallback for other objects to avoid crash
            return null;
        }
    }

    return (
        <div className={`group relative overflow-hidden bg-white/5 hover:bg-white/10 p-4 rounded-2xl border border-white/5 hover:border-white/10 transition-all duration-300 ${fullWidth ? 'md:col-span-2 lg:col-span-3' : ''}`}>
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2 text-zinc-500 text-xs font-bold uppercase tracking-wider">
                    {Icon && <Icon className="w-3.5 h-3.5 text-zinc-600 group-hover:text-orange-500/70 transition-colors" />}
                    {label}
                </div>
                <div className="text-zinc-100 font-medium break-words text-sm leading-relaxed">
                    {isLink ? (
                        <a href={href} target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:text-orange-300 hover:underline flex items-center gap-1.5 transition-colors">
                            {displayValue} <ExternalLink className="w-3 h-3 opacity-70" />
                        </a>
                    ) : (
                        displayValue
                    )}
                </div>
            </div>
        </div>
    );
};

export const ShowDetailsModal: React.FC<ShowDetailsModalProps> = ({ isOpen, onClose, data, onEdit, onDelete }) => {
    const [activeTab, setActiveTab] = useState<'overview' | 'exhibitors'>('overview');
    const [exhibitors, setExhibitors] = useState<any[]>([]);
    const [loadingExhibitors, setLoadingExhibitors] = useState(false);

    // Reset tab when data changes
    useEffect(() => {
        if (isOpen) {
            setActiveTab('overview');
            setExhibitors([]);
        }
    }, [isOpen, data?.ID]);

    // Fetch exhibitors when tab changes
    useEffect(() => {
        if (activeTab === 'exhibitors' && exhibitors.length === 0 && data) {
            const fetchExhibitors = async () => {
                setLoadingExhibitors(true);
                try {
                    // Attempting (Show == ID) as Show.ID caused 404, and quotes caused Type Mismatch.
                    // Show is a lookup field, usually requires direct ID comparison (Number).
                    const criteria = `(Show == ${data.ID})`;
                    console.log('Fetching Exhibitors with criteria:', criteria);

                    const res = await zohoApi.getRecords('Event_and_Exhibitor_Admin_Only_Report', criteria, 0, 200);

                    console.log('Event Exhibitors Response:', res);
                    if (res.code === 3000) {
                        setExhibitors(res.data);
                    } else {
                        setExhibitors([]);
                    }
                } catch (err) {
                    console.error('Failed to fetch exhibitors:', err);
                } finally {
                    setLoadingExhibitors(false);
                }
            };
            fetchExhibitors();
        }
    }, [activeTab, data]);

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
        <Modal isOpen={isOpen} onClose={onClose} title="Show Details" maxWidth="max-w-5xl">
            <div className="relative">
                {/* Hero Header */}
                <div className="relative glass-panel border-b border-white/5 p-8 overflow-hidden rounded-t-2xl">
                    <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 via-transparent to-transparent opacity-50" />
                    <div className="absolute -top-24 -right-24 w-64 h-64 bg-orange-500/20 rounded-full blur-3xl" />

                    <div className="relative z-10 flex flex-col md:flex-row gap-8 items-start">
                        {data.Event_logo && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="w-32 h-32 bg-white rounded-2xl p-4 shrink-0 flex items-center justify-center overflow-hidden shadow-2xl shadow-black/50 border border-white/10"
                            >
                                <img src={data.Event_logo} alt={data.Event || data.Name} className="max-w-full max-h-full object-contain" />
                            </motion.div>
                        )}
                        <div className="flex-1 space-y-4">
                            <div>
                                <motion.h2
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="text-4xl md:text-5xl font-bold text-white mb-3 tracking-tight"
                                >
                                    {data.Event || data.Event_Name || data.Name}
                                </motion.h2>
                                <div className="flex flex-wrap items-center gap-3">
                                    {data.Level && (
                                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-blue-500/20 to-blue-600/20 text-blue-400 border border-blue-500/20 shadow-lg shadow-blue-500/5">
                                            {data.Level}
                                        </span>
                                    )}
                                    <span className="text-zinc-400 text-xs font-medium flex items-center gap-1.5 bg-white/5 px-3 py-1 rounded-full border border-white/5">
                                        <Hash className="w-3 h-3" /> {data.ID}
                                    </span>
                                </div>
                            </div>

                            {data.Note1 && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.2 }}
                                    className="p-4 bg-yellow-500/5 border border-yellow-500/10 rounded-xl text-yellow-200/80 text-sm leading-relaxed backdrop-blur-sm"
                                >
                                    {data.Note1}
                                </motion.div>
                            )}
                        </div>
                    </div>
                </div>



                {/* Tab Navigation */}
                <div className="px-8 border-b border-white/5 bg-black/20 sticky top-0 z-30 backdrop-blur-xl">
                    <div className="flex gap-8">
                        <button
                            onClick={() => setActiveTab('overview')}
                            className={`py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'overview'
                                ? 'text-orange-500 border-orange-500'
                                : 'text-zinc-400 border-transparent hover:text-white'
                                }`}
                        >
                            Overview
                        </button>
                        <button
                            onClick={() => setActiveTab('exhibitors')}
                            className={`py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'exhibitors'
                                ? 'text-orange-500 border-orange-500'
                                : 'text-zinc-400 border-transparent hover:text-white'
                                }`}
                        >
                            Exhibitors
                            {exhibitors.length > 0 && (
                                <span className="ml-2 px-1.5 py-0.5 rounded-full bg-orange-500/10 text-orange-400 text-xs border border-orange-500/20">
                                    {exhibitors.length}
                                </span>
                            )}
                        </button>
                    </div>
                </div>

                {/* Content Scroll Area */}
                <div className="p-8 space-y-10 max-h-[60vh] overflow-y-auto custom-scrollbar bg-black/40 min-h-[400px]">

                    {activeTab === 'overview' ? (
                        <>
                            {/* General Info */}
                            <Section title="General Information" delay={0.1}>
                                <DetailItem label="Event Type" value={data.Event_Type} icon={Layers} />
                                <DetailItem label="Industry" value={data.Industry} icon={Layers} />
                                <DetailItem label="Website" value={data.Website} icon={Globe} isLink />
                                <DetailItem label="Organiser" value={data.Organiser} icon={Users} />
                                <DetailItem label="Frequency" value={data.Frequency} icon={Clock} />
                                <DetailItem label="Starting Date" value={formatDate(data.Starting_Date)} icon={Calendar} />
                            </Section>

                            {/* Location */}
                            <Section title="Location" delay={0.2}>
                                <DetailItem label="City" value={data.City} icon={MapPin} />
                                <DetailItem label="Country" value={data.Country} icon={MapPin} />
                                <DetailItem label="World Area" value={data.World_Area} icon={Globe} />
                            </Section>

                            {/* Metrics */}
                            <Section title="Metrics" delay={0.3}>
                                <DetailItem label="Exhibition Size" value={data.Exhibition_Size} icon={Layers} />
                                <DetailItem label="Last Edition Exhibitors" value={data.Last_edition_n_Exhibitors} icon={Users} />
                            </Section>

                            {/* Resources */}
                            <Section title="Resources" delay={0.4}>
                                <DetailItem label="Exhibitor List (Link)" value={data.Exhibitor_List_Link} icon={LinkIcon} isLink />
                                <DetailItem label="Exhibitor List (File)" value={data.Exhibitor_List_FILE} icon={FileText} />
                                <DetailItem label="Floorplan (Link)" value={data.Floorplan_Link} icon={LinkIcon} isLink />
                                <DetailItem label="Floorplan (File)" value={data.Floorplan} icon={FileText} />
                            </Section>

                            {/* System Info */}
                            <Section title="System Metadata" delay={0.5}>
                                <DetailItem label="Added User" value={data.Added_User} icon={User} />
                                <DetailItem label="Added Time" value={formatDate(data.Added_Time)} icon={Clock} />
                                <DetailItem label="Modified User" value={data.Modified_User} icon={User} />
                                <DetailItem label="Modified Time" value={formatDate(data.Modified_Time)} icon={Clock} />
                                <DetailItem label="Added User IP" value={data.Added_User_IP_Address} icon={Globe} />
                                <DetailItem label="Modified User IP" value={data.Modified_User_IP_Address} icon={Globe} />
                            </Section>

                            {/* Additional Data */}
                            <Section title="Additional Data" delay={0.6}>
                                {Object.entries(data).map(([key, value]) => {
                                    if (['ID', 'Event', 'Event_Name', 'Name', 'Level', 'Event_logo', 'Note1', 'Event_Type', 'Industry', 'Website', 'Organiser', 'Frequency', 'Starting_Date', 'City', 'Country', 'World_Area', 'Exhibition_Size', 'Last_edition_n_Exhibitors', 'Exhibitor_List_Link', 'Exhibitor_List_FILE', 'Floorplan_Link', 'Floorplan', 'Added_User', 'Added_Time', 'Modified_User', 'Modified_Time', 'Added_User_IP_Address', 'Modified_User_IP_Address'].includes(key)) return null;
                                    if (typeof value === 'object' && value !== null) return null;
                                    return <DetailItem key={key} label={key.replace(/_/g, ' ')} value={String(value)} icon={Info} />;
                                })}
                            </Section>
                        </>
                    ) : (
                        <div className="space-y-4">
                            {loadingExhibitors ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <div key={i} className="flex items-center gap-4 p-4 border border-white/5 rounded-xl bg-white/5">
                                        <Skeleton className="w-10 h-10 rounded-lg" />
                                        <div className="space-y-2 flex-1">
                                            <Skeleton className="h-4 w-48" />
                                            <Skeleton className="h-3 w-32" />
                                        </div>
                                    </div>
                                ))
                            ) : exhibitors.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 text-zinc-500 gap-4">
                                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
                                        <Users className="w-8 h-8 opacity-40" />
                                    </div>
                                    <p className="text-lg font-medium">No exhibitors found</p>
                                    <p className="text-sm opacity-60">There are no exhibitors linked to this event.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-3">
                                    {exhibitors.map((item: any) => {
                                        // Helper to safely get display value from any field
                                        const getValue = (val: any) => {
                                            if (!val) return null;
                                            if (typeof val === 'object') return val.display_value || val.value || JSON.stringify(val);
                                            return val;
                                        };

                                        const companyName = getValue(item.Company);
                                        const booth = getValue(item.Booth_No);
                                        const year = getValue(item.Attended_year1);
                                        const size = getValue(item.last_edition_booth_sqm);
                                        const country = getValue(item.Country);
                                        const websiteUrl = item.Website?.url || item.Website;

                                        return (
                                            <div key={item.ID} className="group p-4 bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 hover:border-orange-500/20 rounded-xl transition-all duration-300 flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold bg-zinc-800 text-zinc-400 border border-white/10">
                                                        <Building2 className="w-4 h-4" />
                                                    </div>
                                                    <div>
                                                        <h4 className="text-white font-medium group-hover:text-orange-400 transition-colors">
                                                            {companyName || 'Unknown Company'}
                                                        </h4>
                                                        <div className="flex items-center gap-3 text-xs text-zinc-500 mt-1">
                                                            {booth && <span className="flex items-center gap-1">Booth: {booth}</span>}
                                                            {year && <span className="flex items-center gap-1">Year: {year}</span>}
                                                            {size && <span className="flex items-center gap-1">Size: {size} sqm</span>}
                                                            {country && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {country}</span>}
                                                            {websiteUrl && (
                                                                <a href={websiteUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-orange-400 transition-colors" onClick={(e) => e.stopPropagation()}>
                                                                    <Globe className="w-3 h-3" /> Website
                                                                </a>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Actions Footer */}
                <div className="p-6 border-t border-white/5 bg-zinc-900/90 backdrop-blur-xl flex gap-4 sticky bottom-0 z-20 rounded-b-2xl">
                    <Button
                        onClick={() => onEdit(data)}
                        variant="secondary"
                        className="flex-1 h-12 text-base font-medium glass-button"
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
        </Modal >
    );
};
