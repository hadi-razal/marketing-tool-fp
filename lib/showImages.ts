function parseImageList(value: unknown): string[] {
    if (!value) return [];
    if (Array.isArray(value)) {
        return value
            .map((item) => {
                if (typeof item === 'string') return item.trim();
                if (item && typeof item === 'object' && 'url' in item) {
                    return String((item as { url?: string }).url || '').trim();
                }
                return '';
            })
            .filter(Boolean);
    }
    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (!trimmed) return [];
        if (trimmed.startsWith('[')) {
            try {
                return parseImageList(JSON.parse(trimmed));
            } catch {
                return [trimmed];
            }
        }
        return trimmed.split(/[\n,|]+/).map((part) => part.trim()).filter(Boolean);
    }
    return [];
}

/** Images explicitly stored in Supabase — no website scraping. */
export function getUploadedShowImages(show: Record<string, unknown>): string[] {
    const urls = new Set<string>();

    for (const field of ['images', 'Images', 'event_images', 'Event_Images', 'gallery', 'Gallery']) {
        for (const url of parseImageList(show[field])) {
            urls.add(url);
        }
    }

    return Array.from(urls);
}
