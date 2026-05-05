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

/** Host-only domain for matching `people.organization_domain` (lowercase, no path, no `www.`). */
export function normalizeOrganizationDomain(input?: string | null): string | null {
    if (input == null || String(input).trim() === '') return null;
    let s = String(input).trim().toLowerCase().replace(/^https?:\/\//, '').split('/')[0]?.split('?')[0] ?? '';
    if (!s) return null;
    if (s.startsWith('www.')) s = s.slice(4);
    return s || null;
}
