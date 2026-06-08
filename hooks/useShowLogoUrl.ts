'use client';

import { useEffect, useState } from 'react';
import {
    cacheShowLogoUrl,
    getInstantShowLogoUrl,
    getSupabaseProfileImage,
    resolveShowLogoUrl,
    type ShowLogoSource,
} from '@/lib/showLogo';
import { getGoogleFaviconUrl, getShowWebsiteHostname, getShowWebsiteUrl } from '@/lib/showWebsite';

export function useShowLogoUrl(show: Record<string, unknown>) {
    const profileImage = getSupabaseProfileImage(show);
    const websiteUrl = getShowWebsiteUrl(show);
    const hostname = getShowWebsiteHostname(show);
    const showId = String(show.ID || show.id || '');

    const [imageUrl, setImageUrl] = useState<string | null>(() => getInstantShowLogoUrl(show));
    const [source, setSource] = useState<ShowLogoSource>(() =>
        profileImage ? 'profile' : imageUrl ? 'favicon' : 'none',
    );
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        setFailed(false);

        if (profileImage) {
            setImageUrl(profileImage);
            setSource('profile');
            return;
        }

        const instant = getInstantShowLogoUrl(show);
        setImageUrl(instant);
        setSource(instant ? 'favicon' : 'none');

        if (!websiteUrl) return;

        let cancelled = false;

        void resolveShowLogoUrl(show).then((result) => {
            if (cancelled) return;
            setImageUrl(result.imageUrl);
            setSource(result.source);
        });

        return () => {
            cancelled = true;
        };
    }, [profileImage, websiteUrl, hostname, showId]);

    const retryWithFavicon = () => {
        if (!hostname || !websiteUrl) {
            setFailed(true);
            return;
        }
        const favicon = getGoogleFaviconUrl(hostname);
        cacheShowLogoUrl(websiteUrl, favicon);
        setImageUrl(favicon);
        setSource('favicon');
        setFailed(false);
    };

    const markFailed = () => setFailed(true);

    return {
        imageUrl: failed ? null : imageUrl,
        source,
        failed,
        profileImage,
        websiteUrl,
        hostname,
        retryWithFavicon,
        markFailed,
    };
}
