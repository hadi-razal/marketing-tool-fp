import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

const PREMIUM_COLORS = [
    '#3b82f6', // blue-500
    '#8b5cf6', // violet-500
    '#ec4899', // pink-500
    '#10b981', // emerald-500
    '#f59e0b', // amber-500
    '#06b6d4', // cyan-500
    '#f43f5e', // rose-500
    '#6366f1', // indigo-500
];

export function getBrandColor(name: string) {
    if (!name) return PREMIUM_COLORS[0];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return PREMIUM_COLORS[Math.abs(hash) % PREMIUM_COLORS.length];
}

/** `people.saved_from`: show LinkedIn-style badge for Apollo / LinkedIn search saves */
export function isPersonSavedFromLinkedInSearch(savedFrom?: string | null): boolean {
    if (savedFrom == null || savedFrom === '') return false;
    const v = String(savedFrom).trim().toLowerCase();
    return v === 'linkedin' || v === 'apollo' || v.includes('linkedin');
}

const MIDDLE_EAST_AREA_KEYWORDS = ['middle east', 'mena', 'gcc', 'middle-east'];

const MIDDLE_EAST_COUNTRY_KEYWORDS = [
    'united arab emirates',
    'uae',
    'saudi arabia',
    'ksa',
    'qatar',
    'bahrain',
    'oman',
    'kuwait',
    'jordan',
    'lebanon',
    'iraq',
    'egypt',
];

/** Whether a show is in the Middle East / MENA / GCC (world area or country). */
export function isMiddleEastShow(item: {
    World_Area?: string;
    world_area?: string;
    Country?: string;
    country?: string;
}): boolean {
    const area = String(item.World_Area || item.world_area || '').toLowerCase();
    if (MIDDLE_EAST_AREA_KEYWORDS.some((keyword) => area.includes(keyword))) return true;

    const country = String(item.Country || item.country || '').toLowerCase();
    return MIDDLE_EAST_COUNTRY_KEYWORDS.some(
        (keyword) => country.includes(keyword) || country === keyword,
    );
}

/** Host-only domain for matching `people.organization_domain` (lowercase, no path, no `www.`). */
export function normalizeOrganizationDomain(input?: string | null): string | null {
    if (input == null || String(input).trim() === '') return null;
    let s = String(input).trim().toLowerCase().replace(/^https?:\/\//, '').split('/')[0]?.split('?')[0] ?? '';
    if (!s) return null;
    if (s.startsWith('www.')) s = s.slice(4);
    return s || null;
}

/** Display location for a company row. */
export function formatCompanyLocation(company: {
    country?: string | null;
    world_area?: string | null;
    location?: string | null;
}): string {
    return (
        [company.country, company.world_area].filter(Boolean).join(', ') ||
        String(company.location || '').trim()
    );
}
