import React from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import {
    Calendar, ExternalLink, Globe, Hash, MapPin, Trash2, Edit2,
    Building2, Tag, RefreshCw, Users, Layers, X,
} from 'lucide-react';

interface ShowDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    data: any;
    onEdit: (item: any) => void;
    onDelete: (id: string) => void;
}

const getValue = (data: any, keys: string[]) => {
    for (const key of keys) {
        const value = data?.[key];
        if (value !== undefined && value !== null && value !== '') return value;
    }
    return '';
};

const InfoBlock = ({
    label,
    value,
    icon,
    fullWidth = false,
}: {
    label: string;
    value: string;
    icon?: React.ReactNode;
    fullWidth?: boolean;
}) => (
    <div
        className={`flex flex-col gap-1.5 rounded-2xl border border-zinc-100 bg-zinc-50/80 p-4 transition-colors hover:border-orange-100 hover:bg-orange-50/40 ${fullWidth ? 'md:col-span-2' : ''}`}
    >
        <dt className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-zinc-400">
            {icon}
            {label}
        </dt>
        <dd className="text-sm font-medium leading-relaxed text-zinc-800">{value}</dd>
    </div>
);

const initialsFromName = (name: string) => {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export const ShowDetailsModal: React.FC<ShowDetailsModalProps> = ({ isOpen, onClose, data, onEdit, onDelete }) => {
    if (!data) return null;

    const id = String(getValue(data, ['id', 'ID']));
    const eventName = getValue(data, ['event_name', 'Event_Name', 'event', 'Event', 'name', 'Name']);
    const eventType = getValue(data, ['event_type', 'Event_Type', 'type', 'Type']);
    const startingDate = getValue(data, ['starting_date', 'Starting_Date', 'date', 'Date']);
    const industry = getValue(data, ['industry', 'Industry']);
    const level = getValue(data, ['level', 'Level']);
    const worldArea = getValue(data, ['world_area', 'World_Area']);
    const country = getValue(data, ['country', 'Country']);
    const city = getValue(data, ['city', 'City']);
    const frequency = getValue(data, ['frequency', 'Frequency']);
    const organiser = getValue(data, ['organiser', 'Organiser']);
    const tags = getValue(data, ['tags', 'Tags']);
    const note = getValue(data, ['note', 'Note', 'Note1']);
    const exhibitorList = getValue(data, ['exhibitor_list', 'Exhibitor_List', 'Last_edition_n_Exhibitors']);
    const exhibitorListLink = getValue(data, ['exhibitor_list_link', 'Exhibitor_List_Link']);
    const floorplanLink = getValue(data, ['floorplan_link', 'Floorplan_Link']);

    const location = [city, country, worldArea].filter(Boolean).join(', ');
    const initials = initialsFromName(String(eventName || '?'));

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '';
        const parsed = new Date(dateStr);
        if (Number.isNaN(parsed.getTime())) return dateStr;
        return parsed.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    };

    const hasDetails = !!(industry || level || organiser || exhibitorList || tags);
    const hasLinks = !!(exhibitorListLink || floorplanLink);

    return (
        <Modal isOpen={isOpen} onClose={onClose} hideHeader maxWidth="max-w-2xl">
            {/* ── Hero ── */}
            <div className="relative overflow-hidden bg-gradient-to-br from-zinc-900 via-zinc-800 to-orange-950">
                {/* Ambient glows */}
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_65%_65%_at_85%_10%,rgba(251,146,60,0.45),transparent)]" />
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_40%_40%_at_5%_90%,rgba(251,146,60,0.18),transparent)]" />
                {/* Subtle grid */}
                <div className="pointer-events-none absolute inset-0 opacity-[0.04]"
                    style={{ backgroundImage: 'repeating-linear-gradient(0deg,#fff 0px,#fff 1px,transparent 1px,transparent 40px),repeating-linear-gradient(90deg,#fff 0px,#fff 1px,transparent 1px,transparent 40px)' }}
                />

                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/60 backdrop-blur-sm transition-all hover:bg-white/20 hover:text-white"
                    aria-label="Close"
                >
                    <X className="h-4 w-4" />
                </button>

                <div className="relative px-6 pb-7 pt-6">
                    <div className="flex items-start gap-4">
                        {/* Avatar */}
                        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white text-xl font-bold tracking-tight text-zinc-900 shadow-2xl ring-2 ring-white/20">
                            {initials}
                        </div>

                        <div className="min-w-0 flex-1 pt-0.5">
                            <div className="mb-2 flex flex-wrap items-center gap-2">
                                {id && (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-white/50 ring-1 ring-white/10">
                                        <Hash className="h-2.5 w-2.5" />
                                        {id}
                                    </span>
                                )}
                                {eventType && (
                                    <span className="inline-flex items-center rounded-full bg-orange-500/25 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-orange-200 ring-1 ring-orange-400/25">
                                        {eventType}
                                    </span>
                                )}
                            </div>
                            <h2 className="text-2xl font-bold leading-tight tracking-tight text-white drop-shadow-sm">
                                {String(eventName) || 'Untitled Show'}
                            </h2>
                        </div>
                    </div>

                    {/* Quick-stat strip */}
                    {(startingDate || location || frequency) && (
                        <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-white/10 pt-4">
                            {startingDate && (
                                <div className="flex items-center gap-2 text-sm">
                                    <Calendar className="h-3.5 w-3.5 shrink-0 text-orange-400" />
                                    <span className="font-medium text-white/85">{formatDate(String(startingDate))}</span>
                                </div>
                            )}
                            {location && (
                                <div className="flex items-center gap-2 text-sm">
                                    <MapPin className="h-3.5 w-3.5 shrink-0 text-orange-400" />
                                    <span className="font-medium text-white/85">{location}</span>
                                </div>
                            )}
                            {frequency && (
                                <div className="flex items-center gap-2 text-sm">
                                    <RefreshCw className="h-3.5 w-3.5 shrink-0 text-orange-400" />
                                    <span className="font-medium text-white/85">{String(frequency)}</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Body ── */}
            <div className="space-y-5 p-6">

                {/* Details grid */}
                {hasDetails && (
                    <dl className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        {industry && (
                            <InfoBlock label="Industry" value={String(industry)} icon={<Building2 className="h-2.5 w-2.5" />} />
                        )}
                        {level && (
                            <InfoBlock label="Level" value={String(level)} icon={<Layers className="h-2.5 w-2.5" />} />
                        )}
                        {exhibitorList && (
                            <InfoBlock label="Exhibitors" value={String(exhibitorList)} icon={<Users className="h-2.5 w-2.5" />} />
                        )}
                        {organiser && (
                            <InfoBlock label="Organiser" value={String(organiser)} fullWidth />
                        )}
                        {tags && (
                            <InfoBlock label="Tags" value={String(tags)} icon={<Tag className="h-2.5 w-2.5" />} fullWidth />
                        )}
                    </dl>
                )}

                {/* Links */}
                {hasLinks && (
                    <div className="space-y-2.5">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Links</p>
                        <div className="space-y-2">
                            {exhibitorListLink && (
                                <a
                                    href={String(exhibitorListLink)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-between rounded-xl border border-orange-100 bg-gradient-to-r from-orange-50 to-amber-50/50 px-4 py-3 text-sm font-semibold text-orange-700 transition-all hover:border-orange-200 hover:shadow-sm"
                                >
                                    <span className="flex items-center gap-2.5">
                                        <Globe className="h-4 w-4 shrink-0" />
                                        Exhibitor List
                                    </span>
                                    <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-60" />
                                </a>
                            )}
                            {floorplanLink && (
                                <a
                                    href={String(floorplanLink)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-between rounded-xl border border-orange-100 bg-gradient-to-r from-orange-50 to-amber-50/50 px-4 py-3 text-sm font-semibold text-orange-700 transition-all hover:border-orange-200 hover:shadow-sm"
                                >
                                    <span className="flex items-center gap-2.5">
                                        <Globe className="h-4 w-4 shrink-0" />
                                        Floorplan
                                    </span>
                                    <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-60" />
                                </a>
                            )}
                        </div>
                    </div>
                )}

                {/* Note */}
                {note && (
                    <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-4">
                        <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-amber-600/70">Note</p>
                        <p className="text-sm leading-relaxed text-zinc-700">{String(note)}</p>
                    </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 border-t border-zinc-100 pt-5">
                    <Button
                        onClick={() => onEdit(data)}
                        variant="secondary"
                        className="flex-1 h-11 rounded-xl border-zinc-200 font-semibold text-zinc-700 hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700"
                        leftIcon={<Edit2 className="h-4 w-4" />}
                    >
                        Edit Record
                    </Button>
                    <Button
                        onClick={() => {
                            if (confirm('Are you sure you want to delete this record?')) {
                                onDelete(id);
                                onClose();
                            }
                        }}
                        className="h-11 rounded-xl border border-red-100 bg-red-50 px-5 font-semibold text-red-600 hover:bg-red-100 hover:text-red-700"
                        leftIcon={<Trash2 className="h-4 w-4" />}
                    >
                        Delete
                    </Button>
                </div>
            </div>
        </Modal>
    );
};
