import { normalizeOrganizationDomain } from '@/lib/utils';

/** Official show website only — not exhibitor lists or other links. */
const WEBSITE_FIELDS = [
    'website',
    'Website',
    'show_website',
    'Show_Website',
    'event_website',
    'Event_Website',
] as const;

export function normalizeShowWebsiteUrl(input?: string | null): string {
    const raw = String(input || '').trim();
    if (!raw) return '';
    if (/^https?:\/\//i.test(raw)) return raw;
    if (raw.includes('.')) return `https://${raw.replace(/^\/+/, '')}`;
    return '';
}

/** Official show website URL on a show row. */
export function getShowWebsiteUrl(item: Record<string, unknown>): string {
    for (const field of WEBSITE_FIELDS) {
        const url = normalizeShowWebsiteUrl(String(item[field] || ''));
        if (url) return url;
    }
    return '';
}

export function getShowWebsiteHostname(item: Record<string, unknown>): string | null {
    const url = getShowWebsiteUrl(item);
    if (!url) return null;
    try {
        return normalizeOrganizationDomain(new URL(url).hostname);
    } catch {
        return normalizeOrganizationDomain(url);
    }
}

export function getGoogleFaviconUrl(hostname: string, size = 128): string {
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostname)}&sz=${size}`;
}
