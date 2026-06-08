import React from 'react';
import { Building2, MapPin } from 'lucide-react';
import { Comment } from '@/services/databaseService';
import { formatCompanyLocation } from '@/lib/utils';

export interface Company {
    id: string;
    name: string;
    website?: string;
    logo?: string;
    industry?: string;
    location?: string;
    country?: string;
    world_area?: string;
    employees?: number;
    linkedin?: string;
    twitter?: string;
    facebook?: string;
    keywords?: string[];
    phone?: string;
    isSaved?: boolean;
    comments?: Comment[];
    primary_domain?: string;
    website_url?: string;
    logo_url?: string;
    estimated_num_employees?: number;
    created_at?: string;
}

interface CompanyCardProps {
    company: Company;
    onClick?: () => void;
    onAction?: () => void;
    actionIcon?: React.ElementType;
}

export const CompanyCard: React.FC<CompanyCardProps> = ({ company, onClick, onAction, actionIcon: ActionIcon }) => {
    const locationLabel = formatCompanyLocation(company);
    const websiteLabel = (company.website || '').replace(/^https?:\/\//, '').replace(/\/$/, '');
    const description = 'Company profile available. Open details to edit and enrich this record.';

    return (
        <div
            onClick={onClick}
            className="group relative flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white/95 p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-xl hover:shadow-zinc-950/8"
        >
            <div className="relative z-10 mb-3 flex items-start justify-between gap-2.5">
                <div className="flex min-w-0 gap-3">
                    <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50 p-1.5 transition-transform duration-300 group-hover:scale-105">
                        {company.logo ? (
                            <img src={company.logo} alt={company.name} className="w-full h-full object-contain" />
                        ) : (
                            <Building2 className="w-6 h-6 text-zinc-400" />
                        )}
                    </div>

                    <div className="min-w-0">
                        <h3 className="truncate text-[15px] font-bold tracking-tight text-zinc-950 transition-colors group-hover:text-orange-600 sm:text-base">
                            {company.name}
                        </h3>
                        {company.industry && (
                            <div className="mt-1.5">
                                <span className="inline-flex items-center rounded-md border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 text-[9px] font-semibold text-zinc-600">
                                    {company.industry}
                                </span>
                            </div>
                        )}
                        {websiteLabel && (
                            <p className="mt-1 truncate text-[10px] font-medium text-zinc-400">{websiteLabel}</p>
                        )}
                    </div>
                </div>

                {onAction && ActionIcon && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onAction(); }}
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-400 transition-all hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                    >
                        <ActionIcon className="h-3.5 w-3.5" />
                    </button>
                )}
            </div>

            <p className="mb-3 min-h-[2.6em] text-[11px] leading-relaxed text-zinc-500 line-clamp-2">
                {description}
            </p>

            <div className="mb-3 grid grid-cols-2 gap-1.5">
                {locationLabel && (
                    <div className="col-span-2 flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-1 text-[9px] font-medium text-zinc-700">
                        <MapPin className="h-3 w-3 shrink-0 text-zinc-400" />
                        <span className="truncate">{locationLabel}</span>
                    </div>
                )}
            </div>
        </div>
    );
};
