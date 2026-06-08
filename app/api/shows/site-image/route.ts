import { NextResponse } from 'next/server';
import { getGoogleFaviconUrl, normalizeShowWebsiteUrl } from '@/lib/showWebsite';
import { normalizeOrganizationDomain } from '@/lib/utils';

const CACHE_TTL_MS = 1000 * 60 * 60 * 24;
const cache = new Map<string, { imageUrl: string; expiresAt: number }>();

function resolveImageUrl(baseUrl: string, value: string): string {
    const trimmed = value.trim();
    if (!trimmed) return '';
    try {
        return new URL(trimmed, baseUrl).toString();
    } catch {
        return trimmed;
    }
}

function extractMetaImage(html: string, baseUrl: string): string {
    const patterns = [
        /<meta[^>]+property=["']og:image(?::url)?["'][^>]+content=["']([^"']+)["'][^>]*>/gi,
        /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image(?::url)?["'][^>]*>/gi,
        /<meta[^>]+name=["']twitter:image(?::src)?["'][^>]+content=["']([^"']+)["'][^>]*>/gi,
        /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image(?::src)?["'][^>]*>/gi,
        /<link[^>]+rel=["']apple-touch-icon["'][^>]+href=["']([^"']+)["'][^>]*>/gi,
        /<link[^>]+href=["']([^"']+)["'][^>]+rel=["']apple-touch-icon["'][^>]*>/gi,
    ];

    for (const pattern of patterns) {
        const match = pattern.exec(html);
        if (match?.[1]) {
            const resolved = resolveImageUrl(baseUrl, match[1]);
            if (resolved.startsWith('http')) return resolved;
        }
    }

    return '';
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const rawUrl = searchParams.get('url') || '';
    const pageUrl = normalizeShowWebsiteUrl(rawUrl);

    if (!pageUrl) {
        return NextResponse.json({ error: 'Valid url is required' }, { status: 400 });
    }

    const hostname = normalizeOrganizationDomain(new URL(pageUrl).hostname);
    const faviconFallback = hostname ? getGoogleFaviconUrl(hostname) : '';

    const cached = cache.get(pageUrl);
    if (cached && cached.expiresAt > Date.now()) {
        return NextResponse.json({ imageUrl: cached.imageUrl, source: 'cache' });
    }

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6000);

        const response = await fetch(pageUrl, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; FairplatzBot/1.0)',
                Accept: 'text/html,application/xhtml+xml',
            },
            redirect: 'follow',
        });

        clearTimeout(timeout);

        if (!response.ok) {
            const imageUrl = faviconFallback;
            if (imageUrl) cache.set(pageUrl, { imageUrl, expiresAt: Date.now() + CACHE_TTL_MS });
            return NextResponse.json({ imageUrl, source: 'favicon' });
        }

        const html = await response.text();
        const finalUrl = response.url || pageUrl;
        const ogImage = extractMetaImage(html, finalUrl);
        const imageUrl = ogImage || faviconFallback;

        if (imageUrl) {
            cache.set(pageUrl, { imageUrl, expiresAt: Date.now() + CACHE_TTL_MS });
        }

        return NextResponse.json({
            imageUrl,
            source: ogImage ? 'og' : 'favicon',
        });
    } catch {
        const imageUrl = faviconFallback;
        if (imageUrl) cache.set(pageUrl, { imageUrl, expiresAt: Date.now() + CACHE_TTL_MS });
        return NextResponse.json({ imageUrl, source: 'favicon' });
    }
}
