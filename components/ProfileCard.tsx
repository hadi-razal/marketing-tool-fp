import React, { useState, useEffect } from 'react';
import { Building2, MapPin, Mail, Phone, Check, Linkedin } from 'lucide-react';

interface Lead {
    id: string;
    name?: string;
    first_name?: string;
    last_name?: string;
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
}

interface ProfileCardProps {
    lead: Lead;
    onAction?: (lead: Lead) => void;
    actionIcon?: React.ElementType;
    onClick?: () => void;
    isSaved?: boolean;
    actionType?: 'save' | 'delete'; // Add action type to distinguish between save and delete
}

const Avatar = ({ src, alt, name, className }: { src?: string, alt: string, name: string, className?: string }) => {
    const [imageError, setImageError] = useState(false);

    // Check if we have a valid image URL (not empty, not null, not a placeholder)
    const hasValidSrc = src && src.trim() !== '' && !imageError;

    // Generate initials for fallback
    const initials = name
        ? name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
        : 'U';

    if (hasValidSrc) {
        return (
            <img
                src={src}
                alt={alt}
                className={className}
                onError={() => setImageError(true)}
            />
        );
    }

    return (
        <div className={`${className} flex items-center justify-center bg-orange-500 text-white font-bold text-sm`}>
            {initials}
        </div>
    );
};

export const ProfileCard: React.FC<ProfileCardProps> = ({ lead, onAction, actionIcon: ActionIcon, onClick, isSaved, actionType = 'save' }) => {
    // Normalize data
    const name = lead.name || 'Unknown';
    const title = lead.title || 'No Title';
    const company = lead.company || lead.organization_name || 'Unknown Company';
    const location = lead.location || '';
    const email = lead.email || 'N/A';
    const phone = lead.phone || 'N/A';
    const image = lead.photo_url || lead.image;
    const linkedin = lead.linkedin;
    const isVerified = lead.status === 'Verified' || lead.email_status === 'verified';
    const saved = isSaved || lead.isSaved;

    return (
        <div
            onClick={onClick}
            className="group relative bg-[#0c0c0d] border border-white/5 rounded-xl overflow-hidden cursor-pointer hover:border-white/10 transition-all duration-300 flex flex-col h-[280px]"
        >
            {/* Header */}
            <div className="p-4 flex items-start gap-3">
                <div className="relative shrink-0">
                    <Avatar
                        key={image || 'default'}
                        src={image}
                        name={name}
                        className="w-12 h-12 rounded-xl object-cover border border-white/10"
                        alt={name}
                    />
                    {isVerified && (
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center border-2 border-[#0c0c0d]">
                            <Check className="w-2.5 h-2.5 text-white" />
                        </div>
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="text-white font-semibold text-sm truncate group-hover:text-orange-400 transition-colors">{name}</h3>
                    <p className="text-zinc-500 text-xs truncate mt-0.5">{title}</p>
                </div>
                {onAction && ActionIcon && (
                    <button
                        onClick={(e) => { 
                            e.stopPropagation(); 
                            // Allow delete action even when saved, but only allow save when not saved
                            if (actionType === 'delete' || !saved) {
                                onAction(lead); 
                            }
                        }}
                        disabled={actionType === 'save' && saved}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all shrink-0 ${
                            actionType === 'delete' 
                                ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300'
                                : saved
                                    ? 'bg-green-500/20 text-green-400'
                                    : 'bg-white/5 text-zinc-500 hover:text-white hover:bg-orange-500'
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
            <div className="px-4 flex flex-wrap gap-1.5">
                <span className="inline-flex items-center gap-1.5 bg-white/5 text-zinc-400 text-[10px] px-2.5 py-1 rounded-md font-medium">
                    <Building2 className="w-3 h-3 text-orange-500" />
                    <span className="truncate max-w-[100px]">{company}</span>
                </span>
                {location && (
                    <span className="inline-flex items-center gap-1.5 bg-white/5 text-zinc-400 text-[10px] px-2.5 py-1 rounded-md font-medium">
                        <MapPin className="w-3 h-3 text-blue-500" />
                        <span className="truncate max-w-[120px]">{location}</span>
                    </span>
                )}
            </div>

            {/* Contact Info */}
            <div className="mt-auto p-4 space-y-2 bg-black/20 border-t border-white/5">
                <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-md bg-white/5 flex items-center justify-center shrink-0">
                        <Mail className="w-3 h-3 text-zinc-500" />
                    </div>
                    <span className="text-xs text-zinc-400 truncate flex-1">{email}</span>
                </div>
                <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-md bg-white/5 flex items-center justify-center shrink-0">
                        <Phone className="w-3 h-3 text-zinc-500" />
                    </div>
                    <span className="text-xs text-zinc-400">{phone}</span>
                </div>
            </div>

            {/* Footer */}
            <div className="px-4 py-2.5 border-t border-white/5 flex items-center justify-between bg-black/30">
                <span className="text-[9px] text-zinc-600 font-mono truncate max-w-[140px]">
                    ID: {lead.id?.substring(0, 20)}
                </span>
                {linkedin && (
                    <a
                        href={linkedin.startsWith('http') ? linkedin : `https://${linkedin}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-[10px] font-semibold text-blue-500 hover:text-blue-400 flex items-center gap-1"
                    >
                        <Linkedin className="w-3 h-3" />
                        LinkedIn Profile
                    </a>
                )}
            </div>
        </div>
    );
};
