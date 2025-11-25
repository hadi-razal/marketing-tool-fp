import React from 'react';
import { X, Linkedin, Mail, Phone, Globe, Building2, MapPin, Calendar, MessageSquare } from 'lucide-react';

interface LeadDetailModalProps {
    lead: any;
    onClose: () => void;
}

export const LeadDetailModal: React.FC<LeadDetailModalProps> = ({ lead, onClose }) => {
    if (!lead) return null;

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-zinc-900 border border-zinc-800 w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="relative h-32 bg-gradient-to-r from-orange-500 to-red-600">
                    <button onClick={onClose} className="absolute top-4 right-4 bg-black/20 hover:bg-black/40 text-white p-2 rounded-full transition-colors backdrop-blur-md">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="px-8 pb-8 -mt-12 flex-1 overflow-y-auto custom-scrollbar">
                    <div className="flex justify-between items-end mb-6">
                        <div className="flex items-end gap-6">
                            <img
                                src={lead.image || 'https://via.placeholder.com/150'}
                                className="w-24 h-24 rounded-full object-cover border-4 border-zinc-900 shadow-xl"
                                alt={lead.name}
                            />
                            <div className="mb-1">
                                <h2 className="text-3xl font-bold text-white">{lead.name}</h2>
                                <p className="text-orange-500 font-medium">{lead.title} @ {lead.company}</p>
                            </div>
                        </div>
                        <div className="flex gap-2 mb-1">
                            <a href={`https://${lead.linkedin}`} target="_blank" rel="noreferrer" className="p-2.5 bg-zinc-800 rounded-xl text-zinc-400 hover:text-white hover:bg-[#0077b5] transition-all">
                                <Linkedin className="w-5 h-5" />
                            </a>
                            <a href={`mailto:${lead.email}`} className="p-2.5 bg-zinc-800 rounded-xl text-zinc-400 hover:text-white hover:bg-orange-500 transition-all">
                                <Mail className="w-5 h-5" />
                            </a>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-6">
                            <div className="bg-zinc-800/30 p-5 rounded-2xl border border-white/5 space-y-4">
                                <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">Contact Info</h3>
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3 text-zinc-300">
                                        <Mail className="w-4 h-4 text-zinc-500" /> {lead.email}
                                    </div>
                                    <div className="flex items-center gap-3 text-zinc-300">
                                        <Phone className="w-4 h-4 text-zinc-500" /> {lead.phone}
                                    </div>
                                    <div className="flex items-center gap-3 text-zinc-300">
                                        <Globe className="w-4 h-4 text-zinc-500" /> {lead.website}
                                    </div>
                                    <div className="flex items-center gap-3 text-zinc-300">
                                        <MapPin className="w-4 h-4 text-zinc-500" /> {lead.location}
                                    </div>
                                </div>
                            </div>

                            <div className="bg-zinc-800/30 p-5 rounded-2xl border border-white/5 space-y-4">
                                <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">AI Insights</h3>
                                <div className="space-y-3">
                                    <div className="flex gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center shrink-0">
                                            <Calendar className="w-4 h-4 text-purple-500" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-zinc-500 font-medium">Best Time to Contact</p>
                                            <p className="text-sm text-zinc-200">Tuesday - Thursday, 10am - 2pm EST</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center shrink-0">
                                            <MessageSquare className="w-4 h-4 text-blue-500" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-zinc-500 font-medium">Icebreaker</p>
                                            <p className="text-sm text-zinc-200">Mention their recent expansion in {lead.location.split(',')[0]}.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="bg-zinc-800/30 p-5 rounded-2xl border border-white/5 h-full">
                                <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-4">Lead Score Analysis</h3>
                                <div className="flex flex-col items-center justify-center py-6">
                                    <div className="relative w-32 h-32 flex items-center justify-center">
                                        <svg className="w-full h-full transform -rotate-90">
                                            <circle cx="64" cy="64" r="60" stroke="#27272a" strokeWidth="8" fill="transparent" />
                                            <circle cx="64" cy="64" r="60" stroke={lead.score > 70 ? '#22c55e' : lead.score > 40 ? '#f97316' : '#ef4444'} strokeWidth="8" fill="transparent" strokeDasharray={377} strokeDashoffset={377 - (377 * (lead.score || 0)) / 100} className="transition-all duration-1000 ease-out" />
                                        </svg>
                                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                                            <span className="text-4xl font-bold text-white">{lead.score || 0}</span>
                                            <span className="text-[10px] text-zinc-500 uppercase font-bold">Fit Score</span>
                                        </div>
                                    </div>
                                    <p className="text-center text-zinc-400 text-sm mt-6 px-4">
                                        {lead.score > 80 ? 'Excellent match based on title and industry relevance.' : 'Moderate match. Check specific requirements.'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
