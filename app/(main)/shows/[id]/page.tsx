'use client';

import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useParams, useRouter, useSearchParams, usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { EXHIBITOR_PAGE_SIZE, mapParticipationToExhibitorRow, type ExhibitorFacets } from '@/lib/showExhibitors';
import type { ShowParticipation, ShowExhibitorRow } from '@/types/showParticipation';
import type { Floorplan } from '@/types/floorplan';
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
    ChevronUp,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    ArrowUpDown,
    Download,
    Link2,
    Upload,
    Filter,
    X,
} from 'lucide-react';
import { toast } from 'sonner';
import { ShowFormModal } from '@/components/Zoho/ShowFormModal';
import { FilterPopover, type FilterCategory, type FilterSelections } from '@/components/Zoho/FilterPopover';
import { ShowImagesPanel } from '@/components/Shows/ShowImagesPanel';
import { ShowHeaderLogo } from '@/components/Shows/ShowLogo';

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

const formatRelativeTime = (iso: string) => {
    if (!iso) return '';
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
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

const AVATAR_COLORS = ['#f97316', '#8b5cf6', '#06b6d4', '#10b981', '#f43f5e', '#3b82f6', '#eab308', '#ec4899'];
const avatarColor = (name: string) => AVATAR_COLORS[hashToNumber(name) % AVATAR_COLORS.length];

const parseSqm = (size: string) => {
    const match = String(size).match(/(\d+(?:\.\d+)?)/);
    return match ? Number(match[1]) : 0;
};

type BoothCategory = 'Small' | 'Medium' | 'Large' | 'Enterprise';

const boothCategoryFromSqm = (sqm: number): { label: BoothCategory; order: number } => {
    if (sqm >= 150) return { label: 'Enterprise', order: 4 };
    if (sqm >= 100) return { label: 'Large', order: 3 };
    if (sqm >= 60) return { label: 'Medium', order: 2 };
    return { label: 'Small', order: 1 };
};

const BOOTH_CATEGORY_ORDER: Record<BoothCategory, number> = {
    Small: 1,
    Medium: 2,
    Large: 3,
    Enterprise: 4,
};

const boothCategoryFromDb = (raw?: string | null): { label: BoothCategory; order: number } | null => {
    if (!raw?.trim()) return null;
    const normalized = raw.trim().toLowerCase();
    if (normalized.includes('enterprise')) return { label: 'Enterprise', order: 4 };
    if (normalized.includes('large')) return { label: 'Large', order: 3 };
    if (normalized.includes('medium')) return { label: 'Medium', order: 2 };
    if (normalized.includes('small')) return { label: 'Small', order: 1 };
    const titled = raw.trim() as BoothCategory;
    if (titled in BOOTH_CATEGORY_ORDER) {
        return { label: titled, order: BOOTH_CATEGORY_ORDER[titled] };
    }
    return null;
};

const boothCategoryBadgeClass = (label: BoothCategory) => {
    const styles: Record<BoothCategory, string> = {
        Small: 'border-zinc-200 bg-zinc-50 text-zinc-700',
        Medium: 'border-blue-200 bg-blue-50 text-blue-700',
        Large: 'border-violet-200 bg-violet-50 text-violet-700',
        Enterprise: 'border-orange-200 bg-orange-50 text-orange-700',
    };
    return styles[label];
};

const EXHIBITOR_GRID_COLS = {
    default: 'md:grid-cols-[minmax(0,1fr)_100px_110px_120px_110px_100px]',
    select: 'md:grid-cols-[30px_minmax(0,1fr)_100px_110px_120px_110px_100px]',
} as const;

type ShowContact = {
    id: string;
    name: string;
    role: string;
    department: string;
    email: string;
    phone: string;
};

const EXHIBITOR_SORT_OPTIONS: { key: string; label: string }[] = [
    { key: 'company', label: 'Company' },
    { key: 'year', label: 'Year' },
    { key: 'booth', label: 'Booth' },
    { key: 'size', label: 'Size' },
    { key: 'category', label: 'Category' },
];

const EMPTY_EXHIBITOR_FILTERS: FilterSelections = {
    year: [],
    category: [],
    industry: [],
    country: [],
    worldArea: [],
    employees: [],
};

const FLOORPLAN_STORAGE_BUCKET = 'floorplans';
const MAX_FLOORPLAN_BYTES = 25 * 1024 * 1024;
const FLOORPLAN_ACCEPT = '.pdf,.png,.jpg,.jpeg,.webp,.gif,application/pdf,image/*';

const sanitizeStorageFileName = (name: string) => name.replace(/[^a-zA-Z0-9._-]/g, '_');

const titleFromFileName = (name: string) => {
    const base = name.replace(/\.[^/.]+$/, '');
    return base.replace(/[_-]+/g, ' ').trim() || name;
};

const storagePathFromFloorplanLink = (url: string): string | null => {
    const marker = '/floorplans/';
    const idx = url.indexOf(marker);
    if (idx === -1) return null;
    return decodeURIComponent(url.slice(idx + marker.length).split('?')[0]);
};

const floorplanAttribution = (createdAt?: string) => {
    if (createdAt) return formatRelativeTime(createdAt);
    return '—';
};

/* ─── tabs ────────────────────────────────────────────────── */

type Tab = 'overview' | 'contacts' | 'exhibitors' | 'floorplans' | 'comments' | 'images';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <LayoutGrid className="h-4 w-4" /> },
    { id: 'exhibitors', label: 'Exhibitors', icon: <Building2 className="h-4 w-4" /> },
    { id: 'contacts', label: 'Contacts', icon: <Users className="h-4 w-4" /> },
    { id: 'floorplans', label: 'Floorplans', icon: <Globe className="h-4 w-4" /> },
    { id: 'comments', label: 'Comments', icon: <FileText className="h-4 w-4" /> },
    { id: 'images', label: 'Images', icon: <Camera className="h-4 w-4" /> },
];

const isValidShowTab = (value: string | null): value is Tab =>
    !!value && TABS.some(tab => tab.id === value);

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
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const supabase = useMemo(() => createClient(), []);

    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<Tab>('overview');
    const [exSearch, setExSearch] = useState('');
    const [appliedExSearch, setAppliedExSearch] = useState('');
    const [exSort, setExSort] = useState<{ key: string; dir: 'asc' | 'desc' }>({ key: 'year', dir: 'desc' });
    const [isExhibitorFilterOpen, setIsExhibitorFilterOpen] = useState(false);
    const [exhibitorFilterSelections, setExhibitorFilterSelections] = useState<FilterSelections>(EMPTY_EXHIBITOR_FILTERS);
    const [isExhibitorSelectMode, setIsExhibitorSelectMode] = useState(false);
    const [selectedExhibitorIds, setSelectedExhibitorIds] = useState<string[]>([]);
    const [participations, setParticipations] = useState<ShowParticipation[]>([]);
    const [exhibitorsLoading, setExhibitorsLoading] = useState(false);
    const [exhibitorsLoadingMore, setExhibitorsLoadingMore] = useState(false);
    const [exhibitorTotal, setExhibitorTotal] = useState(0);
    const [exhibitorHasMore, setExhibitorHasMore] = useState(false);
    const [exhibitorFacets, setExhibitorFacets] = useState<ExhibitorFacets | null>(null);
    const exhibitorListRef = useRef<HTMLDivElement>(null);
    const exhibitorFetchKeyRef = useRef('');
    const showContacts: ShowContact[] = [];
    const [isContactSelectMode, setIsContactSelectMode] = useState(false);
    const [selectedContactKeys, setSelectedContactKeys] = useState<string[]>([]);
    const [featureInfoModal, setFeatureInfoModal] = useState<{ isOpen: boolean; title: string; description: string }>({
        isOpen: false,
        title: '',
        description: '',
    });
    const [addLinkModal, setAddLinkModal] = useState(false);
    const [linkForm, setLinkForm] = useState({ title: '', url: '' });
    const [linkSaving, setLinkSaving] = useState(false);
    const [uploadFloorplanModal, setUploadFloorplanModal] = useState(false);
    const [pendingFloorplanFile, setPendingFloorplanFile] = useState<File | null>(null);
    const [uploadFloorplanForm, setUploadFloorplanForm] = useState({ title: '' });
    const [floorplanUploading, setFloorplanUploading] = useState(false);
    const [floorplan, setFloorplan] = useState<Floorplan | null>(null);
    const floorplanFileInputRef = useRef<HTMLInputElement>(null);
    const tabsScrollRef = useRef<HTMLDivElement>(null);
    const [tabsOverflow, setTabsOverflow] = useState(false);
    const [canScrollTabsLeft, setCanScrollTabsLeft] = useState(false);
    const [canScrollTabsRight, setCanScrollTabsRight] = useState(false);
    const [currentUser, setCurrentUser] = useState<{ id: string; email?: string; name?: string } | null>(null);
    const [commentText, setCommentText] = useState('');
    const [commentSaving, setCommentSaving] = useState(false);
    const [commentAuthors, setCommentAuthors] = useState<Record<string, string>>({});

    const showId = params?.id as string;

    const selectTab = useCallback((tab: Tab) => {
        setActiveTab(tab);
        const nextParams = new URLSearchParams(searchParams.toString());
        if (tab === 'overview') {
            nextParams.delete('tab');
        } else {
            nextParams.set('tab', tab);
        }
        const query = nextParams.toString();
        router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    }, [pathname, router, searchParams]);

    useEffect(() => {
        const tabParam = searchParams.get('tab');
        setActiveTab(isValidShowTab(tabParam) ? tabParam : 'overview');
    }, [searchParams]);

    const updateTabScrollState = useCallback(() => {
        const el = tabsScrollRef.current;
        if (!el) return;
        const overflow = el.scrollWidth > el.clientWidth + 1;
        setTabsOverflow(overflow);
        setCanScrollTabsLeft(el.scrollLeft > 1);
        setCanScrollTabsRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
    }, []);

    const scrollTabs = (direction: 'left' | 'right') => {
        const el = tabsScrollRef.current;
        if (!el) return;
        el.scrollBy({ left: direction === 'left' ? -180 : 180, behavior: 'smooth' });
    };

    useEffect(() => {
        const el = tabsScrollRef.current;
        if (!el) return;
        updateTabScrollState();
        el.addEventListener('scroll', updateTabScrollState, { passive: true });
        const observer = new ResizeObserver(updateTabScrollState);
        observer.observe(el);
        window.addEventListener('resize', updateTabScrollState);
        return () => {
            el.removeEventListener('scroll', updateTabScrollState);
            observer.disconnect();
            window.removeEventListener('resize', updateTabScrollState);
        };
    }, [updateTabScrollState, loading]);

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

    const fetchFloorplan = useCallback(async () => {
        if (!showId) return;
        const { data: row, error } = await supabase
            .from('floorplans')
            .select('*')
            .eq('id', showId)
            .maybeSingle();
        if (error) {
            console.error('Failed to load floorplan:', error);
            return;
        }
        setFloorplan(row);
    }, [showId, supabase]);

    useEffect(() => {
        fetchFloorplan();
    }, [fetchFloorplan]);

    useEffect(() => {
        const loadUser = async () => {
            const { data: authData } = await supabase.auth.getUser();
            if (!authData.user) return;
            const { data: profile } = await supabase
                .from('users')
                .select('name')
                .eq('uid', authData.user.id)
                .single();
            setCurrentUser({
                id: authData.user.id,
                email: authData.user.email ?? '',
                name: String(profile?.name || authData.user.email || 'User'),
            });
        };
        loadUser();
    }, [supabase]);

    useEffect(() => {
        const commentList: any[] = Array.isArray(data?.comments) ? data.comments : [];
        const uniqueIds = [...new Set(commentList.map((c: any) => c.user_id).filter(Boolean))] as string[];
        if (uniqueIds.length === 0) return;
        const fetchAuthors = async () => {
            const { data: profiles } = await supabase
                .from('users')
                .select('uid, name')
                .in('uid', uniqueIds);
            if (!profiles) return;
            const map: Record<string, string> = {};
            profiles.forEach((p: any) => { if (p.uid && p.name) map[p.uid] = p.name; });
            setCommentAuthors(map);
        };
        fetchAuthors();
    }, [data?.comments, supabase]);

    const handleAddNewLink = () => {
        setLinkForm({
            title: floorplan?.name || '',
            url: floorplan?.link || '',
        });
        setAddLinkModal(true);
    };

    const defaultFloorplanYear = useCallback(() => {
        const startingDate = getValue(data, ['starting_date', 'Starting_Date', 'date', 'Date']);
        if (!startingDate) return null;
        const year = new Date(startingDate).getFullYear();
        return Number.isNaN(year) ? null : String(year);
    }, [data]);

    const handleSaveLink = async () => {
        if (!linkForm.title.trim() || !linkForm.url.trim()) {
            toast.error('Both title and URL are required.');
            return;
        }
        setLinkSaving(true);
        try {
            const { error } = await supabase
                .from('floorplans')
                .upsert({
                    id: showId,
                    link: normalizeExternalUrl(linkForm.url.trim()),
                    name: linkForm.title.trim(),
                    year: defaultFloorplanYear(),
                });

            if (error) throw error;

            await fetchFloorplan();
            setAddLinkModal(false);
            toast.success('Floorplan link saved');
        } catch (err: any) {
            console.error('Add link error:', err);
            toast.error(err?.message || 'Failed to save floorplan link.');
        } finally {
            setLinkSaving(false);
        }
    };

    const handleFloorplanFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;

        if (file.size > MAX_FLOORPLAN_BYTES) {
            toast.error('File must be 25 MB or smaller.');
            return;
        }

        const allowed = /\.(pdf|png|jpe?g|webp|gif)$/i.test(file.name) || file.type.startsWith('image/') || file.type === 'application/pdf';
        if (!allowed) {
            toast.error('Please upload a PDF or image file (PNG, JPG, WEBP, GIF).');
            return;
        }

        setPendingFloorplanFile(file);
        setUploadFloorplanForm({ title: titleFromFileName(file.name) });
        setUploadFloorplanModal(true);
    };

    const handleUploadFloorplan = async () => {
        if (!pendingFloorplanFile) return;
        if (!currentUser) {
            toast.error('You must be signed in to upload a floorplan.');
            return;
        }
        const title = uploadFloorplanForm.title.trim() || titleFromFileName(pendingFloorplanFile.name);
        setFloorplanUploading(true);
        try {
            const storagePath = `${showId}/${Date.now()}-${sanitizeStorageFileName(pendingFloorplanFile.name)}`;
            const { error: uploadError } = await supabase.storage
                .from(FLOORPLAN_STORAGE_BUCKET)
                .upload(storagePath, pendingFloorplanFile, {
                    contentType: pendingFloorplanFile.type || undefined,
                    upsert: false,
                });

            if (uploadError) {
                const msg = uploadError.message || '';
                if (/row-level security/i.test(msg)) {
                    throw new Error(
                        'Storage access denied: add RLS policies for the "floorplans" bucket in Supabase (see supabase/storage-floorplans-policies.sql).',
                    );
                }
                throw uploadError;
            }

            const { data: { publicUrl } } = supabase.storage
                .from(FLOORPLAN_STORAGE_BUCKET)
                .getPublicUrl(storagePath);

            const { error } = await supabase
                .from('floorplans')
                .upsert({
                    id: showId,
                    link: publicUrl,
                    name: title,
                    year: defaultFloorplanYear(),
                });

            if (error) throw error;

            await fetchFloorplan();
            setUploadFloorplanModal(false);
            setPendingFloorplanFile(null);
            setUploadFloorplanForm({ title: '' });
            toast.success('Floorplan uploaded');
        } catch (err: any) {
            console.error('Floorplan upload error:', err);
            toast.error(err?.message || 'Failed to upload floorplan.');
        } finally {
            setFloorplanUploading(false);
        }
    };

    const handleDeleteFloorplan = async () => {
        if (!floorplan?.link) return;
        try {
            const storagePath = storagePathFromFloorplanLink(floorplan.link);
            if (storagePath) {
                await supabase.storage.from(FLOORPLAN_STORAGE_BUCKET).remove([storagePath]);
            }

            const { error } = await supabase
                .from('floorplans')
                .delete()
                .eq('id', showId);

            if (error) throw error;

            setFloorplan(null);
            toast.success('Floorplan removed');
        } catch (err: any) {
            console.error('Delete floorplan error:', err);
            toast.error(err?.message || 'Failed to remove floorplan.');
        }
    };

    const handleAddComment = async () => {
        if (!commentText.trim()) return;
        if (!currentUser) { toast.error('You must be signed in to comment.'); return; }
        setCommentSaving(true);
        try {
            const existing: any[] = Array.isArray(data?.comments) ? data.comments : [];
            const newComment = {
                id: crypto.randomUUID(),
                user_id: currentUser.id,
                author: currentUser.name || currentUser.email || 'User',
                text: commentText.trim(),
                created_at: new Date().toISOString(),
            };
            const updated = [...existing, newComment];

            const { error } = await supabase.from('shows').update({ comments: updated }).eq('id', showId);
            if (error) throw error;

            const { data: rows } = await supabase.from('shows').select('*').eq('id', showId).limit(1);
            if (rows && rows.length > 0) setData(rows[0]);
            setCommentText('');
            toast.success('Comment added');
        } catch (err: any) {
            toast.error(err?.message || 'Failed to add comment.');
        } finally {
            setCommentSaving(false);
        }
    };

    const handleDeleteComment = async (commentId: string) => {
        try {
            const existing: any[] = Array.isArray(data?.comments) ? data.comments : [];
            const updated = existing.filter((c) => c.id !== commentId);

            const { error } = await supabase
                .from('shows')
                .update({ comments: updated.length ? updated : null })
                .eq('id', showId);
            if (error) throw error;

            const { data: rows } = await supabase.from('shows').select('*').eq('id', showId).limit(1);
            if (rows && rows.length > 0) setData(rows[0]);
            toast.success('Comment deleted');
        } catch (err: any) {
            toast.error(err?.message || 'Failed to delete comment.');
        }
    };

    useEffect(() => {
        setParticipations([]);
        setExhibitorTotal(0);
        setExhibitorHasMore(false);
        setExhibitorFacets(null);
        exhibitorFetchKeyRef.current = '';
    }, [showId]);

    const applyExhibitorSearch = useCallback(() => {
        setAppliedExSearch(exSearch.trim());
    }, [exSearch]);

    const clearExhibitorSearch = useCallback(() => {
        setExSearch('');
        setAppliedExSearch('');
    }, []);

    const buildExhibitorQuery = useCallback((offset: number) => {
        const params = new URLSearchParams({
            limit: String(EXHIBITOR_PAGE_SIZE),
            offset: String(offset),
            search: appliedExSearch,
            sortKey: exSort.key || 'year',
            sortDir: exSort.dir,
            filters: JSON.stringify(exhibitorFilterSelections),
        });
        return params.toString();
    }, [appliedExSearch, exSort, exhibitorFilterSelections]);

    const fetchExhibitorFacets = useCallback(async (signal?: AbortSignal) => {
        const response = await fetch(`/api/shows/${encodeURIComponent(showId)}/exhibitors?facets=1`, { signal });
        const payload = await response.json();
        if (!response.ok) {
            throw new Error(payload?.error || 'Failed to load exhibitor filters.');
        }
        return payload?.facets as ExhibitorFacets;
    }, [showId]);

    const fetchExhibitorPage = useCallback(async (offset: number, signal?: AbortSignal) => {
        const response = await fetch(
            `/api/shows/${encodeURIComponent(showId)}/exhibitors?${buildExhibitorQuery(offset)}`,
            { signal },
        );
        const payload = await response.json();
        if (!response.ok) {
            throw new Error(payload?.error || 'Failed to load exhibitors.');
        }
        return {
            participations: Array.isArray(payload?.participations) ? payload.participations as ShowParticipation[] : [],
            total: Number(payload?.total ?? 0),
            hasMore: Boolean(payload?.hasMore),
        };
    }, [showId, buildExhibitorQuery]);

    useEffect(() => {
        if (!showId || activeTab !== 'exhibitors') return;

        const controller = new AbortController();
        const fetchKey = `${showId}:${buildExhibitorQuery(0)}`;

        if (exhibitorFetchKeyRef.current === fetchKey) return;
        exhibitorFetchKeyRef.current = fetchKey;

        const loadPage = async () => {
            setExhibitorsLoading(true);
            exhibitorListRef.current?.scrollTo({ top: 0 });
            try {
                const page = await fetchExhibitorPage(0, controller.signal);
                if (controller.signal.aborted) return;
                setParticipations(page.participations);
                setExhibitorTotal(page.total);
                setExhibitorHasMore(page.hasMore);
            } catch (err: unknown) {
                if (controller.signal.aborted) return;
                console.error('Fetch show exhibitors error:', err);
                toast.error(err instanceof Error ? err.message : 'Failed to load exhibitors.');
                setParticipations([]);
                setExhibitorTotal(0);
                setExhibitorHasMore(false);
            } finally {
                if (!controller.signal.aborted) setExhibitorsLoading(false);
            }
        };

        loadPage();
        return () => controller.abort();
    }, [showId, activeTab, buildExhibitorQuery, fetchExhibitorPage]);

    useEffect(() => {
        if (!showId || activeTab !== 'exhibitors' || exhibitorFacets) return;

        const controller = new AbortController();
        fetchExhibitorFacets(controller.signal)
            .then((facets) => {
                if (!controller.signal.aborted && facets) setExhibitorFacets(facets);
            })
            .catch((err: unknown) => {
                if (controller.signal.aborted) return;
                console.error('Fetch exhibitor facets error:', err);
            });

        return () => controller.abort();
    }, [showId, activeTab, exhibitorFacets, fetchExhibitorFacets]);

    const loadMoreExhibitors = useCallback(async () => {
        if (exhibitorsLoading || exhibitorsLoadingMore || !exhibitorHasMore) return;

        setExhibitorsLoadingMore(true);
        try {
            const page = await fetchExhibitorPage(participations.length);
            setParticipations((prev) => {
                const seen = new Set(prev.map((row) => String(row.id)));
                const next = [...prev];
                page.participations.forEach((row) => {
                    const id = String(row.id);
                    if (!seen.has(id)) next.push(row);
                });
                return next;
            });
            setExhibitorTotal(page.total);
            setExhibitorHasMore(page.hasMore);
        } catch (err: unknown) {
            console.error('Load more exhibitors error:', err);
            toast.error(err instanceof Error ? err.message : 'Failed to load more exhibitors.');
        } finally {
            setExhibitorsLoadingMore(false);
        }
    }, [exhibitorsLoading, exhibitorsLoadingMore, exhibitorHasMore, fetchExhibitorPage, participations.length]);

    const exhibitorRows = useMemo<ShowExhibitorRow[]>(() => (
        participations
            .map((row) => mapParticipationToExhibitorRow(row))
            .filter((row): row is ShowExhibitorRow => row !== null)
    ), [participations]);

    const totalActiveExhibitorFilters = useMemo(
        () => Object.values(exhibitorFilterSelections).reduce((sum, values) => sum + values.length, 0),
        [exhibitorFilterSelections],
    );

    const exhibitorFilterCategories = useMemo<FilterCategory[]>(() => {
        if (!exhibitorFacets) return [];

        const categories: FilterCategory[] = [
            {
                key: 'year',
                label: 'Attended Year',
                icon: <Calendar className="h-3.5 w-3.5" />,
                options: exhibitorFacets.year,
            },
            {
                key: 'category',
                label: 'Booth Category',
                icon: <Layers className="h-3.5 w-3.5" />,
                options: exhibitorFacets.category,
            },
            {
                key: 'industry',
                label: 'Industry',
                icon: <Building2 className="h-3.5 w-3.5" />,
                options: exhibitorFacets.industry,
            },
            {
                key: 'country',
                label: 'Country',
                icon: <MapPin className="h-3.5 w-3.5" />,
                options: exhibitorFacets.country,
            },
            {
                key: 'worldArea',
                label: 'Region',
                icon: <Globe2 className="h-3.5 w-3.5" />,
                options: exhibitorFacets.worldArea,
            },
            {
                key: 'employees',
                label: 'Company Size',
                icon: <Users className="h-3.5 w-3.5" />,
                options: exhibitorFacets.employees,
            },
        ];

        return categories.filter((category) => category.options.length > 0);
    }, [exhibitorFacets]);

    const hasExhibitorFiltersActive = Boolean(
        appliedExSearch || totalActiveExhibitorFilters > 0,
    );

    const toggleExhibitorSort = (key: string) => {
        setExSort((prev) => (
            prev.key === key
                ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
                : { key, dir: 'asc' }
        ));
    };

    const ExhibitorSortIcon = ({ col }: { col: string }) => {
        if (exSort.key !== col) return <ArrowUpDown className="h-3 w-3 text-zinc-300" />;
        return exSort.dir === 'asc'
            ? <ChevronUp className="h-3 w-3 text-orange-500" />
            : <ChevronDown className="h-3 w-3 text-orange-500" />;
    };

    const clearExhibitorFilters = () => {
        setExhibitorFilterSelections(EMPTY_EXHIBITOR_FILTERS);
        clearExhibitorSearch();
    };

    const removeExhibitorFilterValue = (key: string, value: string) => {
        setExhibitorFilterSelections((prev) => ({
            ...prev,
            [key]: (prev[key] || []).filter((item) => item !== value),
        }));
    };

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
    const showWebsite = String(getValue(data, ['website', 'Website', 'show_website', 'Show_Website', 'event_website', 'Event_Website']) || '');
    const tags = String(getValue(data, ['tags', 'Tags']) || '');
    const note = String(getValue(data, ['note', 'Note', 'Note1']) || '');
    const exhibitorList = String(getValue(data, ['exhibitor_list', 'Exhibitor_List', 'Last_edition_n_Exhibitors']) || '');
    const exhibitorListLink = String(getValue(data, ['exhibitor_list_link', 'Exhibitor_List_Link']) || '');
    const websiteHref = normalizeExternalUrl(showWebsite);

    const location = [city, country].filter(Boolean).join(', ');
    const cover_img_link = String(getValue(data, ['cover_img_link', 'Cover_Img_Link', 'cover_image', 'Cover_Image', 'banner', 'Banner', 'cover']) || '');

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

    const comments: Array<{ id: string; user_id: string; author: string; text: string; created_at: string }> =
        Array.isArray(data?.comments) ? data.comments : [];

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

            {/* ── Add Link Modal ── */}
            {addLinkModal && (
                <>
                    <button
                        type="button"
                        aria-label="Close add link modal"
                        onClick={() => setAddLinkModal(false)}
                        className="fixed inset-0 z-140 bg-zinc-950/45 backdrop-blur-sm"
                    />
                    <div className="fixed inset-0 z-150 m-auto h-fit w-full max-w-lg rounded-2xl border border-zinc-200 bg-white shadow-2xl shadow-zinc-950/20">
                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
                            <div className="flex items-center gap-2">
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50">
                                    <Link2 className="h-4 w-4 text-orange-500" />
                                </div>
                                <h3 className="text-base font-semibold text-zinc-900">{floorplan?.link ? 'Edit floorplan link' : 'Add floorplan link'}</h3>
                            </div>
                            <button
                                onClick={() => setAddLinkModal(false)}
                                className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="p-5">
                            <div className="space-y-3">
                                <div>
                                    <label className="mb-1 block text-xs font-medium text-zinc-600">Title</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Hall A Floorplan"
                                        value={linkForm.title}
                                        onChange={(e) => setLinkForm((prev) => ({ ...prev, title: e.target.value }))}
                                        className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none transition-colors focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-100"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs font-medium text-zinc-600">URL</label>
                                    <input
                                        type="url"
                                        placeholder="https://..."
                                        value={linkForm.url}
                                        onChange={(e) => setLinkForm((prev) => ({ ...prev, url: e.target.value }))}
                                        onKeyDown={(e) => { if (e.key === 'Enter') handleSaveLink(); }}
                                        className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none transition-colors focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-100"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-end gap-2 border-t border-zinc-100 px-5 py-4">
                            <Button size="sm" variant="secondary" onClick={() => setAddLinkModal(false)}>
                                Cancel
                            </Button>
                            <Button
                                size="sm"
                                variant="primary"
                                onClick={handleSaveLink}
                                disabled={linkSaving || !linkForm.title.trim() || !linkForm.url.trim()}
                                leftIcon={linkSaving ? undefined : <Plus className="h-4 w-4" />}
                            >
                                {linkSaving ? 'Saving…' : floorplan?.link ? 'Save changes' : 'Add link'}
                            </Button>
                        </div>
                    </div>
                </>
            )}

            {/* ── Upload Floorplan Modal ── */}
            {uploadFloorplanModal && pendingFloorplanFile && (
                <>
                    <button
                        type="button"
                        aria-label="Close upload floorplan modal"
                        onClick={() => {
                            if (floorplanUploading) return;
                            setUploadFloorplanModal(false);
                            setPendingFloorplanFile(null);
                            setUploadFloorplanForm({ title: '' });
                        }}
                        className="fixed inset-0 z-140 bg-zinc-950/45 backdrop-blur-sm"
                    />
                    <div className="fixed inset-0 z-150 m-auto h-fit w-full max-w-lg rounded-2xl border border-zinc-200 bg-white shadow-2xl shadow-zinc-950/20">
                        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
                            <div className="flex items-center gap-2">
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50">
                                    <Upload className="h-4 w-4 text-orange-500" />
                                </div>
                                <h3 className="text-base font-semibold text-zinc-900">Upload floorplan</h3>
                            </div>
                            <button
                                onClick={() => {
                                    if (floorplanUploading) return;
                                    setUploadFloorplanModal(false);
                                    setPendingFloorplanFile(null);
                                    setUploadFloorplanForm({ title: '' });
                                }}
                                className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600"
                            >
                                ✕
                            </button>
                        </div>
                        <div className="space-y-4 p-5">
                            <div className="rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-600">
                                <p className="font-medium text-zinc-800">{pendingFloorplanFile.name}</p>
                                <p className="mt-0.5 text-xs text-zinc-500">
                                    {(pendingFloorplanFile.size / (1024 * 1024)).toFixed(2)} MB
                                    {currentUser ? ` · will be saved as ${currentUser.name || currentUser.email}` : ''}
                                </p>
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-medium text-zinc-600">Display name</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Hall A Floorplan"
                                    value={uploadFloorplanForm.title}
                                    onChange={(e) => setUploadFloorplanForm({ title: e.target.value })}
                                    className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none transition-colors focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-100"
                                />
                            </div>
                        </div>
                        <div className="flex items-center justify-end gap-2 border-t border-zinc-100 px-5 py-4">
                            <Button
                                size="sm"
                                variant="secondary"
                                disabled={floorplanUploading}
                                onClick={() => {
                                    setUploadFloorplanModal(false);
                                    setPendingFloorplanFile(null);
                                    setUploadFloorplanForm({ title: '' });
                                }}
                            >
                                Cancel
                            </Button>
                            <Button
                                size="sm"
                                variant="primary"
                                onClick={handleUploadFloorplan}
                                disabled={floorplanUploading}
                                isLoading={floorplanUploading}
                                leftIcon={floorplanUploading ? undefined : <Upload className="h-4 w-4" />}
                            >
                                {floorplanUploading ? 'Uploading…' : 'Upload'}
                            </Button>
                        </div>
                    </div>
                </>
            )}

            <input
                ref={floorplanFileInputRef}
                type="file"
                accept={FLOORPLAN_ACCEPT}
                className="hidden"
                onChange={handleFloorplanFileSelected}
            />

            <div className="-m-4 h-[calc(100%+2rem)] lg:-m-6 lg:h-[calc(100%+3rem)] flex flex-col bg-white">

                {/* ── Hero ── */}
                <div
                    className="relative shrink-0 overflow-hidden bg-zinc-950"
                    style={cover_img_link ? { backgroundImage: `url(${cover_img_link})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
                >
                    {cover_img_link && (
                        <div className="absolute inset-0 bg-linear-to-b from-zinc-950/60 via-zinc-950/55 to-zinc-950/80" />
                    )}

                    <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
                        {/* Top nav */}
                        <div className="flex items-center justify-between py-4">
                            <button
                                onClick={() => router.push('/shows')}
                                className="group flex items-center gap-1.5 text-sm font-medium text-white/50 transition-colors hover:text-white"
                            >
                                <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
                                Shows
                            </button>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setIsEditOpen(true)}
                                    className="flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 text-xs font-medium text-white/70 backdrop-blur-sm transition-all hover:bg-white/10 hover:text-white"
                                >
                                    <Edit2 className="h-3.5 w-3.5" />
                                    Edit
                                </button>
                                <button
                                    onClick={handleDelete}
                                    className="flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/10 px-3 text-xs font-medium text-red-400 backdrop-blur-sm transition-all hover:bg-red-500/20 hover:text-red-300"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    Delete
                                </button>
                            </div>
                        </div>

                        {/* Identity */}
                        <div className="flex items-end gap-4 pb-7 pt-2 sm:gap-5">
                            <ShowHeaderLogo show={data} name={eventName} />
                            <div className="min-w-0 pb-0.5">
                                {eventType && (
                                    <span className="mb-2 inline-flex items-center rounded-full bg-orange-500/20 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-orange-300">
                                        {eventType}
                                    </span>
                                )}
                                <h1 className="truncate text-2xl font-bold tracking-tight text-white sm:text-3xl">
                                    {eventName}
                                </h1>
                                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
                                    {location && (
                                        <span className="flex items-center gap-1.5 text-sm text-white/55">
                                            <MapPin className="h-3.5 w-3.5 text-white/35" />
                                            {location}
                                        </span>
                                    )}
                                    {startingDate && (
                                        <span className="flex items-center gap-1.5 text-sm text-white/55">
                                            <Calendar className="h-3.5 w-3.5 text-white/35" />
                                            {formatDate(startingDate)}
                                        </span>
                                    )}
                                    {industry && (
                                        <span className="flex items-center gap-1.5 text-sm text-white/55">
                                            <Building2 className="h-3.5 w-3.5 text-white/35" />
                                            {industry}
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
                        <div className="relative flex items-center">
                            {tabsOverflow && (
                                <button
                                    type="button"
                                    onClick={() => scrollTabs('left')}
                                    disabled={!canScrollTabsLeft}
                                    aria-label="Scroll tabs left"
                                    className={`absolute left-0 z-10 flex h-11 w-8 shrink-0 items-center justify-center rounded-md bg-white text-zinc-600 shadow-[8px_0_12px_-4px_rgba(255,255,255,1)] transition-opacity lg:hidden ${canScrollTabsLeft ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </button>
                            )}
                            <div
                                ref={tabsScrollRef}
                                className={`flex min-w-0 flex-1 items-center gap-1 overflow-x-hidden lg:overflow-x-visible [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${tabsOverflow ? 'px-8 lg:px-0' : ''}`}
                            >
                                {TABS.map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => selectTab(tab.id)}
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
                            {tabsOverflow && (
                                <button
                                    type="button"
                                    onClick={() => scrollTabs('right')}
                                    disabled={!canScrollTabsRight}
                                    aria-label="Scroll tabs right"
                                    className={`absolute right-0 z-10 flex h-11 w-8 shrink-0 items-center justify-center rounded-md bg-white text-zinc-600 shadow-[-8px_0_12px_-4px_rgba(255,255,255,1)] transition-opacity lg:hidden ${canScrollTabsRight ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── Content ── */}
                < div className="flex-1 overflow-y-auto flex flex-col" >

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
                                                <span className="text-xs font-medium text-zinc-400">{comments.length} recent</span>
                                            </div>
                                            <div className="divide-y divide-zinc-100">
                                                {comments.length === 0 ? (
                                                    <p className="px-5 py-6 text-center text-sm text-zinc-400">No comments yet.</p>
                                                ) : comments.slice(0, 3).map((comment) => {
                                                    const previewName = commentAuthors[comment.user_id] || comment.author;
                                                    return (
                                                        <div key={comment.id} className="flex items-start gap-3 px-5 py-4">
                                                            <div
                                                                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                                                                style={{ backgroundColor: avatarColor(previewName) }}
                                                            >
                                                                {initialsFromName(previewName)}
                                                            </div>
                                                            <div className="min-w-0 flex-1">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-sm font-semibold text-zinc-900">{previewName}</span>
                                                                    <span className="text-xs text-zinc-400">{formatRelativeTime(comment.created_at)}</span>
                                                                </div>
                                                                <p className="mt-0.5 text-sm leading-relaxed text-zinc-600 line-clamp-2">{comment.text}</p>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
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
                                            <div>
                                                <h2 className="text-lg font-semibold text-zinc-900">Contacts</h2>
                                                <p className="mt-1 text-sm text-zinc-500">Show organisers and venue contacts for this event.</p>
                                            </div>
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
                                                <p className="text-sm font-semibold text-zinc-900">{showContacts.length} show contacts</p>
                                            </div>
                                            <div className="divide-y divide-zinc-100">
                                                {showContacts.length > 0 ? (
                                                    showContacts.map((contact) => {
                                                        const isSelected = selectedContactKeys.includes(contact.id);

                                                        return (
                                                            <div key={contact.id} className="px-5 py-4">
                                                                <div className={`rounded-xl border p-3 ${isSelected ? 'border-orange-200 bg-orange-50/40' : 'border-zinc-100 bg-zinc-50/40'}`}>
                                                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                                                        <div className="flex min-w-0 items-start gap-3">
                                                                            {isContactSelectMode && (
                                                                                <input
                                                                                    type="checkbox"
                                                                                    checked={isSelected}
                                                                                    onChange={() => {
                                                                                        setSelectedContactKeys((prev) =>
                                                                                            prev.includes(contact.id) ? prev.filter((k) => k !== contact.id) : [...prev, contact.id],
                                                                                        );
                                                                                    }}
                                                                                    className="mt-1 h-3.5 w-3.5 cursor-pointer rounded border-zinc-300 text-orange-500 focus:ring-orange-400"
                                                                                    title={`Select ${contact.name}`}
                                                                                />
                                                                            )}
                                                                            <div
                                                                                className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full text-xs font-bold text-white"
                                                                                style={{ backgroundColor: avatarColor(contact.name) }}
                                                                            >
                                                                                {initialsFromName(contact.name)}
                                                                            </div>
                                                                            <div className="min-w-0">
                                                                                <p className="truncate text-sm font-semibold text-zinc-900">{contact.name}</p>
                                                                                <p className="mt-0.5 text-xs text-zinc-500">{contact.role}</p>
                                                                                <div className="mt-1.5 inline-flex max-w-full items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-2 py-1">
                                                                                    <Users className="h-3.5 w-3.5 shrink-0 text-orange-500" />
                                                                                    <span className="truncate text-xs font-medium text-zinc-700">{contact.department}</span>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                        <div className="text-sm text-zinc-600 sm:text-right">
                                                                            <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">Email</p>
                                                                            <p className="text-sm break-all">{contact.email}</p>
                                                                            <p className="mt-2 text-[11px] font-medium uppercase tracking-wide text-zinc-400">Phone</p>
                                                                            <p className="text-xs text-zinc-500">{contact.phone}</p>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })
                                                ) : (
                                                    <div className="px-5 py-8 text-center text-sm text-zinc-500">
                                                        No show contacts yet.
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}





                                {/* Comments Tab */}
                                {activeTab === 'comments' && (
                                    <div className="flex flex-1 flex-col gap-6">

                                        {/* Header */}
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h2 className="text-lg font-semibold text-zinc-900">Comments</h2>
                                                <p className="mt-0.5 text-sm text-zinc-500">Team notes and follow-ups for this show.</p>
                                            </div>
                                            {comments.length > 0 && (
                                                <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-500">
                                                    {comments.length} comment{comments.length !== 1 ? 's' : ''}
                                                </span>
                                            )}
                                        </div>

                                        {/* Compose box */}
                                        <div className="flex items-start gap-3">
                                            {currentUser ? (
                                                <div
                                                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                                                    style={{ backgroundColor: avatarColor(currentUser.name || currentUser.email || 'U') }}
                                                >
                                                    {initialsFromName(currentUser.name || currentUser.email || 'U')}
                                                </div>
                                            ) : (
                                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-xs font-bold text-zinc-500">?</div>
                                            )}
                                            <div className="flex-1 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm shadow-zinc-950/5 transition-all focus-within:border-orange-300 focus-within:ring-2 focus-within:ring-orange-100">
                                                <textarea
                                                    rows={3}
                                                    placeholder="Write a comment… (Ctrl+Enter to post)"
                                                    value={commentText}
                                                    onChange={(e) => setCommentText(e.target.value)}
                                                    onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleAddComment(); }}
                                                    className="w-full resize-none bg-transparent px-4 py-3 text-sm text-zinc-800 placeholder-zinc-400 outline-none"
                                                />
                                                <div className="flex items-center justify-between border-t border-zinc-100 bg-zinc-50/70 px-4 py-2.5">
                                                    <span className="text-[11px] text-zinc-400">
                                                        {currentUser?.name || currentUser?.email || 'Not signed in'}
                                                    </span>
                                                    <Button
                                                        size="sm"
                                                        variant="primary"
                                                        onClick={handleAddComment}
                                                        disabled={commentSaving || !commentText.trim()}
                                                    >
                                                        {commentSaving ? 'Posting…' : 'Post'}
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Comments list */}
                                        {comments.length === 0 ? (
                                            <EmptyState
                                                icon={<FileText className="h-6 w-6 text-zinc-400" />}
                                                title="No comments yet"
                                                description="Be the first to leave a note or follow-up for this show."
                                            />
                                        ) : (
                                            <div className="flex flex-col gap-3">
                                                {[...comments].reverse().map((comment) => {
                                                    const isOwn = currentUser?.id === comment.user_id;
                                                    const displayName = commentAuthors[comment.user_id] || comment.author;
                                                    const color = avatarColor(displayName);
                                                    return (
                                                        <div
                                                            key={comment.id}
                                                            className={`group relative rounded-2xl border bg-white p-4 shadow-sm shadow-zinc-950/5 transition-colors ${isOwn ? 'border-orange-100 bg-orange-50/20' : 'border-zinc-200'}`}
                                                        >
                                                            <div className="flex items-start gap-3">
                                                                <div
                                                                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                                                                    style={{ backgroundColor: color }}
                                                                >
                                                                    {initialsFromName(displayName)}
                                                                </div>
                                                                <div className="min-w-0 flex-1">
                                                                    <div className="flex items-center justify-between gap-2">
                                                                        <div className="flex flex-wrap items-center gap-2">
                                                                            <span className="text-sm font-semibold text-zinc-900">{displayName}</span>
                                                                            {isOwn && (
                                                                                <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-semibold text-orange-600">You</span>
                                                                            )}
                                                                            <span className="text-xs text-zinc-400">{formatRelativeTime(comment.created_at)}</span>
                                                                        </div>
                                                                        {isOwn && (
                                                                            <button
                                                                                onClick={() => handleDeleteComment(comment.id)}
                                                                                className="shrink-0 flex h-7 w-7 items-center justify-center rounded-lg text-zinc-300 opacity-0 transition-all group-hover:opacity-100 hover:bg-red-50 hover:text-red-500"
                                                                                title="Delete comment"
                                                                            >
                                                                                <Trash2 className="h-3.5 w-3.5" />
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                    <p className="mt-2 text-sm leading-relaxed text-zinc-700">{comment.text}</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Images Tab */}
                                {activeTab === 'images' && (
                                    <ShowImagesPanel show={data} name={eventName} />
                                )}

                            </div>
                        </div>
                    )
                    }

                    {/* Floorplans Tab */}
                    {
                        activeTab === 'floorplans' && (
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
                                                leftIcon={<Upload className="h-4 w-4" />}
                                                onClick={() => floorplanFileInputRef.current?.click()}
                                            >
                                                Upload floorplan
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="primary"
                                                leftIcon={<Plus className="h-4 w-4" />}
                                                onClick={handleAddNewLink}
                                            >
                                                Add map link
                                            </Button>
                                        </div>
                                    </div>
                                    {(() => {
                                        const toType = (url: string): 'pdf' | 'link' | 'image' => {
                                            const lower = url.toLowerCase();
                                            if (lower.includes('.pdf')) return 'pdf';
                                            if (/\.(png|jpg|jpeg|webp|gif)(\?|$)/.test(lower)) return 'image';
                                            return 'link';
                                        };

                                        const floorplanLink = floorplan?.link ? normalizeExternalUrl(floorplan.link) : '';
                                        const floorplanItems = floorplanLink ? [{
                                            id: floorplan!.id,
                                            name: floorplan?.name || `${eventName} Floorplan`,
                                            year: floorplan?.year || (startingDate ? String(new Date(startingDate).getFullYear()) : 'N/A'),
                                            type: toType(floorplanLink),
                                            source: storagePathFromFloorplanLink(floorplanLink) ? 'Uploaded file' : 'Map link',
                                            url: floorplanLink,
                                            attribution: floorplanAttribution(floorplan?.created_at),
                                        }] : [];

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
                                            <div className={floorplanItems.length > 0 ? 'flex w-full flex-col gap-3' : 'w-full'}>
                                                {floorplanItems.length > 0 ? floorplanItems.map((fp) => (
                                                    <div
                                                        key={fp.id}
                                                        className="flex w-full items-center gap-4 rounded-xl border border-zinc-200 bg-white px-5 py-3.5 shadow-sm shadow-zinc-950/5 transition-colors hover:border-zinc-300 hover:bg-zinc-50/80"
                                                    >
                                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-500">
                                                            {fp.type === 'pdf' ? <FileText className="h-4 w-4" /> : fp.type === 'link' ? <Globe className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <p className="truncate text-sm font-medium text-zinc-900">{fp.name}</p>
                                                            <p className="mt-0.5 text-xs text-zinc-400">
                                                                {fp.source} · {fp.year}
                                                            </p>
                                                            <p className="mt-0.5 truncate text-xs text-zinc-500">{fp.attribution}</p>
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
                                                                {fp.type === 'link' ? 'Open' : 'View'}
                                                            </a>
                                                            <button
                                                                type="button"
                                                                onClick={handleDeleteFloorplan}
                                                                className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-600"
                                                                aria-label="Remove floorplan"
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                )) : (
                                                    <div className="w-full py-12 text-center">
                                                        <p className="text-sm text-zinc-400">No floorplan or file links available for this show.</p>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>
                        )
                    }

                    {/* Exhibitors Tab — full width */}
                    {
                        activeTab === 'exhibitors' && (
                            <div className="w-full py-4 sm:py-6 flex min-h-0 flex-1 flex-col">
                                <div className="mx-auto flex h-full w-full max-w-6xl min-h-0 flex-col px-4 sm:px-6 lg:px-8">
                                    <div className="flex flex-col gap-3 pb-4">
                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                            <div>
                                                <h2 className="text-lg font-semibold text-zinc-900">Exhibitors</h2>
                                                <p className="mt-0.5 text-xs text-zinc-500">
                                                    Showing {exhibitorRows.length} of {exhibitorTotal} exhibitors
                                                </p>
                                            </div>
                                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                                                <div className="flex items-center gap-2">
                                                    <div className="flex items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 py-1.5 sm:w-56">
                                                        <Search className="h-4 w-4 text-zinc-400" />
                                                        <input
                                                            type="text"
                                                            placeholder="Search exhibitors..."
                                                            className="w-full bg-transparent text-sm outline-none"
                                                            value={exSearch}
                                                            onChange={(e) => setExSearch(e.target.value)}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') {
                                                                    e.preventDefault();
                                                                    applyExhibitorSearch();
                                                                }
                                                            }}
                                                        />
                                                    </div>
                                                    <Button
                                                        size="sm"
                                                        variant="secondary"
                                                        className="h-9 rounded-md"
                                                        onClick={applyExhibitorSearch}
                                                    >
                                                        Search
                                                    </Button>
                                                </div>
                                                <div className="relative">
                                                    <Button
                                                        size="sm"
                                                        variant="secondary"
                                                        className={`h-9 rounded-md ${totalActiveExhibitorFilters > 0 ? 'border-orange-300 bg-orange-50 text-orange-700' : ''}`}
                                                        leftIcon={<Filter className="h-4 w-4" />}
                                                        onClick={() => setIsExhibitorFilterOpen((prev) => !prev)}
                                                    >
                                                        Filters
                                                        {totalActiveExhibitorFilters > 0 && (
                                                            <span className="ml-1">({totalActiveExhibitorFilters})</span>
                                                        )}
                                                    </Button>
                                                    <FilterPopover
                                                        isOpen={isExhibitorFilterOpen}
                                                        onClose={() => setIsExhibitorFilterOpen(false)}
                                                        categories={exhibitorFilterCategories}
                                                        selections={exhibitorFilterSelections}
                                                        onApply={setExhibitorFilterSelections}
                                                        onClear={() => setExhibitorFilterSelections(EMPTY_EXHIBITOR_FILTERS)}
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

                                        {hasExhibitorFiltersActive && (
                                            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Active:</span>
                                                {appliedExSearch && (
                                                    <button
                                                        type="button"
                                                        onClick={clearExhibitorSearch}
                                                        className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-700 hover:border-orange-300"
                                                    >
                                                        Search: {appliedExSearch}
                                                        <X className="h-3 w-3" />
                                                    </button>
                                                )}
                                                {Object.entries(exhibitorFilterSelections).flatMap(([key, values]) =>
                                                    values.map((value) => {
                                                        const label = exhibitorFilterCategories.find((category) => category.key === key)?.label ?? key;
                                                        return (
                                                            <button
                                                                key={`${key}-${value}`}
                                                                type="button"
                                                                onClick={() => removeExhibitorFilterValue(key, value)}
                                                                className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-700 hover:border-orange-300"
                                                            >
                                                                {label}: {value}
                                                                <X className="h-3 w-3" />
                                                            </button>
                                                        );
                                                    }),
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={clearExhibitorFilters}
                                                    className="text-xs font-semibold text-orange-600 hover:text-orange-700"
                                                >
                                                    Clear all
                                                </button>
                                            </div>
                                        )}
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
                                    <div className="flex h-[calc(100vh-320px)] min-h-[500px] max-h-[760px] min-w-0 flex-col overflow-hidden">
                                        {exhibitorsLoading && participations.length === 0 ? (
                                            <div className="h-full overflow-y-auto">
                                                <div className="mb-2.5 hidden rounded-xl border border-zinc-200 bg-zinc-50/95 px-4 py-2.5 md:block">
                                                    <Skeleton className="h-4 w-full rounded-md" />
                                                </div>
                                                <div className="flex flex-col gap-2.5">
                                                    {Array.from({ length: 8 }).map((_, index) => (
                                                        <div key={index} className="rounded-xl border border-zinc-200 bg-white px-4 py-3">
                                                            <div className="flex items-center gap-3">
                                                                <Skeleton className="h-10 w-10 rounded-lg" />
                                                                <div className="min-w-0 flex-1 space-y-2">
                                                                    <Skeleton className="h-4 w-2/5 rounded-md" />
                                                                    <Skeleton className="h-3 w-1/3 rounded-md" />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ) : (() => {
                                            const sorted = exhibitorRows;
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

                                            const renderExhibitorLogo = (ex: (typeof sorted)[0], avatarText: string) => (
                                                <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-zinc-100 ring-1 ring-zinc-200 sm:h-9 sm:w-9">
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
                                            );

                                            return (
                                                <div
                                                    ref={exhibitorListRef}
                                                    className="h-full overflow-y-auto"
                                                >
                                                    {/* Mobile: sort chips */}
                                                    <div className="sticky top-0 z-20 mb-2.5 space-y-2 rounded-xl border border-zinc-200 bg-zinc-50/95 p-3 backdrop-blur md:hidden">
                                                        {isExhibitorSelectMode && (
                                                            <label className="flex items-center gap-2 text-xs font-medium text-zinc-600">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={allVisibleSelected}
                                                                    onChange={toggleSelectAllVisible}
                                                                    className="h-3.5 w-3.5 cursor-pointer rounded border-zinc-300 text-orange-500 focus:ring-orange-400"
                                                                />
                                                                Select all visible
                                                            </label>
                                                        )}
                                                        <div className="flex gap-1.5 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                                                            {EXHIBITOR_SORT_OPTIONS.map((opt) => (
                                                                <button
                                                                    key={opt.key}
                                                                    type="button"
                                                                    onClick={() => toggleExhibitorSort(opt.key)}
                                                                    className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${exSort.key === opt.key
                                                                        ? 'border-orange-200 bg-orange-50 text-orange-700'
                                                                        : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300'
                                                                        }`}
                                                                >
                                                                    {opt.label}
                                                                    <ExhibitorSortIcon col={opt.key} />
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    {/* Desktop: table header */}
                                                    <div className="sticky top-0 z-20 mb-2.5 hidden rounded-xl border border-zinc-200 bg-zinc-50/95 px-4 py-2.5 backdrop-blur md:block">
                                                        <div className={`grid ${isExhibitorSelectMode ? EXHIBITOR_GRID_COLS.select : EXHIBITOR_GRID_COLS.default} items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500`}>
                                                            {isExhibitorSelectMode && (
                                                                <input
                                                                    type="checkbox"
                                                                    checked={allVisibleSelected}
                                                                    onChange={toggleSelectAllVisible}
                                                                    className="h-3.5 w-3.5 cursor-pointer rounded border-zinc-300 text-orange-500 focus:ring-orange-400"
                                                                    title="Select all visible"
                                                                />
                                                            )}
                                                            <button type="button" onClick={() => toggleExhibitorSort('company')} className="inline-flex items-center gap-1 hover:text-zinc-600">
                                                                Company <ExhibitorSortIcon col="company" />
                                                            </button>
                                                            <button type="button" onClick={() => toggleExhibitorSort('year')} className="inline-flex items-center justify-center gap-1 hover:text-zinc-600">
                                                                Attended Year <ExhibitorSortIcon col="year" />
                                                            </button>
                                                            <button type="button" onClick={() => toggleExhibitorSort('booth')} className="inline-flex items-center justify-center gap-1 hover:text-zinc-600">
                                                                Booth Number <ExhibitorSortIcon col="booth" />
                                                            </button>
                                                            <button type="button" onClick={() => toggleExhibitorSort('size')} className="inline-flex items-center justify-center gap-1 hover:text-zinc-600">
                                                                Booth Size <ExhibitorSortIcon col="size" />
                                                            </button>
                                                            <button type="button" onClick={() => toggleExhibitorSort('category')} className="inline-flex items-center justify-center gap-1 hover:text-zinc-600">
                                                                Category <ExhibitorSortIcon col="category" />
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {exhibitorRows.length > 0 ? (
                                                        <div className="flex w-full flex-col gap-2.5">
                                                            {sorted.map((ex) => {
                                                                const avatarText = initialsFromName(ex.company);
                                                                const openCompany = () => {
                                                                    const query = new URLSearchParams({
                                                                        fromShow: showId,
                                                                        showName: eventName,
                                                                        fromTab: activeTab,
                                                                    });
                                                                    router.push(`/companies/${ex.companyId}?${query.toString()}`);
                                                                };
                                                                return (
                                                                    <div
                                                                        key={ex.id}
                                                                        role="button"
                                                                        tabIndex={0}
                                                                        onClick={openCompany}
                                                                        onKeyDown={(e) => {
                                                                            if (e.key === 'Enter' || e.key === ' ') {
                                                                                e.preventDefault();
                                                                                openCompany();
                                                                            }
                                                                        }}
                                                                        className="group w-full cursor-pointer rounded-xl border border-zinc-200 bg-white px-3 py-3 shadow-sm shadow-zinc-950/5 transition-all duration-200 hover:border-orange-200 hover:shadow-md hover:shadow-zinc-950/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-1 sm:px-4 sm:py-2.5"
                                                                    >
                                                                        {/* Mobile card */}
                                                                        <div className="md:hidden">
                                                                            <div className="flex items-start gap-3">
                                                                                {isExhibitorSelectMode && (
                                                                                    <input
                                                                                        type="checkbox"
                                                                                        checked={selectedExhibitorIds.includes(ex.id)}
                                                                                        onChange={() => toggleSelectOne(ex.id)}
                                                                                        onClick={(event) => event.stopPropagation()}
                                                                                        className="mt-1 h-4 w-4 shrink-0 cursor-pointer rounded border-zinc-300 text-orange-500 focus:ring-orange-400"
                                                                                        title={`Select ${ex.company}`}
                                                                                    />
                                                                                )}
                                                                                {renderExhibitorLogo(ex, avatarText)}
                                                                                <div className="min-w-0 flex-1">
                                                                                    <p className="text-sm font-semibold leading-snug text-zinc-900 group-hover:text-orange-700">{ex.company}</p>
                                                                                    <p className="mt-1 inline-flex min-w-0 items-start gap-1 text-xs text-zinc-500">
                                                                                        <MapPin className="mt-0.5 h-3 w-3 shrink-0 text-orange-500" />
                                                                                        <span className="line-clamp-2">{ex.location || 'Location N/A'}</span>
                                                                                    </p>
                                                                                </div>
                                                                            </div>
                                                                            <div className="mt-3 flex flex-wrap gap-1.5">
                                                                                <span className="inline-flex flex-col rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-1">
                                                                                    <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-400">Year</span>
                                                                                    <span className="text-[11px] font-semibold text-zinc-800">{ex.year}</span>
                                                                                </span>
                                                                                <span className="inline-flex flex-col rounded-lg border border-orange-200 bg-orange-50 px-2 py-1">
                                                                                    <span className="text-[9px] font-bold uppercase tracking-wider text-orange-400">Booth</span>
                                                                                    <span className="text-[11px] font-semibold text-orange-800">{ex.booth}</span>
                                                                                </span>
                                                                                <span className="inline-flex flex-col rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-1">
                                                                                    <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-400">Size</span>
                                                                                    <span className="text-[11px] font-semibold text-zinc-800">{ex.size}</span>
                                                                                </span>
                                                                                <span className={`inline-flex flex-col rounded-lg border px-2 py-1 ${boothCategoryBadgeClass(ex.category)}`}>
                                                                                    <span className="text-[9px] font-bold uppercase tracking-wider opacity-70">Category</span>
                                                                                    <span className="text-[11px] font-semibold">{ex.category}</span>
                                                                                </span>
                                                                            </div>
                                                                        </div>

                                                                        {/* Desktop table row */}
                                                                        <div className={`hidden md:grid ${isExhibitorSelectMode ? EXHIBITOR_GRID_COLS.select : EXHIBITOR_GRID_COLS.default} items-center gap-2`}>
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
                                                                                {renderExhibitorLogo(ex, avatarText)}
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
                                                                            <span
                                                                                className={`justify-self-center rounded-lg border px-2.5 py-1 text-[11px] font-semibold ${boothCategoryBadgeClass(ex.category)}`}
                                                                                title={`${ex.sqm} sqm`}
                                                                            >
                                                                                {ex.category}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                            {exhibitorHasMore && (
                                                                <div className="py-4 text-center">
                                                                    <p className="text-xs text-zinc-400">
                                                                        Loaded {exhibitorRows.length} of {exhibitorTotal} exhibitors
                                                                    </p>
                                                                    <button
                                                                        type="button"
                                                                        onClick={loadMoreExhibitors}
                                                                        disabled={exhibitorsLoadingMore}
                                                                        className="mt-2 text-sm font-semibold text-orange-600 hover:text-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
                                                                    >
                                                                        {exhibitorsLoadingMore ? 'Loading more...' : 'Load more exhibitors'}
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div className="py-12 text-center">
                                                            <p className="text-sm text-zinc-400">
                                                                {hasExhibitorFiltersActive
                                                                    ? 'No exhibitors match the current search or filters.'
                                                                    : 'No exhibitors recorded for this show yet.'}
                                                            </p>
                                                            {hasExhibitorFiltersActive && (
                                                                <button
                                                                    type="button"
                                                                    onClick={clearExhibitorFilters}
                                                                    className="mt-3 text-sm font-semibold text-orange-600 hover:text-orange-700"
                                                                >
                                                                    Clear filters
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })()}
                                    </div>
                                </div>
                            </div>
                        )
                    }

                </div>
            </div>
        </>
    );
}
