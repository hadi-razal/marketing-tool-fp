import React, { useState, useEffect, useRef } from 'react';
import { X, Linkedin, Mail, Phone, Building2, MapPin, Check, Shield, Copy, Send, Trash2, ChevronDown, ChevronUp, MessageSquare, Loader2, CheckCircle2, ExternalLink, User, Sparkles, XCircle, Trophy } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow, format, isBefore, subHours } from 'date-fns';
import { databaseService, Comment, SavedPerson } from '@/services/databaseService';
import { createClient } from '@/lib/supabase';
import { getBrandColor } from '@/lib/utils';
import { toast } from 'sonner';

interface LeadDetailModalProps {
    lead: SavedPerson & { image?: string; isSaved?: boolean; saved_by?: string; saved_by_profile_url?: string };
    onClose: () => void;
    onUnlock?: (lead: SavedPerson, type: 'email' | 'phone') => Promise<any>;
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

const Avatar = ({ src, alt, name, className }: { src?: string, alt: string, name: string, className?: string }) => {
    const [imageError, setImageError] = useState(false);

    // Check if we have a valid image URL
    const hasValidSrc = src && src.trim() !== '' && !imageError;

    // Generate initials for fallback
    const initials = name
        ? name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
        : 'U';

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
    const [localLead, setLocalLead] = useState(lead);
    const [activeTab, setActiveTab] = useState<'overview' | 'comments' | 'actions'>('overview');
    const [isUnlockingEmail, setIsUnlockingEmail] = useState(false);
    const [isUnlockingPhone, setIsUnlockingPhone] = useState(false);
    const [contactStatus, setContactStatus] = useState(lead?.contact_status || 'New');
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

    // Comment state
    const [localComments, setLocalComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState('');
    const [isPostingComment, setIsPostingComment] = useState(false);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [replyingTo, setReplyingTo] = useState<{ id: string, userName: string, text: string, userProfileUrl?: string } | null>(null);
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

    const brandColor = getBrandColor(localLead?.name || 'Lead');

    useEffect(() => {
        setLocalLead(lead);
        setContactStatus(lead?.contact_status || 'New');
    }, [lead]);

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

    useEffect(() => {
        if (activeTab === 'comments') {
            setTimeout(() => {
                commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
        }
    }, [activeTab, localComments.length]);

    const handleStatusUpdate = async (newStatus: string) => {
        setIsUpdatingStatus(true);
        try {
            await databaseService.updatePersonStatus(localLead.id, newStatus);
            setContactStatus(newStatus);
            setLocalLead(prev => ({ ...prev, contact_status: newStatus }));
            toast.success(`Status updated to ${newStatus}`);
        } catch (error) {
            console.error('Failed to update status:', error);
            toast.error('Failed to update status. Please try again.');
        } finally {
            setIsUpdatingStatus(false);
        }
    };

    const STATUS_OPTIONS = ['New', 'Contacted', 'In Progress', 'Qualified', 'Unqualified', 'Customer'];

    if (!localLead) return null;

    const isEmailLocked = !localLead.email || localLead.email === 'email_not_unlocked@domain.com' || localLead.email.includes('email_not_unlocked');
    const isPhoneLocked = !localLead.phone || localLead.phone === 'N/A';

    const handleUnlockClick = async (type: 'email' | 'phone') => {
        if (!onUnlock) return;

        if (type === 'email') setIsUnlockingEmail(true);
        else setIsUnlockingPhone(true);

        try {
            const unlockedLead = await onUnlock(localLead, type);
            if (unlockedLead) {
                setLocalLead(unlockedLead);
            }
        } catch (error) {
            console.error("Failed to unlock:", error);
        } finally {
            setIsUnlockingEmail(false);
            setIsUnlockingPhone(false);
        }
    };

    const getEmailStatusColor = (status: string) => {
        switch (status) {
            case 'verified': return 'text-green-400 bg-green-500/10 border-green-500/20';
            case 'likely_valid': return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
            default: return 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20';
        }
    };

    const getSocialLink = (url: string) => {
        if (!url) return null;
        return url.startsWith('http') ? url : `https://${url}`;
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
    };

    // Comment Handlers
    const handlePostComment = async () => {
        if (!newComment.trim()) return;

        setIsPostingComment(true);
        try {
            let updatedComments;
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
    };

    const handleDeleteCommentClick = (commentId: string) => {
        setConfirmModal({
            isOpen: true,
            type: 'comment',
            id: commentId
        });
    };

    const handleDeleteReplyClick = (commentId: string, replyId: string) => {
        setConfirmModal({
            isOpen: true,
            type: 'reply',
            id: commentId,
            replyId: replyId
        });
    };

    const confirmDelete = async () => {
        if (!confirmModal.id || !confirmModal.type) return;

        try {
            if (confirmModal.type === 'comment') {
                const updatedComments = await databaseService.deletePersonComment(localLead.id, confirmModal.id);
                setLocalComments(updatedComments);
            } else if (confirmModal.type === 'reply' && confirmModal.replyId) {
                const updatedComments = await databaseService.deletePersonReply(localLead.id, confirmModal.id, confirmModal.replyId);
                setLocalComments(updatedComments);
            }
        } catch (error) {
            console.error('Failed to delete item:', error);
            // Optional: Show error toast
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

    const getPositionColor = (status: string) => {
        switch (status) {
            case 'Customer': return 'bg-green-500/20 text-green-400 border-green-500/30';
            case 'Qualified': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
            case 'In Progress': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
            case 'Contacted': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
            default: return 'bg-zinc-800 text-zinc-400 border-white/5';
        }
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[150]"
            />
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="fixed inset-0 m-auto w-full max-w-4xl h-[90vh] bg-[#09090b] border border-white/10 rounded-3xl shadow-2xl z-[150] overflow-hidden flex flex-col"
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
                                alt={localLead.name || ''}
                            />
                            {localLead.email_status === 'verified' && (
                                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center border-2 border-[#09090b]">
                                    <Check className="w-3.5 h-3.5 text-white" />
                                </div>
                            )}
                        </div>
                        <div className="mb-2 flex-1">
                            <div className="flex items-center gap-4 mb-2">
                                <h2 className="text-4xl font-bold text-white tracking-tight">{localLead.name}</h2>
                                {localLead.isSaved && (
                                    <span className="bg-green-500/10 border border-green-500/20 text-green-500 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5">
                                        <CheckCircle2 className="w-3.5 h-3.5" /> Saved
                                    </span>
                                )}
                            </div>
                            <p className="text-orange-500 text-lg font-bold truncate mb-2">{localLead.title}</p>
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
                                        {(localLead as any).saved_by_profile_url ? (
                                            <div className="w-4 h-4 rounded-full overflow-hidden border border-zinc-700">
                                                <img src={(localLead as any).saved_by_profile_url} alt={localLead.saved_by} className="w-full h-full object-cover" />
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
                            {localLead.linkedin && (
                                <a
                                    href={getSocialLink(localLead.linkedin) || '#'}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="p-3 bg-white/5 border border-white/5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-all"
                                >
                                    <Linkedin className="w-5 h-5" />
                                </a>
                            )}
                            {!isEmailLocked && localLead.email && (
                                <a
                                    href={`mailto:${localLead.email}`}
                                    className="p-3 bg-white/5 border border-white/5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-all"
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
                        >
                            Overview
                            {activeTab === 'overview' && (
                                <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 w-full h-0.5 bg-white rounded-full" />
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab('comments')}
                            className={`pb-4 text-sm font-bold transition-all relative ${activeTab === 'comments' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
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
                        <button
                            onClick={() => setActiveTab('actions')}
                            className={`pb-4 text-sm font-bold transition-all relative ${activeTab === 'actions' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                        >
                            Actions
                            {activeTab === 'actions' && (
                                <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 w-full h-0.5 bg-white rounded-full" />
                            )}
                        </button>
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
                                                <span className="w-8 h-[1px] bg-zinc-800"></span> About
                                            </h3>
                                            <p className="text-zinc-300 leading-relaxed text-base">
                                                {localLead.headline || localLead.description || 'No description available for this person.'}
                                            </p>
                                        </section>

                                        {/* Work Info */}
                                        <section>
                                            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                                                <span className="w-8 h-[1px] bg-zinc-800"></span> Work
                                            </h3>
                                            <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-6 space-y-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0">
                                                        <Building2 className="w-6 h-6 text-orange-500" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-lg font-bold text-white truncate">{localLead.company || localLead.organization_name}</p>
                                                        {(localLead.website || localLead.company_website || localLead.organization_domain) && (
                                                            <a
                                                                href={getSocialLink(localLead.website || localLead.company_website || localLead.organization_domain || '') || '#'}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="text-sm text-zinc-500 hover:text-orange-400 flex items-center gap-1 mt-0.5 transition-colors"
                                                            >
                                                                {localLead.website || localLead.company_website || localLead.organization_domain}
                                                                <ExternalLink className="w-3 h-3" />
                                                            </a>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex flex-wrap gap-2">
                                                    {localLead.seniority && (
                                                        <span className="text-xs font-bold px-3 py-1.5 bg-blue-500/10 text-blue-400 rounded-lg border border-blue-500/20 uppercase tracking-wide">
                                                            {localLead.seniority}
                                                        </span>
                                                    )}
                                                    {localLead.departments?.map((dept: string, i: number) => (
                                                        <span key={i} className="text-xs font-bold px-3 py-1.5 bg-purple-500/10 text-purple-400 rounded-lg border border-purple-500/20 uppercase tracking-wide">
                                                            {dept}
                                                        </span>
                                                    ))}
                                                    {localLead.company_industry && (
                                                        <span className="text-xs font-bold px-3 py-1.5 bg-zinc-800 text-zinc-400 rounded-lg border border-white/5 uppercase tracking-wide">
                                                            {localLead.company_industry}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </section>
                                    </div>

                                    {/* Sidebar Info Column */}
                                    <div className="space-y-6">
                                        <div className="bg-zinc-900/50 rounded-2xl p-6 border border-white/5 space-y-5">
                                            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Contact Details</h3>

                                            {isEmailLocked && onUnlock && (
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
                                            )}

                                            {isPhoneLocked && onUnlock && (
                                                <div className="bg-zinc-900 border border-white/5 rounded-xl p-4 flex flex-col gap-3">
                                                    <div className="flex items-center gap-2 opacity-50">
                                                        <Phone className="w-4 h-4 text-zinc-500" />
                                                        <span className="text-xs text-zinc-400 italic">Phone Locked</span>
                                                    </div>
                                                    <button
                                                        onClick={() => handleUnlockClick('phone')}
                                                        disabled={isUnlockingPhone}
                                                        className="w-full py-2 bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20"
                                                    >
                                                        {isUnlockingPhone ? (
                                                            <>
                                                                <Loader2 className="w-3 h-3 animate-spin" />
                                                                Unlocking Phone...
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Shield className="w-3.5 h-3.5" />
                                                                Access Phone
                                                            </>
                                                        )}
                                                    </button>
                                                </div>
                                            )}

                                            {!isEmailLocked && localLead.email && (
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
                                                    >
                                                        <Copy className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            )}

                                            {!isPhoneLocked && localLead.phone && (
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
                                                    >
                                                        <Copy className="w-3.5 h-3.5" />
                                                    </button>
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
                                <div className="max-w-2xl mx-auto space-y-10">
                                    <section>
                                        <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                                            <span className="w-8 h-[1px] bg-zinc-800"></span> Status
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

                                                <div className="grid grid-cols-2 gap-3 mt-6">
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
                                                        'Customer': {
                                                            icon: Trophy,
                                                            color: 'text-yellow-400',
                                                            border: 'border-yellow-500/30',
                                                            bg: 'bg-yellow-500/10',
                                                            desc: 'Converted client'
                                                        }
                                                    }).map(([status, config]) => {
                                                        const Icon = config.icon;
                                                        const isSelected = contactStatus === status;

                                                        return (
                                                            <button
                                                                key={status}
                                                                onClick={() => handleStatusUpdate(status)}
                                                                disabled={isUpdatingStatus}
                                                                className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all duration-200 gap-2 ${isSelected
                                                                    ? `${config.bg} ${config.border} ring-1 ring-inset ring-white/10`
                                                                    : 'bg-zinc-900 border-white/5 hover:bg-white/5 hover:border-white/10'
                                                                    }`}
                                                            >
                                                                <div className={`p-2 rounded-full ${isSelected ? 'bg-white/10' : 'bg-white/5'} ${config.color}`}>
                                                                    <Icon className="w-5 h-5" />
                                                                </div>
                                                                <div className="text-center">
                                                                    <div className={`font-bold text-sm ${isSelected ? 'text-white' : 'text-zinc-400'}`}>
                                                                        {status}
                                                                    </div>
                                                                    <div className={`text-[10px] mt-0.5 ${isSelected ? 'text-white/70' : 'text-zinc-600'}`}>
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
                                                                >
                                                                    <div className="w-6 h-[1px] bg-zinc-800"></div>
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
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            )}

                                            <div
                                                className="flex items-end gap-2 bg-zinc-900/50 border border-white/10 rounded-xl p-2 focus-within:border-[var(--brand-color)]/50 focus-within:ring-1 focus-within:ring-[var(--brand-color)]/50 transition-all"
                                                style={{ '--brand-color': brandColor } as React.CSSProperties}
                                            >
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
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
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
