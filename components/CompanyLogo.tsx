'use client';

import React, { useEffect, useState } from 'react';
import { getBrandColor, getCompanyFaviconUrl } from '@/lib/utils';

interface CompanyLogoProps {
    name: string;
    logoUrl?: string | null;
    company: {
        primary_domain?: string | null;
        website_url?: string | null;
        website?: string | null;
    };
    className?: string;
    imgClassName?: string;
    initialsClassName?: string;
    faviconSize?: number;
}

const initialsFromName = (name: string) => {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

/**
 * Renders a company logo, falling back to the website favicon when no explicit
 * logo is available, and finally to a colored initials avatar.
 */
export const CompanyLogo: React.FC<CompanyLogoProps> = ({
    name,
    logoUrl,
    company,
    className = '',
    imgClassName = 'h-full w-full object-contain p-1',
    initialsClassName = 'text-sm',
    faviconSize = 64,
}) => {
    const favicon = getCompanyFaviconUrl(company, faviconSize);
    const sources = [logoUrl, favicon].filter(Boolean) as string[];
    const [srcIndex, setSrcIndex] = useState(0);

    useEffect(() => {
        setSrcIndex(0);
    }, [logoUrl, favicon]);

    const currentSrc = sources[srcIndex];

    return (
        <div className={className}>
            {currentSrc ? (
                <img
                    src={currentSrc}
                    alt={`${name} logo`}
                    className={imgClassName}
                    loading="lazy"
                    onError={() => setSrcIndex((i) => i + 1)}
                />
            ) : (
                <div
                    className={`flex h-full w-full items-center justify-center font-bold text-white ${initialsClassName}`}
                    style={{ backgroundColor: getBrandColor(name) }}
                >
                    {initialsFromName(name)}
                </div>
            )}
        </div>
    );
};
