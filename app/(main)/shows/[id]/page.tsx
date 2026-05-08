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
    ArrowRight,
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

const normalizeExternalUrl = (url: string) => {
    if (!url) return '';
    const trimmed = url.trim();
    if (!trimmed) return '';
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return `https://${trimmed}`;
};

const initialsFromName = (name: string) => {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const hashToNumber = (value: string) => {
    let hash = 0;
    for (let i = 0; i < value.length; i++) {
        hash = (hash << 5) - hash + value.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash);
};

const randomExhibitorMeta = (seed: string) => {
    const hash = hashToNumber(seed);
    const currentYear = new Date().getFullYear();
    const year = String(currentYear - (hash % 3));
    const hallLetter = String.fromCharCode(65 + (hash % 14)); // A-N
    const booth = `${hallLetter}-${String((hash % 390) + 10)}`;
    const size = `${(hash % 231) + 20} sqm`;
    return { year, booth, size };
};

const extractLinks = (raw: string) => {
    if (!raw) return [];
    return raw
        .split(/[\n,;]+/)
        .map((v) => v.trim())
        .filter(Boolean);
};

/* ─── tabs ────────────────────────────────────────────────── */

type Tab = 'overview' | 'contacts' | 'exhibitors' | 'floorplans' | 'comments';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <LayoutGrid className="h-4 w-4" /> },
    { id: 'exhibitors', label: 'Exhibitors', icon: <Building2 className="h-4 w-4" /> },
    { id: 'contacts', label: 'Contacts', icon: <Users className="h-4 w-4" /> },
    { id: 'floorplans', label: 'Floorplans', icon: <Globe className="h-4 w-4" /> },
    { id: 'comments', label: 'Comments', icon: <FileText className="h-4 w-4" /> },
];

/* ─── info row ────────────────────────────────────────────── */

const InfoRow = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) => (
    <div className="flex items-start gap-3 py-3">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-zinc-100 text-zinc-500">
            {icon}
        </div>
        <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">{label}</p>
            <div className="mt-0.5 text-sm font-semibold text-zinc-800 break-words">{value}</div>
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
    const [isExhibitorSelectMode, setIsExhibitorSelectMode] = useState(false);
    const [selectedExhibitorIds, setSelectedExhibitorIds] = useState<string[]>([]);
    const [exhibitorCompanies, setExhibitorCompanies] = useState<Array<{
        id: string;
        name: string;
        logo_url?: string;
        logo?: string;
        city?: string;
        country?: string;
        industry?: string;
        primary_domain?: string;
        estimated_num_employees?: number;
    }>>([]);
    const [exhibitorsLoading, setExhibitorsLoading] = useState(false);
    const [exhibitorContacts, setExhibitorContacts] = useState<any[]>([]);
    const [contactsLoading, setContactsLoading] = useState(false);
    const [isContactSelectMode, setIsContactSelectMode] = useState(false);
    const [selectedContactKeys, setSelectedContactKeys] = useState<string[]>([]);
    const [featureInfoModal, setFeatureInfoModal] = useState<{ isOpen: boolean; title: string; description: string }>({
        isOpen: false,
        title: '',
        description: '',
    });

    const showId = params?.id as string;
    const companyLogoByName = useMemo(() => {
        const map = new Map<string, string>();
        exhibitorCompanies.forEach((company) => {
            const name = String(company.name || '').trim().toLowerCase();
            const logo = String(company.logo_url || company.logo || '').trim();
            if (name && logo) map.set(name, logo);
        });
        return map;
    }, [exhibitorCompanies]);

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

    useEffect(() => {
        const fetchCompanies = async () => {
            setExhibitorsLoading(true);
            try {
                const { data: rows, error } = await supabase
                    .from('companies')
                    .select('*');
                if (error) throw error;
                const normalized = (rows || []).map((row: any) => {
                    const fallbackIdSeed = String(
                        row?.name ?? row?.Name ?? row?.company_name ?? row?.primary_domain ?? row?.Primary_Domain ?? crypto.randomUUID(),
                    );
                    const id = String(row?.id ?? row?.ID ?? row?.company_id ?? `tmp-${hashToNumber(fallbackIdSeed)}`);
                    const name = String(row?.name ?? row?.Name ?? row?.company_name ?? 'Unknown Company');
                    return {
                        id,
                        name,
                        logo_url: row?.logo_url ?? row?.Logo_URL ?? '',
                        logo: row?.logo ?? row?.Logo ?? '',
                        city: row?.city ?? row?.City ?? '',
                        country: row?.country ?? row?.Country ?? '',
                        industry: row?.industry ?? row?.Industry ?? '',
                        primary_domain: row?.primary_domain ?? row?.Primary_Domain ?? row?.website ?? row?.Website ?? '',
                        estimated_num_employees: Number(row?.estimated_num_employees ?? row?.Estimated_Num_Employees ?? row?.employees ?? 0),
                    };
                });
                setExhibitorCompanies(normalized);
            } catch (err: any) {
                console.error('Fetch exhibitors from companies error:', err);
                toast.error(err?.message || 'Failed to load companies for exhibitors.');
                setExhibitorCompanies([]);
            } finally {
                setExhibitorsLoading(false);
            }
        };
        fetchCompanies();
    }, [supabase]);

    useEffect(() => {
        const fetchAllContacts = async () => {
            setContactsLoading(true);
            try {
                const { data: rows, error } = await supabase.from('people').select('*');
                if (error) throw error;

                const merged = rows || [];
                const unique = new Map<string, any>();
                merged.forEach((person: any, index: number) => {
                    const key = String(
                        person?.id
                        || person?.email
                        || person?.primary_email
                        || `${person?.first_name || ''}-${person?.last_name || ''}-${person?.organization_name || ''}-${index}`,
                    );
                    unique.set(key, person);
                });

                setExhibitorContacts(Array.from(unique.values()));
            } catch (err: any) {
                console.error('Fetch exhibitor contacts error:', err);
                toast.error(err?.message || 'Failed to load exhibitor contacts');
                setExhibitorContacts([]);
            } finally {
                setContactsLoading(false);
            }
        };

        fetchAllContacts();
    }, [supabase]);

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

    const openFeatureInfoModal = (title: string, description: string) => {
        setFeatureInfoModal({ isOpen: true, title, description });
    };

    const closeFeatureInfoModal = () => {
        setFeatureInfoModal({ isOpen: false, title: '', description: '' });
    };

    const handleEditSuccess = async () => {
        setIsEditOpen(false);
        const { data: rows } = await supabase.from('shows').select('*').eq('id', showId).limit(1);
        if (rows && rows.length > 0) setData(rows[0]);
    };

    /* ── loading ── */
    if (loading) {
        return (
            <div className="-m-4 h-[calc(100%+2rem)] lg:-m-6 lg:h-[calc(100%+3rem)] flex flex-col bg-white">
                <div className="shrink-0 bg-zinc-900">
                    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center justify-between py-4">
                            <Skeleton className="h-5 w-24 rounded-md bg-white/20" />
                            <div className="flex items-center gap-2">
                                <Skeleton className="h-8 w-20 rounded-md bg-white/20" />
                                <Skeleton className="h-8 w-20 rounded-md bg-white/20" />
                            </div>
                        </div>
                        <div className="flex items-center gap-4 pb-6 sm:pb-8">
                            <Skeleton className="h-16 w-16 rounded-lg bg-white/20" />
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-28 rounded bg-white/20" />
                                <Skeleton className="h-6 w-64 rounded bg-white/20" />
                                <Skeleton className="h-4 w-40 rounded bg-white/20" />
                            </div>
                        </div>
                    </div>
                </div>
                <div className="shrink-0 border-b border-zinc-200 bg-white">
                    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center gap-2 py-2">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <Skeleton key={i} className="h-8 w-24 rounded-md" />
                            ))}
                        </div>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                    <div className="mx-auto max-w-6xl space-y-4 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
                        <div className="rounded-lg border border-zinc-200 bg-white p-5">
                            <Skeleton className="mb-4 h-5 w-36 rounded-md" />
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                {Array.from({ length: 6 }).map((_, i) => (
                                    <div key={i} className="space-y-2">
                                        <Skeleton className="h-3 w-20 rounded" />
                                        <Skeleton className="h-4 w-40 rounded" />
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="rounded-2xl border border-zinc-200 bg-white p-5">
                            <Skeleton className="mb-4 h-5 w-28 rounded-md" />
                            <div className="space-y-3">
                                {Array.from({ length: 3 }).map((_, i) => (
                                    <Skeleton key={i} className="h-14 w-full rounded-md" />
                                ))}
                            </div>
                        </div>
                    </div>
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
    const showWebsite = String(getValue(data, ['show_website', 'Show_Website', 'website', 'Website', 'event_website', 'Event_Website']) || '');
    const tags = String(getValue(data, ['tags', 'Tags']) || '');
    const note = String(getValue(data, ['note', 'Note', 'Note1']) || '');
    const exhibitorList = String(getValue(data, ['exhibitor_list', 'Exhibitor_List', 'Last_edition_n_Exhibitors']) || '');
    const exhibitorListLink = String(getValue(data, ['exhibitor_list_link', 'Exhibitor_List_Link']) || '');
    const floorplanLink = String(getValue(data, ['floorplan_link', 'Floorplan_Link']) || '');
    const floorplanFileLink = String(getValue(data, ['floorplan_file_link', 'Floorplan_File_Link', 'file_link', 'File_Link']) || '');
    const mapLink = String(getValue(data, ['map_link', 'Map_Link']) || '');
    const websiteHref = normalizeExternalUrl(showWebsite);

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
        showWebsite && {
            label: 'Website',
            value: (
                <a
                    href={websiteHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-orange-600 underline-offset-2 hover:text-orange-500 hover:underline"
                >
                    {showWebsite}
                    <ExternalLink className="h-3.5 w-3.5" />
                </a>
            ),
            icon: <ExternalLink className="h-4 w-4" />,
        },
        exhibitorList && { label: 'Exhibitors', value: exhibitorList, icon: <Users className="h-4 w-4" /> },
        organiser && { label: 'Organiser', value: organiser, icon: <Building2 className="h-4 w-4" /> },
        tags && { label: 'Tags', value: tags, icon: <Tag className="h-4 w-4" /> },
    ].filter(Boolean) as { label: string; value: React.ReactNode; icon: React.ReactNode }[];

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

    return (
        <>
            <ShowFormModal
                key={data?.id}
                isOpen={isEditOpen}
                onClose={() => setIsEditOpen(false)}
                onSuccess={handleEditSuccess}
                initialData={data}
            />
            {featureInfoModal.isOpen && (
                <>
                    <button
                        type="button"
                        aria-label="Close feature modal"
                        onClick={closeFeatureInfoModal}
                        className="fixed inset-0 z-140 bg-zinc-950/45 backdrop-blur-sm"
                    />
                    <div className="fixed inset-0 z-150 m-auto h-fit w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xl shadow-zinc-950/20">
                        <h3 className="text-base font-semibold text-zinc-900">{featureInfoModal.title}</h3>
                        <p className="mt-2 text-sm leading-relaxed text-zinc-600">{featureInfoModal.description}</p>
                        <div className="mt-4 flex justify-end">
                            <Button size="sm" variant="primary" onClick={closeFeatureInfoModal}>
                                Got it
                            </Button>
                        </div>
                    </div>
                </>
            )}

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
                                    className="flex h-8 cursor-pointer items-center gap-1.5 rounded-md bg-white/10 px-3 text-xs font-semibold text-zinc-300 transition-colors hover:bg-white/20 hover:text-white"
                                >
                                    <Edit2 className="h-3.5 w-3.5" />
                                    Edit
                                </button>
                                <button
                                    onClick={handleDelete}
                                    className="flex h-8 cursor-pointer items-center gap-1.5 rounded-md bg-red-500/20 px-3 text-xs font-semibold text-red-400 transition-colors hover:bg-red-500/30 hover:text-red-300"
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
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="secondary"
                                                    className="h-8 rounded-md"
                                                    onClick={() => {
                                                        setIsContactSelectMode((prev) => {
                                                            if (prev) setSelectedContactKeys([]);
                                                            return !prev;
                                                        });
                                                    }}
                                                >
                                                    {isContactSelectMode ? 'Cancel Selection' : 'Select'}
                                                </Button>
                                                <Button size="sm" variant="primary" leftIcon={<Plus className="h-4 w-4" />} onClick={() => toast.info('Coming soon')}>
                                                    Add Contact
                                                </Button>
                                            </div>
                                        </div>
                                        {isContactSelectMode && (
                                        <div className="flex flex-wrap items-center gap-2 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2">
                                            <span className="text-xs font-medium text-zinc-600">{selectedContactKeys.length} selected</span>
                                            <Button
                                                size="sm"
                                                variant="secondary"
                                                className="h-8 rounded-md"
                                                disabled={selectedContactKeys.length === 0}
                                                onClick={() =>
                                                    openFeatureInfoModal(
                                                        'Bulk Send Email (Coming Soon)',
                                                        `You selected ${selectedContactKeys.length} contacts. This will send personalized email campaigns to all selected contacts with delivery and response tracking.`,
                                                    )
                                                }
                                            >
                                                Bulk Send Email
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="secondary"
                                                className="h-8 rounded-md"
                                                disabled={selectedContactKeys.length === 0}
                                                onClick={() =>
                                                    openFeatureInfoModal(
                                                        'Email Auto Generation (Coming Soon)',
                                                        `You selected ${selectedContactKeys.length} contacts. This feature will auto-generate tailored outreach copy based on each contact and company profile.`,
                                                    )
                                                }
                                            >
                                                Email Auto Generation
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="secondary"
                                                className="h-8 rounded-md"
                                                disabled={selectedContactKeys.length === 0}
                                                onClick={() =>
                                                    openFeatureInfoModal(
                                                        'Bulk Enrich (Coming Soon)',
                                                        `You selected ${selectedContactKeys.length} contacts. This will enrich selected contacts with verified emails, phones, and updated profile data.`,
                                                    )
                                                }
                                            >
                                                Bulk Enrich
                                            </Button>
                                        </div>
                                        )}
                                        <div className="min-h-0 flex-1 overflow-y-auto rounded-2xl border border-zinc-200 bg-white shadow-sm shadow-zinc-950/5">
                                            <div className="border-b border-zinc-100 px-5 py-3.5">
                                                <p className="text-sm font-semibold text-zinc-900">{exhibitorContacts.length} contacts</p>
                                            </div>
                                            <div className="divide-y divide-zinc-100">
                                                {contactsLoading ? (
                                                    <div className="px-5 py-8 text-center text-sm text-zinc-500">Loading contacts...</div>
                                                ) : exhibitorContacts.length > 0 ? (
                                                    exhibitorContacts.map((contact, index) => {
                                                        const fullName = String(
                                                            contact?.name
                                                            || [contact?.first_name, contact?.last_name].filter(Boolean).join(' ')
                                                            || contact?.full_name
                                                            || 'Unknown Contact',
                                                        );
                                                        const role = String(contact?.title || contact?.job_title || contact?.role || 'Contact');
                                                        const companyName = String(contact?.organization_name || contact?.company || '');
                                                        const email = String(contact?.email || contact?.primary_email || '');
                                                        const phone = String(contact?.phone || contact?.mobile_phone || contact?.work_phone || '');
                                                        const avatar = String(contact?.photo_url || contact?.image || '');
                                                        const companyLogo = companyLogoByName.get(companyName.trim().toLowerCase()) || '';
                                                        const key = String(contact?.id || email || `${fullName}-${index}`);
                                                        const isSelected = selectedContactKeys.includes(key);

                                                        return (
                                                            <div key={key} className="px-5 py-4">
                                                                <div className={`rounded-xl border p-3 ${isSelected ? 'border-orange-200 bg-orange-50/40' : 'border-zinc-100 bg-zinc-50/40'}`}>
                                                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                                                        <div className="flex min-w-0 items-start gap-3">
                                                                            {isContactSelectMode && (
                                                                                <input
                                                                                    type="checkbox"
                                                                                    checked={isSelected}
                                                                                    onChange={() => {
                                                                                        setSelectedContactKeys((prev) =>
                                                                                            prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
                                                                                        );
                                                                                    }}
                                                                                    className="mt-1 h-3.5 w-3.5 cursor-pointer rounded border-zinc-300 text-orange-500 focus:ring-orange-400"
                                                                                    title={`Select ${fullName}`}
                                                                                />
                                                                            )}
                                                                            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-zinc-200 text-xs font-bold text-zinc-700">
                                                                                {avatar ? (
                                                                                    <img src={avatar} alt={fullName} className="h-full w-full object-cover" />
                                                                                ) : (
                                                                                    initialsFromName(fullName)
                                                                                )}
                                                                            </div>
                                                                            <div className="min-w-0">
                                                                                <p className="truncate text-sm font-semibold text-zinc-900">{fullName}</p>
                                                                                <p className="mt-0.5 text-xs text-zinc-500">{role}</p>
                                                                                {companyName && (
                                                                                    <div className="mt-1.5 inline-flex max-w-full items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-2 py-1">
                                                                                        {companyLogo ? (
                                                                                            <img src={companyLogo} alt={`${companyName} logo`} className="h-4 w-4 shrink-0 object-contain" />
                                                                                        ) : (
                                                                                            <Building2 className="h-3.5 w-3.5 shrink-0 text-orange-500" />
                                                                                        )}
                                                                                        <span className="truncate text-xs font-medium text-zinc-700">{companyName}</span>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                        <div className="text-sm text-zinc-600 sm:text-right">
                                                                            <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">Email</p>
                                                                            <p className="text-sm">{email || 'No email'}</p>
                                                                            <p className="mt-2 text-[11px] font-medium uppercase tracking-wide text-zinc-400">Phone</p>
                                                                            <p className="text-xs text-zinc-500">{phone || 'No phone'}</p>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })
                                                ) : (
                                                    <div className="px-5 py-8 text-center text-sm text-zinc-500">
                                                        No contacts found.
                                                    </div>
                                                )}
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
                                        const toType = (url: string): 'pdf' | 'link' | 'image' => {
                                            const lower = url.toLowerCase();
                                            if (lower.includes('.pdf')) return 'pdf';
                                            if (/\.(png|jpg|jpeg|webp|gif)(\?|$)/.test(lower)) return 'image';
                                            return 'link';
                                        };

                                        const floorplanItems = [
                                            ...extractLinks(floorplanLink).map((url, idx) => ({
                                                id: `floorplan-${idx}-${url}`,
                                                name: `${eventName} — Floorplan ${idx + 1}`,
                                                year: startingDate ? String(new Date(startingDate).getFullYear()) : 'N/A',
                                                type: toType(url),
                                                source: 'Floorplan Link',
                                                url: normalizeExternalUrl(url),
                                            })),
                                            ...extractLinks(floorplanFileLink).map((url, idx) => ({
                                                id: `file-${idx}-${url}`,
                                                name: `${eventName} — Floorplan File ${idx + 1}`,
                                                year: startingDate ? String(new Date(startingDate).getFullYear()) : 'N/A',
                                                type: toType(url),
                                                source: 'File Link',
                                                url: normalizeExternalUrl(url),
                                            })),
                                            ...extractLinks(mapLink).map((url, idx) => ({
                                                id: `map-${idx}-${url}`,
                                                name: `${eventName} — Venue Map ${idx + 1}`,
                                                year: startingDate ? String(new Date(startingDate).getFullYear()) : 'N/A',
                                                type: 'link' as const,
                                                source: 'Map Link',
                                                url: normalizeExternalUrl(url),
                                            })),
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
                                                {floorplanItems.length > 0 ? floorplanItems.map((fp) => (
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
                                                            <a
                                                                href={fp.url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="flex h-8 items-center gap-1.5 rounded-md bg-zinc-100 px-2.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-200 hover:text-zinc-800"
                                                            >
                                                                {fp.type === 'link' ? <ExternalLink className="h-3.5 w-3.5" /> : <Download className="h-3.5 w-3.5" />}
                                                                {fp.type === 'link' ? 'Open' : 'Download'}
                                                            </a>
                                                        </div>
                                                    </div>
                                                )) : (
                                                    <div className="px-5 py-12 text-center">
                                                        <p className="text-sm text-zinc-400">No floorplan or file links available for this show.</p>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Exhibitors Tab — full width */}
                    {activeTab === 'exhibitors' && (
                        <div className="w-full py-4 sm:py-6 flex min-h-0 flex-1 flex-col">
                            <div className="mx-auto flex h-full w-full max-w-6xl min-h-0 flex-col px-4 sm:px-6 lg:px-8">
                                <div className="flex flex-col gap-3 pb-4 sm:flex-row sm:items-center sm:justify-between">
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
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            className="h-9 rounded-md"
                                            onClick={() => {
                                                setIsExhibitorSelectMode((prev) => {
                                                    if (prev) setSelectedExhibitorIds([]);
                                                    return !prev;
                                                });
                                            }}
                                        >
                                            {isExhibitorSelectMode ? 'Cancel Selection' : 'Select'}
                                        </Button>
                                    </div>
                                </div>
                                {isExhibitorSelectMode && (
                                <div className="mb-3 flex flex-wrap items-center gap-2 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2">
                                    <span className="text-xs font-medium text-zinc-600">{selectedExhibitorIds.length} selected</span>
                                    <Button
                                        size="sm"
                                        variant="secondary"
                                        onClick={() =>
                                            openFeatureInfoModal(
                                                'Bulk Delete (Coming Soon)',
                                                `You selected ${selectedExhibitorIds.length} exhibitors. Soon you will be able to delete selected exhibitors in one confirmed action.`,
                                            )
                                        }
                                        className="h-8 rounded-md"
                                        disabled={selectedExhibitorIds.length === 0}
                                    >
                                        Bulk Delete
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="secondary"
                                        onClick={() =>
                                            openFeatureInfoModal(
                                                'Bulk Enrich Data (Coming Soon)',
                                                `You selected ${selectedExhibitorIds.length} exhibitors. This will enrich selected companies with additional firmographic and profile details.`,
                                            )
                                        }
                                        className="h-8 rounded-md"
                                        disabled={selectedExhibitorIds.length === 0}
                                    >
                                        Bulk Enrich Data
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="secondary"
                                        onClick={() =>
                                            openFeatureInfoModal(
                                                'Get Contacts (Coming Soon)',
                                                `You selected ${selectedExhibitorIds.length} exhibitors. This will fetch relevant decision-maker contacts for the selected companies.`,
                                            )
                                        }
                                        className="h-8 rounded-md"
                                        disabled={selectedExhibitorIds.length === 0}
                                    >
                                        Get Contacts
                                    </Button>
                                </div>
                                )}
                                <div className="flex h-[calc(100vh-320px)] min-h-[500px] max-h-[760px] min-w-0 flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm shadow-zinc-950/5">
                                    {(() => {
                                        const demoExhibitors = exhibitorCompanies.map((company) => {
                                            const meta = randomExhibitorMeta(`${company.id}-${company.name}`);
                                            return {
                                                id: company.id,
                                                company: company.name,
                                                year: meta.year,
                                                booth: meta.booth,
                                                size: meta.size,
                                                logoUrl: company.logo_url || company.logo || '',
                                                location: [company.city, company.country].filter(Boolean).join(', '),
                                                industry: company.industry || '',
                                                domain: company.primary_domain || '',
                                                employees: Number(company.estimated_num_employees || 0),
                                            };
                                        });

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
                                                    const aNum = parseInt(String(aVal), 10);
                                                    const bNum = parseInt(String(bVal), 10);
                                                    return exSort.dir === 'asc' ? aNum - bNum : bNum - aNum;
                                                }
                                                const cmp = String(aVal).localeCompare(String(bVal));
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

                                        const visibleIds = sorted.map((ex) => ex.id);
                                        const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedExhibitorIds.includes(id));

                                        const toggleSelectAllVisible = () => {
                                            setSelectedExhibitorIds((prev) => {
                                                if (allVisibleSelected) {
                                                    return prev.filter((id) => !visibleIds.includes(id));
                                                }
                                                const next = new Set(prev);
                                                visibleIds.forEach((id) => next.add(id));
                                                return Array.from(next);
                                            });
                                        };

                                        const toggleSelectOne = (id: string) => {
                                            setSelectedExhibitorIds((prev) => (
                                                prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
                                            ));
                                        };

                                        return (
                                            <div className="h-full overflow-y-auto border-t border-zinc-100">
                                                <div className="sticky top-0 z-20 border-b border-zinc-100 bg-zinc-50/95 px-4 py-2.5 backdrop-blur sm:px-5">
                                                    <div className={`grid ${isExhibitorSelectMode ? 'grid-cols-[30px_minmax(0,1fr)_110px_120px_110px]' : 'grid-cols-[minmax(0,1fr)_110px_120px_110px]'} items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500`}>
                                                        {isExhibitorSelectMode && (
                                                            <input
                                                                type="checkbox"
                                                                checked={allVisibleSelected}
                                                                onChange={toggleSelectAllVisible}
                                                                className="h-3.5 w-3.5 cursor-pointer rounded border-zinc-300 text-orange-500 focus:ring-orange-400"
                                                                title="Select all visible"
                                                            />
                                                        )}
                                                        <button onClick={() => toggleSort('company')} className="inline-flex items-center gap-1 hover:text-zinc-600">
                                                            Company <SortIcon col="company" />
                                                        </button>
                                                        <button onClick={() => toggleSort('year')} className="inline-flex items-center justify-center gap-1 hover:text-zinc-600">
                                                            Attended Year <SortIcon col="year" />
                                                        </button>
                                                        <button onClick={() => toggleSort('booth')} className="inline-flex items-center justify-center gap-1 hover:text-zinc-600">
                                                            Booth Number <SortIcon col="booth" />
                                                        </button>
                                                        <button onClick={() => toggleSort('size')} className="inline-flex items-center justify-center gap-1 hover:text-zinc-600">
                                                            Booth Size <SortIcon col="size" />
                                                        </button>
                                                    </div>
                                                </div>

                                                {sorted.length > 0 ? (
                                                    <div className="space-y-2.5 p-3 sm:p-4">
                                                        {sorted.map((ex) => {
                                                            const avatarText = initialsFromName(ex.company);
                                                            return (
                                                                <div
                                                                    key={ex.id}
                                                                    role="button"
                                                                    tabIndex={0}
                                                                    onClick={() => router.push(`/companies/${ex.id}`)}
                                                                    onKeyDown={(e) => {
                                                                        if (e.key === 'Enter' || e.key === ' ') {
                                                                            e.preventDefault();
                                                                            router.push(`/companies/${ex.id}`);
                                                                        }
                                                                    }}
                                                                    className="group cursor-pointer rounded-xl border border-zinc-200 bg-white px-3 py-2.5 transition-all duration-200 hover:border-orange-200 hover:shadow-sm hover:shadow-zinc-950/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-1"
                                                                >
                                                                    <div className={`grid ${isExhibitorSelectMode ? 'grid-cols-[30px_minmax(0,1fr)_110px_120px_110px]' : 'grid-cols-[minmax(0,1fr)_110px_120px_110px]'} items-center gap-2`}>
                                                                        {isExhibitorSelectMode && (
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={selectedExhibitorIds.includes(ex.id)}
                                                                                onChange={() => toggleSelectOne(ex.id)}
                                                                                onClick={(event) => event.stopPropagation()}
                                                                                className="h-3.5 w-3.5 cursor-pointer rounded border-zinc-300 text-orange-500 focus:ring-orange-400"
                                                                                title={`Select ${ex.company}`}
                                                                            />
                                                                        )}
                                                                        <div className="flex min-w-0 items-center gap-3">
                                                                                <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-zinc-100 ring-1 ring-zinc-200">
                                                                                {ex.logoUrl ? (
                                                                                    <img
                                                                                        src={ex.logoUrl}
                                                                                        alt={`${ex.company} logo`}
                                                                                        className="h-full w-full object-contain p-1"
                                                                                        loading="lazy"
                                                                                    />
                                                                                ) : (
                                                                                    <div className="flex h-full w-full items-center justify-center text-sm font-bold text-white" style={{ backgroundColor: '#fb923c' }}>
                                                                                        {avatarText}
                                                                                    </div>
                                                                                )}
                                                                            </div>

                                                                                <div className="min-w-0">
                                                                                <p className="truncate text-[14px] font-semibold text-zinc-900 group-hover:text-orange-700">{ex.company}</p>
                                                                                <div className="mt-0.5 flex items-center gap-2 text-xs text-zinc-500">
                                                                                    {ex.location ? (
                                                                                        <span className="inline-flex min-w-0 items-center gap-1 truncate">
                                                                                            <MapPin className="h-3 w-3 shrink-0 text-orange-500" />
                                                                                            <span className="truncate">{ex.location}</span>
                                                                                        </span>
                                                                                    ) : (
                                                                                        <span className="text-zinc-400">Location N/A</span>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        </div>

                                                                        <span className="justify-self-center rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[11px] font-semibold text-zinc-700">{ex.year}</span>
                                                                        <span className="justify-self-center rounded-lg border border-orange-200 bg-orange-50 px-2.5 py-1 text-[11px] font-semibold text-orange-700">{ex.booth}</span>
                                                                        <span className="justify-self-center rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[11px] font-semibold text-zinc-700">{ex.size}</span>
                                                                        </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                ) : exhibitorsLoading ? (
                                                    <div className="py-12 text-center">
                                                        <p className="text-sm text-zinc-400">Loading exhibitors...</p>
                                                    </div>
                                                ) : (
                                                    <div className="py-12 text-center">
                                                        <p className="text-sm text-zinc-400">No exhibitors match &ldquo;{exSearch}&rdquo;</p>
                                                    </div>
                                                )}
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
