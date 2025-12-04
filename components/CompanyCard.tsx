import React from 'react';
import { Building2, MapPin, Users, Globe, ArrowRight, CheckCircle2, Trash2 } from 'lucide-react';

export interface Company {
    id: string;
    name: string;
    website: string;
    logo: string;
    industry: string;
    location: string;
    employees: number;
    revenue: string;
    description: string;
    linkedin: string;
    twitter: string;
    facebook: string;
    keywords: string[];
    phone: string;
    founded_year: number;
    isSaved?: boolean; // New prop for saved status
}

interface CompanyCardProps {
    company: Company;
    onClick?: () => void;
    onAction?: () => void; // For delete or other actions
    actionIcon?: React.ElementType; // Icon for the action button
}

export const CompanyCard: React.FC<CompanyCardProps> = ({ company, onClick, onAction, actionIcon: ActionIcon }) => (
    <div
        onClick={onClick}
        className="group relative bg-zinc-900/40 border border-white/5 p-5 rounded-md hover:border-blue-500/30 transition-all duration-500 hover:shadow-2xl hover:shadow-blue-500/10 cursor-pointer overflow-hidden backdrop-blur-sm flex flex-col h-full"
    >
        {/* Hover Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

        <div className="relative z-10 flex justify-between items-start mb-4">
            <div className="flex gap-4 items-center">
                <div className="relative w-14 h-14 rounded-md bg-white p-1 flex items-center justify-center overflow-hidden border border-white/10 group-hover:border-blue-500/50 transition-colors duration-300 shadow-lg shadow-black/20">
                    {company.logo ? (
                        <img src={company.logo} alt={company.name} className="w-full h-full object-contain" />
                    ) : (
                        <Building2 className="w-8 h-8 text-zinc-400" />
                    )}
                </div>
                <div>
                    <h3 className="text-white font-bold text-lg leading-tight group-hover:text-blue-400 transition-colors duration-300">{company.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                        {company.industry && (
                            <span className="text-zinc-400 text-xs font-medium bg-white/5 px-2 py-0.5 rounded-md border border-white/5">
                                {company.industry}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Saved Indicator or Action Button */}
            <div className="flex gap-2">
                {company.isSaved && (
                    <div className="bg-green-500/10 border border-green-500/20 text-green-500 p-2 rounded-lg" title="Saved to Database">
                        <CheckCircle2 className="w-4 h-4" />
                    </div>
                )}
                {onAction && ActionIcon && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onAction(); }}
                        className="p-2 rounded-lg bg-white/5 hover:bg-red-500/10 text-zinc-400 hover:text-red-500 border border-white/5 hover:border-red-500/20 transition-all"
                    >
                        <ActionIcon className="w-4 h-4" />
                    </button>
                )}
            </div>
        </div>

        <p className="relative z-10 text-zinc-400 text-xs line-clamp-2 mb-4 leading-relaxed min-h-[2.5em]">
            {company.description || 'No description available.'}
        </p>

        <div className="relative z-10 flex flex-wrap gap-2 mt-auto">
            {company.location && (
                <span className="bg-white/5 border border-white/5 text-zinc-300 text-[10px] px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-medium hover:bg-white/10 transition-colors">
                    <MapPin className="w-3 h-3 text-blue-500" /> {company.location}
                </span>
            )}
            {company.employees && (
                <span className="bg-white/5 border border-white/5 text-zinc-300 text-[10px] px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-medium hover:bg-white/10 transition-colors">
                    <Users className="w-3 h-3 text-green-500" /> {company.employees.toLocaleString()}
                </span>
            )}
            {company.website && (
                <a
                    href={company.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="bg-white/5 border border-white/5 text-zinc-300 text-[10px] px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-medium hover:bg-white/10 transition-colors hover:text-blue-400"
                >
                    <Globe className="w-3 h-3 text-purple-500" /> Website
                </a>
            )}
        </div>

        <div className="relative z-10 mt-4 pt-3 border-t border-white/5 flex justify-between items-center">
            <span className="text-[9px] text-zinc-600 font-mono uppercase tracking-wider group-hover:text-zinc-500 transition-colors">
                {company.founded_year ? `Est. ${company.founded_year}` : 'Year N/A'}
            </span>
            <div className="flex items-center gap-1 text-[10px] font-bold text-blue-500 group-hover:translate-x-1 transition-transform duration-300">
                View Details <ArrowRight className="w-3 h-3" />
            </div>
        </div>
    </div>
);
