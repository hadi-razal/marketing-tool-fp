'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
    Calendar,
    MapPin,
    ExternalLink,
    Link2,
} from 'lucide-react';
import { Modal } from './ui/Modal';
import { Globe } from 'lucide-react';

/** Normalises link fields (string or { url }) for display. */
function linkValue(raw: unknown): string | null {
    if (raw == null) return null;
    if (typeof raw === 'object' && 'url' in (raw as object)) {
        const u = (raw as { url?: string }).url;
        return typeof u === 'string' && u.trim() ? u : null;
    }
    if (typeof raw === 'string' && raw.trim()) return raw;
    return null;
}

function formatEventDate(dateStr: string | undefined) {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    return d.toLocaleString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
}

interface DatabaseShowDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    /** Raw show payload (e.g. from your API) — field names stay flexible for a future non-Zoho backend */
    show: Record<string, unknown> | null;
}

export const DatabaseShowDetailModal: React.FC<DatabaseShowDetailModalProps> = ({
    isOpen,
    onClose,
    show,
}) => {
    if (!isOpen || !show) return null;

    const title = String(show.name || show.Event || show.Event_Name || show.Name || 'Show');
    const startLabel = formatEventDate((show.starting_date || show.Starting_Date) as string | undefined);
    const city = show.city ? String(show.city) : (show.City ? String(show.City) : '');
    const country = show.country ? String(show.country) : (show.Country ? String(show.Country) : '');
    const worldArea = show.world_area ? String(show.world_area) : (show.World_Area ? String(show.World_Area) : '');
    const location = [city, country, worldArea].filter(Boolean).join(', ');
    const level = show.level ? String(show.level) : (show.Level ? String(show.Level) : '');
    const exhibitorList = linkValue(show.exhibitor_list_link || show.Exhibitor_List_Link);
    const floorplanLink = linkValue(show.floorplan_link);

    const logoUrl =
        typeof show.Event_logo === 'string' && show.Event_logo ? show.Event_logo : null;

    const idLabel = show.id != null ? String(show.id) : (show.ID != null ? String(show.ID) : null);

    return (
        <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-3xl" hideHeader>
            <div className="flex flex-col bg-white rounded-3xl overflow-hidden">
                {/* Minimal Header */}
                <div className="relative px-6 sm:px-10 pt-10 pb-8 border-b border-zinc-100 bg-linear-to-br from-white via-zinc-50 to-orange-50/50">
                    <button
                        onClick={onClose}
                        className="absolute right-5 top-5 rounded-full border border-zinc-200 bg-white p-2 text-zinc-500 transition-colors hover:text-zinc-900 hover:border-orange-200 hover:bg-orange-50"
                        aria-label="Close modal"
                    >
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M18 6L6 18M6 6l12 12" />
                        </svg>
                    </button>
                    <div className="flex flex-col sm:flex-row gap-6 items-start">
                        {logoUrl ? (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-zinc-100/50 bg-zinc-50 p-3"
                            >
                                {/* eslint-disable-next-line @next/next/no-img-element -- dynamic Zoho / CDN URLs */}
                                <img
                                    src={logoUrl || undefined}
                                    alt=""
                                    className="max-h-full max-w-full object-contain mix-blend-multiply"
                                />
                            </motion.div>
                        ) : (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-zinc-50 text-zinc-400"
                            >
                                <Calendar className="h-7 w-7" />
                            </motion.div>
                        )}
                        <div className="min-w-0 flex-1 pt-1">
                            <div className="flex flex-wrap items-center gap-3 mb-2">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                                    Event
                                </span>
                                {level && (
                                    <>
                                        <span className="w-1 h-1 rounded-full bg-zinc-200"></span>
                                        <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">
                                            {level}
                                        </span>
                                    </>
                                )}
                                {idLabel && (
                                    <>
                                        <span className="w-1 h-1 rounded-full bg-zinc-200"></span>
                                        <span className="text-[10px] font-medium text-zinc-400">
                                            #{idLabel}
                                        </span>
                                    </>
                                )}
                            </div>

                            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-900 mb-4">
                                {title}
                            </h2>

                            <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-zinc-600">
                                {startLabel && (
                                    <span className="flex items-center gap-2">
                                        <Calendar className="h-4 w-4 text-zinc-400" />
                                        {startLabel}
                                    </span>
                                )}
                                {location && (
                                    <span className="flex items-center gap-2">
                                        <MapPin className="h-4 w-4 text-zinc-400" />
                                        <span className="truncate">{location}</span>
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {(exhibitorList || floorplanLink) && (
                    <div className="px-6 sm:px-10 py-8">
                        <div className="mb-4 flex items-end justify-between">
                            <h4 className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">
                                Quick links
                            </h4>
                            <span className="text-[10px] font-medium text-zinc-400">
                                {[
                                    exhibitorList ? 1 : 0,
                                    floorplanLink ? 1 : 0,
                                ].reduce((a, b) => a + b, 0)} resources
                            </span>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                                {exhibitorList && (
                                    <a
                                        href={exhibitorList || undefined}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="group flex items-center justify-between p-4 rounded-2xl border border-zinc-200 bg-white shadow-sm hover:-translate-y-0.5 hover:border-orange-200 hover:bg-orange-50/40 hover:shadow-md transition-all"
                                    >
                                        <div className="flex items-center gap-4 min-w-0">
                                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white border border-zinc-200 text-zinc-700 shadow-sm">
                                                <Link2 className="h-4 w-4 group-hover:text-zinc-900 transition-colors" />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="text-sm font-medium text-zinc-900">Exhibitor list</div>
                                                <div className="text-xs text-zinc-500 truncate">External link</div>
                                            </div>
                                        </div>
                                        <ExternalLink className="h-4 w-4 text-zinc-300 group-hover:text-zinc-500 transition-colors" />
                                    </a>
                                )}
                                {floorplanLink && (
                                    <a
                                        href={floorplanLink || undefined}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="group flex items-center justify-between p-4 rounded-2xl border border-zinc-200 bg-white shadow-sm hover:-translate-y-0.5 hover:border-orange-200 hover:bg-orange-50/40 hover:shadow-md transition-all"
                                    >
                                        <div className="flex items-center gap-4 min-w-0">
                                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white border border-zinc-200 text-zinc-700 shadow-sm">
                                                <LayoutTemplateIcon />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="text-sm font-medium text-zinc-900">Floor plan</div>
                                                <div className="text-xs text-zinc-500 truncate">View online</div>
                                            </div>
                                        </div>
                                        <ExternalLink className="h-4 w-4 text-zinc-300 group-hover:text-zinc-500 transition-colors" />
                                    </a>
                                )}
                            </div>
                    </div>
                )}
            </div>
        </Modal>
    );
};

function LayoutTemplateIcon() {
    return (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <line x1="3" y1="9" x2="21" y2="9" />
            <line x1="9" y1="21" x2="9" y2="9" />
        </svg>
    );
}
