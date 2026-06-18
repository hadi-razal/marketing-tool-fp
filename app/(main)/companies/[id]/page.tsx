'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import {
    ArrowLeft,
    Building2,
    MapPin,
    Globe2,
    Link2,
    Phone,
    Users,
    Activity,
    FileText,
    LayoutGrid,
    Calendar,
    Edit2,
    Trash2,
    Plus,
    Sparkles,
    Layers,
    ArrowRight,
    DollarSign,
    Linkedin,
    Twitter,
    Facebook,
    TrendingUp,
    Tag,
    Landmark,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatCompanyLocation } from '@/lib/utils';
import { ProfileCard } from '@/components/ProfileCard';
import { CompanyLogo } from '@/components/CompanyLogo';

/* ─── helpers ─────────────────────────────────────────────── */

const formatMoney = (amount?: number) => {
    if (!amount) return '';
    if (amount >= 1e9) return `$${(amount / 1e9).toFixed(1)}B`;
    if (amount >= 1e6) return `$${(amount / 1e6).toFixed(1)}M`;
    if (amount >= 1e3) return `$${(amount / 1e3).toFixed(1)}K`;
    return `$${amount}`;
};

const initialsFromName = (name: string) => {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

type BoothCategory = 'Small' | 'Medium' | 'Large' | 'Enterprise';

const boothCategoryFromSqm = (sqm: number): BoothCategory => {
    if (sqm >= 150) return 'Enterprise';
    if (sqm >= 100) return 'Large';
    if (sqm >= 60) return 'Medium';
    return 'Small';
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

type ShowEdition = {
    id: string;
    year: number;
    yearLabel: string;
    booth: string;
    sqm: number;
    category?: BoothCategory;
};

type ResolvedShowParticipation = {
    showId: string;
    showName: string;
    location: string;
    coverImage: string;
    profileImage: string;
    editions: ShowEdition[];
};

const parseSqm = (size: string) => {
    const match = String(size).match(/(\d+(?:\.\d+)?)/);
    return match ? Number(match[1]) : 0;
};

const boothCategoryFromDb = (raw?: string | null): BoothCategory | null => {
    if (!raw?.trim()) return null;
    const normalized = raw.trim().toLowerCase();
    if (normalized.includes('enterprise')) return 'Enterprise';
    if (normalized.includes('large')) return 'Large';
    if (normalized.includes('medium')) return 'Medium';
    if (normalized.includes('small')) return 'Small';
    const titled = raw.trim() as BoothCategory;
    if (['Small', 'Medium', 'Large', 'Enterprise'].includes(titled)) return titled;
    return null;
};

const SHOW_COVER_FALLBACKS = [
    'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1551818255-e6e10975bc17?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1587825140708-dfaf72ae4b04?auto=format&fit=crop&q=80&w=800',
];

const getShowCoverImage = (show: any, showName: string) => {
    const cover = show?.cover_img_link ?? show?.Cover_Img_Link ?? show?.cover_image ?? '';
    if (cover) return String(cover);
    const nameSum = showName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return SHOW_COVER_FALLBACKS[nameSum % SHOW_COVER_FALLBACKS.length];
};

const getShowLocation = (show: any) => {
    const city = String(show?.city ?? show?.City ?? '').trim();
    const country = String(show?.country ?? show?.Country ?? '').trim();
    const worldArea = String(show?.world_area ?? show?.World_Area ?? '').trim();
    return [city, country].filter(Boolean).join(', ') || [country, worldArea].filter(Boolean).join(', ') || 'Location TBC';
};

const buildShowParticipations = (
    participations: Array<{
        id: number | string;
        show_id?: string | null;
        year?: string | null;
        booth_number?: string | null;
        booth_size?: string | null;
        booth_size_category?: string | null;
    }>,
    showsById: Record<string, any>,
): ResolvedShowParticipation[] => {
    const grouped = new Map<string, typeof participations>();

    for (const row of participations) {
        const showId = String(row.show_id ?? '').trim();
        if (!showId) continue;
        const existing = grouped.get(showId) ?? [];
        existing.push(row);
        grouped.set(showId, existing);
    }

    return Array.from(grouped.entries())
        .map(([showId, rows]) => {
            const show = showsById[showId];
            const showName = String(show?.name ?? show?.Event_Name ?? 'Untitled show');
            const editions = rows
                .map((row) => {
                    const yearLabel = String(row.year ?? '').trim() || '—';
                    const year = Number.parseInt(yearLabel, 10);
                    const sqm = parseSqm(String(row.booth_size ?? ''));
                    return {
                        id: String(row.id),
                        year: Number.isFinite(year) ? year : 0,
                        yearLabel,
                        booth: String(row.booth_number ?? '').trim() || '—',
                        sqm,
                        category: boothCategoryFromDb(row.booth_size_category) ?? boothCategoryFromSqm(sqm),
                    };
                })
                .sort((a, b) => {
                    if (a.year !== b.year) return b.year - a.year;
                    return b.yearLabel.localeCompare(a.yearLabel);
                });

            return {
                showId,
                showName,
                location: getShowLocation(show),
                coverImage: getShowCoverImage(show, showName),
                profileImage: String(show?.profile_img_link ?? show?.Profile_Img_Link ?? ''),
                editions,
            };
        })
        .sort((a, b) => a.showName.localeCompare(b.showName));
};

const StatPill = ({ label, value, accent }: { label: string; value: string; accent?: boolean }) => (
    <span
        className={`inline-flex min-w-[4.5rem] flex-col rounded-lg border px-2.5 py-1.5 ${
            accent ? 'border-orange-200 bg-orange-50' : 'border-zinc-200 bg-zinc-50'
        }`}
    >
        <span className={`text-[9px] font-bold uppercase tracking-wider ${accent ? 'text-orange-400' : 'text-zinc-400'}`}>
            {label}
        </span>
        <span className={`text-[11px] font-semibold ${accent ? 'text-orange-800' : 'text-zinc-800'}`}>{value}</span>
    </span>
);

const ShowParticipationBars = ({
    groups,
    loading,
    onShowClick,
}: {
    groups: ResolvedShowParticipation[];
    loading: boolean;
    onShowClick: (showId: string) => void;
}) => {
    if (loading) {
        return (
            <div className="space-y-3 p-4 sm:p-5">
                {Array.from({ length: 2 }).map((_, i) => (
                    <div key={i} className="overflow-hidden rounded-xl border border-zinc-200 p-4">
                        <div className="flex items-center gap-3">
                            <Skeleton className="h-16 w-24 shrink-0 rounded-lg" />
                            <div className="flex-1 space-y-2">
                                <Skeleton className="h-4 w-48 rounded" />
                                <Skeleton className="h-3 w-32 rounded" />
                            </div>
                        </div>
                        <div className="mt-4 space-y-2">
                            <Skeleton className="h-12 w-full rounded-lg" />
                            <Skeleton className="h-12 w-full rounded-lg" />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (groups.length === 0) {
        return (
            <div className="px-5 py-10 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-orange-50 text-orange-500">
                    <Layers className="h-5 w-5" />
                </div>
                <p className="text-sm font-semibold text-zinc-900">No show participations yet</p>
                <p className="mt-1 text-xs text-zinc-500">Shows from your database will appear here once linked.</p>
            </div>
        );
    }

    return (
        <div className="space-y-3 p-4 sm:p-5">
            {groups.map(group => (
                <div
                    key={group.showId}
                    className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm shadow-zinc-950/5 transition-colors hover:border-orange-200"
                >
                    <button
                        type="button"
                        onClick={() => onShowClick(group.showId)}
                        className="flex w-full cursor-pointer items-center justify-between gap-3 border-b border-zinc-100 bg-linear-to-r from-zinc-50 to-white px-4 py-3 text-left transition-colors hover:bg-orange-50/50 sm:px-5"
                    >
                        <div className="flex min-w-0 items-center gap-3">
                            <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100">
                                <img
                                    src={group.coverImage}
                                    alt={`${group.showName} cover`}
                                    className="h-full w-full object-cover"
                                    loading="lazy"
                                />
                                <div className="absolute inset-0 bg-linear-to-t from-black/50 via-transparent to-transparent" />
                                {group.profileImage ? (
                                    <img
                                        src={group.profileImage}
                                        alt={`${group.showName} logo`}
                                        className="absolute bottom-1.5 left-1.5 h-7 w-7 rounded-md border border-white/80 object-cover shadow-sm"
                                        loading="lazy"
                                    />
                                ) : (
                                    <div className="absolute bottom-1.5 left-1.5 flex h-7 w-7 items-center justify-center rounded-md border border-white/80 bg-white text-[10px] font-bold text-zinc-700 shadow-sm">
                                        {initialsFromName(group.showName)}
                                    </div>
                                )}
                            </div>
                            <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-zinc-900 transition-colors group-hover:text-orange-700">
                                    {group.showName}
                                </p>
                                <p className="mt-0.5 flex items-center gap-1 text-[11px] text-zinc-500">
                                    <MapPin className="h-3 w-3 shrink-0 text-orange-500" />
                                    <span className="truncate">{group.location}</span>
                                </p>
                                <span className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-semibold text-orange-600">
                                    View show
                                    <ArrowRight className="h-3 w-3" />
                                </span>
                            </div>
                        </div>
                        <span className="shrink-0 rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-[10px] font-semibold text-zinc-600">
                            {group.editions.length} {group.editions.length === 1 ? 'edition' : 'editions'}
                        </span>
                    </button>

                    <div className="divide-y divide-zinc-100">
                        {group.editions.map((edition, index) => {
                            const category = edition.category ?? boothCategoryFromSqm(edition.sqm);
                            return (
                                <div
                                    key={edition.id}
                                    className="group/edition relative flex items-stretch gap-3 px-4 py-3 transition-colors hover:bg-orange-50/40 sm:gap-4 sm:px-5"
                                >
                                    <div
                                        className={`w-1 shrink-0 rounded-full ${
                                            index === 0 ? 'bg-orange-500' : 'bg-orange-300'
                                        }`}
                                    />
                                    <div className="flex w-14 shrink-0 flex-col justify-center sm:w-16">
                                        <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-400">Year</span>
                                        <span className="text-base font-bold tabular-nums text-zinc-900">{edition.yearLabel}</span>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap gap-1.5 sm:gap-2">
                                            <StatPill label="Booth" value={edition.booth} accent />
                                            <StatPill label="Size" value={edition.sqm > 0 ? `${edition.sqm} sqm` : '—'} />
                                            <span className={`inline-flex min-w-[4.5rem] flex-col rounded-lg border px-2.5 py-1.5 ${boothCategoryBadgeClass(category)}`}>
                                                <span className="text-[9px] font-bold uppercase tracking-wider opacity-70">Category</span>
                                                <span className="text-[11px] font-semibold">{category}</span>
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
};

/* ─── tabs ────────────────────────────────────────────────── */

type Tab = 'overview' | 'shows' | 'contacts' | 'comments';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <LayoutGrid className="h-4 w-4" /> },
    { id: 'shows', label: 'Shows', icon: <Calendar className="h-4 w-4" /> },
    { id: 'contacts', label: 'Contacts', icon: <Users className="h-4 w-4" /> },
    { id: 'comments', label: 'Comments', icon: <FileText className="h-4 w-4" /> },
];

/* ─── info row ────────────────────────────────────────────── */

const InfoRow = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | React.ReactNode }) => (
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

/* ─── page ────────────────────────────────────────────────── */

export default function CompanyDetailPage() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const supabase = useMemo(() => createClient(), []);

    const fromShowId = searchParams.get('fromShow') || '';
    const fromShowName = searchParams.get('showName') || '';
    const fromTab = searchParams.get('fromTab') || '';

    const [company, setCompany] = useState<any>(null);
    const [people, setPeople] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [activeTab, setActiveTab] = useState<Tab>('overview');
    const [comments, setComments] = useState<any[]>([]);
    const [commentText, setCommentText] = useState('');
    const [currentUserId, setCurrentUserId] = useState('');
    const [currentUserName, setCurrentUserName] = useState('Unknown User');
    const [currentUserProfileUrl, setCurrentUserProfileUrl] = useState('');
    const [savingComment, setSavingComment] = useState(false);
    const [deletingCommentId, setDeletingCommentId] = useState('');
    const [participations, setParticipations] = useState<any[]>([]);
    const [showsById, setShowsById] = useState<Record<string, any>>({});
    const [showsLoading, setShowsLoading] = useState(true);

    const companyId = params?.id as string;

    const showParticipations = useMemo(
        () => buildShowParticipations(participations, showsById),
        [participations, showsById],
    );
    const totalEditions = useMemo(
        () => showParticipations.reduce((sum, group) => sum + group.editions.length, 0),
        [showParticipations],
    );

    useEffect(() => {
        if (!companyId) {
            setNotFound(true);
            setLoading(false);
            return;
        }
        const fetchCompanyAndPeople = async () => {
            setLoading(true);
            try {
                const { data: cData, error: cError } = await supabase
                    .from('companies')
                    .select('*')
                    .eq('id', companyId)
                    .single();

                if (cError || !cData) {
                    setNotFound(true);
                    return;
                }
                setCompany(cData);
                setComments(Array.isArray(cData.comments) ? cData.comments : []);

                const { data: pData } = await supabase
                    .from('people')
                    .select('*')
                    .eq('organization_name', cData.name);

                if (pData) setPeople(pData);
            } catch {
                setNotFound(true);
            } finally {
                setLoading(false);
            }
        };
        fetchCompanyAndPeople();
    }, [companyId, supabase]);

    useEffect(() => {
        if (!companyId) return;

        let cancelled = false;

        const fetchParticipations = async () => {
            setShowsLoading(true);
            try {
                const { data: rows, error } = await supabase
                    .from('show_participation')
                    .select('id, show_id, company_id, year, booth_number, booth_size, booth_size_category')
                    .eq('company_id', companyId)
                    .order('year', { ascending: false });

                if (error) throw error;

                const participationRows = rows ?? [];
                const showIds = [...new Set(
                    participationRows
                        .map((row) => String(row.show_id ?? '').trim())
                        .filter(Boolean),
                )];

                const nextShowsById: Record<string, any> = {};
                if (showIds.length > 0) {
                    const { data: showRows, error: showError } = await supabase
                        .from('shows')
                        .select('*')
                        .in('id', showIds);

                    if (showError) throw showError;

                    for (const show of showRows ?? []) {
                        nextShowsById[String(show.id)] = show;
                    }
                }

                if (!cancelled) {
                    setParticipations(participationRows);
                    setShowsById(nextShowsById);
                }
            } catch (err) {
                console.error('Failed to fetch show participations:', err);
                if (!cancelled) {
                    setParticipations([]);
                    setShowsById({});
                }
            } finally {
                if (!cancelled) setShowsLoading(false);
            }
        };

        fetchParticipations();
        return () => {
            cancelled = true;
        };
    }, [companyId, supabase]);

    useEffect(() => {
        const fetchCurrentUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            setCurrentUserId(user.id);

            const { data: userProfile } = await supabase
                .from('users')
                .select('name, profile_url')
                .eq('uid', user.id)
                .single();

            if (userProfile?.name) setCurrentUserName(userProfile.name);
            if (userProfile?.profile_url) setCurrentUserProfileUrl(userProfile.profile_url);
        };
        fetchCurrentUser();
    }, [supabase]);

    const handleAddComment = async () => {
        const text = commentText.trim();
        if (!text) return;
        if (!currentUserId) {
            toast.error('Please sign in to comment.');
            return;
        }

        const newComment = {
            id: crypto.randomUUID(),
            uid: currentUserId,
            userName: currentUserName,
            userProfileUrl: currentUserProfileUrl || undefined,
            text,
            createdAt: new Date().toISOString(),
        };

        const updatedComments = [...comments, newComment];
        setSavingComment(true);
        try {
            const { error } = await supabase
                .from('companies')
                .update({ comments: updatedComments })
                .eq('id', companyId);
            if (error) throw error;
            setComments(updatedComments);
            setCommentText('');
            toast.success('Comment added');
        } catch (err: any) {
            console.error(err);
            toast.error(err?.message || 'Failed to add comment');
        } finally {
            setSavingComment(false);
        }
    };

    const handleDeleteComment = async (commentId: string) => {
        const target = comments.find((comment) => comment.id === commentId);
        if (!target) return;
        if (target.uid !== currentUserId) {
            toast.error('You can only delete your own comments.');
            return;
        }

        const updatedComments = comments.filter((comment) => comment.id !== commentId);
        setDeletingCommentId(commentId);
        try {
            const { error } = await supabase
                .from('companies')
                .update({ comments: updatedComments })
                .eq('id', companyId);
            if (error) throw error;
            setComments(updatedComments);
            toast.success('Comment deleted');
        } catch (err: any) {
            console.error(err);
            toast.error(err?.message || 'Failed to delete comment');
        } finally {
            setDeletingCommentId('');
        }
    };

    const handleDelete = async () => {
        if (!confirm('Delete this company permanently?')) return;
        const { error } = await supabase.from('companies').delete().eq('id', companyId);
        if (error) {
            toast.error(error.message);
        } else {
            toast.success('Company deleted');
            router.push('/companies');
        }
    };

    /* ── loading ── */
    if (loading) {
        return (
            <div className="-m-4 h-[calc(100%+2rem)] lg:-m-6 lg:h-[calc(100%+3rem)] flex flex-col bg-white">
                <div className="shrink-0 bg-zinc-900">
                    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center justify-between py-4">
                            <Skeleton className="h-5 w-28 rounded-md bg-white/20" />
                            <div className="flex items-center gap-2">
                                <Skeleton className="h-8 w-20 rounded-md bg-white/20" />
                                <Skeleton className="h-8 w-20 rounded-md bg-white/20" />
                            </div>
                        </div>
                        <div className="flex items-center gap-4 pb-6 sm:pb-8">
                            <Skeleton className="h-16 w-16 rounded-lg bg-white/20" />
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-40 rounded bg-white/20" />
                                <Skeleton className="h-6 w-64 rounded bg-white/20" />
                                <Skeleton className="h-4 w-44 rounded bg-white/20" />
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
                            <Skeleton className="mb-4 h-5 w-40 rounded-md" />
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                {Array.from({ length: 6 }).map((_, i) => (
                                    <div key={i} className="space-y-2">
                                        <Skeleton className="h-3 w-20 rounded" />
                                        <Skeleton className="h-4 w-44 rounded" />
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="rounded-2xl border border-zinc-200 bg-white p-5">
                            <Skeleton className="mb-4 h-5 w-32 rounded-md" />
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
                    <Building2 className="h-7 w-7 text-zinc-400" />
                </div>
                <div>
                    <p className="text-lg font-semibold text-zinc-900">Company not found</p>
                    <p className="mt-1 text-sm text-zinc-500">This company may have been deleted or the ID is invalid.</p>
                </div>
                <Button onClick={() => router.push('/companies')} variant="primary" size="sm" leftIcon={<ArrowLeft className="h-4 w-4" />}>
                    Back to Companies
                </Button>
            </div>
        );
    }

    /* ── data ── */
    const name = company.name || 'Unknown Company';
    const industry = company.industry || '';
    const website = company.website_url || company.primary_domain || '';
    const phone = company.phone || company.sanitized_phone || '';
    const location = formatCompanyLocation(company);
    const logoUrl = company.logo_url;
    const employees = company.estimated_num_employees || 0;

    const foundedYear = company.founded_year ? String(company.founded_year) : '';
    const revenue =
        company.organization_revenue_printed ||
        (company.revenue ? formatMoney(Number(company.revenue)) : '') ||
        '';
    const linkedinUrl = company.linkedin_url || company.linkedin || '';
    const twitterUrl = company.twitter_url || company.twitter || '';
    const facebookUrl = company.facebook_url || company.facebook || '';
    const keywords: string[] = Array.isArray(company.keywords) ? company.keywords.filter(Boolean) : [];
    const streetAddress = [company.street_address, company.city, company.state, company.postal_code]
        .filter(Boolean)
        .join(', ') || company.raw_address || '';
    const publiclyTraded = [company.publicly_traded_exchange, company.publicly_traded_symbol]
        .filter(Boolean)
        .join(': ');
    const alexaRanking = company.alexa_ranking ? Number(company.alexa_ranking) : 0;

    const ensureHttp = (url: string) => (url.startsWith('http') ? url : `https://${url}`);
    const ExternalLink = ({ href, children }: { href: string; children: React.ReactNode }) => (
        <a
            href={ensureHttp(href)}
            target="_blank"
            rel="noreferrer"
            className="text-orange-600 hover:underline break-all"
        >
            {children}
        </a>
    );

    const handleBack = () => {
        if (fromShowId) {
            const query = fromTab && fromTab !== 'overview'
                ? `?tab=${encodeURIComponent(fromTab)}`
                : '';
            router.push(`/shows/${fromShowId}${query}`);
            return;
        }
        router.push('/companies');
    };

    const detailRows = [
        industry && { label: 'Industry', value: industry, icon: <Building2 className="h-4 w-4" /> },
        website && {
            label: 'Website',
            value: <ExternalLink href={website}>{website}</ExternalLink>,
            icon: <Globe2 className="h-4 w-4" />,
        },
        location && { label: 'Location', value: location, icon: <MapPin className="h-4 w-4" /> },
        streetAddress && { label: 'Address', value: streetAddress, icon: <MapPin className="h-4 w-4" /> },
        employees > 0 && { label: 'Employees', value: employees.toLocaleString(), icon: <Users className="h-4 w-4" /> },
        foundedYear && { label: 'Founded', value: foundedYear, icon: <Calendar className="h-4 w-4" /> },
        revenue && { label: 'Revenue', value: revenue, icon: <DollarSign className="h-4 w-4" /> },
        phone && { label: 'Phone', value: phone, icon: <Phone className="h-4 w-4" /> },
        publiclyTraded && { label: 'Publicly Traded', value: publiclyTraded, icon: <Landmark className="h-4 w-4" /> },
        alexaRanking > 0 && { label: 'Alexa Ranking', value: `#${alexaRanking.toLocaleString()}`, icon: <TrendingUp className="h-4 w-4" /> },
        linkedinUrl && {
            label: 'LinkedIn',
            value: <ExternalLink href={linkedinUrl}>{linkedinUrl.replace(/^https?:\/\/(www\.)?/, '')}</ExternalLink>,
            icon: <Linkedin className="h-4 w-4" />,
        },
        twitterUrl && {
            label: 'Twitter / X',
            value: <ExternalLink href={twitterUrl}>{twitterUrl.replace(/^https?:\/\/(www\.)?/, '')}</ExternalLink>,
            icon: <Twitter className="h-4 w-4" />,
        },
        facebookUrl && {
            label: 'Facebook',
            value: <ExternalLink href={facebookUrl}>{facebookUrl.replace(/^https?:\/\/(www\.)?/, '')}</ExternalLink>,
            icon: <Facebook className="h-4 w-4" />,
        },
        keywords.length > 0 && {
            label: 'Keywords',
            value: (
                <div className="flex flex-wrap gap-1.5">
                    {keywords.slice(0, 12).map((kw) => (
                        <span
                            key={kw}
                            className="inline-flex items-center rounded-md border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 text-[11px] font-medium text-zinc-600"
                        >
                            {kw}
                        </span>
                    ))}
                </div>
            ),
            icon: <Tag className="h-4 w-4" />,
        },
    ].filter(Boolean) as { label: string; value: any; icon: React.ReactNode }[];

    return (
        <div className="-m-4 h-[calc(100%+2rem)] lg:-m-6 lg:h-[calc(100%+3rem)] flex flex-col bg-white">

            {/* ── Compact Header Banner ── */}
            <div className="shrink-0 bg-zinc-900">
                <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
                    {/* Top bar */}
                    <div className="flex items-center justify-between py-4">
                        <button
                            onClick={handleBack}
                            className="group flex cursor-pointer items-center gap-2 text-sm font-medium text-zinc-400 transition-colors hover:text-white"
                        >
                            <ArrowLeft className="h-4 w-4 shrink-0 transition-transform group-hover:-translate-x-0.5" />
                            {fromShowId && fromShowName ? (
                                <span className="flex min-w-0 flex-col items-start leading-tight">
                                    <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 group-hover:text-zinc-300">
                                        Exhibition
                                    </span>
                                    <span className="max-w-[12rem] truncate text-sm font-medium text-zinc-300 group-hover:text-white sm:max-w-xs">
                                        {fromShowName}
                                    </span>
                                </span>
                            ) : (
                                'Companies'
                            )}
                        </button>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => toast.info('Apollo enrichment coming soon')}
                                className="flex h-8 cursor-pointer items-center gap-1.5 rounded-md bg-blue-500/15 px-3 text-xs font-semibold text-blue-300 transition-colors hover:bg-blue-500/25 hover:text-blue-200"
                            >
                                <Sparkles className="h-3.5 w-3.5" />
                                Enrich (Apollo)
                            </button>
                            <button
                                onClick={() => toast.info('Edit coming soon')}
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

                    {/* Company identity */}
                    <div className="flex items-center gap-4 pb-6 sm:gap-5 sm:pb-8">
                        <CompanyLogo
                            name={name}
                            logoUrl={logoUrl}
                            company={company}
                            className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white shadow-2xl ring-2 ring-white/25 sm:h-16 sm:w-16"
                            initialsClassName="text-lg sm:text-xl"
                        />
                        <div className="min-w-0">
                            {industry && (
                                <span className="mb-1 inline-block rounded bg-orange-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-orange-300">
                                    {industry}
                                </span>
                            )}
                            <h1 className="truncate text-xl font-bold text-white sm:text-2xl">
                                {name}
                            </h1>
                            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-zinc-400">
                                {location && (
                                    <span className="flex items-center gap-1">
                                        <MapPin className="h-3 w-3" />
                                        {location}
                                    </span>
                                )}
                                {website && (
                                    <span className="flex items-center gap-1">
                                        <Link2 className="h-3 w-3" />
                                        {website}
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
                <div className="w-full py-6 sm:py-8 flex flex-col">
                    <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">

                        {/* Overview Tab */}
                        {activeTab === 'overview' && (
                            <div className="space-y-6">
                                {company.description && (
                                    <div className="rounded-lg border border-zinc-200 bg-white">
                                        <div className="border-b border-zinc-100 px-5 py-3">
                                            <h2 className="text-sm font-semibold text-zinc-900">About {name}</h2>
                                        </div>
                                        <div className="px-5 py-4">
                                            <p className="text-sm leading-relaxed text-zinc-600 whitespace-pre-wrap">
                                                {company.description}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                <div className="rounded-lg border border-zinc-200 bg-white">
                                    <div className="border-b border-zinc-100 px-5 py-3">
                                        <h2 className="text-sm font-semibold text-zinc-900">Company Details</h2>
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
                                </div>

                                <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm shadow-zinc-950/5">
                                    <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-3.5">
                                        <h2 className="text-sm font-semibold text-zinc-900">Show Participations</h2>
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs font-medium text-zinc-400">
                                                {showsLoading
                                                    ? 'Loading...'
                                                    : `${showParticipations.length} exhibitions · ${totalEditions} editions`}
                                            </span>
                                            {!showsLoading && showParticipations.length > 0 && (
                                                <button
                                                    type="button"
                                                    onClick={() => setActiveTab('shows')}
                                                    className="text-xs font-semibold text-orange-600 transition-colors hover:text-orange-700"
                                                >
                                                    View all
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <ShowParticipationBars
                                        groups={showParticipations.slice(0, 2)}
                                        loading={showsLoading}
                                        onShowClick={(showId) => router.push(`/shows/${showId}`)}
                                    />
                                </div>

                                {comments.length > 0 && (
                                    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm shadow-zinc-950/5">
                                        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-3.5">
                                            <h2 className="text-sm font-semibold text-zinc-900">Recent Comments</h2>
                                            <span className="text-xs font-medium text-zinc-400">{comments.length} total</span>
                                        </div>
                                        <div className="divide-y divide-zinc-100">
                                            {comments
                                                .slice()
                                                .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
                                                .slice(0, 3)
                                                .map((comment) => {
                                                    const commentName = String(comment.userName || 'Unknown User');
                                                    const createdAt = comment.createdAt
                                                        ? new Date(comment.createdAt).toLocaleString()
                                                        : 'Unknown time';
                                                    return (
                                                        <div key={comment.id} className="px-5 py-4">
                                                            <div className="mb-1.5 flex items-start justify-between gap-3">
                                                                <div className="flex min-w-0 items-center gap-2">
                                                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-zinc-100 text-[10px] font-bold text-zinc-600">
                                                                        {comment.userProfileUrl ? (
                                                                            <img src={comment.userProfileUrl} alt={commentName} className="h-full w-full object-cover" />
                                                                        ) : (
                                                                            initialsFromName(commentName)
                                                                        )}
                                                                    </div>
                                                                    <p className="truncate text-sm font-semibold text-zinc-900">{commentName}</p>
                                                                </div>
                                                                <p className="text-xs text-zinc-400">{createdAt}</p>
                                                            </div>
                                                            <p className="line-clamp-2 text-sm leading-relaxed text-zinc-600">{String(comment.text || '')}</p>
                                                        </div>
                                                    );
                                                })}
                                        </div>
                                        <div className="border-t border-zinc-100 bg-zinc-50/60 px-5 py-3">
                                            <button
                                                onClick={() => setActiveTab('comments')}
                                                className="text-xs font-semibold text-orange-600 transition-colors hover:text-orange-700"
                                            >
                                                View all comments
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Shows Tab */}
                        {activeTab === 'shows' && (
                            <div className="flex flex-col gap-5">
                                <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                                    <div>
                                        <h2 className="text-lg font-semibold text-zinc-900">Shows</h2>
                                        <p className="mt-1 text-sm text-zinc-500">
                                            Exhibitions {name} has participated in, grouped by show and year.
                                        </p>
                                    </div>
                                    {!showsLoading && (
                                        <span className="text-xs font-medium text-zinc-400">
                                            {showParticipations.length} show{showParticipations.length === 1 ? '' : 's'} · {totalEditions} edition{totalEditions === 1 ? '' : 's'}
                                        </span>
                                    )}
                                </div>

                                <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm shadow-zinc-950/5">
                                    <ShowParticipationBars
                                        groups={showParticipations}
                                        loading={showsLoading}
                                        onShowClick={(showId) => router.push(`/shows/${showId}`)}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Contacts Tab */}
                        {activeTab === 'contacts' && (
                            <div className="flex flex-col gap-5">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <h2 className="text-lg font-semibold text-zinc-900">Contacts</h2>
                                    <Button size="sm" variant="primary" leftIcon={<Plus className="h-4 w-4" />} onClick={() => toast.info('Coming soon')}>
                                        Add Contact
                                    </Button>
                                </div>
                                {people.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                        {people.map(person => (
                                            <ProfileCard
                                                key={person.id}
                                                lead={person}
                                                isSaved={true}
                                            />
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center gap-4 py-20 bg-white rounded-2xl border border-zinc-200">
                                        <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-orange-50">
                                            <Users className="h-8 w-8 text-orange-400" />
                                        </div>
                                        <div className="text-center">
                                            <p className="text-base font-semibold text-zinc-900">No contacts found</p>
                                            <p className="mt-1 text-sm text-zinc-500">There are no contacts associated with {name}.</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Comments Tab */}
                        {activeTab === 'comments' && (
                            <div className="flex flex-col gap-5">
                                <div>
                                    <h2 className="text-lg font-semibold text-zinc-900">Comments</h2>
                                    <p className="mt-1 text-sm text-zinc-500">Keep team comments and follow-ups in one stream.</p>
                                </div>

                                <div className="rounded-2xl border border-zinc-200 bg-white p-4">
                                    <textarea
                                        value={commentText}
                                        onChange={(e) => setCommentText(e.target.value)}
                                        placeholder="Write a comment..."
                                        className="min-h-[96px] w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 outline-none transition-colors placeholder:text-zinc-400 focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
                                    />
                                    <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                        <div className="text-xs text-zinc-500">
                                            <span>{commentText.length} chars</span>
                                            <span className="mx-1.5 text-zinc-300">·</span>
                                            <span>Signed in as {currentUserName}</span>
                                        </div>
                                        <Button
                                            size="sm"
                                            variant="primary"
                                            leftIcon={<Plus className="h-4 w-4" />}
                                            onClick={handleAddComment}
                                            isLoading={savingComment}
                                            disabled={!commentText.trim()}
                                            className="self-end sm:self-auto"
                                        >
                                            Post Comment
                                        </Button>
                                    </div>
                                </div>

                                {comments.length > 0 ? (
                                    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm shadow-zinc-950/5">
                                        <div className="border-b border-zinc-100 px-5 py-3.5">
                                            <p className="text-sm font-semibold text-zinc-900">{comments.length} comments</p>
                                        </div>
                                        <div className="divide-y divide-zinc-100">
                                            {comments
                                                .slice()
                                                .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
                                                .map((comment) => {
                                                    const commentName = String(comment.userName || 'Unknown User');
                                                    const createdAt = comment.createdAt
                                                        ? new Date(comment.createdAt).toLocaleString()
                                                        : 'Unknown time';
                                                    const canDelete = comment.uid === currentUserId;

                                                    return (
                                                        <div key={comment.id} className="px-5 py-4">
                                                            <div className="mb-2 flex items-start justify-between gap-3">
                                                                <div className="flex min-w-0 items-center gap-2">
                                                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-zinc-100 text-[10px] font-bold text-zinc-600">
                                                                        {comment.userProfileUrl ? (
                                                                            <img src={comment.userProfileUrl} alt={commentName} className="h-full w-full object-cover" />
                                                                        ) : (
                                                                            initialsFromName(commentName)
                                                                        )}
                                                                    </div>
                                                                    <div className="min-w-0">
                                                                        <p className="truncate text-sm font-semibold text-zinc-900">{commentName}</p>
                                                                        <p className="text-xs text-zinc-500">{createdAt}</p>
                                                                    </div>
                                                                </div>
                                                                {canDelete && (
                                                                    <button
                                                                        onClick={() => handleDeleteComment(comment.id)}
                                                                        disabled={deletingCommentId === comment.id}
                                                                        className="cursor-pointer rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs font-semibold text-red-600 transition-colors hover:bg-red-100 disabled:opacity-60"
                                                                    >
                                                                        {deletingCommentId === comment.id ? 'Deleting...' : 'Delete'}
                                                                    </button>
                                                                )}
                                                            </div>
                                                            <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-700">{String(comment.text || '')}</p>
                                                        </div>
                                                    );
                                                })}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center gap-4 py-20 bg-white rounded-2xl border border-zinc-200">
                                        <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-zinc-50">
                                            <FileText className="h-8 w-8 text-zinc-300" />
                                        </div>
                                        <div className="text-center">
                                            <p className="text-base font-semibold text-zinc-900">No comments yet</p>
                                            <p className="mt-1 text-sm text-zinc-500">Be the first to add a comment to {name}.</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                    </div>
                </div>
            </div>
        </div>
    );
}
