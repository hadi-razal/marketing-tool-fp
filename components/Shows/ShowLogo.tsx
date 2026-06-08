'use client';

import React from 'react';
import { Camera, School } from 'lucide-react';
import { useShowLogoUrl } from '@/hooks/useShowLogoUrl';
import { initialsFromShowName } from '@/lib/showLogo';
import { getGoogleFaviconUrl } from '@/lib/showWebsite';

type ShowLogoFallback = 'school' | 'initials' | 'camera';

type ShowLogoProps = {
    show: Record<string, unknown>;
    name: string;
    className?: string;
    imageClassName?: string;
    fallback?: ShowLogoFallback;
};

const FallbackContent: React.FC<{ fallback: ShowLogoFallback; name: string }> = ({ fallback, name }) => {
    if (fallback === 'initials') {
        return <span className="font-bold">{initialsFromShowName(name)}</span>;
    }
    if (fallback === 'camera') {
        return (
            <>
                <Camera className="h-8 w-8" />
                <p className="text-xs">No profile photo</p>
            </>
        );
    }
    return <School className="h-7 w-7 text-zinc-400" />;
};

export const ShowLogo: React.FC<ShowLogoProps> = ({
    show,
    name,
    className = 'flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-white text-base font-bold tracking-tight text-zinc-900 shadow-2xl ring-2 ring-white/25',
    imageClassName = 'h-full w-full object-cover',
    fallback = 'school',
}) => {
    const { imageUrl, websiteUrl, hostname, retryWithFavicon, markFailed } = useShowLogoUrl(show);

    if (!imageUrl) {
        return (
            <div
                className={`${className} ${
                    fallback === 'camera' ? 'flex-col gap-2 bg-zinc-50 text-zinc-400' : ''
                }`}
            >
                <FallbackContent fallback={fallback} name={name} />
            </div>
        );
    }

    return (
        <div className={className}>
            <img
                src={imageUrl}
                alt={`${name} logo`}
                className={imageClassName}
                loading="lazy"
                onError={() => {
                    if (
                        websiteUrl &&
                        hostname &&
                        imageUrl !== getGoogleFaviconUrl(hostname)
                    ) {
                        retryWithFavicon();
                        return;
                    }
                    markFailed();
                }}
            />
        </div>
    );
};

/** Card header logo — white box with initials when no image is found. */
export const ShowCardLogo: React.FC<Pick<ShowLogoProps, 'show' | 'name' | 'className'>> = (props) => (
    <ShowLogo
        {...props}
        fallback="initials"
        imageClassName="h-full w-full object-contain bg-white p-1.5"
    />
);

/** Detail page hero — initials when no image is available. */
export const ShowHeaderLogo: React.FC<Pick<ShowLogoProps, 'show' | 'name' | 'className'>> = ({
    className = 'flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-white/10 text-lg font-bold text-white backdrop-blur-sm sm:h-20 sm:w-20 sm:text-xl',
    ...props
}) => <ShowLogo {...props} className={className} fallback="initials" />;

/** Detail page images panel — camera placeholder when nothing found. */
export const ShowProfilePhoto: React.FC<Pick<ShowLogoProps, 'show' | 'name'>> = (props) => (
    <div className="group relative aspect-square overflow-hidden bg-zinc-50">
        <ShowLogo
            {...props}
            className="flex h-full w-full items-center justify-center"
            imageClassName="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            fallback="camera"
        />
    </div>
);
