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
        className="bg-zinc-900/40 border border-zinc-800/60 p-5 rounded-3xl hover:bg-zinc-900 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-black/20 group flex flex-col h-full animate-in zoom-in-95 duration-300 cursor-pointer relative overflow-hidden"
    >
        {/* Score Badge */}
        {lead.score && (
            <div className="absolute top-0 right-0 p-4">
                <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold border ${lead.score > 70 ? 'bg-green-500/10 text-green-500 border-green-500/20' : lead.score > 40 ? 'bg-orange-500/10 text-orange-500 border-orange-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                    <Activity className="w-3 h-3" /> {lead.score}
                </div>
            </div>
        )}

        <div className="flex justify-between items-start mb-5">
            <div className="flex gap-4 items-center">
                <img
                    src={lead.image || 'https://via.placeholder.com/150'}
                    className="w-14 h-14 rounded-full object-cover border-4 border-zinc-900 shadow-md group-hover:border-zinc-800 transition-colors"
                    alt={lead.name}
                />
                <div>
                    <h3 className="text-white font-bold text-lg leading-tight">{lead.name}</h3>
                    <p className="text-orange-400 text-xs font-medium mt-0.5">{lead.title}</p>
                </div>
            </div>
            {onAction && ActionIcon && (
                <button
                    onClick={(e) => { e.stopPropagation(); onAction(lead); }}
                    className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-orange-500 transition-all shadow-lg z-10 relative"
                >
                    <ActionIcon className="w-4 h-4" />
                </button>
            )}
        </div>
        <div className="flex flex-wrap gap-2 mb-6">
            <span className="bg-zinc-800/80 text-zinc-400 text-[10px] px-3 py-1.5 rounded-full flex items-center gap-1.5 font-medium border border-zinc-700/50">
                <Building2 className="w-3 h-3" /> {lead.company}
            </span>
            <span className="bg-zinc-800/80 text-zinc-400 text-[10px] px-3 py-1.5 rounded-full flex items-center gap-1.5 font-medium border border-zinc-700/50">
                <MapPin className="w-3 h-3" /> {lead.location}
            </span>
        </div>
        <div className="space-y-3 mt-auto bg-black/20 p-4 rounded-2xl border border-white/5">
            <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center shrink-0">
                    <Mail className="w-3.5 h-3.5 text-zinc-400" />
                </div>
                <span className="text-xs text-zinc-300 truncate">{lead.email}</span>
            </div>
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center shrink-0">
                    <Phone className="w-3.5 h-3.5 text-zinc-400" />
                </div>
                <span className="text-xs text-zinc-300">{lead.phone}</span>
            </div>
        </div>
        {/* ID Display */}
        <div className="mt-4 pt-3 border-t border-zinc-800/50 flex justify-between items-center text-[9px] text-zinc-600 font-mono">
            <span>ID: {lead.id}</span>
        </div>
    </div>
);
