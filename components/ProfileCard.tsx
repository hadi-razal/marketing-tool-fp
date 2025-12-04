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
        className="group relative bg-zinc-900/40 border border-white/5 p-5 rounded-md hover:border-orange-500/30 transition-all duration-500 hover:shadow-2xl hover:shadow-orange-500/10 cursor-pointer overflow-hidden backdrop-blur-sm"
    >
        {/* Hover Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

        <div className="relative z-10 flex justify-between items-start mb-5">
            <div className="flex gap-4 items-center">
                <div className="relative">
                    <div className="absolute inset-0 bg-orange-500/20 rounded-full blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <img
                        src={lead.image || 'https://via.placeholder.com/150'}
                        className="relative w-14 h-14 rounded-full object-cover border-2 border-white/10 group-hover:border-orange-500/50 transition-colors duration-300"
                        alt={lead.name}
                    />
                    {lead.status === 'Verified' && (
                        <div className="absolute -bottom-1 -right-1 bg-green-500 border-2 border-zinc-900 w-4 h-4 rounded-full flex items-center justify-center">
                            <Activity className="w-2 h-2 text-black fill-current" />
                        </div>
                    )}
                </div>
                <div>
                    <h3 className="text-white font-bold text-lg leading-tight group-hover:text-orange-400 transition-colors duration-300">{lead.name}</h3>
                    <p className="text-zinc-400 text-xs font-medium mt-0.5">{lead.title}</p>
                </div>
            </div>
            {onAction && ActionIcon && (
                <button
                    onClick={(e) => { e.stopPropagation(); onAction(lead); }}
                    className="w-9 h-9 rounded-md bg-white/5 border border-white/5 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-orange-500 hover:border-orange-500 hover:shadow-lg hover:shadow-orange-500/20 transition-all duration-300 transform hover:-translate-y-1"
                >
                    <ActionIcon className="w-4 h-4" />
                </button>
            )}
        </div>

        <div className="relative z-10 flex flex-wrap gap-2 mb-6">
            <span className="bg-white/5 border border-white/5 text-zinc-300 text-[10px] px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-medium hover:bg-white/10 transition-colors">
                <Building2 className="w-3 h-3 text-orange-500" /> {lead.company}
            </span>
            <span className="bg-white/5 border border-white/5 text-zinc-300 text-[10px] px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-medium hover:bg-white/10 transition-colors">
                <MapPin className="w-3 h-3 text-blue-500" /> {lead.location}
            </span>
        </div>

        <div className="relative z-10 space-y-2 mt-auto bg-black/40 p-3 rounded-md border border-white/5 group-hover:border-white/10 transition-colors">
            <div className="flex items-center gap-3 overflow-hidden group/item">
                <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center shrink-0 border border-white/5 group-hover/item:border-orange-500/30 group-hover/item:text-orange-400 transition-all">
                    <Mail className="w-3.5 h-3.5 text-zinc-500 group-hover/item:text-orange-400 transition-colors" />
                </div>
                <span className="text-xs text-zinc-400 truncate font-medium group-hover/item:text-zinc-200 transition-colors">{lead.email}</span>
            </div>
            <div className="flex items-center gap-3 group/item">
                <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center shrink-0 border border-white/5 group-hover/item:border-blue-500/30 group-hover/item:text-blue-400 transition-all">
                    <Phone className="w-3.5 h-3.5 text-zinc-500 group-hover/item:text-blue-400 transition-colors" />
                </div>
                <span className="text-xs text-zinc-400 font-medium group-hover/item:text-zinc-200 transition-colors">{lead.phone}</span>
            </div>
        </div>

        {/* ID Display */}
        <div className="relative z-10 mt-4 pt-3 border-t border-white/5 flex justify-between items-center">
            <span className="text-[9px] text-zinc-600 font-mono uppercase tracking-wider group-hover:text-zinc-500 transition-colors">ID: {lead.id.split('_')[1] || lead.id}</span>
            {lead.linkedin && (
                <a href={lead.linkedin} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-[10px] font-bold text-blue-500 hover:text-blue-400 hover:underline">
                    LinkedIn Profile
                </a>
            )}
        </div>
    </div>
);
