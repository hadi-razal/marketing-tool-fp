import React from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Globe, MapPin, Hash, ExternalLink, Trash2, Edit2, Plus, User, Clock, Info, Building2, Phone } from 'lucide-react';
import { motion } from 'framer-motion';

interface ExhibitorDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    data: any;
    onEdit: (item: any) => void;
    onDelete: (id: string) => void;
    onAddToLeads: (item: any) => void;
}

const Field = ({ label, value, isLink = false, href }: { label: string, value: any, isLink?: boolean, href?: string }) => {
    if (!value) return null;
    return (
        <div className="flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-wider font-bold text-zinc-500">{label}</span>
            {isLink ? (
                <a href={href || value} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-blue-400 hover:text-blue-300 hover:underline flex items-center gap-1 w-fit">
                    {value} <ExternalLink className="w-3 h-3 opacity-50" />
                </a>
            ) : (
                <span className="text-sm font-medium text-zinc-200">{value}</span>
            )}
        </div>
    );
};

const Section = ({ title, children }: { title: string, children: React.ReactNode }) => (
    <div className="space-y-3">
        <h3 className="text-xs font-bold text-zinc-600 uppercase tracking-widest border-b border-white/5 pb-2">{title}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-6 gap-x-4">
            {children}
        </div>
    </div>
);

const SubformTable = ({ data }: { data: any[] }) => {
    if (!data || !Array.isArray(data) || data.length === 0) return null;
    return (
        <div className="space-y-3">
            <h3 className="text-xs font-bold text-zinc-600 uppercase tracking-widest border-b border-white/5 pb-2">People</h3>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-zinc-400">
                    <thead className="text-zinc-500 font-bold text-[10px] uppercase tracking-wider">
                        <tr>
                            <th className="pb-2 pr-4">Name</th>
                            <th className="pb-2 pr-4">Role</th>
                            <th className="pb-2 pr-4">Email</th>
                            <th className="pb-2 pr-4">Mobile</th>
                            <th className="pb-2">Website</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {data.map((item, i) => (
                            <tr key={i} className="group">
                                <td className="py-2 pr-4 text-zinc-300 font-medium group-hover:text-white transition-colors">{item.Name}</td>
                                <td className="py-2 pr-4">{item.Role}</td>
                                <td className="py-2 pr-4">{item.Mail}</td>
                                <td className="py-2 pr-4">{item.Mobile}</td>
                                <td className="py-2">{item.website || item.Website}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export const ExhibitorDetailsModal: React.FC<ExhibitorDetailsModalProps> = ({ isOpen, onClose, data, onEdit, onDelete, onAddToLeads }) => {
    if (!data) return null;

    const formatDate = (dateStr: string) => {
        if (!dateStr) return null;
        return new Date(dateStr).toLocaleString(undefined, {
            year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    };

    // Helper to extract URL/Value from object
    const extract = (val: any) => {
        if (!val) return '';
        if (typeof val === 'string') return val;
        if (typeof val === 'object') return val.value || val.url || JSON.stringify(val);
        return String(val);
    };

    const website = extract(data.Website || data.website || data.Company_Website);
    const linkedin = extract(data.Company_Linkedin);
    const eventsUrl = data.View_Company_Events_Url || data.View_Company_Events;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Exhibitor Details" maxWidth="max-w-4xl">
            <div className="flex flex-col h-[80vh] md:h-auto">
                {/* Minimal Header */}
                <div className="px-8 pt-8 pb-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">{data.Company}</h2>
                            <div className="flex items-center gap-3 mt-2 text-sm text-zinc-500">
                                <span className="flex items-center gap-1"><Hash className="w-3 h-3" /> {data.ID}</span>
                                {data.FP_Level && (
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${data.FP_Level === '1' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                                        data.FP_Level === '2' ? 'bg-orange-500/10 text-orange-500 border-orange-500/20' :
                                            data.FP_Level === '3' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' :
                                                'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
                                        }`}>
                                        Level {data.FP_Level}
                                    </span>
                                )}
                            </div>
                        </div>
                        {eventsUrl && (
                            <a href={eventsUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-zinc-400 hover:text-white flex items-center gap-1 transition-colors border border-white/10 px-3 py-1.5 rounded-lg hover:bg-white/5">
                                View Events <ExternalLink className="w-3 h-3" />
                            </a>
                        )}
                    </div>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar px-8 py-4 space-y-8">

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-6 gap-x-4">
                        <Field label="Type" value={data.Company_Type || data.Type} />
                        <Field label="Events" value={Array.isArray(data.Events) ? data.Events.join(', ') : data.Events} />
                    </div>

                    {(website || linkedin || data.Contact_Details) && (
                        <Section title="Contact & Web">
                            <Field label="Website" value={website} isLink href={website} />
                            <Field label="LinkedIn" value={linkedin} isLink href={linkedin} />
                            <Field label="Contact" value={data.Contact_Details} />
                        </Section>
                    )}

                    {(data.City || data.Country || data.Area || data.World_Area) && (
                        <Section title="Location">
                            <Field label="City" value={data.City} />
                            <Field label="Country" value={data.Country} />
                            <Field label="Area" value={data.Area || data.World_Area} />
                        </Section>
                    )}

                    {data.People && (
                        <SubformTable data={data.People} />
                    )}

                    {data.Notes && (
                        <div className="space-y-2">
                            <h3 className="text-xs font-bold text-zinc-600 uppercase tracking-widest border-b border-white/5 pb-2">Notes</h3>
                            <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">{data.Notes}</p>
                        </div>
                    )}

                    <div className="pt-4 border-t border-white/5">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <Field label="Added By" value={data.Added_User} />
                            <Field label="Added Time" value={formatDate(data.Added_Time)} />
                            <Field label="Modified By" value={data.Modified_User} />
                            <Field label="Modified Time" value={formatDate(data.Modified_Time)} />
                        </div>
                    </div>
                </div>

                {/* Minimal Footer */}
                <div className="p-6 border-t border-white/5 bg-zinc-900/50 backdrop-blur-sm flex justify-end gap-3">
                    <Button variant="ghost" onClick={onClose} className="text-zinc-400 hover:text-white">Close</Button>
                    <Button onClick={() => onEdit(data)} variant="secondary" className="glass-button" leftIcon={<Edit2 className="w-4 h-4" />}>Edit</Button>
                    <Button onClick={() => onAddToLeads(data)} className="bg-green-600 hover:bg-green-500 text-white border-0" leftIcon={<Plus className="w-4 h-4" />}>Add to Leads</Button>
                </div>
            </div>
        </Modal>
    );
};
