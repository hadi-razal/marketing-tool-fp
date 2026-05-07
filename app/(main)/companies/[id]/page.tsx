'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
} from 'lucide-react';
import { toast } from 'sonner';
import { getBrandColor } from '@/lib/utils';
import { ProfileCard } from '@/components/ProfileCard';

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

/* ─── tabs ────────────────────────────────────────────────── */

type Tab = 'overview' | 'contacts' | 'comments';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <LayoutGrid className="h-4 w-4" /> },
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
    const supabase = useMemo(() => createClient(), []);

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

    const companyId = params?.id as string;

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
                            {Array.from({ length: 3 }).map((_, i) => (
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
    const industry = company.industry || company.industries?.[0] || '';
    const website = company.website_url || company.primary_domain || '';
    const phone = company.sanitized_phone || company.phone || '';
    const location = [company.city, company.country].filter(Boolean).join(', ') || company.raw_address || '';
    const initials = initialsFromName(name);
    const logoUrl = company.logo_url;
    const employees = company.estimated_num_employees || 0;
    const revenue = company.organization_revenue_printed || formatMoney(company.organization_revenue) || '';
    const founded = company.founded_year || '';

    const detailRows = [
        industry && { label: 'Industry', value: industry, icon: <Building2 className="h-4 w-4" /> },
        location && { label: 'Location', value: location, icon: <MapPin className="h-4 w-4" /> },
        employees > 0 && { label: 'Employees', value: employees.toLocaleString(), icon: <Users className="h-4 w-4" /> },
        revenue && { label: 'Revenue', value: revenue, icon: <Activity className="h-4 w-4" /> },
        founded && { label: 'Founded', value: String(founded), icon: <Calendar className="h-4 w-4" /> },
        phone && { label: 'Phone', value: phone, icon: <Phone className="h-4 w-4" /> },
        website && {
            label: 'Website',
            value: <a href={website.startsWith('http') ? website : `https://${website}`} target="_blank" rel="noreferrer" className="text-orange-600 hover:underline">{website}</a>,
            icon: <Globe2 className="h-4 w-4" />,
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
                            onClick={() => router.back()}
                            className="group flex cursor-pointer items-center gap-2 text-sm font-medium text-zinc-400 transition-colors hover:text-white"
                        >
                            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
                            Companies
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
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white shadow-2xl ring-2 ring-white/25 sm:h-16 sm:w-16">
                            {logoUrl ? (
                                <img
                                    src={logoUrl}
                                    alt={`${name} logo`}
                                    className="h-full w-full object-contain p-1"
                                    loading="lazy"
                                />
                            ) : (
                                <div
                                    className="w-full h-full flex items-center justify-center text-lg font-bold text-white sm:text-xl"
                                    style={{ backgroundColor: getBrandColor(name) }}
                                >
                                    {initials}
                                </div>
                            )}
                        </div>
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
                                        <h2 className="text-sm font-semibold text-zinc-900">Key Contacts</h2>
                                        <span className="text-xs font-medium text-zinc-400">{people.length} contacts</span>
                                    </div>
                                    <div className="divide-y divide-zinc-100">
                                        {people.length > 0 ? (
                                            people.slice(0, 4).map(person => (
                                                <div key={person.id} className="px-5 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full overflow-hidden bg-zinc-100 shrink-0">
                                                            {person.photo_url || person.image ? (
                                                                <img src={person.photo_url || person.image} alt={person.full_name} className="w-full h-full object-cover" />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-white" style={{ backgroundColor: getBrandColor(person.full_name) }}>
                                                                    {initialsFromName(person.full_name || 'U')}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <p className="text-sm font-semibold text-zinc-900 truncate">{person.full_name}</p>
                                                            <p className="text-[10px] text-zinc-500 truncate">{person.title || person.job_title || 'Employee'}</p>
                                                            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[10px] text-zinc-500">
                                                                {(person.email || person.primary_email) && <span className="truncate">{person.email || person.primary_email}</span>}
                                                                {(person.phone || person.mobile_phone || person.work_phone) && <span>{person.phone || person.mobile_phone || person.work_phone}</span>}
                                                                {(person.city && person.country) ? <span>{person.city}, {person.country}</span> : person.location ? <span>{person.location}</span> : null}
                                                                {(person.linkedin_url || person.linkedin) && (
                                                                    <a
                                                                        href={(person.linkedin_url || person.linkedin).startsWith('http') ? (person.linkedin_url || person.linkedin) : `https://${person.linkedin_url || person.linkedin}`}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="font-medium text-orange-600 hover:underline"
                                                                    >
                                                                        LinkedIn
                                                                    </a>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="px-5 py-6 text-center">
                                                <p className="text-xs text-zinc-500">No people found.</p>
                                            </div>
                                        )}
                                    </div>
                                    {people.length > 4 && (
                                        <div className="border-t border-zinc-100 bg-zinc-50/60 px-5 py-4">
                                            <button onClick={() => setActiveTab('contacts')} className="text-xs font-semibold text-orange-600 transition-colors hover:text-orange-700">
                                                View all {people.length} contacts
                                            </button>
                                        </div>
                                    )}
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
