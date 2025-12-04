import React from 'react';
import { Building2, MapPin, Globe, Users, MoreHorizontal, Trash2 } from 'lucide-react';

export interface Company {
    id: string;
    name: string;
    industry: string;
    website: string;
    location: string;
    size: string;
    description: string;
    logo: string;
}

interface CompanyCardProps {
    company: Company;
    onAction?: (company: Company) => void;
    actionIcon?: React.ElementType;
    onClick?: () => void;
}

export const CompanyCard: React.FC<CompanyCardProps> = ({ company, onAction, actionIcon: ActionIcon, onClick }) => (
    <div
        onClick={onClick}
        className="bg-[#09090b] border border-white/5 p-5 rounded-[24px] hover:border-white/10 transition-all duration-300 hover:shadow-2xl hover:shadow-black/50 group flex flex-col h-full cursor-pointer relative overflow-hidden"
    >
        <div className="flex justify-between items-start mb-5">
            <div className="flex gap-4 items-center">
                <div className="relative">
                    <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-white/5 flex items-center justify-center">
                        {company.logo ? (
                            <img
                                src={company.logo}
                                className="w-full h-full rounded-xl object-cover"
                                alt={company.name}
                            />
                        ) : (
                            <Building2 className="w-6 h-6 text-zinc-600" />
                        )}
                    </div>
                </div>
                <div>
                    <h3 className="text-white font-bold text-base leading-tight">{company.name}</h3>
                    <p className="text-zinc-500 text-[11px] font-bold mt-0.5 uppercase tracking-wide">{company.industry}</p>
                </div>
            </div>
            {onAction && ActionIcon && (
                <button
                    onClick={(e) => { e.stopPropagation(); onAction(company); }}
                    className="w-8 h-8 rounded-full bg-zinc-900 border border-white/5 flex items-center justify-center text-zinc-500 hover:text-red-500 hover:border-red-500/20 hover:bg-red-500/10 transition-all"
                >
                    <ActionIcon className="w-3.5 h-3.5" />
                </button>
            )}
        </div>

        <p className="text-zinc-400 text-xs leading-relaxed mb-6 line-clamp-2">
            {company.description}
        </p>

        <div className="flex flex-wrap gap-2 mt-auto">
            <span className="bg-zinc-900 border border-white/5 text-zinc-400 text-[10px] px-3 py-1.5 rounded-full flex items-center gap-1.5 font-medium">
                <MapPin className="w-3 h-3 text-zinc-500" /> {company.location}
            </span>
            <span className="bg-zinc-900 border border-white/5 text-zinc-400 text-[10px] px-3 py-1.5 rounded-full flex items-center gap-1.5 font-medium">
                <Users className="w-3 h-3 text-zinc-500" /> {company.size}
            </span>
            {company.website && (
                <a href={company.website} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="bg-zinc-900 border border-white/5 text-zinc-400 text-[10px] px-3 py-1.5 rounded-full flex items-center gap-1.5 font-medium hover:text-white hover:bg-zinc-800 transition-colors">
                    <Globe className="w-3 h-3 text-zinc-500" /> Website
                </a>
            )}
        </div>
    </div>
);
