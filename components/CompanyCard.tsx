import React from 'react';
import { Building2, MapPin, Users, Globe, ArrowRight, CheckCircle2, Trash2, Calendar, MessageSquare } from 'lucide-react';
import { getBrandColor } from '@/lib/utils';
import { Comment } from '@/services/databaseService';

export interface Company {
    id: string;
    name: string;
    website?: string;
    logo?: string;
    industry?: string;
    location?: string;
    employees?: number;
    revenue?: string;
    description?: string;
    linkedin?: string;
    twitter?: string;
    facebook?: string;
    keywords?: string[];
    phone?: string;
    founded_year?: number;
    isSaved?: boolean;
    saved_by?: string;
    comments?: Comment[];
}

interface CompanyCardProps {
    company: Company;
    onClick?: () => void;
    onAction?: () => void;
    actionIcon?: React.ElementType;
}

export const CompanyCard: React.FC<CompanyCardProps> = ({ company, onClick, onAction, actionIcon: ActionIcon }) => {
    const brandColor = getBrandColor(company.name);

    return (
        <div
            onClick={onClick}
            className="group relative bg-zinc-900/50 backdrop-blur-md border border-white/5 p-5 rounded-2xl transition-all duration-300 hover:bg-zinc-900/80 hover:border-white/10 hover:shadow-2xl hover:shadow-black/50 cursor-pointer flex flex-col h-full overflow-hidden"
        >
            {/* Top Gradient Line */}
            <div
                className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[var(--brand-color)] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{ '--brand-color': brandColor } as React.CSSProperties}
            />

            {/* Header Section */}
            <div className="flex justify-between items-start mb-4 relative z-10">
                <div className="flex gap-4">
                    {/* Logo */}
                    <div className="relative w-12 h-12 rounded-xl bg-white/5 border border-white/10 p-2 flex items-center justify-center overflow-hidden transition-transform duration-300 group-hover:scale-105 group-hover:border-white/20">
                        {company.logo ? (
                            <img src={company.logo} alt={company.name} className="w-full h-full object-contain" />
                        ) : (
                            <Building2 className="w-6 h-6 text-zinc-500" />
                        )}
                    </div>

                    {/* Name & Industry */}
                    <div>
                        <h3 className="text-white font-bold text-lg leading-tight tracking-tight group-hover:text-white/90 transition-colors">
                            {company.name}
                        </h3>
                        {company.industry && (
                            <div className="mt-1">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-white/5 border border-white/5 text-[10px] font-medium text-zinc-400">
                                    {company.industry}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                    {company.isSaved && (
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500" title="Saved">
                            <CheckCircle2 className="w-4 h-4" />
                        </div>
                    )}
                    {onAction && ActionIcon && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onAction(); }}
                            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-red-500/10 border border-white/5 hover:border-red-500/20 flex items-center justify-center text-zinc-400 hover:text-red-500 transition-all"
                        >
                            <ActionIcon className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* Description */}
            <p className="text-zinc-400 text-xs leading-relaxed line-clamp-2 mb-5 min-h-[2.5em]">
                {company.description || 'No description available for this company.'}
            </p>

            {/* Metadata Tags */}
            <div className="flex flex-wrap gap-2 mt-auto mb-5">
                {company.location && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/5 text-[10px] text-zinc-300 font-medium">
                        <MapPin className="w-3 h-3 text-zinc-500" />
                        <span className="truncate max-w-[100px]">{company.location}</span>
                    </div>
                )}
                {company.employees && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/5 text-[10px] text-zinc-300 font-medium">
                        <Users className="w-3 h-3 text-zinc-500" />
                        <span>{company.employees.toLocaleString()}</span>
                    </div>
                )}
                {company.website && (
                    <a
                        href={company.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/5 text-[10px] text-zinc-300 font-medium hover:bg-white/10 hover:text-white transition-colors"
                    >
                        <Globe className="w-3 h-3 text-zinc-500" />
                        <span>Website</span>
                    </a>
                )}
            </div>

            {/* Footer */}
            <div className="pt-4 border-t border-white/5 flex items-center justify-between mt-auto">
                <div className="flex items-center gap-3">
                    {company.founded_year && (
                        <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-medium">
                            <Calendar className="w-3 h-3" />
                            <span>{company.founded_year}</span>
                        </div>
                    )}
                    {company.comments && company.comments.length > 0 && (
                        <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-medium">
                            <MessageSquare className="w-3 h-3" />
                            <span>{company.comments.length}</span>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-1 text-[10px] font-bold text-zinc-500 group-hover:text-white transition-colors">
                    View Details
                    <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
                </div>
            </div>
        </div>
    );
};
