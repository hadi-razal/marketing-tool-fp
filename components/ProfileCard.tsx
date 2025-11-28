import React from 'react';
import { Building2, MapPin, Mail, Phone, Activity } from 'lucide-react';

interface Lead {
    id: string;
    name: string;
    title: string;
    company: string;
    website: string;
    location: string;
    email: string;
    phone: string;
    linkedin: string;
    image: string;
    status: string;
    group_name?: string;
    score?: number;
}

interface ProfileCardProps {
    lead: Lead;
    onAction?: (lead: Lead) => void;
    actionIcon?: React.ElementType;
    onClick?: () => void;
}

export const ProfileCard: React.FC<ProfileCardProps> = ({ lead, onAction, actionIcon: ActionIcon, onClick }) => (
    <div
        onClick={onClick}
        className="bg-[#09090b] border border-white/5 p-5 rounded-[24px] hover:border-white/10 transition-all duration-300 hover:shadow-2xl hover:shadow-black/50 group flex flex-col h-full cursor-pointer relative overflow-hidden"
    >
        <div className="flex justify-between items-start mb-5">
            <div className="flex gap-4 items-center">
                <div className="relative">
                    <img
                        src={lead.image || 'https://via.placeholder.com/150'}
                        className="w-12 h-12 rounded-full object-cover border-2 border-white/5"
                        alt={lead.name}
                    />
                </div>
                <div>
                    <h3 className="text-white font-bold text-base leading-tight">{lead.name}</h3>
                    <p className="text-orange-500 text-[11px] font-bold mt-0.5 uppercase tracking-wide">{lead.title}</p>
                </div>
            </div>
            {onAction && ActionIcon && (
                <button
                    onClick={(e) => { e.stopPropagation(); onAction(lead); }}
                    className="w-8 h-8 rounded-full bg-zinc-900 border border-white/5 flex items-center justify-center text-zinc-500 hover:text-red-500 hover:border-red-500/20 hover:bg-red-500/10 transition-all"
                >
                    <ActionIcon className="w-3.5 h-3.5" />
                </button>
            )}
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
            <span className="bg-zinc-900 border border-white/5 text-zinc-400 text-[10px] px-3 py-1.5 rounded-full flex items-center gap-1.5 font-medium">
                <Building2 className="w-3 h-3 text-zinc-500" /> {lead.company}
            </span>
            <span className="bg-zinc-900 border border-white/5 text-zinc-400 text-[10px] px-3 py-1.5 rounded-full flex items-center gap-1.5 font-medium">
                <MapPin className="w-3 h-3 text-zinc-500" /> {lead.location}
            </span>
        </div>

        <div className="space-y-2 mt-auto bg-zinc-900/50 p-3 rounded-2xl border border-white/5">
            <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-6 h-6 rounded-full bg-zinc-800/50 flex items-center justify-center shrink-0 border border-white/5">
                    <Mail className="w-3 h-3 text-zinc-500" />
                </div>
                <span className="text-[11px] text-zinc-300 truncate font-medium">{lead.email}</span>
            </div>
            <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-zinc-800/50 flex items-center justify-center shrink-0 border border-white/5">
                    <Phone className="w-3 h-3 text-zinc-500" />
                </div>
                <span className="text-[11px] text-zinc-300 font-medium">{lead.phone}</span>
            </div>
        </div>

        {/* ID Display */}
        <div className="mt-4 pt-3 border-t border-white/5 flex justify-between items-center text-[9px] text-zinc-600 font-mono uppercase tracking-wider">
            <span>ID: {lead.id.split('_')[1] || lead.id}</span>
        </div>
    </div>
);
