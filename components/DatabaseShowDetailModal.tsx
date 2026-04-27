'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Calendar,
    MapPin,
    Globe,
    ExternalLink,
    Download,
    Hash,
    Building2,
    Link2,
    FileText,
    Sparkles,
} from 'lucide-react';
import { Modal } from './ui/Modal';
import { getZohoConfig } from '@/lib/zoho';

/** Normalises Zoho link fields (string or { url }) for display. */
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
    const [noteOpen, setNoteOpen] = useState(false);

    useEffect(() => {
        if (isOpen) setNoteOpen(false);
    }, [isOpen, show?.ID]);

    if (!isOpen || !show) return null;

    const title = String(show.Event || show.Event_Name || show.Name || 'Show');
    const startLabel = formatEventDate(show.Starting_Date as string | undefined);
    const industry = show.Industry ? String(show.Industry) : '';
    const organiser = show.Organiser ? String(show.Organiser) : '';
    const city = show.City ? String(show.City) : '';
    const country = show.Country ? String(show.Country) : '';
    const worldArea = show.World_Area ? String(show.World_Area) : '';
    const location = [city, country, worldArea].filter(Boolean).join(', ');
    const size = show.Exhibition_Size ? String(show.Exhibition_Size) : '';
    const exhibitorCount = show.Last_edition_n_Exhibitors
        ? String(show.Last_edition_n_Exhibitors)
        : '';
    const frequency = show.Frequency ? String(show.Frequency) : '';
    const level = show.Level ? String(show.Level) : '';
    const note1 = show.Note1 ? String(show.Note1) : '';
    const website = linkValue(show.Website);
    const exhibitorList = linkValue(show.Exhibitor_List_Link);
    const floorplanLink = linkValue(show.Floorplan_Link);
    const floorplanRaw = show.Floorplan;
    const floorplanFileUrl =
        linkValue(floorplanRaw) ||
        (typeof floorplanRaw === 'string' && floorplanRaw.trim() ? floorplanRaw : null);

    const logoUrl =
        typeof show.Event_logo === 'string' && show.Event_logo ? show.Event_logo : null;

    const idLabel = show.ID != null ? String(show.ID) : null;

    const handleFloorplanDownload = async (fileUrl: string) => {
        try {
            const config = getZohoConfig();
            let downloadUrl = fileUrl;
            if (fileUrl.startsWith('/api/v2/')) {
                downloadUrl = `https://creator.zoho.com${fileUrl}`;
            } else if (!fileUrl.startsWith('http')) {
                downloadUrl = `https://creator.zoho.com/api/v2/${config.ownerName}/${config.appLinkName}/report/Show_List/${show.ID}/Floorplan/download?filepath=${fileUrl}`;
            }
            let filename = 'floorplan.pdf';
            try {
                const urlObj = new URL(downloadUrl);
                const fp = urlObj.searchParams.get('filepath');
                if (fp) {
                    filename = fp.split('/').pop() || fp.split('\\').pop() || filename;
                }
            } catch {
                /* use default */
            }
            const response = await fetch('/api/zoho/proxy-v2', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url: downloadUrl,
                    method: 'GET',
                    headers: {},
                }),
            });
            if (!response.ok) {
                throw new Error(`Download failed: ${response.status}`);
            }
            const blob = await response.blob();
            const href = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = href;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(href);
            document.body.removeChild(a);
        } catch (e) {
            console.error(e);
            alert(`Download failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-3xl" title={null}>
            <div className="flex flex-col bg-white rounded-3xl overflow-hidden">
                {/* Minimal Header */}
                <div className="px-6 sm:px-10 pt-10 pb-8 border-b border-zinc-100">
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

                <div className="px-6 sm:px-10 py-8 space-y-10">
                    {/* Quick Links Section */}
                    {(exhibitorList || floorplanLink || floorplanFileUrl) && (
                        <div>
                            <h4 className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400 mb-4">
                                Quick links
                            </h4>
                            <div className="grid gap-3 sm:grid-cols-2">
                                {exhibitorList && (
                                    <a
                                        href={exhibitorList || undefined}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="group flex items-center justify-between p-4 rounded-2xl border border-zinc-100 hover:border-zinc-200 hover:bg-zinc-50 transition-colors"
                                    >
                                        <div className="flex items-center gap-4 min-w-0">
                                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white border border-zinc-100 text-zinc-600 shadow-sm">
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
                                        className="group flex items-center justify-between p-4 rounded-2xl border border-zinc-100 hover:border-zinc-200 hover:bg-zinc-50 transition-colors"
                                    >
                                        <div className="flex items-center gap-4 min-w-0">
                                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white border border-zinc-100 text-zinc-600 shadow-sm">
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
                                {floorplanFileUrl && (
                                    <button
                                        type="button"
                                        onClick={() => void handleFloorplanDownload(floorplanFileUrl)}
                                        className="group sm:col-span-2 flex items-center justify-between p-4 rounded-2xl border border-zinc-100 hover:border-zinc-200 hover:bg-zinc-50 transition-colors text-left"
                                    >
                                        <div className="flex items-center gap-4 min-w-0">
                                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white border border-zinc-100 text-zinc-600 shadow-sm">
                                                <FileText className="h-4 w-4 group-hover:text-zinc-900 transition-colors" />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="text-sm font-medium text-zinc-900">Floor plan file</div>
                                                <div className="text-xs text-zinc-500 truncate">Download PDF</div>
                                            </div>
                                        </div>
                                        <Download className="h-4 w-4 text-zinc-300 group-hover:text-zinc-500 transition-colors" />
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Details Section */}
                    <div>
                        <h4 className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400 mb-4">
                            Details
                        </h4>
                        <div className="border border-zinc-100 rounded-2xl overflow-hidden">
                            <div className="divide-y divide-zinc-50">
                                {industry && <Row label="Industry" value={industry} />}
                                {location && <Row label="Location" value={location} icon={<MapPin className="h-3.5 w-3.5 text-zinc-400" />} />}
                                {organiser && <Row label="Organiser" value={organiser} />}
                                {exhibitorCount && <Row label="Exhibitors" value={exhibitorCount} />}
                                {size && <Row label="Size" value={size} />}
                                {frequency && <Row label="Frequency" value={frequency} />}
                                {website && (
                                    <div className="flex flex-col gap-1 px-5 py-3 sm:flex-row sm:items-center sm:gap-6">
                                        <span className="w-32 shrink-0 text-xs text-zinc-500 font-medium">Website</span>
                                        <a
                                            href={website || undefined}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="group flex items-center gap-2 text-sm text-zinc-900 hover:text-orange-600 transition-colors min-w-0"
                                        >
                                            <Globe className="h-3.5 w-3.5 shrink-0 text-zinc-400 group-hover:text-orange-500 transition-colors" />
                                            <span className="truncate">{website}</span>
                                        </a>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Note Section */}
                    {note1 && (
                        <div className="rounded-2xl bg-zinc-50/50 p-6">
                            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-zinc-500 mb-3">
                                <Building2 className="h-3.5 w-3.5" />
                                Show Notes
                            </div>
                            <p className={`text-sm leading-relaxed text-zinc-700 ${noteOpen ? '' : 'line-clamp-4'}`}>
                                {note1}
                            </p>
                            {note1.length > 200 && (
                                <button
                                    type="button"
                                    onClick={() => setNoteOpen(!noteOpen)}
                                    className="mt-3 text-xs font-medium text-zinc-500 hover:text-zinc-900 transition-colors"
                                >
                                    {noteOpen ? 'Show less' : 'Read more'}
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
};

function Row({
    label,
    value,
    icon,
}: {
    label: string;
    value: string;
    icon?: React.ReactNode;
}) {
    return (
        <div className="flex flex-col gap-0.5 px-4 py-3 sm:flex-row sm:items-center sm:gap-4">
            <span className="w-32 shrink-0 text-[11px] font-bold uppercase tracking-wide text-zinc-500">
                {label}
            </span>
            <span className="inline-flex min-w-0 items-center gap-1.5 text-sm font-medium text-zinc-900">
                {icon}
                <span className="min-w-0 wrap-break-word">{value}</span>
            </span>
        </div>
    );
}

function LayoutTemplateIcon() {
    return (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <line x1="3" y1="9" x2="21" y2="9" />
            <line x1="9" y1="21" x2="9" y2="9" />
        </svg>
    );
}
