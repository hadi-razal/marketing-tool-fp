import React, { useState, useEffect, useMemo } from 'react';
import { X, Globe, Linkedin, Twitter, Facebook, MapPin, Users, Calendar, DollarSign, Phone, Building2, Save, CheckCircle2, Loader2, Trash2, ChevronDown, ChevronUp, Search, Mail, ChevronRight, Hash, Reply, Edit2, Plus, UserPlus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Company } from './CompanyCard';
import { formatDistanceToNow, format, isBefore, subHours } from 'date-fns';

import { getBrandColor, normalizeOrganizationDomain, formatCompanyLocation } from '@/lib/utils';
import { databaseService, Comment, SavedPerson } from '@/services/databaseService';
import { createClient } from '@/lib/supabase';
import { toast } from 'sonner';

interface CompanyDetailsModalProps {
    company: Company | null;
    isOpen: boolean;
    onClose: () => void;
    onSave?: (company: Company) => Promise<void>; // Async save handler
    /** Called after a saved person is deleted from Supabase (so parent lists can update). */
    onPersonRemoved?: (personId: string) => void;
    /** After editing a saved company in the database, parent refreshes list / selection. */
    onCompanyUpdated?: (company: Company) => void;
}

function companyToSavePayload(c: Company) {
    const rawKw = c.keywords as string[] | string | undefined;
    const kw = Array.isArray(rawKw)
        ? rawKw
        : typeof rawKw === 'string'
          ? rawKw.split(',').map((x: string) => x.trim()).filter(Boolean)
          : [];
    let websiteUrl = ((c as Company & { website_url?: string }).website_url || c.website || '').trim();
    if (websiteUrl && !/^https?:\/\//i.test(websiteUrl)) {
        websiteUrl = `https://${websiteUrl.replace(/^\/+/, '')}`;
    }
    return {
        id: c.id,
        name: c.name,
        website_url: websiteUrl || null,
        linkedin_url: c.linkedin || null,
        twitter_url: c.twitter || null,
        facebook_url: c.facebook || null,
        logo_url: c.logo || null,
        primary_domain: c.primary_domain || null,
        industry: c.industry || null,
        keywords: kw.length ? kw : null,
        phone: c.phone || null,
        country: c.country || null,
        world_area: (c as Company & { world_area?: string }).world_area || null,
        estimated_num_employees: typeof c.employees === 'number' ? c.employees : null,
        comments: c.comments ?? null,
    };
}

// Helper for date formatting
const formatCommentDate = (dateString: string) => {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';

    const now = new Date();
    // If older than 24 hours, show absolute date
    if (isBefore(date, subHours(now, 24))) {
        return format(date, 'MMM d, yyyy h:mm a');
    }

    // Custom "Just now" for very recent
    const diffInSeconds = (now.getTime() - date.getTime()) / 1000;
    if (diffInSeconds < 60) {
        return 'Just now';
    }

    return formatDistanceToNow(date, { addSuffix: true });
};

const personDisplayName = (p: SavedPerson) =>
    (p.name || p.full_name || [p.first_name, p.last_name].filter(Boolean).join(' ') || '').trim() || 'Unknown';

const personLocationStr = (p: SavedPerson) =>
    (p.location || [p.city, p.state, p.country].filter(Boolean).join(', ') || '').trim();

const personLinkedinUrl = (p: SavedPerson) => p.linkedin || p.linkedin_url;

type CompanyCommentDeleteConfirm =
    | null
    | { kind: 'comment'; commentId: string }
    | { kind: 'reply'; commentId: string; replyId: string };

const Avatar = ({ src, alt, name, className }: { src?: string, alt: string, name: string, className?: string }) => {
    const [imageError, setImageError] = useState(false);

    // Ignore backend-provided ui-avatars URLs to ensure consistent styling
    const isUiAvatar = src?.includes('ui-avatars.com');
    const hasValidImage = src && !isUiAvatar && !imageError;

    if (hasValidImage) {
        return (
            <img
                src={src}
                alt={alt}
                className={className}
                onError={() => setImageError(true)}
            />
        );
    }

    const initials = name
        ? name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
        : 'U';

    return (
        <div className={`${className} flex items-center justify-center bg-orange-500 text-white font-bold`}>
            {initials}
        </div>
    );
};

export const CompanyDetailsModal: React.FC<CompanyDetailsModalProps> = ({
    company,
    isOpen,
    onClose,
    onSave,
    onPersonRemoved,
    onCompanyUpdated,
}) => {
    const [isSaving, setIsSaving] = useState(false);
    const [localCompany, setLocalCompany] = useState<Company | null>(null);
    const [editingSavedCompany, setEditingSavedCompany] = useState(false);
    const [isUpdatingCompany, setIsUpdatingCompany] = useState(false);
    const [showAllKeywords, setShowAllKeywords] = useState(false);
    const [localComments, setLocalComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState('');
    const [isPostingComment, setIsPostingComment] = useState(false);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'overview' | 'comments' | 'people'>('overview');
    const [companyPeople, setCompanyPeople] = useState<SavedPerson[]>([]);
    const [isLoadingPeople, setIsLoadingPeople] = useState(false);
    const [peopleQuery, setPeopleQuery] = useState('');
    const [peopleSort, setPeopleSort] = useState<'name' | 'title' | 'location'>('name');
    const [showAdvancedCompany, setShowAdvancedCompany] = useState(false);
    const [personRemoveLoadingId, setPersonRemoveLoadingId] = useState<string | null>(null);
    const [linkPickerOpen, setLinkPickerOpen] = useState(false);
    const [linkPickerQuery, setLinkPickerQuery] = useState('');
    const [savedPeoplePool, setSavedPeoplePool] = useState<SavedPerson[]>([]);
    const [loadingSavedPeoplePool, setLoadingSavedPeoplePool] = useState(false);
    const [linkingPersonId, setLinkingPersonId] = useState<string | null>(null);
    const [replyingTo, setReplyingTo] = useState<{ id: string, userName: string, text: string, userProfileUrl?: string } | null>(null);
    const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
    const [commentDeleteConfirm, setCommentDeleteConfirm] = useState<CompanyCommentDeleteConfirm>(null);
    const [isCommentDeleteLoading, setIsCommentDeleteLoading] = useState(false);
    const commentsEndRef = React.useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        const fetchUser = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setCurrentUserId(user.id);
            }
        };
        fetchUser();
    }, []);

    useEffect(() => {
        if (!isOpen) setLinkPickerOpen(false);
    }, [isOpen]);

    useEffect(() => {
        if (!company) {
            setLocalCompany(null);
            return;
        }
        if (!editingSavedCompany) setLocalCompany(company);
    }, [company, editingSavedCompany]);

    useEffect(() => {
        // Reset comments when company changes
        setLocalComments([]);
        setReplyingTo(null);
        setExpandedComments(new Set());
        setCommentDeleteConfirm(null);

        const fetchComments = async () => {
            if (company?.id && company.isSaved) {
                try {
                    const comments = await databaseService.getComments(company.id);
                    setLocalComments(comments);
                } catch (error) {
                    console.error('Failed to fetch comments:', error);
                }
            } else if (company?.comments) {
                setLocalComments(company.comments);
            }
        };

        fetchComments();
    }, [company?.id, company?.isSaved]);

    useEffect(() => {
        setPeopleQuery('');
        setPeopleSort('name');
        setLinkPickerOpen(false);
        setLinkPickerQuery('');
    }, [company?.id]);

    useEffect(() => {
        const fetchPeople = async () => {
            if (!isOpen || !company?.id) return;
            setIsLoadingPeople(true);
            try {
                const domain =
                    normalizeOrganizationDomain(company.primary_domain) ||
                    normalizeOrganizationDomain(company.website) ||
                    normalizeOrganizationDomain((company as Company & { website_url?: string }).website_url);
                const people = await databaseService.getPeopleByCompany(company.id, {
                    companyName: company.name,
                    domain: domain ?? undefined,
                });
                setCompanyPeople(people);
            } catch (error) {
                console.error('Failed to fetch people:', error);
            } finally {
                setIsLoadingPeople(false);
            }
        };

        fetchPeople();
    }, [isOpen, company?.id, company?.name, company?.primary_domain, company?.website]);

    useEffect(() => {
        if (activeTab === 'comments') {
            // Small timeout to ensure DOM is ready
            setTimeout(scrollToBottom, 100);
        } else {
            setCommentDeleteConfirm(null);
        }
    }, [activeTab, localComments.length]);

    const filteredSortedPeople = useMemo(() => {
        const q = peopleQuery.trim().toLowerCase();
        let list = [...companyPeople];
        if (q) {
            list = list.filter((p) => {
                const blob = [
                    personDisplayName(p),
                    p.email,
                    p.title,
                    p.headline,
                    personLocationStr(p),
                    personLinkedinUrl(p),
                ]
                    .filter(Boolean)
                    .join(' ')
                    .toLowerCase();
                return blob.includes(q);
            });
        }
        const loc = (p: SavedPerson) => personLocationStr(p) || '\uffff';
        list.sort((a, b) => {
            if (peopleSort === 'title') {
                return (a.title || '').localeCompare(b.title || '', undefined, { sensitivity: 'base' });
            }
            if (peopleSort === 'location') {
                return loc(a).localeCompare(loc(b), undefined, { sensitivity: 'base' });
            }
            return personDisplayName(a).localeCompare(personDisplayName(b), undefined, { sensitivity: 'base' });
        });
        return list;
    }, [companyPeople, peopleQuery, peopleSort]);

    const linkableSavedPeople = useMemo(() => {
        const linked = new Set(companyPeople.map((p) => p.id));
        const q = linkPickerQuery.trim().toLowerCase();
        return savedPeoplePool.filter((p) => {
            if (linked.has(p.id)) return false;
            if (!q) return true;
            const blob = [
                personDisplayName(p),
                p.email,
                p.title,
                p.company,
                p.organization_name,
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();
            return blob.includes(q);
        });
    }, [savedPeoplePool, companyPeople, linkPickerQuery]);

    const openLinkPeoplePicker = async () => {
        if (!company?.isSaved) {
            toast.info('Save this company to your database first');
            return;
        }
        setLinkPickerOpen(true);
        setLoadingSavedPeoplePool(true);
        setLinkPickerQuery('');
        try {
            const rows = await databaseService.getSavedPeople();
            setSavedPeoplePool(rows);
        } catch (e) {
            console.error(e);
            toast.error('Could not load saved people');
        } finally {
            setLoadingSavedPeoplePool(false);
        }
    };

    const handleLinkPersonToCompany = async (personId: string) => {
        if (!company?.id || !company.isSaved) return;
        const c = localCompany ?? company;
        setLinkingPersonId(personId);
        try {
            await databaseService.linkPersonToCompany(personId, {
                id: c.id,
                name: c.name,
                primary_domain: c.primary_domain,
                website: c.website,
                website_url: (c as Company & { website_url?: string }).website_url,
            });
            const domain =
                normalizeOrganizationDomain(c.primary_domain) ||
                normalizeOrganizationDomain(c.website) ||
                normalizeOrganizationDomain((c as Company & { website_url?: string }).website_url);
            const people = await databaseService.getPeopleByCompany(c.id, {
                companyName: c.name,
                domain: domain ?? undefined,
            });
            setCompanyPeople(people);
            toast.success('Linked to this company');
            setLinkPickerOpen(false);
        } catch (e) {
            console.error(e);
            toast.error('Could not link person');
        } finally {
            setLinkingPersonId(null);
        }
    };

    if (!company) return null;

    const displayCompany = localCompany ?? company;

    const brandColor = getBrandColor(displayCompany.name);

    const hasAdvancedCompanyFields = Boolean(
        displayCompany.primary_domain ||
            displayCompany.country ||
            displayCompany.world_area
    );

    const handleSave = async () => {
        if (onSave && !displayCompany.isSaved) {
            setIsSaving(true);
            await onSave(displayCompany);
            setIsSaving(false);
        }
    };

    const handleStartEditSavedCompany = () => {
        setLocalCompany({ ...displayCompany });
        setEditingSavedCompany(true);
    };

    const handleCancelEditSavedCompany = () => {
        setEditingSavedCompany(false);
        setLocalCompany(company);
    };

    const handleSubmitSavedCompanyEdit = async () => {
        if (!localCompany?.id) return;
        setIsUpdatingCompany(true);
        try {
            await databaseService.saveCompany(companyToSavePayload(localCompany));
            const fresh = await databaseService.getCompanyById(localCompany.id);
            if (fresh) {
                setLocalCompany(fresh);
                onCompanyUpdated?.(fresh);
            }
            setEditingSavedCompany(false);
            toast.success('Company updated');
        } catch (e) {
            console.error(e);
            toast.error('Could not update company');
        } finally {
            setIsUpdatingCompany(false);
        }
    };

    const handleRequestDeleteComment = (commentId: string) => {
        setCommentDeleteConfirm({ kind: 'comment', commentId });
    };

    const handleRequestDeleteReply = (commentId: string, replyId: string) => {
        setCommentDeleteConfirm({ kind: 'reply', commentId, replyId });
    };

    const handleConfirmCommentDelete = async () => {
        if (!commentDeleteConfirm) return;
        setIsCommentDeleteLoading(true);
        try {
            if (commentDeleteConfirm.kind === 'comment') {
                const updatedComments = await databaseService.deleteComment(displayCompany.id, commentDeleteConfirm.commentId);
                setLocalComments(updatedComments);
                toast.success('Comment deleted');
            } else {
                const updatedComments = await databaseService.deleteReply(
                    displayCompany.id,
                    commentDeleteConfirm.commentId,
                    commentDeleteConfirm.replyId
                );
                setLocalComments(updatedComments);
                toast.success('Reply deleted');
            }
            setCommentDeleteConfirm(null);
        } catch (error) {
            console.error('Failed to delete comment or reply:', error);
            toast.error(
                commentDeleteConfirm.kind === 'comment'
                    ? 'Failed to delete comment. Please try again.'
                    : 'Failed to delete reply. Please try again.'
            );
        } finally {
            setIsCommentDeleteLoading(false);
        }
    };

    const handlePostComment = async () => {
        if (!newComment.trim()) return;

        setIsPostingComment(true);
        try {
            let updatedComments;
            if (replyingTo) {
                updatedComments = await databaseService.addReply(displayCompany.id, replyingTo.id, newComment.trim());
                // Automatically expand the comment we just replied to
                setExpandedComments(prev => new Set(prev).add(replyingTo.id));
                setReplyingTo(null);
            } else {
                updatedComments = await databaseService.addComment(displayCompany.id, newComment.trim());
                // Scroll to bottom for new main comments
                setTimeout(scrollToBottom, 100);
            }
            setLocalComments(updatedComments);
            setNewComment('');
            toast.success(replyingTo ? 'Reply posted' : 'Comment posted');
        } catch (error) {
            console.error('Failed to post comment/reply:', error);
            toast.error('Failed to post. Please try again.');
        } finally {
            setIsPostingComment(false);
        }
    };

    const toggleReplies = (commentId: string) => {
        setExpandedComments(prev => {
            const next = new Set(prev);
            if (next.has(commentId)) {
                next.delete(commentId);
            } else {
                next.add(commentId);
            }
            return next;
        });
    };

    const handleRemoveSavedPerson = async (person: SavedPerson) => {
        if (!displayCompany?.isSaved) return;
        const name = personDisplayName(person);
        if (!confirm(`Remove "${name}" from your saved contacts? This cannot be undone.`)) return;
        setPersonRemoveLoadingId(person.id);
        try {
            await databaseService.deletePerson(person.id);
            setCompanyPeople((prev) => prev.filter((p) => p.id !== person.id));
            onPersonRemoved?.(person.id);
            toast.success(`${name} removed from your database`);
        } catch (error) {
            console.error(error);
            toast.error('Could not remove this contact. Please try again.');
        } finally {
            setPersonRemoveLoadingId(null);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-zinc-950/45 backdrop-blur-sm z-150"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        onClick={(e) => e.stopPropagation()}
                        className="fixed inset-0 m-auto w-full max-w-5xl h-[85vh] bg-white border border-zinc-200 shadow-2xl shadow-zinc-950/20 rounded-3xl z-150 overflow-hidden flex flex-col"
                    >
                        <div className="relative flex min-h-0 flex-1 flex-col">
                        {/* Hero header — matches lead modal / app shell */}
                        <div
                            className="relative h-64 border-b border-zinc-200 shrink-0 transition-colors duration-700"
                            style={{ background: `linear-gradient(135deg, #ffffff 0%, #fafafa 40%, ${brandColor}15 100%)` }}
                        >
                            <button
                                onClick={onClose}
                                className="absolute top-6 right-6 p-2 bg-zinc-100 hover:bg-orange-50 rounded-full text-zinc-500 hover:text-zinc-950 transition-colors border border-zinc-200 backdrop-blur-md z-20"
                                aria-label="Close modal"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            <div className="absolute bottom-0 left-0 w-full p-6 sm:p-8 flex flex-wrap items-end gap-6 lg:gap-8 bg-linear-to-t from-white via-white/95 to-transparent">
                                <div className="w-28 h-28 lg:w-32 lg:h-32 rounded-2xl bg-white p-1 border-4 border-white shadow-xl flex items-center justify-center overflow-hidden shrink-0">
                                    {displayCompany.logo ? (
                                        <img src={displayCompany.logo} alt={displayCompany.name} className="max-w-[75%] max-h-[75%] object-contain" />
                                    ) : (
                                        <Building2 className="w-14 h-14 text-zinc-300" />
                                    )}
                                </div>
                                <div className="mb-1 flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-3 mb-2">
                                        <h2 className="text-3xl lg:text-4xl font-bold text-zinc-950 tracking-tight leading-tight">{displayCompany.name}</h2>
                                        {displayCompany.isSaved && (
                                            <span className="flex shrink-0 items-center gap-1.5 rounded-lg border border-green-500/20 bg-green-500/10 px-3 py-1 text-xs font-bold text-green-600">
                                                <CheckCircle2 className="w-3.5 h-3.5" /> Database
                                            </span>
                                        )}
                                        {displayCompany.isSaved && !editingSavedCompany && (
                                            <button
                                                type="button"
                                                onClick={handleStartEditSavedCompany}
                                                disabled={isUpdatingCompany}
                                                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1 text-xs font-bold text-zinc-800 shadow-sm transition-colors hover:border-orange-200 hover:bg-orange-50 disabled:opacity-50"
                                            >
                                                <Edit2 className="h-3.5 w-3.5" />
                                                Edit
                                            </button>
                                        )}
                                        {displayCompany.isSaved && editingSavedCompany && (
                                            <div className="flex shrink-0 flex-wrap items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={handleCancelEditSavedCompany}
                                                    disabled={isUpdatingCompany}
                                                    className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-bold text-zinc-700 hover:bg-zinc-100 disabled:opacity-50"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => void handleSubmitSavedCompanyEdit()}
                                                    disabled={isUpdatingCompany}
                                                    className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-950 px-3 py-1 text-xs font-bold text-white hover:bg-zinc-800 disabled:opacity-50"
                                                >
                                                    {isUpdatingCompany ? (
                                                        <>
                                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                            Saving…
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Save className="h-3.5 w-3.5" />
                                                            Save
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    {displayCompany.industry && (
                                        <p className="text-orange-500 text-sm font-bold mb-2">{displayCompany.industry}</p>
                                    )}
                                    <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-600">
                                        {displayCompany.location && (
                                            <span className="flex items-center gap-1.5 min-w-0">
                                                <MapPin className="w-4 h-4 text-zinc-400 shrink-0" />
                                                <span className="truncate">{displayCompany.location}</span>
                                            </span>
                                        )}
                                        {displayCompany.founded_year && (
                                            <span className="flex items-center gap-1.5 shrink-0">
                                                <Calendar className="w-4 h-4 text-zinc-400" strokeWidth={1.5} />
                                                Est. {displayCompany.founded_year}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                {onSave && !displayCompany.isSaved && (
                                    <div className="flex gap-2 mb-1 shrink-0 w-full sm:w-auto">
                                        <button
                                            onClick={handleSave}
                                            disabled={isSaving}
                                            className="px-4 py-2 bg-zinc-950 hover:bg-zinc-800 text-white font-bold text-sm rounded-xl hover:shadow-lg shadow-zinc-950/20 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto justify-center"
                                        >
                                            {isSaving ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                    Saving...
                                                </>
                                            ) : (
                                                <>
                                                    <Save className="w-4 h-4" />
                                                    Save to Database
                                                </>
                                            )}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Tabs */}
                        <div className="px-8 pt-6 bg-white shrink-0">
                            <div className="flex items-center gap-6 border-b border-zinc-200">
                                <button
                                    onClick={() => setActiveTab('overview')}
                                    className={`pb-4 text-sm font-bold transition-all relative ${activeTab === 'overview' ? 'text-zinc-950' : 'text-zinc-500 hover:text-zinc-950'}`}
                                >
                                    Overview
                                    {activeTab === 'overview' && (
                                        <motion.div layoutId="companyModalTab" className="absolute bottom-0 left-0 w-full h-0.5 bg-orange-500 rounded-full" />
                                    )}
                                </button>
                                <button
                                    onClick={() => setActiveTab('comments')}
                                    className={`pb-4 text-sm font-bold transition-all flex items-center gap-2 relative ${activeTab === 'comments' ? 'text-zinc-950' : 'text-zinc-500 hover:text-zinc-950'}`}
                                >
                                    Comments
                                    {localComments.length > 0 && (
                                        <span className="px-1.5 py-0.5 rounded-full bg-orange-50 text-[10px] text-orange-600 font-bold">
                                            {localComments.length}
                                        </span>
                                    )}
                                    {activeTab === 'comments' && (
                                        <motion.div layoutId="companyModalTab" className="absolute bottom-0 left-0 w-full h-0.5 bg-orange-500 rounded-full" />
                                    )}
                                </button>
                                <button
                                    onClick={() => setActiveTab('people')}
                                    className={`pb-4 text-sm font-bold transition-all flex items-center gap-2 relative ${activeTab === 'people' ? 'text-zinc-950' : 'text-zinc-500 hover:text-zinc-950'}`}
                                >
                                    People
                                    {companyPeople.length > 0 && (
                                        <span className="px-1.5 py-0.5 rounded-full bg-orange-50 text-[10px] text-orange-600 font-bold">
                                            {companyPeople.length}
                                        </span>
                                    )}
                                    {activeTab === 'people' && (
                                        <motion.div layoutId="companyModalTab" className="absolute bottom-0 left-0 w-full h-0.5 bg-orange-500 rounded-full" />
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 min-h-0 bg-white flex flex-col relative">
                            <AnimatePresence mode="wait">
                                {activeTab === 'overview' ? (
                                    <motion.div
                                        key="overview"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        transition={{ duration: 0.2 }}
                                        className="flex-1 min-h-0 overflow-y-auto p-8 custom-scrollbar"
                                    >
                                        {editingSavedCompany && localCompany && (
                                            <section className="mb-10 rounded-2xl border border-orange-200/80 bg-orange-50/40 p-6 shadow-inner shadow-zinc-950/5">
                                                <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-zinc-600">
                                                    Edit company details
                                                </h3>
                                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                                    <label className="block md:col-span-2">
                                                        <span className="mb-1 block text-[11px] font-semibold text-zinc-500">Company name</span>
                                                        <input
                                                            value={localCompany.name}
                                                            onChange={(e) =>
                                                                setLocalCompany((p) => (p ? { ...p, name: e.target.value } : p))
                                                            }
                                                            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                                                        />
                                                    </label>
                                                    <label className="block md:col-span-2">
                                                        <span className="mb-1 block text-[11px] font-semibold text-zinc-500">Industry</span>
                                                        <input
                                                            value={localCompany.industry || ''}
                                                            onChange={(e) =>
                                                                setLocalCompany((p) => (p ? { ...p, industry: e.target.value } : p))
                                                            }
                                                            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                                                        />
                                                    </label>
                                                    <label className="block md:col-span-2">
                                                        <span className="mb-1 block text-[11px] font-semibold text-zinc-500">Website URL</span>
                                                        <input
                                                            value={localCompany.website || ''}
                                                            onChange={(e) =>
                                                                setLocalCompany((p) => (p ? { ...p, website: e.target.value } : p))
                                                            }
                                                            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                                                        />
                                                    </label>
                                                    <label className="block">
                                                        <span className="mb-1 block text-[11px] font-semibold text-zinc-500">Country</span>
                                                        <input
                                                            value={localCompany.country || ''}
                                                            onChange={(e) =>
                                                                setLocalCompany((p) => (p ? { ...p, country: e.target.value } : p))
                                                            }
                                                            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                                                        />
                                                    </label>
                                                    <label className="block">
                                                        <span className="mb-1 block text-[11px] font-semibold text-zinc-500">World area</span>
                                                        <input
                                                            value={(localCompany as Company & { world_area?: string }).world_area || ''}
                                                            onChange={(e) =>
                                                                setLocalCompany((p) => (p ? { ...p, world_area: e.target.value } : p))
                                                            }
                                                            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                                                        />
                                                    </label>
                                                    <label className="block">
                                                        <span className="mb-1 block text-[11px] font-semibold text-zinc-500">Phone</span>
                                                        <input
                                                            value={localCompany.phone || ''}
                                                            onChange={(e) =>
                                                                setLocalCompany((p) => (p ? { ...p, phone: e.target.value } : p))
                                                            }
                                                            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                                                        />
                                                    </label>
                                                    <label className="block">
                                                        <span className="mb-1 block text-[11px] font-semibold text-zinc-500">Founded year</span>
                                                        <input
                                                            type="number"
                                                            value={localCompany.founded_year ?? ''}
                                                            onChange={(e) =>
                                                                setLocalCompany((p) =>
                                                                    p
                                                                        ? {
                                                                              ...p,
                                                                              founded_year: e.target.value
                                                                                  ? parseInt(e.target.value, 10)
                                                                                  : undefined,
                                                                          }
                                                                        : p,
                                                                )
                                                            }
                                                            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                                                        />
                                                    </label>
                                                    <label className="block">
                                                        <span className="mb-1 block text-[11px] font-semibold text-zinc-500">Employees (estimate)</span>
                                                        <input
                                                            type="number"
                                                            value={localCompany.employees ?? ''}
                                                            onChange={(e) =>
                                                                setLocalCompany((p) =>
                                                                    p
                                                                        ? {
                                                                              ...p,
                                                                              employees: e.target.value
                                                                                  ? parseInt(e.target.value, 10)
                                                                                  : undefined,
                                                                          }
                                                                        : p,
                                                                )
                                                            }
                                                            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                                                        />
                                                    </label>
                                                    <label className="block md:col-span-2">
                                                        <span className="mb-1 block text-[11px] font-semibold text-zinc-500">Revenue (label)</span>
                                                        <input
                                                            value={localCompany.revenue || ''}
                                                            onChange={(e) =>
                                                                setLocalCompany((p) => (p ? { ...p, revenue: e.target.value } : p))
                                                            }
                                                            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                                                        />
                                                    </label>
                                                    <label className="block md:col-span-2">
                                                        <span className="mb-1 block text-[11px] font-semibold text-zinc-500">Logo image URL</span>
                                                        <input
                                                            value={localCompany.logo || ''}
                                                            onChange={(e) =>
                                                                setLocalCompany((p) => (p ? { ...p, logo: e.target.value } : p))
                                                            }
                                                            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                                                        />
                                                    </label>
                                                    <label className="block md:col-span-2">
                                                        <span className="mb-1 block text-[11px] font-semibold text-zinc-500">LinkedIn URL</span>
                                                        <input
                                                            value={localCompany.linkedin || ''}
                                                            onChange={(e) =>
                                                                setLocalCompany((p) => (p ? { ...p, linkedin: e.target.value } : p))
                                                            }
                                                            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                                                        />
                                                    </label>
                                                    <label className="block md:col-span-2">
                                                        <span className="mb-1 block text-[11px] font-semibold text-zinc-500">Twitter URL</span>
                                                        <input
                                                            value={localCompany.twitter || ''}
                                                            onChange={(e) =>
                                                                setLocalCompany((p) => (p ? { ...p, twitter: e.target.value } : p))
                                                            }
                                                            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                                                        />
                                                    </label>
                                                    <label className="block md:col-span-2">
                                                        <span className="mb-1 block text-[11px] font-semibold text-zinc-500">Facebook URL</span>
                                                        <input
                                                            value={localCompany.facebook || ''}
                                                            onChange={(e) =>
                                                                setLocalCompany((p) => (p ? { ...p, facebook: e.target.value } : p))
                                                            }
                                                            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                                                        />
                                                    </label>
                                                    <label className="block md:col-span-2">
                                                        <span className="mb-1 block text-[11px] font-semibold text-zinc-500">Keywords (comma-separated)</span>
                                                        <input
                                                            value={
                                                                Array.isArray(localCompany.keywords)
                                                                    ? localCompany.keywords.join(', ')
                                                                    : (localCompany.keywords as unknown as string) || ''
                                                            }
                                                            onChange={(e) =>
                                                                setLocalCompany((p) =>
                                                                    p
                                                                        ? {
                                                                              ...p,
                                                                              keywords: e.target.value
                                                                                  .split(',')
                                                                                  .map((s) => s.trim())
                                                                                  .filter(Boolean),
                                                                          }
                                                                        : p,
                                                                )
                                                            }
                                                            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                                                        />
                                                    </label>
                                                    <label className="block md:col-span-2">
                                                        <span className="mb-1 block text-[11px] font-semibold text-zinc-500">Description</span>
                                                        <textarea
                                                            rows={4}
                                                            value={localCompany.description || ''}
                                                            onChange={(e) =>
                                                                setLocalCompany((p) => (p ? { ...p, description: e.target.value } : p))
                                                            }
                                                            className="w-full resize-y rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                                                        />
                                                    </label>
                                                </div>
                                            </section>
                                        )}
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
                                            {displayCompany.employees != null && displayCompany.employees > 0 && (
                                                <div className="rounded-2xl border border-zinc-200 bg-zinc-50/80 p-4">
                                                    <div className="flex items-center gap-2 text-zinc-500 mb-1">
                                                        <Users className="w-4 h-4" />
                                                        <span className="text-[10px] font-bold uppercase tracking-wider">Headcount</span>
                                                    </div>
                                                    <p className="text-lg font-bold text-zinc-950 tabular-nums">{displayCompany.employees.toLocaleString()}</p>
                                                </div>
                                            )}
                                            {(displayCompany.revenue || displayCompany.organization_revenue_printed) && (
                                                <div className="rounded-2xl border border-zinc-200 bg-zinc-50/80 p-4">
                                                    <div className="flex items-center gap-2 text-zinc-500 mb-1">
                                                        <DollarSign className="w-4 h-4" />
                                                        <span className="text-[10px] font-bold uppercase tracking-wider">Revenue</span>
                                                    </div>
                                                    <p className="text-sm font-bold text-zinc-950 leading-snug line-clamp-2">
                                                        {displayCompany.revenue || displayCompany.organization_revenue_printed}
                                                    </p>
                                                </div>
                                            )}
                                            {displayCompany.founded_year != null && (
                                                <div className="rounded-2xl border border-zinc-200 bg-zinc-50/80 p-4">
                                                    <div className="flex items-center gap-2 text-zinc-500 mb-1">
                                                        <Calendar className="w-4 h-4" />
                                                        <span className="text-[10px] font-bold uppercase tracking-wider">Founded</span>
                                                    </div>
                                                    <p className="text-lg font-bold text-zinc-950">{displayCompany.founded_year}</p>
                                                </div>
                                            )}
                                            {(displayCompany.phone || displayCompany.sanitized_phone) && (
                                                <div className="rounded-2xl border border-zinc-200 bg-zinc-50/80 p-4">
                                                    <div className="flex items-center gap-2 text-zinc-500 mb-1">
                                                        <Phone className="w-4 h-4" />
                                                        <span className="text-[10px] font-bold uppercase tracking-wider">Phone</span>
                                                    </div>
                                                    <p className="text-sm font-bold text-zinc-950 truncate" title={displayCompany.phone || displayCompany.sanitized_phone}>
                                                        {displayCompany.phone || displayCompany.sanitized_phone}
                                                    </p>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex flex-col lg:flex-row gap-10 lg:gap-12">
                                            {/* LEFT COLUMN: About & Keywords */}
                                            <div className="flex-1 min-w-0 space-y-10">
                                                <section>
                                                    <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                                                        <span className="w-8 h-px bg-zinc-200"></span> About
                                                    </h3>
                                                    <p className="text-zinc-700 leading-relaxed text-base max-w-[640px]">
                                                        {displayCompany.description || 'No description available for this company.'}
                                                    </p>
                                                </section>

                                                {displayCompany.keywords && displayCompany.keywords.length > 0 && (
                                                    <section>
                                                        <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                                                            <span className="w-8 h-px bg-zinc-200"></span> Keywords
                                                        </h3>
                                                        <div className="flex flex-wrap gap-2 max-w-[640px]">
                                                            {displayCompany.keywords.slice(0, showAllKeywords ? undefined : 12).map((keyword, idx) => (
                                                                <span key={idx} className="px-3 py-1.5 rounded-lg bg-zinc-50 border border-zinc-200 text-zinc-700 text-sm font-medium">
                                                                    {keyword}
                                                                </span>
                                                            ))}
                                                            {displayCompany.keywords.length > 12 && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setShowAllKeywords(!showAllKeywords)}
                                                                    className="px-3 py-1.5 rounded-lg bg-orange-50 border border-orange-200 text-orange-700 text-sm font-medium hover:bg-orange-100 transition-colors"
                                                                >
                                                                    {showAllKeywords ? 'Show less' : `+${displayCompany.keywords.length - 12} more`}
                                                                </button>
                                                            )}
                                                        </div>
                                                    </section>
                                                )}

                                                {hasAdvancedCompanyFields && (
                                                    <section className="rounded-2xl border border-zinc-200 bg-white overflow-hidden">
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowAdvancedCompany((v) => !v)}
                                                            className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left hover:bg-zinc-50/80 transition-colors"
                                                        >
                                                            <div className="flex items-center gap-3 min-w-0">
                                                                <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center shrink-0">
                                                                    <Hash className="w-5 h-5 text-orange-600" />
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <h3 className="text-sm font-bold text-zinc-950">Advanced organization data</h3>
                                                                    <p className="text-xs text-zinc-500 truncate">Domains, address, industry codes, listings</p>
                                                                </div>
                                                            </div>
                                                            <ChevronRight className={`w-5 h-5 text-zinc-400 shrink-0 transition-transform ${showAdvancedCompany ? 'rotate-90' : ''}`} />
                                                        </button>
                                                        {showAdvancedCompany && (
                                                            <div className="px-5 pb-5 pt-0 border-t border-zinc-100 space-y-4 text-sm">
                                                                {displayCompany.primary_domain && (
                                                                    <div className="flex justify-between gap-4">
                                                                        <span className="text-zinc-500 shrink-0">Primary domain</span>
                                                                        <span className="font-medium text-zinc-950 text-right break-all">{displayCompany.primary_domain}</span>
                                                                    </div>
                                                                )}
                                                                {(displayCompany.street_address || displayCompany.state || displayCompany.postal_code || displayCompany.country || displayCompany.raw_address) && (
                                                                    <div className="flex justify-between gap-4">
                                                                        <span className="text-zinc-500 shrink-0">Address</span>
                                                                        <span className="font-medium text-zinc-950 text-right">
                                                                            {[displayCompany.street_address, formatCompanyLocation(displayCompany), displayCompany.postal_code].filter(Boolean).join(' · ')}
                                                                        </span>
                                                                    </div>
                                                                )}
                                                                {displayCompany.raw_address && !displayCompany.street_address && (
                                                                    <div className="flex justify-between gap-4">
                                                                        <span className="text-zinc-500 shrink-0">Raw address</span>
                                                                        <span className="font-medium text-zinc-950 text-right">{displayCompany.raw_address}</span>
                                                                    </div>
                                                                )}
                                                                {displayCompany.sic_codes && displayCompany.sic_codes.length > 0 && (
                                                                    <div>
                                                                        <span className="text-zinc-500 text-xs font-bold uppercase tracking-wider">SIC</span>
                                                                        <p className="mt-1 font-mono text-xs text-zinc-800">{displayCompany.sic_codes.join(', ')}</p>
                                                                    </div>
                                                                )}
                                                                {displayCompany.naics_codes && displayCompany.naics_codes.length > 0 && (
                                                                    <div>
                                                                        <span className="text-zinc-500 text-xs font-bold uppercase tracking-wider">NAICS</span>
                                                                        <p className="mt-1 font-mono text-xs text-zinc-800">{displayCompany.naics_codes.join(', ')}</p>
                                                                    </div>
                                                                )}
                                                                {(displayCompany.publicly_traded_symbol || displayCompany.publicly_traded_exchange) && (
                                                                    <div className="flex justify-between gap-4">
                                                                        <span className="text-zinc-500 shrink-0">Ticker</span>
                                                                        <span className="font-medium text-zinc-950">
                                                                            {[displayCompany.publicly_traded_symbol, displayCompany.publicly_traded_exchange].filter(Boolean).join(' · ')}
                                                                        </span>
                                                                    </div>
                                                                )}
                                                                {typeof displayCompany.alexa_ranking === 'number' && (
                                                                    <div className="flex justify-between gap-4">
                                                                        <span className="text-zinc-500 shrink-0">Alexa rank</span>
                                                                        <span className="font-medium text-zinc-950 tabular-nums">{displayCompany.alexa_ranking.toLocaleString()}</span>
                                                                    </div>
                                                                )}
                                                                {typeof displayCompany.retail_location_count === 'number' && displayCompany.retail_location_count > 0 && (
                                                                    <div className="flex justify-between gap-4">
                                                                        <span className="text-zinc-500 shrink-0">Retail locations</span>
                                                                        <span className="font-medium text-zinc-950 tabular-nums">{displayCompany.retail_location_count.toLocaleString()}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </section>
                                                )}
                                            </div>

                                            {/* RIGHT COLUMN: Details & Socials */}
                                            <div className="w-full lg:w-[340px] shrink-0 space-y-6">
                                                <div className="p-6 rounded-2xl border border-zinc-200 bg-zinc-50">
                                                    <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-5">Company details</h3>
                                                    <div className="space-y-5">
                                                        {displayCompany.website && (
                                                            <div className="flex items-center gap-4">
                                                                <div className="w-10 h-10 rounded-xl bg-white border border-zinc-200 flex items-center justify-center shrink-0">
                                                                    <Globe className="w-5 h-5 text-zinc-500" strokeWidth={1.5} />
                                                                </div>
                                                                <a href={displayCompany.website} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-orange-600 hover:text-orange-700 hover:underline truncate">
                                                                    {displayCompany.website.replace(/^https?:\/\//, '').replace(/\/$/, '') || 'Website'}
                                                                </a>
                                                            </div>
                                                        )}
                                                        {displayCompany.employees && (
                                                            <div className="flex items-center gap-4">
                                                                <div className="w-10 h-10 rounded-xl bg-white border border-zinc-200 flex items-center justify-center shrink-0">
                                                                    <Users className="w-5 h-5 text-zinc-500" strokeWidth={1.5} />
                                                                </div>
                                                                <span className="text-sm font-semibold text-zinc-950">
                                                                    {displayCompany.employees.toLocaleString()} employees
                                                                </span>
                                                            </div>
                                                        )}
                                                        {displayCompany.revenue && (
                                                            <div className="flex items-center gap-4">
                                                                <div className="w-10 h-10 rounded-xl bg-white border border-zinc-200 flex items-center justify-center shrink-0">
                                                                    <DollarSign className="w-5 h-5 text-zinc-500" strokeWidth={1.5} />
                                                                </div>
                                                                <span className="text-sm font-semibold text-zinc-950">
                                                                    {displayCompany.revenue} revenue
                                                                </span>
                                                            </div>
                                                        )}
                                                        {displayCompany.phone && (
                                                            <div className="flex items-center gap-4">
                                                                <div className="w-10 h-10 rounded-xl bg-white border border-zinc-200 flex items-center justify-center shrink-0">
                                                                    <Phone className="w-5 h-5 text-zinc-500" strokeWidth={1.5} />
                                                                </div>
                                                                <span className="text-sm font-semibold text-zinc-950">
                                                                    {displayCompany.phone}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="p-6 rounded-2xl border border-zinc-200 bg-zinc-50">
                                                    <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-4">Social profiles</h3>
                                                    <div className="flex flex-wrap gap-3">
                                                        {displayCompany.linkedin && (
                                                            <a href={displayCompany.linkedin} target="_blank" rel="noopener noreferrer" className="w-11 h-11 rounded-xl border border-blue-200 bg-blue-50 flex items-center justify-center text-blue-600 hover:bg-blue-100 transition-colors">
                                                                <Linkedin className="w-5 h-5" fill="currentColor" strokeWidth={0} />
                                                            </a>
                                                        )}
                                                        {displayCompany.twitter && (
                                                            <a href={displayCompany.twitter} target="_blank" rel="noopener noreferrer" className="w-11 h-11 rounded-xl border border-zinc-200 bg-white flex items-center justify-center text-zinc-700 hover:bg-orange-50 hover:border-orange-200 transition-colors">
                                                                <Twitter className="w-5 h-5" />
                                                            </a>
                                                        )}
                                                        {displayCompany.facebook && (
                                                            <a href={displayCompany.facebook} target="_blank" rel="noopener noreferrer" className="w-11 h-11 rounded-xl border border-indigo-200 bg-indigo-50 flex items-center justify-center text-indigo-600 hover:bg-indigo-100 transition-colors">
                                                                <Facebook className="w-5 h-5" />
                                                            </a>
                                                        )}
                                                        {!displayCompany.linkedin && !displayCompany.twitter && !displayCompany.facebook && (
                                                            <span className="text-sm text-zinc-500">No profiles found</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                ) : activeTab === 'comments' ? (
                                    <motion.div
                                        key="comments"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        transition={{ duration: 0.2 }}
                                        className="flex flex-1 flex-col min-h-0 overflow-hidden bg-white"
                                    >
                                        <div className="min-h-0 flex-1 overflow-y-auto p-8 custom-scrollbar">
                                            <div className="mx-auto max-w-2xl space-y-6">
                                                {localComments.length > 0 ? (
                                                    <>
                                                        {localComments.map((comment) => (
                                                            <article key={comment.id} className="border-b border-zinc-100 pb-6 last:border-0 last:pb-0">
                                                                <div className="flex items-start justify-between gap-3">
                                                                    <div className="flex min-w-0 gap-2.5">
                                                                        <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-zinc-100 text-[10px] font-bold text-zinc-600">
                                                                            {comment.userProfileUrl ? (
                                                                                <img src={comment.userProfileUrl} alt="" className="h-full w-full object-cover" />
                                                                            ) : (
                                                                                comment.userName.substring(0, 2).toUpperCase()
                                                                            )}
                                                                        </div>
                                                                        <div className="min-w-0">
                                                                            <span className="text-sm font-medium text-zinc-950">{comment.userName}</span>
                                                                            <span className="ml-2 text-xs text-zinc-400">
                                                                                {formatCommentDate(comment.createdAt)}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex shrink-0 items-center gap-2">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() =>
                                                                                setReplyingTo({
                                                                                    id: comment.id,
                                                                                    userName: comment.userName,
                                                                                    text: comment.text,
                                                                                    userProfileUrl: comment.userProfileUrl,
                                                                                })
                                                                            }
                                                                            className="inline-flex items-center gap-1 text-xs font-medium text-zinc-400 transition-colors hover:text-orange-600"
                                                                        >
                                                                            <Reply className="h-3 w-3" />
                                                                            Reply
                                                                        </button>
                                                                        {currentUserId === comment.uid && (
                                                                            <button
                                                                                type="button"
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    handleRequestDeleteComment(comment.id);
                                                                                }}
                                                                                className="p-1 text-zinc-300 transition-colors hover:text-red-500"
                                                                                title="Delete"
                                                                            >
                                                                                <Trash2 className="h-3.5 w-3.5" />
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <p className="mt-2 pl-[42px] text-sm leading-relaxed text-zinc-700 whitespace-pre-wrap">
                                                                    {comment.text}
                                                                </p>

                                                                {comment.replies && comment.replies.length > 0 && (
                                                                    <div className="mt-4 pl-[42px]">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => toggleReplies(comment.id)}
                                                                            className="mb-2 flex items-center gap-1 text-xs font-medium text-zinc-400 transition-colors hover:text-zinc-700"
                                                                        >
                                                                            {expandedComments.has(comment.id) ? (
                                                                                <ChevronUp className="h-3.5 w-3.5" />
                                                                            ) : (
                                                                                <ChevronDown className="h-3.5 w-3.5" />
                                                                            )}
                                                                            {comment.replies.length}{' '}
                                                                            {comment.replies.length === 1 ? 'reply' : 'replies'}
                                                                        </button>

                                                                        <AnimatePresence initial={false}>
                                                                            {expandedComments.has(comment.id) && (
                                                                                <motion.div
                                                                                    initial={{ opacity: 0, height: 0 }}
                                                                                    animate={{ opacity: 1, height: 'auto' }}
                                                                                    exit={{ opacity: 0, height: 0 }}
                                                                                    transition={{ duration: 0.15 }}
                                                                                    className="space-y-3 overflow-hidden border-l border-zinc-200 pl-3"
                                                                                >
                                                                                    {comment.replies.map((reply) => (
                                                                                        <div key={reply.id}>
                                                                                            <div className="flex items-start justify-between gap-2">
                                                                                                <div className="min-w-0">
                                                                                                    <span className="text-xs font-medium text-zinc-900">{reply.userName}</span>
                                                                                                    <span className="ml-2 text-[11px] text-zinc-400">
                                                                                                        {formatCommentDate(reply.createdAt)}
                                                                                                    </span>
                                                                                                </div>
                                                                                                {currentUserId === reply.uid && (
                                                                                                    <button
                                                                                                        type="button"
                                                                                                        onClick={(e) => {
                                                                                                            e.stopPropagation();
                                                                                                            handleRequestDeleteReply(comment.id, reply.id);
                                                                                                        }}
                                                                                                        className="p-0.5 text-zinc-300 hover:text-red-500"
                                                                                                        title="Delete"
                                                                                                    >
                                                                                                        <Trash2 className="h-3 w-3" />
                                                                                                    </button>
                                                                                                )}
                                                                                            </div>
                                                                                            <p className="mt-1 text-sm leading-relaxed text-zinc-600 whitespace-pre-wrap">
                                                                                                {reply.text}
                                                                                            </p>
                                                                                        </div>
                                                                                    ))}
                                                                                </motion.div>
                                                                            )}
                                                                        </AnimatePresence>
                                                                    </div>
                                                                )}
                                                            </article>
                                                        ))}
                                                        <div ref={commentsEndRef} />
                                                    </>
                                                ) : (
                                                    <p className="py-8 text-center text-sm text-zinc-400">
                                                        {displayCompany.isSaved ? 'No comments yet.' : 'Save the company to add comments.'}
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        {displayCompany.isSaved && (
                                            <div className="shrink-0 border-t border-zinc-100 bg-white px-8 py-4">
                                                <div className="mx-auto flex max-w-2xl flex-col gap-2">
                                                    {replyingTo && (
                                                        <div className="flex items-center justify-between gap-2 rounded-lg bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
                                                            <span className="min-w-0 truncate">
                                                                Replying to <span className="font-medium text-zinc-900">{replyingTo.userName}</span>
                                                            </span>
                                                            <button
                                                                type="button"
                                                                onClick={() => setReplyingTo(null)}
                                                                className="shrink-0 text-zinc-400 hover:text-zinc-800"
                                                                aria-label="Cancel reply"
                                                            >
                                                                <X className="h-3.5 w-3.5" />
                                                            </button>
                                                        </div>
                                                    )}

                                                    <div className="flex gap-2">
                                                        <textarea
                                                            placeholder={replyingTo ? `Reply to ${replyingTo.userName}…` : 'Add a comment…'}
                                                            value={newComment}
                                                            onChange={(e) => setNewComment(e.target.value)}
                                                            className="min-h-[44px] flex-1 resize-y rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-950 placeholder:text-zinc-400 focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400/30"
                                                            rows={2}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                                    e.preventDefault();
                                                                    handlePostComment();
                                                                }
                                                            }}
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={handlePostComment}
                                                            disabled={!newComment.trim() || isPostingComment}
                                                            className="shrink-0 self-end rounded-lg bg-zinc-950 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-zinc-800 disabled:opacity-40"
                                                        >
                                                            {isPostingComment ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Post'}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="people"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        transition={{ duration: 0.2 }}
                                        className="flex-1 min-h-0 flex flex-col overflow-hidden"
                                    >
                                        {isLoadingPeople ? (
                                            <div className="flex flex-1 flex-col items-center justify-center gap-2 py-20">
                                                <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
                                                <p className="text-xs text-zinc-500">Loading…</p>
                                            </div>
                                        ) : companyPeople.length > 0 ? (
                                            <>
                                                <div className="shrink-0 border-b border-zinc-100 bg-white px-8 py-4">
                                                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
                                                        <div className="relative min-w-0 flex-1 lg:max-w-md">
                                                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                                                            <input
                                                                type="search"
                                                                value={peopleQuery}
                                                                onChange={(e) => setPeopleQuery(e.target.value)}
                                                                placeholder="Search people…"
                                                                className="w-full rounded-lg border border-zinc-200 bg-zinc-50/50 py-2 pl-9 pr-3 text-sm text-zinc-950 placeholder:text-zinc-400 transition-colors focus:border-orange-300 focus:bg-white focus:outline-none focus:ring-1 focus:ring-orange-400/25"
                                                                aria-label="Search people"
                                                            />
                                                        </div>
                                                        <div className="flex flex-wrap items-center justify-end gap-2 lg:shrink-0">
                                                            {displayCompany.isSaved && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => void openLinkPeoplePicker()}
                                                                    className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-xs font-bold text-orange-800 transition-colors hover:bg-orange-100"
                                                                >
                                                                    <UserPlus className="h-3.5 w-3.5" />
                                                                    Link people
                                                                </button>
                                                            )}
                                                            <label htmlFor="company-people-sort" className="sr-only">
                                                                Sort list
                                                            </label>
                                                            <select
                                                                id="company-people-sort"
                                                                value={peopleSort}
                                                                onChange={(e) => setPeopleSort(e.target.value as 'name' | 'title' | 'location')}
                                                                className="cursor-pointer rounded-lg border border-zinc-200 bg-white py-2 pl-3 pr-9 text-sm text-zinc-800 focus:border-orange-300 focus:outline-none focus:ring-1 focus:ring-orange-400/25"
                                                            >
                                                                <option value="name">Sort: Name</option>
                                                                <option value="title">Sort: Title</option>
                                                                <option value="location">Sort: Location</option>
                                                            </select>
                                                            <span className="whitespace-nowrap tabular-nums text-xs text-zinc-400">
                                                                {peopleQuery.trim()
                                                                    ? `${filteredSortedPeople.length} of ${companyPeople.length}`
                                                                    : `${companyPeople.length} ${companyPeople.length === 1 ? 'person' : 'people'}`}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="min-h-0 flex-1 overflow-y-auto px-8 py-2 pb-8 custom-scrollbar">
                                                    {filteredSortedPeople.length === 0 && peopleQuery.trim() ? (
                                                        <div className="mx-auto max-w-md py-16 text-center">
                                                            <p className="text-sm text-zinc-600">No matches for &ldquo;{peopleQuery.trim()}&rdquo;</p>
                                                            <button
                                                                type="button"
                                                                onClick={() => setPeopleQuery('')}
                                                                className="mt-2 text-xs font-semibold text-orange-600 hover:text-orange-700"
                                                            >
                                                                Clear search
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <ul className="divide-y divide-zinc-100">
                                                            {filteredSortedPeople.map((person) => {
                                                                const name = personDisplayName(person);
                                                                const loc = personLocationStr(person);
                                                                const li = personLinkedinUrl(person);
                                                                return (
                                                                    <li key={person.id}>
                                                                        <div className="group flex items-start gap-4 py-4 transition-colors sm:items-center sm:gap-5 sm:py-3.5">
                                                                            <Avatar
                                                                                src={person.image || person.photo_url}
                                                                                alt={name}
                                                                                name={name}
                                                                                className="h-10 w-10 shrink-0 rounded-full object-cover text-[10px] sm:h-11 sm:w-11"
                                                                            />
                                                                            <div className="min-w-0 flex-1">
                                                                                <p className="truncate text-[15px] font-semibold leading-snug tracking-tight text-zinc-950">
                                                                                    {name}
                                                                                </p>
                                                                                {person.title ? (
                                                                                    <p className="mt-0.5 truncate text-xs text-zinc-500">{person.title}</p>
                                                                                ) : null}
                                                                                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-zinc-400">
                                                                                    {person.email ? (
                                                                                        <span className="truncate max-w-[220px] sm:max-w-[280px]">{person.email}</span>
                                                                                    ) : null}
                                                                                    {person.email && loc ? (
                                                                                        <span className="hidden text-zinc-300 sm:inline" aria-hidden>
                                                                                            ·
                                                                                        </span>
                                                                                    ) : null}
                                                                                    {loc ? <span className="truncate max-w-[200px] sm:max-w-none">{loc}</span> : null}
                                                                                </div>
                                                                            </div>
                                                                            <div className="flex shrink-0 items-center gap-0.5 pt-0.5 sm:pt-0">
                                                                                {li ? (
                                                                                    <a
                                                                                        href={li.startsWith('http') ? li : `https://${li}`}
                                                                                        target="_blank"
                                                                                        rel="noopener noreferrer"
                                                                                        className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-blue-600"
                                                                                        title="LinkedIn"
                                                                                    >
                                                                                        <Linkedin className="h-4 w-4" />
                                                                                    </a>
                                                                                ) : null}
                                                                                {person.email ? (
                                                                                    <a
                                                                                        href={`mailto:${person.email}`}
                                                                                        className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-orange-600"
                                                                                        title="Email"
                                                                                    >
                                                                                        <Mail className="h-4 w-4" />
                                                                                    </a>
                                                                                ) : null}
                                                                                {displayCompany.isSaved ? (
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => void handleRemoveSavedPerson(person)}
                                                                                        disabled={personRemoveLoadingId === person.id}
                                                                                        className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                                                                                        title="Remove from saved database"
                                                                                    >
                                                                                        {personRemoveLoadingId === person.id ? (
                                                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                                                        ) : (
                                                                                            <Trash2 className="h-4 w-4" />
                                                                                        )}
                                                                                    </button>
                                                                                ) : null}
                                                                            </div>
                                                                        </div>
                                                                    </li>
                                                                );
                                                            })}
                                                        </ul>
                                                    )}
                                                </div>
                                            </>
                                        ) : (
                                            <div className="flex flex-1 flex-col items-center justify-center px-8 py-16 text-center">
                                                <Users className="mb-3 h-8 w-8 text-zinc-300" />
                                                <p className="text-sm font-medium text-zinc-700">No people linked to this company yet.</p>
                                                <p className="mt-1 max-w-md text-xs leading-relaxed text-zinc-500">
                                                    We match saved contacts by company ID, company name, or website domain—so imports and manual entries can show up here too.
                                                </p>
                                                {displayCompany.isSaved ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => void openLinkPeoplePicker()}
                                                        className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-zinc-950 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-zinc-950/15 transition-colors hover:bg-zinc-800"
                                                    >
                                                        <Plus className="h-4 w-4" />
                                                        Add / link people from database
                                                    </button>
                                                ) : (
                                                    <p className="mt-4 max-w-xs text-xs text-zinc-400">
                                                        Save this company to your database, then link people here.
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        <AnimatePresence>
                            {linkPickerOpen && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="absolute inset-0 z-210 flex items-center justify-center bg-zinc-950/40 p-4 backdrop-blur-[2px]"
                                    role="presentation"
                                    onClick={() => !linkingPersonId && setLinkPickerOpen(false)}
                                >
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.96, y: 8 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.96, y: 8 }}
                                        transition={{ duration: 0.15 }}
                                        role="dialog"
                                        aria-modal="true"
                                        aria-labelledby="company-link-people-title"
                                        className="flex max-h-[min(72vh,640px)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-zinc-100 px-5 py-4">
                                            <div>
                                                <h2 id="company-link-people-title" className="text-lg font-bold text-zinc-950">
                                                    Link saved people
                                                </h2>
                                                <p className="mt-0.5 text-xs text-zinc-500">
                                                    Choose contacts already in your database. They will be assigned to{' '}
                                                    <span className="font-semibold text-zinc-800">{displayCompany.name}</span>.
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => !linkingPersonId && setLinkPickerOpen(false)}
                                                className="shrink-0 rounded-full p-2 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-800"
                                                aria-label="Close"
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        </div>
                                        <div className="shrink-0 border-b border-zinc-100 px-5 py-3">
                                            <div className="relative">
                                                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                                                <input
                                                    type="search"
                                                    value={linkPickerQuery}
                                                    onChange={(e) => setLinkPickerQuery(e.target.value)}
                                                    placeholder="Search by name, email, title…"
                                                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50/80 py-2.5 pl-9 pr-3 text-sm text-zinc-950 placeholder:text-zinc-400 focus:border-orange-300 focus:bg-white focus:outline-none focus:ring-1 focus:ring-orange-400/25"
                                                />
                                            </div>
                                        </div>
                                        <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2 custom-scrollbar">
                                            {loadingSavedPeoplePool ? (
                                                <div className="flex flex-col items-center justify-center gap-2 py-16">
                                                    <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
                                                    <p className="text-xs text-zinc-500">Loading saved people…</p>
                                                </div>
                                            ) : linkableSavedPeople.length === 0 ? (
                                                <div className="px-4 py-12 text-center text-sm text-zinc-500">
                                                    {savedPeoplePool.length === 0
                                                        ? 'No saved people in your database yet.'
                                                        : 'Everyone in your database is already listed for this company, or nothing matches your search.'}
                                                </div>
                                            ) : (
                                                <ul className="divide-y divide-zinc-100">
                                                    {linkableSavedPeople.map((p) => {
                                                        const name = personDisplayName(p);
                                                        return (
                                                            <li key={p.id} className="flex items-center gap-3 px-3 py-3">
                                                                <Avatar
                                                                    src={p.image || p.photo_url}
                                                                    alt={name}
                                                                    name={name}
                                                                    className="h-9 w-9 shrink-0 rounded-full object-cover text-[10px]"
                                                                />
                                                                <div className="min-w-0 flex-1">
                                                                    <p className="truncate text-sm font-semibold text-zinc-950">{name}</p>
                                                                    {p.title ? (
                                                                        <p className="truncate text-xs text-zinc-500">{p.title}</p>
                                                                    ) : null}
                                                                    {p.email ? (
                                                                        <p className="truncate text-xs text-zinc-400">{p.email}</p>
                                                                    ) : null}
                                                                </div>
                                                                <button
                                                                    type="button"
                                                                    disabled={linkingPersonId !== null}
                                                                    onClick={() => void handleLinkPersonToCompany(p.id)}
                                                                    className="shrink-0 rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-orange-600 disabled:opacity-50"
                                                                >
                                                                    {linkingPersonId === p.id ? (
                                                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                                    ) : (
                                                                        'Link'
                                                                    )}
                                                                </button>
                                                            </li>
                                                        );
                                                    })}
                                                </ul>
                                            )}
                                        </div>
                                    </motion.div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <AnimatePresence>
                            {commentDeleteConfirm && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="absolute inset-0 z-200 flex items-center justify-center bg-zinc-950/45 p-4 backdrop-blur-[2px]"
                                    role="presentation"
                                    onClick={() => !isCommentDeleteLoading && setCommentDeleteConfirm(null)}
                                >
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.96 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.96 }}
                                        transition={{ duration: 0.15 }}
                                        role="alertdialog"
                                        aria-modal="true"
                                        aria-labelledby="company-delete-comment-title"
                                        className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <h2 id="company-delete-comment-title" className="text-lg font-bold text-zinc-950">
                                            {commentDeleteConfirm.kind === 'reply' ? 'Delete this reply?' : 'Delete this comment?'}
                                        </h2>
                                        <p className="mt-2 text-sm text-zinc-600">
                                            This cannot be undone.{' '}
                                            {commentDeleteConfirm.kind === 'reply'
                                                ? 'The reply will be removed.'
                                                : 'The comment and its replies will be removed.'}
                                        </p>
                                        <div className="mt-6 flex flex-wrap justify-end gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setCommentDeleteConfirm(null)}
                                                disabled={isCommentDeleteLoading}
                                                className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-bold text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => void handleConfirmCommentDelete()}
                                                disabled={isCommentDeleteLoading}
                                                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                                            >
                                                {isCommentDeleteLoading ? (
                                                    <span className="inline-flex items-center gap-2">
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                        Deleting…
                                                    </span>
                                                ) : (
                                                    'Delete'
                                                )}
                                            </button>
                                        </div>
                                    </motion.div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
