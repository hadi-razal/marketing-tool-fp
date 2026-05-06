'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import {
    ArrowLeft,
    Calendar,
    MapPin,
    Globe2,
    Layers,
    RefreshCw,
    Building2,
    Users,
    Tag,
    Globe,
    ExternalLink,
    Edit2,
    Trash2,
    LayoutGrid,
    Camera,
    FileText,
    Plus,
    Search,
    UserCircle2,
    ChevronUp,
    ChevronDown,
    ArrowUpDown,
    Download,
    Link2,
} from 'lucide-react';
import { toast } from 'sonner';
import { ShowFormModal } from '@/components/Zoho/ShowFormModal';

/* ─── helpers ─────────────────────────────────────────────── */

const getValue = (data: any, keys: string[]) => {
    for (const key of keys) {
        const v = data?.[key];
        if (v !== undefined && v !== null && v !== '') return v;
    }
    return '';
};

const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const parsed = new Date(dateStr);
    if (Number.isNaN(parsed.getTime())) return dateStr;
    return parsed.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
};

const initialsFromName = (name: string) => {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

/* ─── tabs ────────────────────────────────────────────────── */

type Tab = 'overview' | 'contacts' | 'exhibitors' | 'floorplans' | 'comments';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <LayoutGrid className="h-4 w-4" /> },
    { id: 'contacts', label: 'Contacts', icon: <Users className="h-4 w-4" /> },
    { id: 'exhibitors', label: 'Exhibitors', icon: <Building2 className="h-4 w-4" /> },
    { id: 'floorplans', label: 'Floorplans', icon: <Globe className="h-4 w-4" /> },
    { id: 'comments', label: 'Comments', icon: <FileText className="h-4 w-4" /> },
];

/* ─── info row ────────────────────────────────────────────── */

const InfoRow = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
    <div className="flex items-start gap-3 py-3">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-zinc-100 text-zinc-500">
            {icon}
        </div>
        <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">{label}</p>
            <p className="mt-0.5 text-sm font-semibold text-zinc-800 break-words">{value}</p>
        </div>
    </div>
);

/* ─── empty state ─────────────────────────────────────────── */

const EmptyState = ({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) => (
    <div className="flex flex-col items-center justify-center gap-3 py-16 px-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-zinc-100">
            {icon}
        </div>
        <p className="text-sm font-semibold text-zinc-700">{title}</p>
        <p className="max-w-xs text-center text-xs text-zinc-400">{description}</p>
    </div>
);

/* ─── page ────────────────────────────────────────────────── */

export default function ShowDetailPage() {
    const params = useParams();
    const router = useRouter();
    const supabase = useMemo(() => createClient(), []);

    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<Tab>('overview');
    const [exSearch, setExSearch] = useState('');
    const [exSort, setExSort] = useState<{ key: string; dir: 'asc' | 'desc' }>({ key: '', dir: 'asc' });

    const showId = params?.id as string;

    useEffect(() => {
        if (!showId) {
            setNotFound(true);
            setLoading(false);
            return;
        }
        const fetchShow = async () => {
            setLoading(true);
            try {
                const { data: rows, error } = await supabase
                    .from('shows')
                    .select('*')
                    .eq('id', showId)
                    .limit(1);
                if (error || !rows || rows.length === 0) {
                    setNotFound(true);
                } else {
                    setData(rows[0]);
                }
            } catch {
                setNotFound(true);
            } finally {
                setLoading(false);
            }
        };
        fetchShow();
    }, [showId, supabase]);

    const handleDelete = async () => {
        if (!confirm('Delete this show permanently?')) return;
        const { error } = await supabase.from('shows').delete().eq('id', showId);
        if (error) {
            toast.error(error.message);
        } else {
            toast.success('Show deleted');
            router.push('/shows');
        }
    };

    const handleEditSuccess = async () => {
        setIsEditOpen(false);
        const { data: rows } = await supabase.from('shows').select('*').eq('id', showId).limit(1);
        if (rows && rows.length > 0) setData(rows[0]);
    };

    /* ── loading ── */
    if (loading) {
        return (
            <div className="min-h-full bg-white p-6 sm:p-10">
                <Skeleton className="mb-6 h-10 w-48 rounded-md" />
                <Skeleton className="mb-2 h-8 w-96 rounded-md" />
                <Skeleton className="mb-8 h-4 w-64 rounded-md" />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <Skeleton key={i} className="h-20 rounded-md" />
                    ))}
                </div>
            </div>
        );
    }

    /* ── not found ── */
    if (notFound) {
        return (
            <div className="flex h-full flex-col items-center justify-center gap-4 bg-white text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-zinc-100">
                    <Calendar className="h-7 w-7 text-zinc-400" />
                </div>
                <div>
                    <p className="text-lg font-semibold text-zinc-900">Show not found</p>
                    <p className="mt-1 text-sm text-zinc-500">This show may have been deleted or the ID is invalid.</p>
                </div>
                <Button onClick={() => router.push('/shows')} variant="primary" size="sm" leftIcon={<ArrowLeft className="h-4 w-4" />}>
                    Back to Shows
                </Button>
            </div>
        );
    }

    /* ── data ── */
    const eventName = String(getValue(data, ['name', 'event_name', 'Event_Name', 'event', 'Event', 'Name']) || 'Untitled Show');
    const eventType = String(getValue(data, ['event_type', 'Event_Type', 'type', 'Type']) || '');
    const startingDate = String(getValue(data, ['starting_date', 'Starting_Date', 'date', 'Date']) || '');
    const industry = String(getValue(data, ['industry', 'Industry']) || '');
    const level = String(getValue(data, ['level', 'Level']) || '');
    const worldArea = String(getValue(data, ['world_area', 'World_Area']) || '');
    const country = String(getValue(data, ['country', 'Country']) || '');
    const city = String(getValue(data, ['city', 'City']) || '');
    const frequency = String(getValue(data, ['frequency', 'Frequency']) || '');
    const organiser = String(getValue(data, ['organiser', 'Organiser']) || '');
    const tags = String(getValue(data, ['tags', 'Tags']) || '');
    const note = String(getValue(data, ['note', 'Note', 'Note1']) || '');
    const exhibitorList = String(getValue(data, ['exhibitor_list', 'Exhibitor_List', 'Last_edition_n_Exhibitors']) || '');
    const exhibitorListLink = String(getValue(data, ['exhibitor_list_link', 'Exhibitor_List_Link']) || '');
    const floorplanLink = String(getValue(data, ['floorplan_link', 'Floorplan_Link']) || '');

    const location = [city, country].filter(Boolean).join(', ');
    const initials = initialsFromName(eventName);
    const isIbc = eventName.toLowerCase().includes('ibc');
    const ibcLogoImage = 'https://cdn.prod.website-files.com/686e72da8be0fd92280388b7/6970abf7af4eaf76f110b30a_689ca814a9cbd6ff03649c1a_Newsroom_events_template_IBC.webp';
    const ibcCoverImage = 'https://cdn.prod.website-files.com/6641aa6384a3010ab6b735d7/679b179403837ff93b623af0_IBC2024-0915-Alex-105928-1-.webp';

    const detailRows = [
        startingDate && { label: 'Date', value: formatDate(startingDate), icon: <Calendar className="h-4 w-4" /> },
        location && { label: 'Location', value: location, icon: <MapPin className="h-4 w-4" /> },
        industry && { label: 'Industry', value: industry, icon: <Building2 className="h-4 w-4" /> },
        level && { label: 'Level', value: level, icon: <Layers className="h-4 w-4" /> },
        frequency && { label: 'Frequency', value: frequency, icon: <RefreshCw className="h-4 w-4" /> },
        worldArea && { label: 'World Area', value: worldArea, icon: <Globe2 className="h-4 w-4" /> },
        exhibitorList && { label: 'Exhibitors', value: exhibitorList, icon: <Users className="h-4 w-4" /> },
        organiser && { label: 'Organiser', value: organiser, icon: <Building2 className="h-4 w-4" /> },
        tags && { label: 'Tags', value: tags, icon: <Tag className="h-4 w-4" /> },
    ].filter(Boolean) as { label: string; value: string; icon: React.ReactNode }[];

    const demoGalleryImages = Array.from({ length: 10 }, (_, i) => ({
        id: i + 1,
        src: `https://picsum.photos/seed/exhibition-${i + 1}/1200/800`,
    }));

    const demoComments = [
        { author: 'Sara M.', time: '2h ago', text: 'Traffic around Hall 4 peaked after 2 PM. We should keep two people at the demo station at all times.' },
        { author: 'Dan K.', time: 'Yesterday', text: 'Strong interest from media-tech buyers. Follow up with three leads from Germany and one from UAE.' },
        { author: 'Nora A.', time: 'Yesterday', text: 'Booth visuals worked well, but brochure stock ran low by late afternoon.' },
        { author: 'Ali R.', time: '3 days ago', text: 'Competitors nearby had larger screens. Consider adding one center display next edition.' },
    ];

    const demoContacts = [
        { name: 'Emma Thompson', role: 'Event Director', company: 'IBC', email: 'emma.thompson@ibc.org', phone: '+31 20 555 0142' },
        { name: 'Liam Carter', role: 'Sponsorship Lead', company: 'IBC', email: 'liam.carter@ibc.org', phone: '+31 20 555 0178' },
        { name: 'Sofia Mendes', role: 'Operations Manager', company: 'RAI Amsterdam', email: 'sofia.mendes@rai.nl', phone: '+31 20 555 0113' },
        { name: 'Noah Becker', role: 'Exhibitor Support', company: 'IBC', email: 'noah.becker@ibc.org', phone: '+31 20 555 0190' },
        { name: 'Ava Rahman', role: 'Partnership Manager', company: 'MediaConnect', email: 'ava.rahman@mediaconnect.io', phone: '+44 20 7123 4421' },
    ];

    return (
        <>
            <ShowFormModal
                key={data?.id}
                isOpen={isEditOpen}
                onClose={() => setIsEditOpen(false)}
                onSuccess={handleEditSuccess}
                initialData={data}
            />

            <div className="-m-4 h-[calc(100%+2rem)] lg:-m-6 lg:h-[calc(100%+3rem)] flex flex-col bg-white">

                {/* ── Compact Header Banner ── */}
                <div
                    className="shrink-0 bg-zinc-900 bg-cover bg-center"
                    style={isIbc ? { backgroundImage: `linear-gradient(135deg, rgba(24,24,27,0.7), rgba(24,24,27,0.65)), url(${ibcCoverImage})` } : undefined}
                >
                    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
                        {/* Top bar */}
                        <div className="flex items-center justify-between py-4">
                            <button
                                onClick={() => router.push('/shows')}
                                className="group flex items-center gap-2 text-sm font-medium text-zinc-400 transition-colors hover:text-white"
                            >
                                <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
                                Shows
                            </button>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setIsEditOpen(true)}
                                    className="flex h-8 items-center gap-1.5 rounded-md bg-white/10 px-3 text-xs font-semibold text-zinc-300 transition-colors hover:bg-white/20 hover:text-white"
                                >
                                    <Edit2 className="h-3.5 w-3.5" />
                                    Edit
                                </button>
                                <button
                                    onClick={handleDelete}
                                    className="flex h-8 items-center gap-1.5 rounded-md bg-red-500/20 px-3 text-xs font-semibold text-red-400 transition-colors hover:bg-red-500/30 hover:text-red-300"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    Delete
                                </button>
                            </div>
                        </div>

                        {/* Show identity */}
                        <div className="flex items-center gap-4 pb-6 sm:gap-5 sm:pb-8">
                            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-orange-400 to-orange-600 text-lg font-bold text-white sm:h-16 sm:w-16 sm:text-xl">
                                {isIbc ? (
                                    <img
                                        src={ibcLogoImage}
                                        alt="IBC logo"
                                        className="h-full w-full object-cover"
                                        loading="lazy"
                                    />
                                ) : (
                                    initials
                                )}
                            </div>
                            <div className="min-w-0">
                                {eventType && (
                                    <span className="mb-1 inline-block rounded bg-orange-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-orange-300">
                                        {eventType}
                                    </span>
                                )}
                                <h1 className="truncate text-xl font-bold text-white sm:text-2xl">
                                    {eventName}
                                </h1>
                                <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-zinc-400">
                                    {location && (
                                        <span className="flex items-center gap-1">
                                            <MapPin className="h-3 w-3" />
                                            {location}
                                        </span>
                                    )}
                                    {startingDate && (
                                        <span className="flex items-center gap-1">
                                            <Calendar className="h-3 w-3" />
                                            {formatDate(startingDate)}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Tab Navigation ── */}
                <div className="shrink-0 border-b border-zinc-200 bg-white">
                    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
                            {TABS.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`relative flex shrink-0 items-center gap-1.5 px-4 py-3 text-sm font-medium transition-colors ${activeTab === tab.id
                                            ? 'text-zinc-900'
                                            : 'text-zinc-400 hover:text-zinc-600'
                                        }`}
                                >
                                    {tab.icon}
                                    {tab.label}
                                    {activeTab === tab.id && (
                                        <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-orange-500" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ── Content ── */}
                <div className="flex-1 overflow-y-auto flex flex-col">

                    {activeTab !== 'exhibitors' && activeTab !== 'floorplans' && (
                        <div className="w-full py-6 sm:py-8 flex flex-col">
                            <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">

                                {/* Overview Tab */}
                                {activeTab === 'overview' && (
                                    <div className="space-y-6">
                                        <div className="rounded-lg border border-zinc-200 bg-white">
                                            <div className="border-b border-zinc-100 px-5 py-3">
                                                <h2 className="text-sm font-semibold text-zinc-900">Show Details</h2>
                                            </div>
                                            <div className="grid grid-cols-1 divide-y divide-zinc-100 sm:grid-cols-2 sm:divide-y-0">
                                                {detailRows.length > 0 ? (
                                                    detailRows.map((row, i) => (
                                                        <div key={row.label} className={`px-5 ${i >= 2 ? 'border-t border-zinc-100' : ''}`}>
                                                            <InfoRow icon={row.icon} label={row.label} value={row.value} />
                                                        </div>
                                                    ))
                                                ) : (
                                                    <p className="col-span-2 py-8 text-center text-sm text-zinc-400">No details available.</p>
                                                )}
                                            </div>
                                            <div className="border-t border-zinc-100 px-5 py-4">
                                                <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">Show note</p>
                                                <p className="mt-1 text-sm leading-relaxed text-zinc-600">
                                                    Strong interest from broadcast technology buyers in the 2026 edition; consider increasing demo capacity and booking more
                                                    meeting slots for key accounts on days 2 and 3.
                                                </p>
                                            </div>
                                        </div>

                                        {/* Notes preview */}
                                        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm shadow-zinc-950/5">
                                            <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-3.5">
                                                <h2 className="text-sm font-semibold text-zinc-900">Comments</h2>
                                                <span className="text-xs font-medium text-zinc-400">{demoComments.length} recent</span>
                                            </div>
                                            <div className="divide-y divide-zinc-100">
                                                {demoComments.slice(0, 3).map((comment, idx) => (
                                                    <div key={`${comment.author}-ov-${idx}`} className="px-5 py-4">
                                                        <div className="mb-1.5 flex items-center justify-between gap-3">
                                                            <p className="text-sm font-semibold text-zinc-900">{comment.author}</p>
                                                            <p className="text-xs text-zinc-400">{comment.time}</p>
                                                        </div>
                                                        <p className="text-sm leading-relaxed text-zinc-600">{comment.text}</p>
                                                    </div>
                                                ))}
                                            </div>
                                            {note ? (
                                                <div className="border-t border-zinc-100 bg-zinc-50/60 px-5 py-4">
                                                    <p className="text-xs font-bold uppercase tracking-wider text-orange-700">Imported note</p>
                                                    <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-zinc-700">{note}</p>
                                                </div>
                                            ) : (
                                                <div className="border-t border-zinc-100 bg-zinc-50/60 px-5 py-4">
                                                    <p className="text-sm text-zinc-500">No imported note available yet.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Contacts Tab */}
                                {activeTab === 'contacts' && (
                                    <div className="flex flex-1 min-h-0 flex-col gap-5">
                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                            <h2 className="text-lg font-semibold text-zinc-900">Contacts</h2>
                                            <Button size="sm" variant="primary" leftIcon={<Plus className="h-4 w-4" />} onClick={() => toast.info('Coming soon')}>
                                                Add Contact
                                            </Button>
                                        </div>
                                        <div className="min-h-0 flex-1 overflow-y-auto rounded-2xl border border-zinc-200 bg-white shadow-sm shadow-zinc-950/5">
                                            <div className="border-b border-zinc-100 px-5 py-3.5">
                                                <p className="text-sm font-semibold text-zinc-900">{demoContacts.length} contacts</p>
                                            </div>
                                            <div className="divide-y divide-zinc-100">
                                                {demoContacts.map((contact) => (
                                                    <div key={contact.email} className="px-5 py-4">
                                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                                            <div>
                                                                <p className="text-sm font-semibold text-zinc-900">{contact.name}</p>
                                                                <p className="mt-0.5 text-xs text-zinc-500">{contact.role} · {contact.company}</p>
                                                            </div>
                                                            <div className="text-sm text-zinc-600">
                                                                <p>{contact.email}</p>
                                                                <p className="text-xs text-zinc-500">{contact.phone}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}





                                {/* Comments Tab */}
                                {activeTab === 'comments' && (
                                    <div className="flex flex-1 flex-col gap-5">
                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                            <div>
                                                <h2 className="text-lg font-semibold text-zinc-900">Comments</h2>
                                                <p className="mt-1 text-sm text-zinc-500">Keep team comments and follow-ups in one stream.</p>
                                            </div>
                                            <Button size="sm" variant="primary" leftIcon={<Plus className="h-4 w-4" />} onClick={() => toast.info('Coming soon')}>
                                                Add Comment
                                            </Button>
                                        </div>

                                        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                                            <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm shadow-zinc-950/5">
                                                <div className="border-b border-zinc-100 px-5 py-3.5">
                                                    <p className="text-sm font-semibold text-zinc-900">Team comments</p>
                                                </div>
                                                <div className="divide-y divide-zinc-100">
                                                    {demoComments.map((comment, idx) => (
                                                        <div key={`${comment.author}-${idx}`} className="px-5 py-4">
                                                            <div className="mb-1.5 flex items-center justify-between gap-3">
                                                                <p className="text-sm font-semibold text-zinc-900">{comment.author}</p>
                                                                <p className="text-xs text-zinc-400">{comment.time}</p>
                                                            </div>
                                                            <p className="text-sm leading-relaxed text-zinc-600">{comment.text}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="flex flex-col gap-4">
                                                <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm shadow-zinc-950/5">
                                                    <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">Comment stats</p>
                                                    <p className="mt-2 text-sm font-medium text-zinc-700">{demoComments.length} recent comments</p>
                                                </div>
                                                {note && (
                                                    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm shadow-zinc-950/5">
                                                        <div className="border-b border-zinc-100 bg-zinc-50/70 px-4 py-3">
                                                            <p className="text-xs font-bold uppercase tracking-wider text-orange-700">Imported note</p>
                                                        </div>
                                                        <div className="px-4 py-3.5">
                                                            <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-700">{note}</p>
                                                        </div>
                                                    </div>
                                                )}
                                                <button
                                                    onClick={() => toast.info('Coming soon')}
                                                    className="group flex min-h-[140px] flex-1 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-zinc-200 bg-white p-6 text-center transition-colors hover:border-orange-300 hover:bg-orange-50/30"
                                                >
                                                    <div className="mb-3 rounded-full bg-zinc-100 p-3 text-zinc-400 transition-colors group-hover:bg-orange-100 group-hover:text-orange-600">
                                                        <Plus className="h-5 w-5" />
                                                    </div>
                                                    <p className="text-sm font-semibold text-zinc-700">Add another comment</p>
                                                    <p className="mt-1 text-xs text-zinc-400">Save meeting updates, blockers, and decisions.</p>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                            </div>
                        </div>
                    )}

                    {/* Floorplans Tab */}
                    {activeTab === 'floorplans' && (
                        <div className="w-full py-6 sm:py-8 flex flex-col">
                            <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
                                <div className="flex flex-col gap-3 pb-5 sm:flex-row sm:items-center sm:justify-between">
                                    <div>
                                        <h2 className="text-lg font-semibold text-zinc-900">Floorplans & Maps</h2>
                                        <p className="mt-1 text-sm text-zinc-500">Upload PDFs, image files, or save external map links.</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            leftIcon={<LayoutGrid className="h-4 w-4" />}
                                            onClick={() => toast.info('Upload floorplan (coming soon)')}
                                        >
                                            Upload floorplan
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="primary"
                                            leftIcon={<Plus className="h-4 w-4" />}
                                            onClick={() => toast.info('Add map link (coming soon)')}
                                        >
                                            Add map link
                                        </Button>
                                    </div>
                                </div>
                                <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm shadow-zinc-950/5">
                                    {(() => {
                                        const demoFloorplans = [
                                            { id: 1, name: `${eventName} — Hall Layout`, year: '2025', type: 'pdf' as const, source: 'Uploaded' },
                                            { id: 2, name: `${eventName} — Full Venue Map`, year: '2025', type: 'link' as const, source: 'Google Maps' },
                                            { id: 3, name: `${eventName} — Booth Overview`, year: '2024', type: 'pdf' as const, source: 'Uploaded' },
                                            { id: 4, name: `${eventName} — Entrance Layout`, year: '2024', type: 'image' as const, source: 'Uploaded' },
                                            { id: 5, name: `${eventName} — Parking & Access`, year: '2023', type: 'link' as const, source: 'Custom URL' },
                                            { id: 6, name: `${eventName} — Exhibition Halls A-D`, year: '2023', type: 'pdf' as const, source: 'Uploaded' },
                                        ];

                                        const typeBadge = (type: 'pdf' | 'link' | 'image') => {
                                            const styles = {
                                                pdf: 'bg-red-50 text-red-600 border-red-100',
                                                link: 'bg-blue-50 text-blue-600 border-blue-100',
                                                image: 'bg-emerald-50 text-emerald-600 border-emerald-100',
                                            };
                                            const icons = {
                                                pdf: <FileText className="h-3.5 w-3.5" />,
                                                link: <Link2 className="h-3.5 w-3.5" />,
                                                image: <Camera className="h-3.5 w-3.5" />,
                                            };
                                            return (
                                                <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${styles[type]}`}>
                                                    {icons[type]}
                                                    {type}
                                                </span>
                                            );
                                        };

                                        return (
                                            <div className="divide-y divide-zinc-100">
                                                {demoFloorplans.map((fp) => (
                                                    <div
                                                        key={fp.id}
                                                        className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-zinc-50/80"
                                                    >
                                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-500">
                                                            {fp.type === 'pdf' ? <FileText className="h-4 w-4" /> : fp.type === 'link' ? <Globe className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <p className="truncate text-sm font-medium text-zinc-900">{fp.name}</p>
                                                            <p className="mt-0.5 text-xs text-zinc-400">{fp.source} · {fp.year}</p>
                                                        </div>
                                                        <div className="hidden sm:block">
                                                            {typeBadge(fp.type)}
                                                        </div>
                                                        <div className="flex items-center gap-1.5">
                                                            {fp.type === 'link' ? (
                                                                <button
                                                                    onClick={() => toast.info('Open link (coming soon)')}
                                                                    className="flex h-8 items-center gap-1.5 rounded-md bg-zinc-100 px-2.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-200 hover:text-zinc-800"
                                                                >
                                                                    <ExternalLink className="h-3.5 w-3.5" />
                                                                    Open
                                                                </button>
                                                            ) : (
                                                                <button
                                                                    onClick={() => toast.info('Download (coming soon)')}
                                                                    className="flex h-8 items-center gap-1.5 rounded-md bg-zinc-100 px-2.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-200 hover:text-zinc-800"
                                                                >
                                                                    <Download className="h-3.5 w-3.5" />
                                                                    Download
                                                                </button>
                                                            )}
                                                            <button
                                                                onClick={() => toast.info('Delete floorplan (coming soon)')}
                                                                className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-500"
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Exhibitors Tab — full width */}
                    {activeTab === 'exhibitors' && (
                        <div className="w-full py-6 sm:py-8 flex flex-col min-h-full">
                            <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
                                <div className="flex flex-col gap-3 pb-5 sm:flex-row sm:items-center sm:justify-between">
                                    <h2 className="text-lg font-semibold text-zinc-900">Exhibitors</h2>
                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                                        <div className="flex items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 py-1.5 sm:w-56">
                                            <Search className="h-4 w-4 text-zinc-400" />
                                            <input
                                                type="text"
                                                placeholder="Search exhibitors..."
                                                className="w-full bg-transparent text-sm outline-none"
                                                value={exSearch}
                                                onChange={(e) => setExSearch(e.target.value)}
                                            />
                                        </div>
                                        <Button size="sm" variant="primary" leftIcon={<Plus className="h-4 w-4" />} onClick={() => toast.info('Coming soon')}>
                                            Add Exhibitor
                                        </Button>
                                    </div>
                                </div>
                                <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm shadow-zinc-950/5">
                                    {(() => {
                                        const demoExhibitors = [
                                            { company: 'Sony Professional', year: '2025', booth: 'A-101', size: '120 sqm' },
                                            { company: 'Samsung Display', year: '2025', booth: 'A-102', size: '200 sqm' },
                                            { company: 'Panasonic Connect', year: '2025', booth: 'A-205', size: '80 sqm' },
                                            { company: 'Blackmagic Design', year: '2025', booth: 'B-301', size: '150 sqm' },
                                            { company: 'Grass Valley', year: '2024', booth: 'B-312', size: '90 sqm' },
                                            { company: 'Avid Technology', year: '2025', booth: 'C-110', size: '180 sqm' },
                                            { company: 'Ross Video', year: '2024', booth: 'C-115', size: '60 sqm' },
                                            { company: 'Vizrt Group', year: '2025', booth: 'C-220', size: '140 sqm' },
                                            { company: 'EVS Broadcast', year: '2025', booth: 'D-105', size: '100 sqm' },
                                            { company: 'Haivision', year: '2024', booth: 'D-210', size: '45 sqm' },
                                            { company: 'Harmonic Inc.', year: '2025', booth: 'D-305', size: '110 sqm' },
                                            { company: 'Lawo AG', year: '2025', booth: 'E-101', size: '70 sqm' },
                                            { company: 'Calrec Audio', year: '2024', booth: 'E-112', size: '55 sqm' },
                                            { company: 'Shure Inc.', year: '2025', booth: 'E-200', size: '85 sqm' },
                                            { company: 'Sennheiser', year: '2025', booth: 'E-215', size: '95 sqm' },
                                            { company: 'Arri AG', year: '2025', booth: 'F-101', size: '250 sqm' },
                                            { company: 'Canon Professional', year: '2025', booth: 'F-110', size: '200 sqm' },
                                            { company: 'Fujinon (Fujifilm)', year: '2024', booth: 'F-205', size: '75 sqm' },
                                            { company: 'RED Digital Cinema', year: '2025', booth: 'F-301', size: '130 sqm' },
                                            { company: 'Atomos', year: '2024', booth: 'G-102', size: '40 sqm' },
                                            { company: 'AJA Video Systems', year: '2025', booth: 'G-108', size: '50 sqm' },
                                            { company: 'Telestream', year: '2025', booth: 'G-210', size: '65 sqm' },
                                            { company: 'Imagine Comms.', year: '2024', booth: 'G-305', size: '90 sqm' },
                                            { company: 'Dalet', year: '2025', booth: 'H-101', size: '80 sqm' },
                                            { company: 'Rohde & Schwarz', year: '2025', booth: 'H-115', size: '160 sqm' },
                                            { company: 'Tektronix', year: '2024', booth: 'H-220', size: '55 sqm' },
                                            { company: 'Riedel Communications', year: '2025', booth: 'H-310', size: '120 sqm' },
                                            { company: 'Clear-Com', year: '2024', booth: 'I-105', size: '45 sqm' },
                                            { company: 'Dolby Laboratories', year: '2025', booth: 'I-201', size: '180 sqm' },
                                            { company: 'Akamai Technologies', year: '2025', booth: 'I-305', size: '100 sqm' },
                                            { company: 'Brightcove', year: '2024', booth: 'J-102', size: '60 sqm' },
                                            { company: 'Wowza Media', year: '2025', booth: 'J-108', size: '35 sqm' },
                                            { company: 'Limelight Networks', year: '2024', booth: 'J-210', size: '50 sqm' },
                                            { company: 'Appear TV', year: '2025', booth: 'J-305', size: '70 sqm' },
                                            { company: 'NewTek (Vizrt)', year: '2025', booth: 'K-101', size: '90 sqm' },
                                            { company: 'Matrox Video', year: '2024', booth: 'K-115', size: '40 sqm' },
                                            { company: 'Deltacast', year: '2025', booth: 'K-210', size: '30 sqm' },
                                            { company: 'Cinegy GmbH', year: '2025', booth: 'K-302', size: '55 sqm' },
                                            { company: 'EditShare', year: '2024', booth: 'L-105', size: '65 sqm' },
                                            { company: 'Object Matrix', year: '2025', booth: 'L-112', size: '25 sqm' },
                                            { company: 'Tedial', year: '2024', booth: 'L-205', size: '45 sqm' },
                                            { company: 'Marquis Broadcast', year: '2025', booth: 'L-301', size: '35 sqm' },
                                            { company: 'Apantac', year: '2025', booth: 'M-101', size: '50 sqm' },
                                            { company: 'Phabrix', year: '2024', booth: 'M-108', size: '30 sqm' },
                                            { company: 'Leader Electronics', year: '2025', booth: 'M-205', size: '40 sqm' },
                                            { company: 'TAG Video Systems', year: '2025', booth: 'M-310', size: '60 sqm' },
                                            { company: 'LiveU', year: '2025', booth: 'N-102', size: '75 sqm' },
                                            { company: 'TVU Networks', year: '2024', booth: 'N-210', size: '55 sqm' },
                                            { company: 'Dejero', year: '2025', booth: 'N-305', size: '45 sqm' },
                                            { company: 'Comrex', year: '2024', booth: 'N-401', size: '30 sqm' },
                                        ];

                                        // Filter by search
                                        const q = exSearch.toLowerCase();
                                        const filtered = q
                                            ? demoExhibitors.filter(ex =>
                                                ex.company.toLowerCase().includes(q) ||
                                                ex.booth.toLowerCase().includes(q) ||
                                                ex.year.includes(q)
                                            )
                                            : demoExhibitors;

                                        // Sort
                                        const sorted = exSort.key
                                            ? [...filtered].sort((a, b) => {
                                                const aVal = a[exSort.key as keyof typeof a];
                                                const bVal = b[exSort.key as keyof typeof b];
                                                // Extract numeric value for size column
                                                if (exSort.key === 'size') {
                                                    const aNum = parseInt(aVal);
                                                    const bNum = parseInt(bVal);
                                                    return exSort.dir === 'asc' ? aNum - bNum : bNum - aNum;
                                                }
                                                const cmp = aVal.localeCompare(bVal);
                                                return exSort.dir === 'asc' ? cmp : -cmp;
                                            })
                                            : filtered;

                                        const toggleSort = (key: string) => {
                                            setExSort(prev =>
                                                prev.key === key
                                                    ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
                                                    : { key, dir: 'asc' }
                                            );
                                        };

                                        const SortIcon = ({ col }: { col: string }) => {
                                            if (exSort.key !== col) return <ArrowUpDown className="h-3 w-3 text-zinc-300" />;
                                            return exSort.dir === 'asc'
                                                ? <ChevronUp className="h-3 w-3 text-orange-500" />
                                                : <ChevronDown className="h-3 w-3 text-orange-500" />;
                                        };

                                        const columns = [
                                            { key: 'company', label: 'Company' },
                                            { key: 'year', label: 'Attended Year' },
                                            { key: 'booth', label: 'Booth Number' },
                                            { key: 'size', label: 'Booth Size' },
                                        ];

                                        return (
                                            <div className="max-h-[62vh] overflow-y-auto border-t border-zinc-100">
                                                <table className="w-full text-left text-sm">
                                                    <thead className="sticky top-0 z-10 bg-white border-b border-zinc-200">
                                                        <tr>
                                                            {columns.map(col => (
                                                                <th
                                                                    key={col.key}
                                                                    onClick={() => toggleSort(col.key)}
                                                                    className="cursor-pointer select-none whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-400 transition-colors hover:text-zinc-600"
                                                                >
                                                                    <span className="inline-flex items-center gap-1.5">
                                                                        {col.label}
                                                                        <SortIcon col={col.key} />
                                                                    </span>
                                                                </th>
                                                            ))}
                                                            <th className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-400"></th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-zinc-50">
                                                        {sorted.length > 0 ? (
                                                            sorted.map((ex, i) => (
                                                                <tr key={i} className="transition-colors hover:bg-zinc-50/80 cursor-pointer group">
                                                                    <td className="whitespace-nowrap px-5 py-3 font-medium text-zinc-900 group-hover:text-orange-600 transition-colors">{ex.company}</td>
                                                                    <td className="whitespace-nowrap px-5 py-3 text-zinc-600">{ex.year}</td>
                                                                    <td className="whitespace-nowrap px-5 py-3">
                                                                        <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-700">{ex.booth}</span>
                                                                    </td>
                                                                    <td className="whitespace-nowrap px-5 py-3 text-zinc-600">{ex.size}</td>
                                                                    <td className="whitespace-nowrap px-5 py-3 text-right">
                                                                        <button className="text-xs font-semibold text-orange-600 transition-colors group-hover:text-orange-700">
                                                                            View More
                                                                        </button>
                                                                    </td>
                                                                </tr>
                                                            ))
                                                        ) : (
                                                            <tr>
                                                                <td colSpan={5} className="py-12 text-center">
                                                                    <p className="text-sm text-zinc-400">No exhibitors match &ldquo;{exSearch}&rdquo;</p>
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </>
    );
}
