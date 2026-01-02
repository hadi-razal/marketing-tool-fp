import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { X, Linkedin, Mail, Phone, Building2, MapPin, Check, Shield, Copy, Send, Trash2, ChevronDown, ChevronUp, MessageSquare, Loader2, CheckCircle2, ExternalLink, Sparkles, XCircle, Clock, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow, format, isBefore, subHours } from 'date-fns';
import { databaseService, Comment, SavedPerson } from '@/services/databaseService';
import { createClient } from '@/lib/supabase';
import { getBrandColor } from '@/lib/utils';
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

export const LeadDetailModal: React.FC<LeadDetailModalProps> = ({ lead, onClose, onUnlock }) => {
    const [localLead, setLocalLead] = useState<ExtendedSavedPerson>(lead);
    const [activeTab, setActiveTab] = useState<'overview' | 'comments' | 'actions'>('overview');

    // Redirect to overview if lead is not saved and user is on actions tab
    useEffect(() => {
        if (activeTab === 'actions' && !localLead.isSaved) {
            setActiveTab('overview');
        }
    }, [activeTab, localLead.isSaved]);
    const [isUnlockingEmail, setIsUnlockingEmail] = useState(false);
    const [isUnlockingPhone, setIsUnlockingPhone] = useState(false);
    const [contactStatus, setContactStatus] = useState<string>(lead?.contact_status || 'New');
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Comment state
    const [localComments, setLocalComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState('');
    const [isPostingComment, setIsPostingComment] = useState(false);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [replyingTo, setReplyingTo] = useState<{ id: string; userName: string; text: string; userProfileUrl?: string } | null>(null);
    const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
    const commentsEndRef = useRef<HTMLDivElement>(null);

    // Confirmation Modal State
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        type: 'comment' | 'reply' | null;
        id: string | null;
        replyId?: string | null;
    }>({
        isOpen: false,
        type: null,
        id: null,
        replyId: null
    });

    const brandColor = useMemo(() => getBrandColor(localLead?.name || 'Lead'), [localLead?.name]);

    // Update local lead when prop changes, and fetch from Supabase if saved
    useEffect(() => {
        const fetchLeadData = async () => {
            // If lead is saved, fetch fresh data from Supabase with timeout
            if (lead?.isSaved && lead?.id) {
                try {
                    // Add timeout to prevent hanging
                    const timeoutPromise = new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('Timeout')), 5000)
                    );

                    const savedPerson = await Promise.race([
                        databaseService.getPersonById(lead.id),
                        timeoutPromise
                    ]) as any;

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
    }, [lead]);

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
    }, [localLead?.id, localLead?.isSaved]);

    // Scroll to bottom when comments tab is active
    useEffect(() => {
        if (activeTab === 'comments') {
            setTimeout(() => {
                commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
        }
    }, [activeTab, localComments.length]);

    const handleStatusUpdate = useCallback(async (newStatus: string) => {
        if (!localLead?.id) return;

        setIsUpdatingStatus(true);
        try {
            await databaseService.updatePersonStatus(localLead.id, newStatus);
            setContactStatus(newStatus);
            setLocalLead(prev => prev ? { ...prev, contact_status: newStatus } : prev);
            toast.success(`Status updated to ${newStatus}`);
        } catch (error) {
            console.error('Failed to update status:', error);
            toast.error('Failed to update status. Please try again.');
        } finally {
            setIsUpdatingStatus(false);
        }
    }, [localLead?.id]);

    if (!localLead) return null;

    const isEmailLocked = useMemo(() => {
        return !localLead.email ||
            localLead.email === 'email_not_unlocked@domain.com' ||
            localLead.email.includes('email_not_unlocked');
    }, [localLead.email]);

    const isPhoneLocked = useMemo(() => {
        return !localLead.phone || localLead.phone === 'N/A';
    }, [localLead.phone]);

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
            const needsFullData = (localLead as any).last_name_obfuscated ||
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

            // Save to database
            await databaseService.savePerson(fullPersonData);

            // Update local state
            setLocalLead({ ...fullPersonData, isSaved: true });

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
    }, [localLead, onUnlock]);

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
            toast.success(replyingTo ? 'Reply posted' : 'Comment posted');
        } catch (error) {
            console.error('Failed to post comment/reply:', error);
            toast.error('Failed to post. Please try again.');
        } finally {
            setIsPostingComment(false);
        }
    }, [newComment, replyingTo, localLead?.id]);

    const handleDeleteCommentClick = useCallback((commentId: string) => {
        setConfirmModal({
            isOpen: true,
            type: 'comment',
            id: commentId
        });
    }, []);

    const handleDeleteReplyClick = useCallback((commentId: string, replyId: string) => {
        setConfirmModal({
            isOpen: true,
            type: 'reply',
            id: commentId,
            replyId: replyId
        });
    }, []);

    const confirmDelete = useCallback(async () => {
        if (!confirmModal.id || !confirmModal.type || !localLead?.id) return;

        try {
            if (confirmModal.type === 'comment') {
                const updatedComments = await databaseService.deletePersonComment(localLead.id, confirmModal.id);
                setLocalComments(updatedComments);
                toast.success('Comment deleted');
            } else if (confirmModal.type === 'reply' && confirmModal.replyId) {
                const updatedComments = await databaseService.deletePersonReply(localLead.id, confirmModal.id, confirmModal.replyId);
                setLocalComments(updatedComments);
                toast.success('Reply deleted');
            }
        } catch (error) {
            console.error('Failed to delete item:', error);
            toast.error('Failed to delete. Please try again.');
        }
    }, [confirmModal, localLead?.id]);

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

    const getPositionColor = useCallback((status: string): string => {
        switch (status) {
            case 'Need a Follow Up': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
            case 'Qualified': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
            case 'In Progress': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
            case 'Contacted': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
            default: return 'bg-zinc-800 text-zinc-400 border-white/5';
        }
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

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="fixed inset-0 bg-black/80 backdrop-blur-sm z-150"
            />
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="fixed inset-0 m-auto w-full max-w-4xl h-[90vh] bg-[#09090b] border border-white/10 rounded-3xl shadow-2xl z-150 overflow-hidden flex flex-col"
            >
                {/* Hero Header */}
                <div
                    className="relative h-64 border-b border-white/5 shrink-0 transition-colors duration-700"
                    style={{ background: `linear-gradient(135deg, #09090b 0%, #000000 40%, ${brandColor}40 100%)` }}
                >
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />

                    {/* Close Button */}
                    <button
                        onClick={onClose}
                        className="absolute top-6 right-6 p-2 bg-black/50 hover:bg-white/10 rounded-full text-white/70 hover:text-white transition-colors border border-white/5 backdrop-blur-md z-20"
                        aria-label="Close modal"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    {/* Content Container */}
                    <div className="absolute bottom-0 left-0 w-full p-8 flex items-end gap-8 bg-gradient-to-t from-[#09090b] to-transparent">
                        <div className="w-32 h-32 rounded-2xl bg-white p-1 border-4 border-[#09090b] shadow-2xl flex items-center justify-center overflow-hidden shrink-0 relative z-10">
                            <Avatar
                                src={localLead.photo_url || localLead.image}
                                name={localLead.name || ''}
                                className="w-full h-full object-cover rounded-xl text-4xl"
                                alt={localLead.name || 'Profile'}
                            />
                            {localLead.email_status === 'verified' && (
                                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center border-2 border-[#09090b]">
                                    <Check className="w-3.5 h-3.5 text-white" />
                                </div>
                            )}
                        </div>
                        <div className="mb-2 flex-1">
                            <div className="flex items-center gap-4 mb-2">
                                <h2 className="text-4xl font-bold text-white tracking-tight">{localLead.name || 'Unknown'}</h2>
                                {localLead.isSaved && (
                                    <span className="bg-green-500/10 border border-green-500/20 text-green-500 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5">
                                        <CheckCircle2 className="w-3.5 h-3.5" /> Saved
                                    </span>
                                )}
                            </div>
                            {localLead.title && (
                                <p className="text-orange-500 text-lg font-bold truncate mb-2">{localLead.title}</p>
                            )}
                            <div className="flex flex-wrap items-center gap-4 text-sm">
                                <span className="flex items-center gap-1.5 text-zinc-400">
                                    <Building2 className="w-4 h-4 text-zinc-500" />
                                    {localLead.company || localLead.organization_name || 'Unknown Company'}
                                </span>
                                {localLead.location && (
                                    <span className="flex items-center gap-1.5 text-zinc-400">
                                        <MapPin className="w-4 h-4 text-zinc-500" /> {localLead.location}
                                    </span>
                                )}
                                {localLead.saved_by && (
                                    <span className="flex items-center gap-1.5 text-zinc-500">
                                        {localLead.saved_by_profile_url ? (
                                            <div className="w-4 h-4 rounded-full overflow-hidden border border-zinc-700">
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
                        <div className="flex gap-2 mb-2">
                            {!localLead.isSaved && (
                                <button
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className="px-4 py-2 bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold text-sm rounded-xl hover:shadow-lg shadow-orange-500/20 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isSaving ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            <span>Saving...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-4 h-4" />
                                            <span>Get Details & Save</span>
                                        </>
                                    )}
                                </button>
                            )}
                            {socialLinks.linkedin && (
                                <a
                                    href={getSocialLink(socialLinks.linkedin) || '#'}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="p-3 bg-white/5 border border-white/5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-all"
                                    aria-label="LinkedIn profile"
                                >
                                    <Linkedin className="w-5 h-5" />
                                </a>
                            )}
                            {!isEmailLocked && localLead.email && (
                                <a
                                    href={`mailto:${localLead.email}`}
                                    className="p-3 bg-white/5 border border-white/5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-all"
                                    aria-label="Send email"
                                >
                                    <Mail className="w-5 h-5" />
                                </a>
                            )}
                        </div>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="px-8 pt-6 bg-[#09090b]">
                    <div className="flex items-center gap-6 border-b border-white/5">
                        <button
                            onClick={() => setActiveTab('overview')}
                            className={`pb-4 text-sm font-bold transition-all relative ${activeTab === 'overview' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                            aria-label="Overview tab"
                        >
                            Overview
                            {activeTab === 'overview' && (
                                <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 w-full h-0.5 bg-white rounded-full" />
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab('comments')}
                            className={`pb-4 text-sm font-bold transition-all relative ${activeTab === 'comments' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                            aria-label="Comments tab"
                        >
                            Comments
                            {localComments.length > 0 && (
                                <span className="ml-2 px-1.5 py-0.5 rounded-full bg-white/10 text-[10px] text-zinc-400">
                                    {localComments.length}
                                </span>
                            )}
                            {activeTab === 'comments' && (
                                <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 w-full h-0.5 bg-white rounded-full" />
                            )}
                        </button>
                        {localLead.isSaved && (
                            <button
                                onClick={() => setActiveTab('actions')}
                                className={`pb-4 text-sm font-bold transition-all relative ${activeTab === 'actions' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                                aria-label="Actions tab"
                            >
                                Actions
                                {activeTab === 'actions' && (
                                    <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 w-full h-0.5 bg-white rounded-full" />
                                )}
                            </button>
                        )}
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 min-h-0 bg-[#09090b] flex flex-col relative">
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
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                                    {/* Main Info Column */}
                                    <div className="lg:col-span-2 space-y-10">
                                        <section>
                                            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                                                <span className="w-8 h-px bg-zinc-800"></span> About
                                            </h3>
                                            <p className="text-zinc-300 leading-relaxed text-base">
                                                {localLead.headline || localLead.description || 'No description available for this person.'}
                                            </p>
                                        </section>

                                        {/* Location Details */}
                                        {(localLead.city || localLead.state || localLead.country) && (
                                            <section>
                                                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                                                    <span className="w-8 h-px bg-zinc-800"></span> Location
                                                </h3>
                                                <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-6">
                                                    <div className="grid grid-cols-3 gap-4">
                                                        {localLead.city && (
                                                            <div>
                                                                <p className="text-xs text-zinc-500 mb-1">City</p>
                                                                <p className="text-sm text-white font-medium">{localLead.city}</p>
                                                            </div>
                                                        )}
                                                        {localLead.state && (
                                                            <div>
                                                                <p className="text-xs text-zinc-500 mb-1">State</p>
                                                                <p className="text-sm text-white font-medium">{localLead.state}</p>
                                                            </div>
                                                        )}
                                                        {localLead.country && (
                                                            <div>
                                                                <p className="text-xs text-zinc-500 mb-1">Country</p>
                                                                <p className="text-sm text-white font-medium">{localLead.country}</p>
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
                                                    <span className="w-8 h-px bg-zinc-800"></span> Social Media
                                                </h3>
                                                <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-6">
                                                    <div className="flex flex-wrap gap-3">
                                                        {socialLinks.linkedin && (
                                                            <a
                                                                href={getSocialLink(socialLinks.linkedin) || '#'}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-lg text-blue-400 hover:text-blue-300 transition-all"
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
                                                                className="flex items-center gap-2 px-4 py-2 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/20 rounded-lg text-sky-400 hover:text-sky-300 transition-all"
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
                                                                className="flex items-center gap-2 px-4 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 rounded-lg text-indigo-400 hover:text-indigo-300 transition-all"
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
                                                                className="flex items-center gap-2 px-4 py-2 bg-zinc-700/50 hover:bg-zinc-700/70 border border-white/10 rounded-lg text-white hover:text-white transition-all"
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
                                        <div className="bg-zinc-900/50 rounded-2xl p-6 border border-white/5 space-y-5">
                                            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Contact Details</h3>

                                            {/* Email Section */}
                                            {isEmailLocked && onUnlock ? (
                                                <div className="bg-zinc-900 border border-white/5 rounded-xl p-4 flex flex-col gap-3">
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
                                                <div className="group flex items-center justify-between p-2 -mx-2 hover:bg-white/5 rounded-lg transition-colors">
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center border border-white/5">
                                                            <Mail className="w-4 h-4 text-zinc-500" />
                                                        </div>
                                                        <div className="flex flex-col min-w-0">
                                                            <span className="text-sm text-zinc-300 truncate font-medium">{localLead.email}</span>
                                                            {localLead.email_status && (
                                                                <span className={`text-[10px] font-bold uppercase tracking-wide ${localLead.email_status === 'verified' ? 'text-green-400' : 'text-zinc-500'}`}>
                                                                    {localLead.email_status === 'verified' ? 'Verified' : localLead.email_status}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => copyToClipboard(localLead.email || '')}
                                                        className="text-zinc-600 hover:text-white opacity-0 group-hover:opacity-100 transition-all p-2"
                                                        aria-label="Copy email"
                                                    >
                                                        <Copy className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-3 p-2 -mx-2">
                                                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center border border-white/5">
                                                        <Mail className="w-4 h-4 text-zinc-500" />
                                                    </div>
                                                    <span className="text-sm text-zinc-500">Not available</span>
                                                </div>
                                            )}

                                            {/* Phone Section */}
                                            {!isPhoneLocked && localLead.phone ? (
                                                <div className="group flex items-center justify-between p-2 -mx-2 hover:bg-white/5 rounded-lg transition-colors">
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center border border-white/5">
                                                            <Phone className="w-4 h-4 text-zinc-500" />
                                                        </div>
                                                        <span className="text-sm text-zinc-300 font-medium">{localLead.phone}</span>
                                                    </div>
                                                    <button
                                                        onClick={() => copyToClipboard(localLead.phone || '')}
                                                        className="text-zinc-600 hover:text-white opacity-0 group-hover:opacity-100 transition-all p-2"
                                                        aria-label="Copy phone"
                                                    >
                                                        <Copy className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-3 p-2 -mx-2">
                                                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center border border-white/5">
                                                        <Phone className="w-4 h-4 text-zinc-500" />
                                                    </div>
                                                    <span className="text-sm text-zinc-500">Not available</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ) : activeTab === 'actions' ? (
                            <motion.div
                                key="actions"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.2 }}
                                className="flex-1 overflow-y-auto p-8 custom-scrollbar"
                            >
                                <div className="max-w-xl space-y-10">
                                    <section>
                                        <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                                            <span className="w-8 h-px bg-zinc-800"></span> Status
                                        </h3>
                                        <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-6">
                                            <div className="flex flex-col gap-4">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <h4 className="text-lg font-bold text-white">Contact Status</h4>
                                                        <p className="text-sm text-zinc-400">Update the progression status of this contact.</p>
                                                    </div>
                                                    <div className={`px-3 py-1 rounded-full text-xs font-bold border ${getPositionColor(contactStatus)}`}>
                                                        {contactStatus}
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-1.5 mt-6">
                                                    {Object.entries({
                                                        'Need to Contact': {
                                                            icon: Phone,
                                                            color: 'text-blue-400',
                                                            border: 'border-blue-500/30',
                                                            bg: 'bg-blue-500/10',
                                                            desc: 'Priority for outreach'
                                                        },
                                                        'Good Lead': {
                                                            icon: Sparkles,
                                                            color: 'text-emerald-400',
                                                            border: 'border-emerald-500/30',
                                                            bg: 'bg-emerald-500/10',
                                                            desc: 'High potential prospect'
                                                        },
                                                        'Not Interested': {
                                                            icon: XCircle,
                                                            color: 'text-red-400',
                                                            border: 'border-red-500/30',
                                                            bg: 'bg-red-500/10',
                                                            desc: 'Closed / Unqualified'
                                                        },
                                                        'Need a Follow Up': {
                                                            icon: Clock,
                                                            color: 'text-yellow-400',
                                                            border: 'border-yellow-500/30',
                                                            bg: 'bg-yellow-500/10',
                                                            desc: 'Requires follow-up action'
                                                        }
                                                    }).map(([status, config]) => {
                                                        const Icon = config.icon;
                                                        const isSelected = contactStatus === status;

                                                        return (
                                                            <button
                                                                key={status}
                                                                onClick={() => handleStatusUpdate(status)}
                                                                disabled={isUpdatingStatus}
                                                                className={`flex flex-col items-center justify-center p-1.5 rounded-lg border transition-all duration-200 gap-1 ${isSelected
                                                                    ? `${config.bg} ${config.border} ring-1 ring-inset ring-white/10`
                                                                    : 'bg-zinc-900 border-white/5 hover:bg-white/5 hover:border-white/10'
                                                                    }`}
                                                            >
                                                                <div className={`p-1 rounded-full ${isSelected ? 'bg-white/10' : 'bg-white/5'} ${config.color}`}>
                                                                    <Icon className="w-3.5 h-3.5" />
                                                                </div>
                                                                <div className="text-center">
                                                                    <div className={`font-bold text-[11px] leading-tight ${isSelected ? 'text-white' : 'text-zinc-400'}`}>
                                                                        {status}
                                                                    </div>
                                                                    <div className={`text-[9px] leading-tight ${isSelected ? 'text-white/70' : 'text-zinc-600'}`}>
                                                                        {config.desc}
                                                                    </div>
                                                                </div>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    </section>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="comments"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.2 }}
                                className="flex-1 flex flex-col min-h-0"
                            >
                                {/* Comments List */}
                                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                                    <div className="max-w-3xl mx-auto space-y-8">
                                        {localComments.length > 0 ? (
                                            <>
                                                {localComments.map((comment) => (
                                                    <div key={comment.id} className="group relative">
                                                        <div className="pl-4 border-l-2 border-white/5 hover:border-white/10 transition-colors">
                                                            <div className="flex justify-between items-start mb-2">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-white/10 to-white/5 border border-white/10 flex items-center justify-center text-xs font-bold text-white shadow-inner overflow-hidden">
                                                                        {comment.userProfileUrl ? (
                                                                            <img src={comment.userProfileUrl} alt={comment.userName} className="w-full h-full object-cover" />
                                                                        ) : (
                                                                            comment.userName.substring(0, 2).toUpperCase()
                                                                        )}
                                                                    </div>
                                                                    <div>
                                                                        <span className="block text-sm font-bold text-white leading-none mb-1">{comment.userName}</span>
                                                                        <span className="text-[10px] text-zinc-500 font-medium">
                                                                            {formatCommentDate(comment.createdAt)}
                                                                        </span>
                                                                    </div>
                                                                </div>

                                                                <div className="flex items-center gap-2">
                                                                    <button
                                                                        onClick={() => setReplyingTo({ id: comment.id, userName: comment.userName, text: comment.text, userProfileUrl: comment.userProfileUrl })}
                                                                        className="text-xs text-zinc-500 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
                                                                        aria-label="Reply to comment"
                                                                    >
                                                                        Reply
                                                                    </button>
                                                                    {(currentUserId === comment.uid) && (
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                handleDeleteCommentClick(comment.id);
                                                                            }}
                                                                            className="p-1.5 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-400/10 transition-all"
                                                                            title="Delete comment"
                                                                            aria-label="Delete comment"
                                                                        >
                                                                            <Trash2 className="w-3.5 h-3.5" />
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <p className="text-sm text-zinc-300 leading-relaxed pl-11">
                                                                {comment.text}
                                                            </p>
                                                        </div>

                                                        {/* Replies Section */}
                                                        {comment.replies && comment.replies.length > 0 && (
                                                            <div className="mt-2 ml-11">
                                                                {/* Toggle Button */}
                                                                <button
                                                                    onClick={() => toggleReplies(comment.id)}
                                                                    className="flex items-center gap-2 text-xs font-bold text-zinc-500 hover:text-white transition-colors mb-2"
                                                                    aria-label={expandedComments.has(comment.id) ? 'Hide replies' : 'Show replies'}
                                                                >
                                                                    <div className="w-6 h-px bg-zinc-800"></div>
                                                                    {expandedComments.has(comment.id) ? (
                                                                        <>
                                                                            <ChevronUp className="w-3 h-3" />
                                                                            Hide {comment.replies.length} replies
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <ChevronDown className="w-3 h-3" />
                                                                            View {comment.replies.length} replies
                                                                        </>
                                                                    )}
                                                                </button>

                                                                {/* Replies List */}
                                                                <AnimatePresence>
                                                                    {expandedComments.has(comment.id) && (
                                                                        <motion.div
                                                                            initial={{ opacity: 0, height: 0 }}
                                                                            animate={{ opacity: 1, height: 'auto' }}
                                                                            exit={{ opacity: 0, height: 0 }}
                                                                            className="space-y-4 overflow-hidden"
                                                                        >
                                                                            {comment.replies.map((reply) => (
                                                                                <div key={reply.id} className="relative pl-4 border-l-2 border-white/5 hover:border-white/10 transition-colors group/reply">
                                                                                    <div className="flex justify-between items-start mb-2">
                                                                                        <div className="flex items-center gap-3">
                                                                                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-white/10 to-white/5 border border-white/10 flex items-center justify-center text-[10px] font-bold text-white shadow-inner overflow-hidden">
                                                                                                {reply.userProfileUrl ? (
                                                                                                    <img src={reply.userProfileUrl} alt={reply.userName} className="w-full h-full object-cover" />
                                                                                                ) : (
                                                                                                    reply.userName.substring(0, 2).toUpperCase()
                                                                                                )}
                                                                                            </div>
                                                                                            <div>
                                                                                                <span className="block text-xs font-bold text-white leading-none mb-1">{reply.userName}</span>
                                                                                                <span className="text-[10px] text-zinc-500 font-medium">
                                                                                                    {formatCommentDate(reply.createdAt)}
                                                                                                </span>
                                                                                            </div>
                                                                                        </div>

                                                                                        {(currentUserId === reply.uid) && (
                                                                                            <button
                                                                                                onClick={(e) => {
                                                                                                    e.stopPropagation();
                                                                                                    handleDeleteReplyClick(comment.id, reply.id);
                                                                                                }}
                                                                                                className="p-1.5 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-400/10 transition-all"
                                                                                                title="Delete reply"
                                                                                                aria-label="Delete reply"
                                                                                            >
                                                                                                <Trash2 className="w-3 h-3" />
                                                                                            </button>
                                                                                        )}
                                                                                    </div>
                                                                                    <p className="text-sm text-zinc-300 leading-relaxed pl-9">
                                                                                        {reply.text}
                                                                                    </p>
                                                                                </div>
                                                                            ))}
                                                                        </motion.div>
                                                                    )}
                                                                </AnimatePresence>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                                <div ref={commentsEndRef} />
                                            </>
                                        ) : (
                                            <div className="text-center py-12">
                                                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-3">
                                                    <MessageSquare className="w-5 h-5 text-zinc-600" />
                                                </div>
                                                <p className="text-sm text-zinc-500">No comments yet. Start the conversation!</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Fixed Input Area */}
                                {localLead.isSaved && (
                                    <div className="p-4 border-t border-white/5 bg-[#09090b] z-10">
                                        <div className="max-w-3xl mx-auto flex flex-col gap-3">
                                            {replyingTo && (
                                                <div className="flex items-center justify-between bg-zinc-900/50 border border-white/5 rounded-xl p-2 px-3 mb-1">
                                                    <div className="flex items-center gap-3 overflow-hidden">
                                                        <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center shrink-0 overflow-hidden">
                                                            {replyingTo.userProfileUrl ? (
                                                                <img src={replyingTo.userProfileUrl} alt={replyingTo.userName} className="w-full h-full object-cover" />
                                                            ) : (
                                                                <span className="text-[10px] font-bold text-zinc-400">{replyingTo.userName.substring(0, 2).toUpperCase()}</span>
                                                            )}
                                                        </div>
                                                        <div className="flex flex-col min-w-0">
                                                            <span className="text-[10px] font-bold text-zinc-400">Replying to {replyingTo.userName}</span>
                                                            <span className="text-[10px] text-zinc-600 truncate max-w-[300px]">{replyingTo.text}</span>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => setReplyingTo(null)}
                                                        className="p-1 rounded-lg hover:bg-white/10 text-zinc-500 hover:text-white transition-colors"
                                                        aria-label="Cancel reply"
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            )}

                                            <div className="flex items-end gap-2 bg-zinc-900/50 border border-white/10 rounded-xl p-2 transition-all">
                                                <textarea
                                                    placeholder={replyingTo ? `Reply to ${replyingTo.userName}...` : "Add a note..."}
                                                    value={newComment}
                                                    onChange={(e) => setNewComment(e.target.value)}
                                                    className="flex-1 bg-transparent border-none focus:ring-0 p-2 text-sm text-white placeholder:text-zinc-600 resize-none min-h-[24px] max-h-[120px] leading-relaxed custom-scrollbar"
                                                    rows={1}
                                                    style={{ minHeight: '24px' }}
                                                    onInput={(e) => {
                                                        const target = e.target as HTMLTextAreaElement;
                                                        target.style.height = 'auto';
                                                        target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
                                                    }}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter' && !e.shiftKey) {
                                                            e.preventDefault();
                                                            handlePostComment();
                                                        }
                                                    }}
                                                />
                                                <button
                                                    onClick={handlePostComment}
                                                    disabled={!newComment.trim() || isPostingComment}
                                                    className="shrink-0 bg-white hover:bg-zinc-200 text-black px-4 py-2 rounded-lg text-xs font-bold transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-white/5 h-[36px]"
                                                >
                                                    {isPostingComment ? (
                                                        <Loader2 className="w-3 h-3 animate-spin" />
                                                    ) : (
                                                        <Send className="w-3 h-3" />
                                                    )}
                                                    Post
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>

            {/* Confirmation Modal */}
            {confirmModal.isOpen && (
                <div className="fixed inset-0 z-200 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-[#09090b] border border-white/10 rounded-xl p-6 max-w-sm w-full shadow-2xl"
                    >
                        <h3 className="text-lg font-bold text-white mb-2">Delete {confirmModal.type}?</h3>
                        <p className="text-zinc-400 text-sm mb-6">
                            Are you sure you want to delete this {confirmModal.type}? This action cannot be undone.
                        </p>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                                className="px-4 py-2 rounded-lg text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    confirmDelete();
                                    setConfirmModal({ ...confirmModal, isOpen: false });
                                }}
                                className="px-4 py-2 rounded-lg text-sm font-bold bg-red-500 hover:bg-red-600 text-white transition-colors shadow-lg shadow-red-500/20"
                            >
                                Delete
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
