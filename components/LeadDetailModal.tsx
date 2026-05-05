import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { X, Linkedin, Mail, Phone, Building2, MapPin, Check, Shield, Copy, Trash2, ChevronDown, ChevronUp, Loader2, CheckCircle2, ExternalLink, Sparkles, XCircle, Clock, Save, Reply, Circle, UserCheck, TrendingUp, Edit2, type LucideIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow, format, isBefore, subHours } from 'date-fns';
import { databaseService, Comment, SavedPerson } from '@/services/databaseService';
import { createClient } from '@/lib/supabase';
import { getBrandColor, isPersonSavedFromLinkedInSearch } from '@/lib/utils';
import { toast } from 'sonner';

// Extended interface to include all possible properties
interface ExtendedSavedPerson extends SavedPerson {
    image?: string;
    isSaved?: boolean;
    saved_by?: string;
    saved_by_profile_url?: string;
    twitter?: string;
    facebook?: string;
    github?: string;
    company_logo?: string;
    company_logo_url?: string;
    comments?: Comment[];
    last_name_obfuscated?: string;
}

interface LeadDetailModalProps {
    lead: ExtendedSavedPerson;
    onClose: () => void;
    onUnlock?: (lead: SavedPerson, type: 'email' | 'phone') => Promise<SavedPerson | null>;
    /** When saving a *new* person from the database UI, default `saved_from` to manual. Search omits this (Apollo / LinkedIn). */
    personSaveOrigin?: 'apollo_search' | 'manual_entry';
    /** After editing a saved person, parent can refresh list / selection. */
    onPersonUpdated?: (person: ExtendedSavedPerson) => void;
}

type SavedPersonEditForm = {
    full_name: string;
    title: string;
    headline: string;
    email: string;
    phone: string;
    organization_name: string;
    website: string;
    city: string;
    state: string;
    country: string;
    location: string;
    linkedin: string;
    photo_url: string;
};

function leadToEditForm(lead: ExtendedSavedPerson): SavedPersonEditForm {
    const full =
        (lead.name || lead.full_name || [lead.first_name, lead.last_name].filter(Boolean).join(' ') || '').trim();
    return {
        full_name: full,
        title: lead.title || '',
        headline: lead.headline || '',
        email: lead.email === 'N/A' ? '' : lead.email || '',
        phone: lead.phone === 'N/A' || lead.phone === 'Available (Unlock)' ? '' : lead.phone || '',
        organization_name: lead.company || lead.organization_name || '',
        website: lead.website || lead.company_website || lead.organization_domain || '',
        city: lead.city || '',
        state: lead.state || '',
        country: lead.country || '',
        location: lead.location || lead.formatted_address || '',
        linkedin: lead.linkedin || lead.linkedin_url || '',
        photo_url: lead.photo_url || lead.image || '',
    };
}

// Helper for date formatting
const formatCommentDate = (dateString: string): string => {
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

interface AvatarProps {
    src?: string;
    alt: string;
    name: string;
    className?: string;
}

const Avatar: React.FC<AvatarProps> = ({ src, alt, name, className }) => {
    const [imageError, setImageError] = useState(false);

    // Check if we have a valid image URL
    const hasValidSrc = Boolean(src && src.trim() !== '' && !imageError);

    // Generate initials for fallback
    const initials = useMemo(() => {
        if (!name) return 'U';
        return name
            .split(' ')
            .map(n => n[0])
            .join('')
            .substring(0, 2)
            .toUpperCase();
    }, [name]);

    if (hasValidSrc) {
        return (
            // eslint-disable-next-line @next/next/no-img-element -- small avatar URLs from external APIs
            <img
                src={src}
                alt={alt}
                className={className}
                onError={() => setImageError(true)}
            />
        );
    }

    return (
        <div className={`${className} flex items-center justify-center bg-orange-500 text-white font-bold`}>
            {initials}
        </div>
    );
};

type CommentDeleteConfirm =
    | null
    | { kind: 'comment'; commentId: string }
    | { kind: 'reply'; commentId: string; replyId: string };

const PIPELINE_STATUS_OPTIONS: ReadonlyArray<{
    id: string;
    desc: string;
    icon: LucideIcon;
    iconColor: string;
}> = [
    { id: 'New', desc: 'Not started', icon: Circle, iconColor: 'text-zinc-500' },
    { id: 'Need to Contact', desc: 'Priority outreach', icon: Phone, iconColor: 'text-blue-500' },
    { id: 'Contacted', desc: 'Reached once', icon: UserCheck, iconColor: 'text-purple-500' },
    { id: 'In Progress', desc: 'Active outreach', icon: TrendingUp, iconColor: 'text-orange-500' },
    { id: 'Good Lead', desc: 'High potential', icon: Sparkles, iconColor: 'text-emerald-500' },
    { id: 'Need a Follow Up', desc: 'Schedule follow-up', icon: Clock, iconColor: 'text-amber-500' },
    { id: 'Not Interested', desc: 'Closed / unqualified', icon: XCircle, iconColor: 'text-red-500' },
];

export const LeadDetailModal: React.FC<LeadDetailModalProps> = ({
    lead,
    onClose,
    onUnlock,
    personSaveOrigin,
    onPersonUpdated,
}) => {
    const [localLead, setLocalLead] = useState<ExtendedSavedPerson>(lead);
    const [activeTab, setActiveTab] = useState<'overview' | 'comments'>('overview');
    const [isUnlockingEmail, setIsUnlockingEmail] = useState(false);
    const [isUnlockingPhone, setIsUnlockingPhone] = useState(false);
    const [contactStatus, setContactStatus] = useState<string>(lead?.contact_status || 'New');
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editingSavedPerson, setEditingSavedPerson] = useState(false);
    const [savedPersonEditForm, setSavedPersonEditForm] = useState<SavedPersonEditForm | null>(null);
    const [isUpdatingSavedPerson, setIsUpdatingSavedPerson] = useState(false);

    // Comment state
    const [localComments, setLocalComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState('');
    const [isPostingComment, setIsPostingComment] = useState(false);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [replyingTo, setReplyingTo] = useState<{ id: string; userName: string; text: string; userProfileUrl?: string } | null>(null);
    const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
    const [commentDeleteConfirm, setCommentDeleteConfirm] = useState<CommentDeleteConfirm>(null);
    const [isCommentDeleteLoading, setIsCommentDeleteLoading] = useState(false);
    const [pipelineMenuOpen, setPipelineMenuOpen] = useState(false);
    const pipelineMenuRef = useRef<HTMLDivElement>(null);
    const commentsEndRef = useRef<HTMLDivElement>(null);

    const brandColor = useMemo(() => getBrandColor(localLead?.name || 'Lead'), [localLead?.name]);

    useEffect(() => {
        setEditingSavedPerson(false);
        setSavedPersonEditForm(null);
    }, [lead?.id]);

    // Update local lead when prop changes, and fetch from Supabase if saved
    useEffect(() => {
        if (editingSavedPerson) return;
        const fetchLeadData = async () => {
            // If lead is saved, fetch fresh data from Supabase with timeout
            if (lead?.isSaved && lead?.id) {
                try {
                    // Add timeout to prevent hanging
                    const timeoutPromise = new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('Timeout')), 5000)
                    );

                    const savedPerson = (await Promise.race([
                        databaseService.getPersonById(lead.id),
                        timeoutPromise,
                    ])) as SavedPerson | null;

                    if (savedPerson) {
                        setLocalLead(savedPerson);
                        setContactStatus(savedPerson?.contact_status || 'New');
                        return;
                    }
                } catch (error) {
                    console.error('Error fetching saved person from Supabase:', error);
                    // Fallback to prop data if Supabase fetch fails or times out
                }
            }
            // Use prop data for unsaved leads or if Supabase fetch fails
            setLocalLead(lead);
            setContactStatus(lead?.contact_status || 'New');
        };

        fetchLeadData();
    }, [lead, editingSavedPerson]);

    // Fetch current user
    useEffect(() => {
        const fetchUser = async () => {
            try {
                const supabase = createClient();
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    setCurrentUserId(user.id);
                }
            } catch (error) {
                console.error('Failed to fetch user:', error);
            }
        };
        fetchUser();
    }, []);

    // Fetch comments when lead changes
    useEffect(() => {
        // Reset comments when lead changes
        setLocalComments([]);
        setReplyingTo(null);
        setExpandedComments(new Set());
        setCommentDeleteConfirm(null);

        const fetchComments = async () => {
            if (localLead?.id && localLead.isSaved) {
                try {
                    const comments = await databaseService.getPersonComments(localLead.id);
                    setLocalComments(comments);
                } catch (error) {
                    console.error('Failed to fetch comments:', error);
                }
            } else if (localLead?.comments) {
                setLocalComments(localLead.comments);
            }
        };

        fetchComments();
    }, [localLead?.id, localLead?.isSaved, localLead?.comments]);

    // Scroll to bottom when comments tab is active
    useEffect(() => {
        if (activeTab === 'comments') {
            setTimeout(() => {
                commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
        }
    }, [activeTab, localComments.length]);

    useEffect(() => {
        if (activeTab !== 'comments') setCommentDeleteConfirm(null);
    }, [activeTab]);

    useEffect(() => {
        if (!pipelineMenuOpen) return;
        const onPointerDown = (e: PointerEvent) => {
            if (pipelineMenuRef.current?.contains(e.target as Node)) return;
            setPipelineMenuOpen(false);
        };
        document.addEventListener('pointerdown', onPointerDown, true);
        return () => document.removeEventListener('pointerdown', onPointerDown, true);
    }, [pipelineMenuOpen]);

    useEffect(() => {
        if (!pipelineMenuOpen) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setPipelineMenuOpen(false);
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [pipelineMenuOpen]);

    const handleStatusUpdate = useCallback(async (newStatus: string) => {
        if (!localLead?.id) return;
        if ((contactStatus || 'New') === newStatus) {
            setPipelineMenuOpen(false);
            return;
        }

        setIsUpdatingStatus(true);
        try {
            await databaseService.updatePersonStatus(localLead.id, newStatus);
            setContactStatus(newStatus);
            setLocalLead(prev => prev ? { ...prev, contact_status: newStatus } : prev);
            toast.success(`Status updated to ${newStatus}`);
            setPipelineMenuOpen(false);
        } catch (error) {
            console.error('Failed to update status:', error);
            toast.error('Failed to update status. Please try again.');
        } finally {
            setIsUpdatingStatus(false);
        }
    }, [localLead?.id, contactStatus]);

    const isEmailLocked = useMemo(() => {
        return !localLead.email ||
            localLead.email === 'N/A' ||
            localLead.email === 'Available (Unlock)' ||
            localLead.email === 'email_not_unlocked@domain.com' ||
            localLead.email.includes('email_not_unlocked');
    }, [localLead.email]);

    const hasDisplayablePhone = useMemo(() => {
        const p = localLead.phone;
        return Boolean(p && p !== 'N/A' && p !== 'Available (Unlock)');
    }, [localLead.phone]);

    const canUnlockPhone = useMemo(
        () => Boolean(onUnlock && localLead.phone === 'Available (Unlock)'),
        [onUnlock, localLead.phone]
    );

    const handleUnlockClick = useCallback(async (type: 'email' | 'phone') => {
        if (!onUnlock) return;

        if (type === 'email') setIsUnlockingEmail(true);
        else setIsUnlockingPhone(true);

        try {
            const unlockedLead = await onUnlock(localLead, type);
            if (unlockedLead) {
                setLocalLead(unlockedLead as ExtendedSavedPerson);
            }
        } catch (error) {
            console.error("Failed to unlock:", error);
            toast.error(`Failed to unlock ${type}. Please try again.`);
        } finally {
            setIsUnlockingEmail(false);
            setIsUnlockingPhone(false);
        }
    }, [onUnlock, localLead]);

    const handleSave = useCallback(async () => {
        if (localLead.isSaved) {
            toast.info('This person is already saved');
            return;
        }

        setIsSaving(true);
        let loadingToastId: string | number | undefined;

        try {
            // Check if we need to fetch full data
            const needsFullData = (localLead as ExtendedSavedPerson).last_name_obfuscated ||
                localLead.email === 'Available (Unlock)' ||
                localLead.phone === 'Available (Unlock)' ||
                (!localLead.email || localLead.email === 'N/A') ||
                (!localLead.phone || localLead.phone === 'N/A');

            let fullPersonData = localLead;

            if (needsFullData && onUnlock) {
                loadingToastId = toast.loading('Fetching full person details...');
                // Try to unlock email to get full data
                try {
                    const unlockedLead = await onUnlock(localLead, 'email');
                    if (unlockedLead) {
                        fullPersonData = unlockedLead as ExtendedSavedPerson;
                    }
                } catch (error) {
                    console.warn('Failed to unlock email, saving with available data:', error);
                } finally {
                    // Dismiss loading toast
                    if (loadingToastId) {
                        toast.dismiss(loadingToastId);
                    }
                }
            }

            const existingSavedFrom = (fullPersonData as ExtendedSavedPerson).saved_from?.trim();
            const resolvedSavedFrom =
                existingSavedFrom ||
                (personSaveOrigin === 'manual_entry' ? 'manual' : 'linkedin');

            await databaseService.savePerson({ ...fullPersonData, saved_from: resolvedSavedFrom });

            setLocalLead({ ...fullPersonData, isSaved: true, saved_from: resolvedSavedFrom });

            toast.success('Person saved to database');
        } catch (error) {
            console.error('Failed to save person:', error);
            // Dismiss loading toast if still showing
            if (loadingToastId) {
                toast.dismiss(loadingToastId);
            }
            toast.error('Failed to save person');
        } finally {
            setIsSaving(false);
        }
    }, [localLead, onUnlock, personSaveOrigin]);

    const handleStartEditSavedPerson = useCallback(() => {
        setSavedPersonEditForm(leadToEditForm(localLead));
        setEditingSavedPerson(true);
    }, [localLead]);

    const handleCancelSavedPersonEdit = useCallback(() => {
        setEditingSavedPerson(false);
        setSavedPersonEditForm(null);
    }, []);

    const handleSubmitSavedPersonEdit = useCallback(async () => {
        if (!savedPersonEditForm || !localLead.id) return;
        setIsUpdatingSavedPerson(true);
        try {
            const fullName = savedPersonEditForm.full_name.trim();
            const parts = fullName.split(/\s+/);
            const payload = {
                ...localLead,
                name: fullName,
                full_name: fullName,
                first_name: parts[0] || localLead.first_name,
                last_name: parts.slice(1).join(' ') || localLead.last_name || '',
                title: savedPersonEditForm.title.trim(),
                headline: savedPersonEditForm.headline.trim(),
                email: savedPersonEditForm.email.trim() || 'N/A',
                phone: savedPersonEditForm.phone.trim() || 'N/A',
                company: savedPersonEditForm.organization_name.trim(),
                organization_name: savedPersonEditForm.organization_name.trim(),
                website: savedPersonEditForm.website.trim(),
                company_website: savedPersonEditForm.website.trim(),
                organization_domain: savedPersonEditForm.website.trim(),
                city: savedPersonEditForm.city.trim(),
                state: savedPersonEditForm.state.trim(),
                country: savedPersonEditForm.country.trim(),
                location: savedPersonEditForm.location.trim(),
                formatted_address: savedPersonEditForm.location.trim(),
                linkedin: savedPersonEditForm.linkedin.trim(),
                linkedin_url: savedPersonEditForm.linkedin.trim(),
                photo_url: savedPersonEditForm.photo_url.trim(),
                image: savedPersonEditForm.photo_url.trim(),
                saved_from: localLead.saved_from,
                contact_status: contactStatus || localLead.contact_status,
            };
            await databaseService.savePerson(payload);
            const refreshed = await databaseService.getPersonById(localLead.id);
            const next = refreshed
                ? ({ ...refreshed, isSaved: true } as ExtendedSavedPerson)
                : ({ ...localLead, ...payload, isSaved: true } as ExtendedSavedPerson);
            setLocalLead(next);
            setContactStatus(next.contact_status || 'New');
            onPersonUpdated?.(next);
            setEditingSavedPerson(false);
            setSavedPersonEditForm(null);
            toast.success('Person updated');
        } catch (e) {
            console.error(e);
            toast.error('Could not update person');
        } finally {
            setIsUpdatingSavedPerson(false);
        }
    }, [localLead, savedPersonEditForm, contactStatus, onPersonUpdated]);

    const getSocialLink = useCallback((url: string | null | undefined): string | null => {
        if (!url) return null;
        return url.startsWith('http') ? url : `https://${url}`;
    }, []);

    const copyToClipboard = useCallback(async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            toast.success('Copied to clipboard');
        } catch (error) {
            console.error('Failed to copy:', error);
            toast.error('Failed to copy to clipboard');
        }
    }, []);

    // Comment Handlers
    const handlePostComment = useCallback(async () => {
        if (!newComment.trim() || !localLead?.id) return;

        setIsPostingComment(true);
        const wasReply = !!replyingTo;
        try {
            let updatedComments: Comment[];
            if (replyingTo) {
                updatedComments = await databaseService.addPersonReply(localLead.id, replyingTo.id, newComment.trim());
                setExpandedComments(prev => new Set(prev).add(replyingTo.id));
                setReplyingTo(null);
            } else {
                updatedComments = await databaseService.addPersonComment(localLead.id, newComment.trim());
                setTimeout(() => {
                    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                }, 100);
            }
            setLocalComments(updatedComments);
            setNewComment('');
            toast.success(wasReply ? 'Reply posted' : 'Comment posted');
        } catch (error) {
            console.error('Failed to post comment/reply:', error);
            toast.error('Failed to post. Please try again.');
        } finally {
            setIsPostingComment(false);
        }
    }, [newComment, replyingTo, localLead?.id]);

    const handleConfirmCommentDelete = useCallback(async () => {
        if (!commentDeleteConfirm || !localLead?.id) return;
        setIsCommentDeleteLoading(true);
        try {
            if (commentDeleteConfirm.kind === 'comment') {
                const updatedComments = await databaseService.deletePersonComment(
                    localLead.id,
                    commentDeleteConfirm.commentId
                );
                setLocalComments(updatedComments);
                toast.success('Comment deleted');
            } else {
                const updatedComments = await databaseService.deletePersonReply(
                    localLead.id,
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
    }, [commentDeleteConfirm, localLead?.id]);

    const toggleReplies = useCallback((commentId: string) => {
        setExpandedComments(prev => {
            const next = new Set(prev);
            if (next.has(commentId)) {
                next.delete(commentId);
            } else {
                next.add(commentId);
            }
            return next;
        });
    }, []);

    // Get social media links with proper type handling
    const socialLinks = useMemo(() => {
        return {
            linkedin: localLead.linkedin || localLead.linkedin_url,
            twitter: (localLead as ExtendedSavedPerson).twitter || localLead.twitter_url,
            facebook: (localLead as ExtendedSavedPerson).facebook || localLead.facebook_url,
            github: (localLead as ExtendedSavedPerson).github || localLead.github_url,
        };
    }, [localLead]);

    const hasSocialLinks = useMemo(() => {
        return Boolean(socialLinks.linkedin || socialLinks.twitter || socialLinks.facebook || socialLinks.github);
    }, [socialLinks]);

    const currentPipelineOption = useMemo(() => {
        const id = contactStatus || 'New';
        return PIPELINE_STATUS_OPTIONS.find((o) => o.id === id) ?? PIPELINE_STATUS_OPTIONS[0];
    }, [contactStatus]);

    useEffect(() => {
        setPipelineMenuOpen(false);
    }, [lead?.id]);

    if (!localLead) return null;

    const PipelineTriggerIcon = currentPipelineOption.icon;

    return (
        <AnimatePresence>
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
                className="fixed inset-0 m-auto w-full max-w-4xl h-[90vh] bg-white border border-zinc-200 shadow-2xl shadow-zinc-950/20 rounded-3xl z-150 overflow-hidden flex flex-col"
            >
                <div className="relative flex min-h-0 flex-1 flex-col">
                {/* Hero Header */}
                <div
                    className="relative h-64 shrink-0 overflow-visible border-b border-zinc-200 transition-colors duration-700"
                    style={{ background: `linear-gradient(135deg, #ffffff 0%, #fafafa 40%, ${brandColor}15 100%)` }}
                >
                    {/* Close Button */}
                    <button
                        onClick={onClose}
                        className="absolute top-6 right-6 z-20 rounded-full border border-zinc-200 bg-zinc-100 p-2 text-zinc-500 backdrop-blur-md transition-colors hover:bg-orange-50 hover:text-zinc-950"
                        aria-label="Close modal"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    {localLead.isSaved && (
                        <div
                            ref={pipelineMenuRef}
                            className="absolute right-6 top-20 z-30 flex flex-col items-end"
                        >
                            <button
                                type="button"
                                id="pipeline-menu-trigger"
                                aria-haspopup="listbox"
                                aria-expanded={pipelineMenuOpen}
                                aria-controls="pipeline-status-listbox"
                                aria-label={`Pipeline stage: ${contactStatus || 'New'}. Change stage.`}
                                onClick={() => setPipelineMenuOpen((open) => !open)}
                                disabled={isUpdatingStatus}
                                className="inline-flex min-w-42 max-w-56 items-center gap-2.5 rounded-lg border border-zinc-200/90 bg-white/95 py-2 pl-3 pr-2.5 text-left shadow-md ring-1 ring-zinc-950/6 backdrop-blur-sm transition-all hover:border-orange-200 hover:bg-white hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                <span className={currentPipelineOption.iconColor}>
                                    <PipelineTriggerIcon className="h-4 w-4 shrink-0" strokeWidth={2} />
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className="block text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                                        Stage
                                    </span>
                                    <span className="block truncate text-sm font-bold leading-tight text-zinc-900">
                                        {contactStatus || 'New'}
                                    </span>
                                </span>
                                <ChevronDown
                                    className={`h-4 w-4 shrink-0 text-zinc-400 transition-transform duration-200 ${pipelineMenuOpen ? 'rotate-180' : ''}`}
                                    aria-hidden
                                />
                            </button>

                            <AnimatePresence>
                                {pipelineMenuOpen && (
                                    <motion.div
                                        id="pipeline-status-listbox"
                                        role="listbox"
                                        aria-labelledby="pipeline-menu-trigger"
                                        initial={{ opacity: 0, y: -8, scale: 0.98 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: -8, scale: 0.98 }}
                                        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                                        className="absolute right-0 top-[calc(100%+0.375rem)] z-50 w-[min(calc(100vw-2rem),19rem)] origin-top-right overflow-hidden rounded-xl border border-zinc-200 bg-white py-1 shadow-2xl ring-1 ring-zinc-950/10"
                                    >
                                        <div className="border-b border-zinc-100 bg-linear-to-b from-zinc-50 to-white px-3 py-2">
                                            <p className="text-xs font-semibold text-zinc-800">Pipeline stage</p>
                                            <p className="mt-0.5 text-[11px] leading-snug text-zinc-500">
                                                Updates database filters and how your team sees this contact.
                                            </p>
                                        </div>
                                        <ul className="max-h-[min(48vh,18rem)] overflow-y-auto py-1 custom-scrollbar">
                                            {PIPELINE_STATUS_OPTIONS.map(({ id, desc, icon: Icon, iconColor }) => {
                                                const selected = (contactStatus || 'New') === id;
                                                return (
                                                    <li key={id} role="presentation">
                                                        <button
                                                            type="button"
                                                            role="option"
                                                            aria-selected={selected}
                                                            onClick={() => void handleStatusUpdate(id)}
                                                            disabled={isUpdatingStatus}
                                                            className={`flex w-full items-start gap-3 px-3 py-2 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${selected ? 'bg-orange-50/90' : 'hover:bg-zinc-50'}`}
                                                        >
                                                            <span className={`mt-0.5 shrink-0 ${iconColor}`}>
                                                                <Icon className="h-4 w-4" strokeWidth={2} />
                                                            </span>
                                                            <span className="min-w-0 flex-1">
                                                                <span className="block text-sm font-bold text-zinc-950">{id}</span>
                                                                <span className="mt-0.5 block text-[11px] leading-snug text-zinc-500">{desc}</span>
                                                            </span>
                                                            {selected && (
                                                                <Check className="mt-0.5 h-4 w-4 shrink-0 text-orange-600" aria-hidden />
                                                            )}
                                                        </button>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    )}

                    {/* Content Container */}
                    <div className="absolute bottom-0 left-0 w-full p-6 sm:p-8 flex flex-col gap-6 lg:flex-row lg:items-end lg:gap-8 bg-linear-to-t from-white to-transparent">
                        <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl bg-white p-1 border-4 border-white shadow-xl flex items-center justify-center overflow-hidden shrink-0 relative z-10">
                            <Avatar
                                src={localLead.photo_url || localLead.image}
                                name={localLead.name || ''}
                                className="w-full h-full object-cover rounded-xl text-4xl"
                                alt={localLead.name || 'Profile'}
                            />
                            {localLead.email_status === 'verified' && (
                                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center border-2 border-white">
                                    <Check className="w-3.5 h-3.5 text-white" />
                                </div>
                            )}
                        </div>
                        <div className="mb-0 lg:mb-2 flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                                <h2 className="text-2xl sm:text-4xl font-bold text-zinc-950 tracking-tight wrap-break-word">{localLead.name || 'Unknown'}</h2>
                                {localLead.isSaved && (
                                    <span className="flex shrink-0 items-center gap-1.5 rounded-lg border border-green-500/20 bg-green-500/10 px-3 py-1 text-xs font-bold text-green-600">
                                        <CheckCircle2 className="w-3.5 h-3.5" /> Saved
                                    </span>
                                )}
                                {localLead.isSaved && isPersonSavedFromLinkedInSearch(localLead.saved_from) && (
                                    <span
                                        className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-[#0a66c2]/25 bg-[#0a66c2]/10 px-2.5 py-1 text-xs font-bold text-[#0a66c2]"
                                        title="Saved from LinkedIn / Apollo search"
                                    >
                                        <Linkedin className="h-3.5 w-3.5" />
                                        Saved from LinkedIn
                                    </span>
                                )}
                            </div>
                            {localLead.title && (
                                <p className="text-orange-500 text-lg font-bold truncate mb-2">{localLead.title}</p>
                            )}
                            <div className="flex flex-wrap items-center gap-4 text-sm">
                                <span className="flex items-center gap-1.5 text-zinc-600">
                                    <Building2 className="w-4 h-4 text-zinc-400" />
                                    {localLead.company || localLead.organization_name || 'Unknown Company'}
                                </span>
                                {localLead.location && (
                                    <span className="flex items-center gap-1.5 text-zinc-600">
                                        <MapPin className="w-4 h-4 text-zinc-400" /> {localLead.location}
                                    </span>
                                )}
                                {localLead.saved_by && (
                                    <span className="flex items-center gap-1.5 text-zinc-500">
                                        {localLead.saved_by_profile_url ? (
                                            <div className="w-4 h-4 rounded-full overflow-hidden border border-zinc-200">
                                                {/* eslint-disable-next-line @next/next/no-img-element -- external profile URL */}
                                                <img src={localLead.saved_by_profile_url} alt={localLead.saved_by} className="w-full h-full object-cover" />
                                            </div>
                                        ) : (
                                            <span className="w-1 h-1 rounded-full bg-zinc-600" />
                                        )}
                                        Saved by {localLead.saved_by}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="flex w-full flex-wrap gap-2 lg:mb-2 lg:w-auto lg:shrink-0 lg:justify-end">
                            {localLead.isSaved && !editingSavedPerson && (
                                <button
                                    type="button"
                                    onClick={handleStartEditSavedPerson}
                                    disabled={isUpdatingSavedPerson}
                                    className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-bold text-zinc-800 shadow-sm transition-all hover:border-orange-200 hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <Edit2 className="h-4 w-4" />
                                    Edit
                                </button>
                            )}
                            {localLead.isSaved && editingSavedPerson && (
                                <button
                                    type="button"
                                    onClick={handleCancelSavedPersonEdit}
                                    disabled={isUpdatingSavedPerson}
                                    className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm font-bold text-zinc-700 transition-all hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    Cancel edit
                                </button>
                            )}
                            {!localLead.isSaved && (
                                <button
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className="px-4 py-2.5 bg-zinc-950 hover:bg-zinc-800 text-white font-bold text-sm rounded-xl hover:shadow-lg shadow-zinc-950/20 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isSaving ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            <span>Saving...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-4 h-4" />
                                            <span className="hidden min-[400px]:inline">Get Details & Save</span>
                                            <span className="min-[400px]:hidden">Save</span>
                                        </>
                                    )}
                                </button>
                            )}
                            {socialLinks.linkedin && (
                                <a
                                    href={getSocialLink(socialLinks.linkedin) || '#'}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-500 hover:text-zinc-950 hover:bg-orange-50 transition-all"
                                    aria-label="LinkedIn profile"
                                >
                                    <Linkedin className="w-5 h-5" />
                                </a>
                            )}
                            {!isEmailLocked && localLead.email && (
                                <a
                                    href={`mailto:${localLead.email}`}
                                    className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-500 hover:text-zinc-950 hover:bg-orange-50 transition-all"
                                    aria-label="Send email"
                                >
                                    <Mail className="w-5 h-5" />
                                </a>
                            )}
                            {hasDisplayablePhone && localLead.phone && (
                                <a
                                    href={`tel:${localLead.phone.replace(/\s/g, '')}`}
                                    className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-500 hover:text-zinc-950 hover:bg-orange-50 transition-all"
                                    aria-label="Call phone"
                                >
                                    <Phone className="w-5 h-5" />
                                </a>
                            )}
                            {canUnlockPhone && (
                                <button
                                    type="button"
                                    onClick={() => handleUnlockClick('phone')}
                                    disabled={isUnlockingPhone}
                                    className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm font-bold text-zinc-700 transition-all hover:border-orange-200 hover:bg-orange-50 hover:text-zinc-950 disabled:cursor-not-allowed disabled:opacity-50"
                                    aria-label="Unlock phone number"
                                >
                                    {isUnlockingPhone ? (
                                        <Loader2 className="h-5 w-5 shrink-0 animate-spin" />
                                    ) : (
                                        <Phone className="h-5 w-5 shrink-0" />
                                    )}
                                    <span className="hidden sm:inline">Unlock phone</span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="px-8 pt-6 bg-white">
                    <div className="flex items-center gap-6 border-b border-zinc-200">
                        <button
                            onClick={() => setActiveTab('overview')}
                            className={`pb-4 text-sm font-bold transition-all relative ${activeTab === 'overview' ? 'text-zinc-950' : 'text-zinc-500 hover:text-zinc-950'}`}
                            aria-label="Overview tab"
                        >
                            Overview
                            {activeTab === 'overview' && (
                                <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 w-full h-0.5 bg-orange-500 rounded-full" />
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab('comments')}
                            className={`pb-4 text-sm font-bold transition-all relative ${activeTab === 'comments' ? 'text-zinc-950' : 'text-zinc-500 hover:text-zinc-950'}`}
                            aria-label="Comments tab"
                        >
                            Comments
                            {localComments.length > 0 && (
                                <span className="ml-2 px-1.5 py-0.5 rounded-full bg-orange-50 text-[10px] text-orange-600">
                                    {localComments.length}
                                </span>
                            )}
                            {activeTab === 'comments' && (
                                <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 w-full h-0.5 bg-orange-500 rounded-full" />
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
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                transition={{ duration: 0.2 }}
                                className="flex-1 overflow-y-auto p-8 custom-scrollbar"
                            >
                                <div className="space-y-10">
                                {localLead.isSaved && editingSavedPerson && savedPersonEditForm && (
                                    <section className="rounded-2xl border border-orange-200/80 bg-orange-50/40 p-6 shadow-inner shadow-zinc-950/5">
                                        <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-zinc-600">
                                            Edit saved contact
                                        </h3>
                                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                            <label className="block md:col-span-2">
                                                <span className="mb-1 block text-[11px] font-semibold text-zinc-500">Full name</span>
                                                <input
                                                    value={savedPersonEditForm.full_name}
                                                    onChange={(e) =>
                                                        setSavedPersonEditForm((f) => (f ? { ...f, full_name: e.target.value } : f))
                                                    }
                                                    className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                                                />
                                            </label>
                                            <label className="block">
                                                <span className="mb-1 block text-[11px] font-semibold text-zinc-500">Title</span>
                                                <input
                                                    value={savedPersonEditForm.title}
                                                    onChange={(e) =>
                                                        setSavedPersonEditForm((f) => (f ? { ...f, title: e.target.value } : f))
                                                    }
                                                    className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                                                />
                                            </label>
                                            <label className="block md:col-span-2">
                                                <span className="mb-1 block text-[11px] font-semibold text-zinc-500">Headline</span>
                                                <input
                                                    value={savedPersonEditForm.headline}
                                                    onChange={(e) =>
                                                        setSavedPersonEditForm((f) => (f ? { ...f, headline: e.target.value } : f))
                                                    }
                                                    className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                                                />
                                            </label>
                                            <label className="block">
                                                <span className="mb-1 block text-[11px] font-semibold text-zinc-500">Email</span>
                                                <input
                                                    type="email"
                                                    value={savedPersonEditForm.email}
                                                    onChange={(e) =>
                                                        setSavedPersonEditForm((f) => (f ? { ...f, email: e.target.value } : f))
                                                    }
                                                    className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                                                />
                                            </label>
                                            <label className="block">
                                                <span className="mb-1 block text-[11px] font-semibold text-zinc-500">Phone</span>
                                                <input
                                                    value={savedPersonEditForm.phone}
                                                    onChange={(e) =>
                                                        setSavedPersonEditForm((f) => (f ? { ...f, phone: e.target.value } : f))
                                                    }
                                                    className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                                                />
                                            </label>
                                            <label className="block md:col-span-2">
                                                <span className="mb-1 block text-[11px] font-semibold text-zinc-500">Company</span>
                                                <input
                                                    value={savedPersonEditForm.organization_name}
                                                    onChange={(e) =>
                                                        setSavedPersonEditForm((f) =>
                                                            f ? { ...f, organization_name: e.target.value } : f,
                                                        )
                                                    }
                                                    className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                                                />
                                            </label>
                                            <label className="block md:col-span-2">
                                                <span className="mb-1 block text-[11px] font-semibold text-zinc-500">Company website / domain</span>
                                                <input
                                                    value={savedPersonEditForm.website}
                                                    onChange={(e) =>
                                                        setSavedPersonEditForm((f) => (f ? { ...f, website: e.target.value } : f))
                                                    }
                                                    className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                                                />
                                            </label>
                                            <label className="block">
                                                <span className="mb-1 block text-[11px] font-semibold text-zinc-500">City</span>
                                                <input
                                                    value={savedPersonEditForm.city}
                                                    onChange={(e) =>
                                                        setSavedPersonEditForm((f) => (f ? { ...f, city: e.target.value } : f))
                                                    }
                                                    className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                                                />
                                            </label>
                                            <label className="block">
                                                <span className="mb-1 block text-[11px] font-semibold text-zinc-500">State / region</span>
                                                <input
                                                    value={savedPersonEditForm.state}
                                                    onChange={(e) =>
                                                        setSavedPersonEditForm((f) => (f ? { ...f, state: e.target.value } : f))
                                                    }
                                                    className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                                                />
                                            </label>
                                            <label className="block">
                                                <span className="mb-1 block text-[11px] font-semibold text-zinc-500">Country</span>
                                                <input
                                                    value={savedPersonEditForm.country}
                                                    onChange={(e) =>
                                                        setSavedPersonEditForm((f) => (f ? { ...f, country: e.target.value } : f))
                                                    }
                                                    className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                                                />
                                            </label>
                                            <label className="block md:col-span-2">
                                                <span className="mb-1 block text-[11px] font-semibold text-zinc-500">Location (full line)</span>
                                                <input
                                                    value={savedPersonEditForm.location}
                                                    onChange={(e) =>
                                                        setSavedPersonEditForm((f) => (f ? { ...f, location: e.target.value } : f))
                                                    }
                                                    className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                                                />
                                            </label>
                                            <label className="block md:col-span-2">
                                                <span className="mb-1 block text-[11px] font-semibold text-zinc-500">LinkedIn URL</span>
                                                <input
                                                    value={savedPersonEditForm.linkedin}
                                                    onChange={(e) =>
                                                        setSavedPersonEditForm((f) => (f ? { ...f, linkedin: e.target.value } : f))
                                                    }
                                                    className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                                                />
                                            </label>
                                            <label className="block md:col-span-2">
                                                <span className="mb-1 block text-[11px] font-semibold text-zinc-500">Photo URL</span>
                                                <input
                                                    value={savedPersonEditForm.photo_url}
                                                    onChange={(e) =>
                                                        setSavedPersonEditForm((f) => (f ? { ...f, photo_url: e.target.value } : f))
                                                    }
                                                    className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                                                />
                                            </label>
                                        </div>
                                        <div className="mt-5 flex flex-wrap justify-end gap-2">
                                            <button
                                                type="button"
                                                onClick={handleCancelSavedPersonEdit}
                                                disabled={isUpdatingSavedPerson}
                                                className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => void handleSubmitSavedPersonEdit()}
                                                disabled={isUpdatingSavedPerson}
                                                className="inline-flex items-center gap-2 rounded-xl bg-zinc-950 px-5 py-2 text-sm font-bold text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                {isUpdatingSavedPerson ? (
                                                    <>
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                        Saving…
                                                    </>
                                                ) : (
                                                    <>
                                                        <Save className="h-4 w-4" />
                                                        Save changes
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </section>
                                )}
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                                    {/* Main Info Column */}
                                    <div className="lg:col-span-2 space-y-10">
                                        <section>
                                            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                                                <span className="w-8 h-px bg-zinc-200"></span> About
                                            </h3>
                                            <p className="text-zinc-700 leading-relaxed text-base">
                                                {localLead.headline || localLead.description || 'No description available for this person.'}
                                            </p>
                                        </section>

                                        {/* Location Details */}
                                        {(localLead.city || localLead.state || localLead.country) && (
                                            <section>
                                                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                                                    <span className="w-8 h-px bg-zinc-200"></span> Location
                                                </h3>
                                                <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-6">
                                                    <div className="grid grid-cols-3 gap-4">
                                                        {localLead.city && (
                                                            <div>
                                                                <p className="text-xs text-zinc-500 mb-1">City</p>
                                                                <p className="text-sm text-zinc-950 font-medium">{localLead.city}</p>
                                                            </div>
                                                        )}
                                                        {localLead.state && (
                                                            <div>
                                                                <p className="text-xs text-zinc-500 mb-1">State</p>
                                                                <p className="text-sm text-zinc-950 font-medium">{localLead.state}</p>
                                                            </div>
                                                        )}
                                                        {localLead.country && (
                                                            <div>
                                                                <p className="text-xs text-zinc-500 mb-1">Country</p>
                                                                <p className="text-sm text-zinc-950 font-medium">{localLead.country}</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </section>
                                        )}

                                        {/* Social Media */}
                                        {hasSocialLinks && (
                                            <section>
                                                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                                                    <span className="w-8 h-px bg-zinc-200"></span> Social Media
                                                </h3>
                                                <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-6">
                                                    <div className="flex flex-wrap gap-3">
                                                        {socialLinks.linkedin && (
                                                            <a
                                                                href={getSocialLink(socialLinks.linkedin) || '#'}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="flex items-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg text-blue-600 hover:text-blue-700 transition-all"
                                                            >
                                                                <Linkedin className="w-4 h-4" />
                                                                <span className="text-sm font-medium">LinkedIn</span>
                                                                <ExternalLink className="w-3 h-3" />
                                                            </a>
                                                        )}
                                                        {socialLinks.twitter && (
                                                            <a
                                                                href={getSocialLink(socialLinks.twitter) || '#'}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="flex items-center gap-2 px-4 py-2 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-lg text-sky-600 hover:text-sky-700 transition-all"
                                                            >
                                                                <span className="text-sm font-medium">Twitter</span>
                                                                <ExternalLink className="w-3 h-3" />
                                                            </a>
                                                        )}
                                                        {socialLinks.facebook && (
                                                            <a
                                                                href={getSocialLink(socialLinks.facebook) || '#'}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="flex items-center gap-2 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg text-indigo-600 hover:text-indigo-700 transition-all"
                                                            >
                                                                <span className="text-sm font-medium">Facebook</span>
                                                                <ExternalLink className="w-3 h-3" />
                                                            </a>
                                                        )}
                                                        {socialLinks.github && (
                                                            <a
                                                                href={getSocialLink(socialLinks.github) || '#'}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="flex items-center gap-2 px-4 py-2 bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 rounded-lg text-zinc-700 hover:text-zinc-900 transition-all"
                                                            >
                                                                <span className="text-sm font-medium">GitHub</span>
                                                                <ExternalLink className="w-3 h-3" />
                                                            </a>
                                                        )}
                                                    </div>
                                                </div>
                                            </section>
                                        )}
                                    </div>

                                    {/* Sidebar Info Column */}
                                    <div className="space-y-6">
                                        <div className="bg-zinc-50 rounded-2xl p-6 border border-zinc-200 space-y-5">
                                            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Contact Details</h3>

                                            {/* Email Section */}
                                            {isEmailLocked && onUnlock ? (
                                                <div className="bg-zinc-100 border border-zinc-200 rounded-xl p-4 flex flex-col gap-3">
                                                    <div className="flex items-center gap-2 opacity-50">
                                                        <Mail className="w-4 h-4 text-zinc-500" />
                                                        <span className="text-xs text-zinc-400 italic">Email Locked</span>
                                                    </div>
                                                    <button
                                                        onClick={() => handleUnlockClick('email')}
                                                        disabled={isUnlockingEmail}
                                                        className="w-full py-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-orange-500/20"
                                                    >
                                                        {isUnlockingEmail ? (
                                                            <>
                                                                <Loader2 className="w-3 h-3 animate-spin" />
                                                                Unlocking Email...
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Shield className="w-3.5 h-3.5" />
                                                                Access Email
                                                            </>
                                                        )}
                                                    </button>
                                                </div>
                                            ) : !isEmailLocked && localLead.email ? (
                                                <div className="group flex items-center justify-between p-2 -mx-2 hover:bg-orange-50 rounded-lg transition-colors">
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center border border-zinc-200">
                                                            <Mail className="w-4 h-4 text-zinc-500" />
                                                        </div>
                                                        <div className="flex flex-col min-w-0">
                                                            <span className="text-sm text-zinc-700 truncate font-medium">{localLead.email}</span>
                                                            {localLead.email_status && (
                                                                <span className={`text-[10px] font-bold uppercase tracking-wide ${localLead.email_status === 'verified' ? 'text-green-400' : 'text-zinc-500'}`}>
                                                                    {localLead.email_status === 'verified' ? 'Verified' : localLead.email_status}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => copyToClipboard(localLead.email || '')}
                                                        className="text-zinc-400 hover:text-zinc-950 opacity-0 group-hover:opacity-100 transition-all p-2"
                                                        aria-label="Copy email"
                                                    >
                                                        <Copy className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-3 p-2 -mx-2">
                                                    <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center border border-zinc-200">
                                                        <Mail className="w-4 h-4 text-zinc-500" />
                                                    </div>
                                                    <span className="text-sm text-zinc-500">Not available</span>
                                                </div>
                                            )}

                                            {/* Phone Section */}
                                            {hasDisplayablePhone && localLead.phone ? (
                                                <div className="group flex items-center justify-between p-2 -mx-2 hover:bg-orange-50 rounded-lg transition-colors">
                                                    <a
                                                        href={`tel:${localLead.phone.replace(/\s/g, '')}`}
                                                        className="flex min-w-0 flex-1 items-center gap-3"
                                                    >
                                                        <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center border border-zinc-200">
                                                            <Phone className="w-4 h-4 text-zinc-500" />
                                                        </div>
                                                        <span className="text-sm text-zinc-700 font-medium truncate">{localLead.phone}</span>
                                                    </a>
                                                    <button
                                                        type="button"
                                                        onClick={() => copyToClipboard(localLead.phone || '')}
                                                        className="text-zinc-400 hover:text-zinc-950 opacity-0 group-hover:opacity-100 transition-all p-2"
                                                        aria-label="Copy phone"
                                                    >
                                                        <Copy className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            ) : canUnlockPhone ? (
                                                <div className="bg-zinc-100 border border-zinc-200 rounded-xl p-4 flex flex-col gap-3">
                                                    <div className="flex items-center gap-2 opacity-50">
                                                        <Phone className="w-4 h-4 text-zinc-500" />
                                                        <span className="text-xs text-zinc-400 italic">Phone locked</span>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleUnlockClick('phone')}
                                                        disabled={isUnlockingPhone}
                                                        className="w-full py-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-orange-500/20"
                                                    >
                                                        {isUnlockingPhone ? (
                                                            <>
                                                                <Loader2 className="w-3 h-3 animate-spin" />
                                                                Unlocking phone…
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Shield className="w-3.5 h-3.5" />
                                                                Access phone
                                                            </>
                                                        )}
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-3 p-2 -mx-2">
                                                    <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center border border-zinc-200">
                                                        <Phone className="w-4 h-4 text-zinc-500" />
                                                    </div>
                                                    <span className="text-sm text-zinc-500">Not available</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="comments"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.2 }}
                                className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white"
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
                                                                        <>
                                                                            {/* eslint-disable-next-line @next/next/no-img-element -- user-uploaded avatar URL */}
                                                                            <img src={comment.userProfileUrl} alt="" className="h-full w-full object-cover" />
                                                                        </>
                                                                    ) : (
                                                                        comment.userName.substring(0, 2).toUpperCase()
                                                                    )}
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <span className="text-sm font-medium text-zinc-950">{comment.userName}</span>
                                                                    <span className="ml-2 text-xs text-zinc-400">{formatCommentDate(comment.createdAt)}</span>
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
                                                                            setCommentDeleteConfirm({ kind: 'comment', commentId: comment.id });
                                                                        }}
                                                                        className="p-1 text-zinc-300 transition-colors hover:text-red-500"
                                                                        title="Delete"
                                                                    >
                                                                        <Trash2 className="h-3.5 w-3.5" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <p className="mt-2 pl-[42px] text-sm leading-relaxed whitespace-pre-wrap text-zinc-700">
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
                                                                                                    setCommentDeleteConfirm({
                                                                                                        kind: 'reply',
                                                                                                        commentId: comment.id,
                                                                                                        replyId: reply.id,
                                                                                                    });
                                                                                                }}
                                                                                                className="p-0.5 text-zinc-300 hover:text-red-500"
                                                                                                title="Delete"
                                                                                            >
                                                                                                <Trash2 className="h-3 w-3" />
                                                                                            </button>
                                                                                        )}
                                                                                    </div>
                                                                                    <p className="mt-1 text-sm leading-relaxed whitespace-pre-wrap text-zinc-600">
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
                                                {localLead.isSaved ? 'No comments yet.' : 'Save this person to add comments.'}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {localLead.isSaved && (
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
                        )}
                    </AnimatePresence>
                </div>

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
                                aria-labelledby="lead-delete-comment-title"
                                className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <h2 id="lead-delete-comment-title" className="text-lg font-bold text-zinc-950">
                                    {commentDeleteConfirm.kind === 'reply' ? 'Delete this reply?' : 'Delete this comment?'}
                                </h2>
                                <p className="mt-2 text-sm text-zinc-600">
                                    This cannot be undone. {commentDeleteConfirm.kind === 'reply' ? 'The reply will be removed.' : 'The comment and its replies will be removed.'}
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
        </AnimatePresence>
    );
};
