import { getGoogleFaviconUrl, getShowWebsiteHostname, getShowWebsiteUrl } from '@/lib/showWebsite';

export type ShowLogoSource = 'profile' | 'website' | 'favicon' | 'none';

const clientCache = new Map<string, string>();

export function getSupabaseProfileImage(show: Record<string, unknown>): string | null {
    const value = String(show.profile_img_link || show.Profile_Img_Link || '').trim();
    return value || null;
}

export async function resolveShowLogoUrl(show: Record<string, unknown>): Promise<{
    imageUrl: string | null;
    source: ShowLogoSource;
}> {
    const profileImage = getSupabaseProfileImage(show);
    if (profileImage) {
        return { imageUrl: profileImage, source: 'profile' };
    }

    const websiteUrl = getShowWebsiteUrl(show);
    const hostname = getShowWebsiteHostname(show);

    if (!websiteUrl) {
        return { imageUrl: null, source: 'none' };
    }

    if (clientCache.has(websiteUrl)) {
        const cached = clientCache.get(websiteUrl) || null;
        return {
            imageUrl: cached,
            source: cached?.includes('favicons') ? 'favicon' : 'website',
        };
    }

    if (hostname) {
        const favicon = getGoogleFaviconUrl(hostname);
        clientCache.set(websiteUrl, favicon);
    }

    try {
        const res = await fetch(`/api/shows/site-image?url=${encodeURIComponent(websiteUrl)}`);
        const data = await res.json();
        const resolved = typeof data?.imageUrl === 'string' && data.imageUrl ? data.imageUrl : null;

        if (resolved) {
            clientCache.set(websiteUrl, resolved);
            return {
                imageUrl: resolved,
                source: data?.source === 'favicon' ? 'favicon' : 'website',
            };
        }
    } catch {
        // fall through to favicon
    }

    if (hostname) {
        const favicon = getGoogleFaviconUrl(hostname);
        clientCache.set(websiteUrl, favicon);
        return { imageUrl: favicon, source: 'favicon' };
    }

    return { imageUrl: null, source: 'none' };
}

export function getInstantShowLogoUrl(show: Record<string, unknown>): string | null {
    const profileImage = getSupabaseProfileImage(show);
    if (profileImage) return profileImage;

    const websiteUrl = getShowWebsiteUrl(show);
    if (websiteUrl && clientCache.has(websiteUrl)) {
        return clientCache.get(websiteUrl) || null;
    }

    const hostname = getShowWebsiteHostname(show);
    return hostname ? getGoogleFaviconUrl(hostname) : null;
}

export function cacheShowLogoUrl(websiteUrl: string, imageUrl: string) {
    clientCache.set(websiteUrl, imageUrl);
}

export function initialsFromShowName(name: string): string {
    const parts = String(name || '')
        .trim()
        .split(/\s+/)
        .filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
}
