import React from 'react';
import { Building2, MapPin, Users, Globe, ArrowRight, Trash2, Calendar, MessageSquare } from 'lucide-react';
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
    saved_by_profile_url?: string;
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
            className="group relative bg-white border border-zinc-200 p-5 rounded-2xl transition-all duration-300 hover:border-orange-200 hover:shadow-xl hover:shadow-zinc-950/5 cursor-pointer flex flex-col h-full overflow-hidden"
        >
            {/* Top Gradient Line */}
            <div
                className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-transparent via-(--brand-color) to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{ '--brand-color': brandColor } as React.CSSProperties}
            />

            {/* Header Section */}
            <div className="flex justify-between items-start mb-4 relative z-10">
                <div className="flex gap-4">
                    <div className="relative w-12 h-12 rounded-xl bg-zinc-50 border border-zinc-200 p-2 flex items-center justify-center overflow-hidden transition-transform duration-300 group-hover:scale-105">
                        {company.logo ? (
                            <img src={company.logo} alt={company.name} className="w-full h-full object-contain" />
                        ) : (
                            <Building2 className="w-6 h-6 text-zinc-400" />
                        )}
                    </div>

                    <div>
                        <h3 className="text-zinc-950 font-bold text-lg leading-tight tracking-tight group-hover:text-orange-600 transition-colors">
                            {company.name}
                        </h3>
                        {company.industry && (
                            <div className="mt-1">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-zinc-50 border border-zinc-200 text-[10px] font-medium text-zinc-600">
                                    {company.industry}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex gap-2">
                    {onAction && ActionIcon && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onAction(); }}
                            className="w-8 h-8 rounded-lg bg-zinc-50 hover:bg-red-50 border border-zinc-200 hover:border-red-200 flex items-center justify-center text-zinc-400 hover:text-red-600 transition-all"
                        >
                            <ActionIcon className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            <p className="text-zinc-500 text-xs leading-relaxed line-clamp-2 mb-5 min-h-[2.5em]">
                {company.description || 'No description available for this company.'}
            </p>

            {/* Metadata Tags */}
            <div className="flex flex-wrap gap-2 mt-auto mb-5">
                {company.location && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-50 border border-zinc-200 text-[10px] text-zinc-700 font-medium">
                        <MapPin className="w-3 h-3 text-zinc-400" />
                        <span className="truncate max-w-[100px]">{company.location}</span>
                    </div>
                )}
                {company.employees && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-50 border border-zinc-200 text-[10px] text-zinc-700 font-medium">
                        <Users className="w-3 h-3 text-zinc-400" />
                        <span>{company.employees.toLocaleString()}</span>
                    </div>
                )}
                {company.website && (
                    <a
                        href={company.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-50 border border-zinc-200 text-[10px] text-zinc-700 font-medium hover:bg-orange-50 hover:border-orange-200 hover:text-zinc-950 transition-colors"
                    >
                        <Globe className="w-3 h-3 text-zinc-400" />
                        <span>Website</span>
                    </a>
                )}
            </div>

            {/* Footer */}
            <div className="pt-4 border-t border-zinc-200 flex items-center justify-between mt-auto">
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

                <div className="flex items-center gap-1 text-[10px] font-bold text-zinc-500 group-hover:text-orange-600 transition-colors">
                    View Details
                    <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
                </div>
            </div>
        </div>
    );
};
