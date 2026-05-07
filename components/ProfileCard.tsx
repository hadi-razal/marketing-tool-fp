import React, { useState } from 'react';
import {
    Building2,
    MapPin,
    Mail,
    Phone,
    Check,
    Circle,
    UserCheck,
    TrendingUp,
    Sparkles,
    Clock,
    XCircle,
    Linkedin,
    type LucideIcon,
} from 'lucide-react';
import { getBrandColor, isPersonSavedFromLinkedInSearch } from '@/lib/utils';
import { toast } from 'sonner';

interface Lead {
    id: string;
    name?: string;
    first_name?: string;
    last_name?: string;
    last_name_obfuscated?: string;
    title?: string;
    headline?: string;
    company?: string;
    organization_name?: string;
    company_id?: string;
    website?: string;
    company_website?: string;
    organization_domain?: string;
    company_logo?: string;
    company_industry?: string;
    company_size?: string | number;
    location?: string;
    city?: string;
    state?: string;
    country?: string;
    email?: string;
    phone?: string;
    linkedin?: string;
    linkedin_url?: string;
    twitter?: string;
    twitter_url?: string;
    facebook?: string;
    facebook_url?: string;
    github?: string;
    github_url?: string;
    image?: string;
    photo_url?: string;
    status?: string;
    email_status?: string;
    group_name?: string;
    score?: number;
    seniority?: string;
    departments?: string[];
    functions?: string[];
    isSaved?: boolean;
    description?: string;
    contact_status?: string;
    saved_from?: string | null;
}

interface ProfileCardProps {
    lead: Lead;
    onAction?: (lead: Lead) => void;
    actionIcon?: React.ElementType;
    onClick?: () => void;
    isSaved?: boolean;
    actionType?: 'save' | 'delete';
}

const Avatar = ({ src, alt, name, className }: { src?: string, alt: string, name: string, className?: string }) => {
    const [imageError, setImageError] = useState(false);
    const hasValidSrc = src && src.trim() !== '' && !imageError;
    const initials = name
        ? name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
        : 'U';

    if (hasValidSrc) {
        return (
            // eslint-disable-next-line @next/next/no-img-element -- external avatar URLs
            <img
                src={src}
                alt={alt}
                className={className}
                onError={() => setImageError(true)}
            />
        );
    }

    const accent = getBrandColor(name || alt);

    return (
        <div
            className={`${className} flex items-center justify-center border border-black/8 text-[11px] font-semibold leading-none tracking-tight text-white antialiased shadow-[inset_0_1px_0_rgba(255,255,255,0.28)] ring-1 ring-inset ring-white/20 sm:text-xs`}
            style={{ backgroundColor: accent }}
        >
            {initials}
        </div>
    );
};

const PIPELINE_VISUAL: Record<
    string,
    { Icon: LucideIcon; chip: string; iconClass: string }
> = {
    New: {
        Icon: Circle,
        chip: 'border-zinc-200 bg-zinc-50 text-zinc-800',
        iconClass: 'text-zinc-500',
    },
    'Need to Contact': {
        Icon: Phone,
        chip: 'border-blue-200 bg-blue-50 text-blue-900',
        iconClass: 'text-blue-600',
    },
    Contacted: {
        Icon: UserCheck,
        chip: 'border-purple-200 bg-purple-50 text-purple-900',
        iconClass: 'text-purple-600',
    },
    'In Progress': {
        Icon: TrendingUp,
        chip: 'border-orange-200 bg-orange-50 text-orange-900',
        iconClass: 'text-orange-600',
    },
    'Good Lead': {
        Icon: Sparkles,
        chip: 'border-emerald-200 bg-emerald-50 text-emerald-900',
        iconClass: 'text-emerald-600',
    },
    'Need a Follow Up': {
        Icon: Clock,
        chip: 'border-amber-200 bg-amber-50 text-amber-950',
        iconClass: 'text-amber-600',
    },
    'Not Interested': {
        Icon: XCircle,
        chip: 'border-red-200 bg-red-50 text-red-900',
        iconClass: 'text-red-600',
    },
    Qualified: {
        Icon: Sparkles,
        chip: 'border-blue-200 bg-blue-50 text-blue-900',
        iconClass: 'text-blue-600',
    },
};

export const ProfileCard: React.FC<ProfileCardProps> = ({ lead, onAction, actionIcon: ActionIcon, onClick, isSaved, actionType = 'save' }) => {
    const firstName = lead.first_name || '';
    const lastName = lead.last_name || '';
    const name = lead.name || (firstName && lastName ? `${firstName} ${lastName}` : firstName || 'Unknown');
    const title = lead.title || 'No Title';
    const company = lead.company || lead.organization_name || 'Unknown Company';
    const location = lead.location || '';
    const email = lead.email || 'N/A';
    const phone = lead.phone || 'N/A';
    const image = lead.photo_url || lead.image;
    const isVerified = lead.status === 'Verified' || lead.email_status === 'verified';
    const saved = isSaved || lead.isSaved;
    const canCopyEmail = Boolean(email && email !== 'N/A' && email !== 'Available (Unlock)');
    const canCopyPhone = Boolean(phone && phone !== 'N/A' && phone !== 'Available (Unlock)');

    const handleCopyEmail = async (event: React.MouseEvent) => {
        event.stopPropagation();
        if (!canCopyEmail) return;
        try {
            await navigator.clipboard.writeText(email);
            toast.success('Email copied');
        } catch {
            toast.error('Failed to copy email');
        }
    };

    const handleCopyPhone = async (event: React.MouseEvent) => {
        event.stopPropagation();
        if (!canCopyPhone) return;
        try {
            await navigator.clipboard.writeText(phone);
            toast.success('Phone copied');
        } catch {
            toast.error('Failed to copy phone');
        }
    };

    const pipelineLabel = (lead.contact_status || 'New').trim() || 'New';
    const pipelineVisual = PIPELINE_VISUAL[pipelineLabel] ?? PIPELINE_VISUAL.New;
    const PipelineStatusIcon = pipelineVisual.Icon;

    const hasLimitedData = !saved && (
        email === 'Available (Unlock)' ||
        phone === 'Available (Unlock)' ||
        (email === 'N/A' && phone === 'N/A') ||
        (lead.first_name && !lead.last_name && lead.last_name_obfuscated) ||
        lead.last_name_obfuscated
    );

    if (!saved && hasLimitedData) {
        return (
            <div
                onClick={onClick}
                className="group relative flex h-48 flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white cursor-pointer transition-all duration-300 hover:border-orange-200 hover:shadow-xl hover:shadow-zinc-950/5"
            >
                <div className="flex items-start gap-2 p-2.5">
                    <div className="relative shrink-0">
                        <Avatar
                            key={image || 'default'}
                            src={image}
                            name={name}
                            className="h-9 w-9 rounded-lg border border-zinc-200 object-cover"
                            alt={name}
                        />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="text-zinc-950 font-semibold text-sm truncate group-hover:text-orange-600 transition-colors">
                            {name}
                        </h3>
                        <p className="mt-0 truncate text-[11px] text-zinc-500">{title}</p>
                    </div>
                </div>

                <div className="mb-1.5 flex flex-wrap gap-1 px-2.5">
                    <span className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[10px] font-medium text-zinc-600">
                        <Building2 className="w-3 h-3 text-orange-500" />
                        <span className="truncate max-w-[120px]">{company}</span>
                    </span>
                    {location && (
                        <span className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[10px] font-medium text-zinc-600">
                            <MapPin className="w-3 h-3 text-blue-500" />
                            <span className="truncate max-w-[100px]">{location}</span>
                        </span>
                    )}
                </div>

                <div className="mt-auto px-2.5 pb-2.5">
                    <div className="rounded-lg border border-orange-200 bg-orange-50 px-2 py-2">
                        <p className="text-[10px] text-orange-600 font-medium text-center">
                            Click to view details and save
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div
            onClick={onClick}
            className="group relative flex h-48 flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white cursor-pointer transition-all duration-300 hover:border-orange-200 hover:shadow-xl hover:shadow-zinc-950/5"
        >
            <div className="flex items-start gap-2 p-2.5">
                <div className="relative shrink-0">
                    <Avatar
                        key={image || 'default'}
                        src={image}
                        name={name}
                        className="h-10 w-10 rounded-lg border border-zinc-200 object-cover"
                        alt={name}
                    />
                    {isVerified && (
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center border-2 border-white">
                            <Check className="w-2.5 h-2.5 text-white" />
                        </div>
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="text-zinc-950 font-semibold text-sm truncate group-hover:text-orange-600 transition-colors">{name}</h3>
                    <p className="mt-0 truncate text-[11px] text-zinc-500">{title}</p>
                </div>
                {onAction && ActionIcon && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            if (actionType === 'delete' || !saved) {
                                onAction(lead);
                            }
                        }}
                        disabled={actionType === 'save' && saved}
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border transition-all ${actionType === 'delete'
                                ? 'bg-red-50 border-red-200 text-red-500 hover:bg-red-100 hover:text-red-600'
                                : saved
                                    ? 'bg-green-50 border-green-200 text-green-500'
                                    : 'bg-zinc-50 border-zinc-200 text-zinc-500 hover:text-white hover:bg-orange-500 hover:border-orange-500'
                        }`}
                        title={actionType === 'delete' ? 'Delete person' : saved ? 'Already saved' : 'Save person'}
                    >
                        {actionType === 'delete' ? (
                            <ActionIcon className="w-4 h-4" />
                        ) : saved ? (
                            <Check className="w-4 h-4" />
                        ) : (
                            <ActionIcon className="w-4 h-4" />
                        )}
                    </button>
                )}
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-1 px-2.5">
                <span className="inline-flex max-w-full items-center gap-1 rounded-md border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[10px] font-medium text-zinc-600">
                    <Building2 className="h-3 w-3 shrink-0 text-orange-500" />
                    <span className="truncate max-w-[100px]">{company}</span>
                </span>
                {location && (
                    <span className="inline-flex max-w-full items-center gap-1 rounded-md border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[10px] font-medium text-zinc-600">
                        <MapPin className="h-3 w-3 shrink-0 text-blue-500" />
                        <span className="truncate max-w-[120px]">{location}</span>
                    </span>
                )}
                {saved && (
                    <span
                        className={`inline-flex max-w-full items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-bold ${pipelineVisual.chip}`}
                        title={`Pipeline: ${pipelineLabel}`}
                    >
                        <PipelineStatusIcon className={`h-3 w-3 shrink-0 ${pipelineVisual.iconClass}`} strokeWidth={2} />
                        <span className="min-w-0 truncate">{pipelineLabel}</span>
                    </span>
                )}
                {saved && isPersonSavedFromLinkedInSearch(lead.saved_from) && (
                    <span
                        className="inline-flex max-w-full flex-wrap items-center gap-0.5 rounded-md border border-[#0a66c2]/30 bg-[#0a66c2]/8 px-2 py-0.5 text-[9px] font-bold leading-tight text-[#0a66c2] sm:text-[10px]"
                        title="Saved from LinkedIn / Apollo search"
                    >
                        <Linkedin className="h-3 w-3 shrink-0" />
                        <span className="min-w-0">LinkedIn Enriched</span>
                    </span>
                )}
            </div>

            {/* Contact Info */}
            <div className="mt-auto space-y-1 border-t border-zinc-200 bg-zinc-50 px-2.5 py-2">
                <div className="flex items-center gap-2">
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded border border-zinc-200 bg-white">
                        <Mail className="h-2.5 w-2.5 text-zinc-400" />
                    </div>
                    <button
                        type="button"
                        onClick={handleCopyEmail}
                        className={`flex-1 truncate text-left text-[11px] ${canCopyEmail ? 'cursor-pointer text-zinc-600 hover:text-orange-600' : 'cursor-default text-zinc-600'}`}
                        title={canCopyEmail ? 'Click to copy email' : undefined}
                    >
                        {email}
                    </button>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded border border-zinc-200 bg-white">
                        <Phone className="h-2.5 w-2.5 text-zinc-400" />
                    </div>
                    <button
                        type="button"
                        onClick={handleCopyPhone}
                        className={`truncate text-left text-[11px] ${canCopyPhone ? 'cursor-pointer text-zinc-600 hover:text-orange-600' : 'cursor-default text-zinc-600'}`}
                        title={canCopyPhone ? 'Click to copy phone' : undefined}
                    >
                        {phone}
                    </button>
                </div>
            </div>
        </div>
    );
};
