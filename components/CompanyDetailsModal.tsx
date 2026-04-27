import React, { useState, useEffect } from 'react';
import { X, Globe, Linkedin, Twitter, Facebook, MapPin, Users, Calendar, DollarSign, Phone, Building2, ExternalLink, Save, CheckCircle2, Loader2, Trash2, Send, ChevronDown, ChevronUp, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Company } from './CompanyCard';
import { formatDistanceToNow, format, isBefore, subHours } from 'date-fns';

import { getBrandColor } from '@/lib/utils';
import { databaseService, Comment, SavedPerson } from '@/services/databaseService';
import { createClient } from '@/lib/supabase';
import { toast } from 'sonner';

interface CompanyDetailsModalProps {
    company: Company | null;
    isOpen: boolean;
    onClose: () => void;
    onSave?: (company: Company) => Promise<void>; // Async save handler
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

export const CompanyDetailsModal: React.FC<CompanyDetailsModalProps> = ({ company, isOpen, onClose, onSave }) => {
    const [isSaving, setIsSaving] = useState(false);
    const [showAllKeywords, setShowAllKeywords] = useState(false);
    const [localComments, setLocalComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState('');
    const [isPostingComment, setIsPostingComment] = useState(false);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'overview' | 'comments' | 'people'>('overview');
    const [companyPeople, setCompanyPeople] = useState<SavedPerson[]>([]);
    const [isLoadingPeople, setIsLoadingPeople] = useState(false);
    const [replyingTo, setReplyingTo] = useState<{ id: string, userName: string, text: string, userProfileUrl?: string } | null>(null);
    const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
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
        // Reset comments when company changes
        setLocalComments([]);
        setReplyingTo(null);
        setExpandedComments(new Set());

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
        const fetchPeople = async () => {
            if (activeTab === 'people' && company?.id) {
                setIsLoadingPeople(true);
                try {
                    const people = await databaseService.getPeopleByCompany(company.id);
                    setCompanyPeople(people);
                } catch (error) {
                    console.error('Failed to fetch people:', error);
                } finally {
                    setIsLoadingPeople(false);
                }
            }
        };

        fetchPeople();
    }, [activeTab, company?.id]);

    useEffect(() => {
        if (activeTab === 'comments') {
            // Small timeout to ensure DOM is ready
            setTimeout(scrollToBottom, 100);
        }
    }, [activeTab, localComments.length]);

    if (!company) return null;

    const brandColor = getBrandColor(company.name);

    const handleSave = async () => {
        if (onSave && !company.isSaved) {
            setIsSaving(true);
            await onSave(company);
            setIsSaving(false);
        }
    };

    const handleDeleteComment = async (commentId: string) => {
        if (!confirm('Are you sure you want to delete this comment?')) return;

        try {
            const updatedComments = await databaseService.deleteComment(company.id, commentId);
            setLocalComments(updatedComments);
            toast.success('Comment deleted');
        } catch (error) {
            console.error('Failed to delete comment:', error);
            toast.error('Failed to delete comment. Please try again.');
        }
    };

    const handleDeleteReply = async (commentId: string, replyId: string) => {
        if (!confirm('Are you sure you want to delete this reply?')) return;

        try {
            const updatedComments = await databaseService.deleteReply(company.id, commentId, replyId);
            setLocalComments(updatedComments);
            toast.success('Reply deleted');
        } catch (error) {
            console.error('Failed to delete reply:', error);
            toast.error('Failed to delete reply. Please try again.');
        }
    };

    const handlePostComment = async () => {
        if (!newComment.trim()) return;

        setIsPostingComment(true);
        try {
            let updatedComments;
            if (replyingTo) {
                updatedComments = await databaseService.addReply(company.id, replyingTo.id, newComment.trim());
                // Automatically expand the comment we just replied to
                setExpandedComments(prev => new Set(prev).add(replyingTo.id));
                setReplyingTo(null);
            } else {
                updatedComments = await databaseService.addComment(company.id, newComment.trim());
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

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="fixed inset-0 m-auto w-full max-w-5xl h-[85vh] bg-[#0c0c0e] border border-white/5 shadow-[0_0_100px_rgba(0,0,0,0.8)] rounded-[20px] z-50 overflow-hidden flex flex-col"
                    >
                        {/* Background subtle glow */}
                        <div
                            className="absolute top-[-100px] right-[-100px] w-[600px] h-[600px] rounded-full blur-[160px] opacity-[0.12] pointer-events-none"
                            style={{ background: brandColor || '#3b82f6' }}
                        />

                        {/* Top Header Section */}
                        <div className="relative pt-12 px-12 pb-8 flex items-start gap-8 shrink-0 z-10 w-full">
                            {/* Close Button */}
                            <button
                                onClick={onClose}
                                className="absolute top-6 right-6 p-2 bg-white/5 hover:bg-white/10 rounded-full text-zinc-400 hover:text-white transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            <div className="w-[140px] h-[140px] shrink-0 bg-white flex items-center justify-center p-4">
                                {company.logo ? (
                                    <img src={company.logo} alt={company.name} className="max-w-[70%] max-h-[70%] object-contain" />
                                ) : (
                                    <Building2 className="w-16 h-16 text-zinc-300" />
                                )}
                            </div>

                            <div className="flex-1 mt-1 pr-16">
                                <h2 className="text-[42px] font-bold tracking-[-0.02em] text-white leading-tight mb-3">{company.name}</h2>

                                <div className="flex items-center gap-3 mb-6">
                                    {company.industry && (
                                        <span className="px-4 py-1.5 rounded-full bg-[#081e3a] border border-[#163a6a] text-blue-300 text-xs font-semibold">
                                            {company.industry}
                                        </span>
                                    )}
                                </div>

                                <div className="flex items-center gap-6 text-[13px] text-zinc-400 font-medium">
                                    {company.location && (
                                        <span className="flex items-center gap-2">
                                            <MapPin className="w-4 h-4 text-transparent stroke-zinc-500" fill="none" />
                                            {company.location}
                                        </span>
                                    )}
                                    {company.founded_year && (
                                        <span className="flex items-center gap-2">
                                            <Calendar className="w-4 h-4 text-zinc-500" strokeWidth={1.5} />
                                            Est. {company.founded_year}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Action Button - Moved to right side with flex positioning */}
                            <div className="shrink-0 pt-2 absolute right-12 top-[80px]">
                                {onSave && (
                                    <button
                                        onClick={handleSave}
                                        disabled={company.isSaved || isSaving}
                                        className={`px-5 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all ${company.isSaved
                                                ? 'bg-zinc-800/80 text-zinc-400 border border-white/5 cursor-default'
                                                : 'bg-white hover:bg-zinc-200 text-black shadow-lg shadow-white/10'
                                            }`}
                                    >
                                        {isSaving ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : company.isSaved ? (
                                            <CheckCircle2 className="w-4 h-4 text-zinc-500" strokeWidth={2.5} />
                                        ) : (
                                            <CheckCircle2 className="w-4 h-4 opacity-50" strokeWidth={2.5} />
                                        )}
                                        {isSaving ? 'Saving...' : company.isSaved ? 'Saved to Database' : 'Save to Database'}
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Tabs */}
                        <div className="px-12 border-b border-white/[0.08] relative z-10 shrink-0 mt-3 flex items-center h-12">
                            <div className="flex gap-10 h-full">
                                <button
                                    onClick={() => setActiveTab('overview')}
                                    className={`h-full text-[14px] font-bold transition-all relative ${activeTab === 'overview' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                                >
                                    Overview
                                    {activeTab === 'overview' && (
                                        <motion.div layoutId="tab-indicator" className="absolute bottom-[-1px] left-0 w-full h-[2px] bg-white" />
                                    )}
                                </button>
                                <button
                                    onClick={() => setActiveTab('comments')}
                                    className={`h-full text-[14px] font-bold transition-all flex items-center gap-2 relative ${activeTab === 'comments' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                                >
                                    Comments
                                    <span className={`w-[22px] h-[22px] rounded-full flex items-center justify-center text-[10px] font-bold ${activeTab === 'comments' ? 'bg-white/20 text-white' : 'bg-white/10 text-zinc-400'}`}>
                                        {localComments.length}
                                    </span>
                                    {activeTab === 'comments' && (
                                        <motion.div layoutId="tab-indicator" className="absolute bottom-[-1px] left-0 w-full h-[2px] bg-white" />
                                    )}
                                </button>
                                <button
                                    onClick={() => setActiveTab('people')}
                                    className={`h-full text-[14px] font-bold transition-all relative ${activeTab === 'people' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                                >
                                    People
                                    {activeTab === 'people' && (
                                        <motion.div layoutId="tab-indicator" className="absolute bottom-[-1px] left-0 w-full h-[2px] bg-white" />
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 min-h-0 relative z-10 flex flex-col pt-10 px-12 pb-12">
                            <AnimatePresence mode="wait">
                                {activeTab === 'overview' ? (
                                    <motion.div
                                        key="overview"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        transition={{ duration: 0.2 }}
                                        className="h-full overflow-y-auto custom-scrollbar pr-4 -mr-4"
                                    >
                                        <div className="flex flex-col lg:flex-row gap-8 lg:gap-[120px]">
                                            {/* LEFT COLUMN: About & Keywords */}
                                            <div className="flex-1 min-w-0 space-y-[44px]">
                                                <section>
                                                    <h3 className="text-[12px] font-semibold text-zinc-500 tracking-[0.08em] mb-7 flex items-center gap-3">
                                                        <span className="w-10 h-[1px] bg-zinc-700"></span> ABOUT
                                                    </h3>
                                                    <p className="text-white text-[15px] leading-relaxed max-w-[640px] font-medium">
                                                        {company.description || 'No description available for this company.'}
                                                    </p>
                                                </section>

                                                {company.keywords && company.keywords.length > 0 && (
                                                    <section>
                                                        <h3 className="text-[12px] font-semibold text-zinc-500 tracking-[0.08em] mb-6 flex items-center gap-3">
                                                            <span className="w-10 h-[1px] bg-zinc-700"></span> KEYWORDS
                                                        </h3>
                                                        <div className="flex flex-wrap gap-[9px] max-w-[640px]">
                                                            {company.keywords.slice(0, showAllKeywords ? undefined : 12).map((keyword, idx) => (
                                                                <span key={idx} className="px-4 py-[8px] rounded-lg bg-white/[0.04] border border-white-[0.06] flex items-center text-zinc-300 text-[13px] font-medium tracking-wide">
                                                                    {keyword}
                                                                </span>
                                                            ))}
                                                            {company.keywords.length > 12 && (
                                                                <button
                                                                    onClick={() => setShowAllKeywords(!showAllKeywords)}
                                                                    className="px-4 py-[8px] rounded-lg bg-white/10 text-white text-[13px] font-medium hover:bg-white/20 transition-colors"
                                                                >
                                                                    {showAllKeywords ? 'Show Less' : `+${company.keywords.length - 12} more`}
                                                                </button>
                                                            )}
                                                        </div>
                                                    </section>
                                                )}
                                            </div>

                                            {/* RIGHT COLUMN: Details & Socials */}
                                            <div className="w-[340px] shrink-0 space-y-7">
                                                {/* Details Box */}
                                                <div className="p-7 pt-6 rounded-xl border border-white/10 bg-[#111113]">
                                                    <h3 className="text-[11px] font-bold text-zinc-500 tracking-[0.08em] mb-8 uppercase">Company Details</h3>
                                                    <div className="space-y-[30px]">
                                                        {company.website && (
                                                            <div className="flex items-center gap-5">
                                                                <div className="w-11 h-11 rounded-lg bg-white/[0.03] border border-white/[0.08] flex items-center justify-center shrink-0">
                                                                    <Globe className="w-5 h-5 text-zinc-400" strokeWidth={1.5} />
                                                                </div>
                                                                <a href={company.website} target="_blank" rel="noopener noreferrer" className="text-[14px] font-semibold text-white hover:underline truncate">
                                                                    {company.website.replace(/^https?:\/\//, '').replace(/\/$/, '') || 'Website'}
                                                                </a>
                                                            </div>
                                                        )}
                                                        {company.employees && (
                                                            <div className="flex items-center gap-5">
                                                                <div className="w-11 h-11 rounded-lg bg-white/[0.03] border border-white/[0.08] flex items-center justify-center shrink-0">
                                                                    <Users className="w-5 h-5 text-zinc-400" strokeWidth={1.5} />
                                                                </div>
                                                                <span className="text-[14px] font-semibold text-white">
                                                                    {company.employees.toLocaleString()} Employees
                                                                </span>
                                                            </div>
                                                        )}
                                                        {company.revenue && (
                                                            <div className="flex items-center gap-5">
                                                                <div className="w-11 h-11 rounded-lg bg-white/[0.03] border border-white/[0.08] flex items-center justify-center shrink-0">
                                                                    <DollarSign className="w-5 h-5 text-zinc-400" strokeWidth={1.5} />
                                                                </div>
                                                                <span className="text-[14px] font-semibold text-white">
                                                                    {company.revenue} Revenue
                                                                </span>
                                                            </div>
                                                        )}
                                                        {company.phone && (
                                                            <div className="flex items-center gap-5">
                                                                <div className="w-11 h-11 rounded-lg bg-white/[0.03] border border-white/[0.08] flex items-center justify-center shrink-0">
                                                                    <Phone className="w-5 h-5 text-zinc-400" strokeWidth={1.5} />
                                                                </div>
                                                                <span className="text-[14px] font-semibold text-white">
                                                                    {company.phone}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Social Profiles */}
                                                <div className="p-7 pt-6 rounded-xl border border-white/10 bg-[#111113]">
                                                    <h3 className="text-[11px] font-bold text-zinc-500 tracking-[0.08em] mb-6 uppercase">Social Profiles</h3>
                                                    <div className="flex gap-[14px]">
                                                        {company.linkedin && (
                                                            <a href={company.linkedin} target="_blank" rel="noopener noreferrer" className="w-[42px] h-[42px] rounded-xl border border-[#0077b5]/30 bg-[#0077b5]/10 flex items-center justify-center text-[#0077b5] transition-all">
                                                                <Linkedin className="w-5 h-5" fill="currentColor" strokeWidth={0} />
                                                            </a>
                                                        )}
                                                        {company.twitter && (
                                                            <a href={company.twitter} target="_blank" rel="noopener noreferrer" className="w-[42px] h-[42px] rounded-xl border border-white/10 bg-white/5 flex items-center justify-center text-white transition-all">
                                                                <Twitter className="w-5 h-5" />
                                                            </a>
                                                        )}
                                                        {company.facebook && (
                                                            <a href={company.facebook} target="_blank" rel="noopener noreferrer" className="w-[42px] h-[42px] rounded-xl border border-white/10 bg-white/5 flex items-center justify-center text-white transition-all">
                                                                <Facebook className="w-5 h-5" />
                                                            </a>
                                                        )}
                                                        {!company.linkedin && !company.twitter && !company.facebook && (
                                                            <span className="text-[14px] text-zinc-500">No profiles found</span>
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
                                                                                        handleDeleteComment(comment.id);
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
                                                                                                            handleDeleteReply(comment.id, reply.id);
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
                                        {company.isSaved && (
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
                                                        className="flex items-end gap-2 bg-zinc-900/50 border border-white/10 rounded-xl p-2 transition-all"
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
                                ) : (
                                    <motion.div
                                        key="people"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        transition={{ duration: 0.2 }}
                                        className="flex-1 overflow-y-auto p-8 custom-scrollbar"
                                    >
                                        {isLoadingPeople ? (
                                            <div className="flex items-center justify-center h-40">
                                                <Loader2 className="w-8 h-8 text-zinc-500 animate-spin" />
                                            </div>
                                        ) : companyPeople.length > 0 ? (
                                            <div className="overflow-hidden rounded-xl border border-white/5 bg-zinc-900/30">
                                                <table className="w-full text-left text-sm text-zinc-400">
                                                    <thead className="bg-white/5 text-xs uppercase font-bold text-zinc-500">
                                                        <tr>
                                                            <th className="px-6 py-4">Name</th>
                                                            <th className="px-6 py-4">Title</th>
                                                            <th className="px-6 py-4">Location</th>
                                                            <th className="px-6 py-4 text-right">Actions</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-white/5">
                                                        {companyPeople.map((person) => (
                                                            <tr key={person.id} className="hover:bg-white/5 transition-colors">
                                                                <td className="px-6 py-4">
                                                                    <div className="flex items-center gap-3">
                                                                        <Avatar
                                                                            src={person.image || person.photo_url}
                                                                            alt={person.name ?? ''}
                                                                            name={person.name ?? ''}
                                                                            className="w-8 h-8 rounded-full object-cover text-xs"
                                                                        />
                                                                        <div>
                                                                            <div className="font-medium text-white">{person.name}</div>
                                                                            <div className="text-xs text-zinc-500">{person.email}</div>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-4 max-w-[200px] truncate" title={person.title}>
                                                                    {person.title || 'N/A'}
                                                                </td>
                                                                <td className="px-6 py-4">
                                                                    {person.location || person.city || 'N/A'}
                                                                </td>
                                                                <td className="px-6 py-4 text-right">
                                                                    <div className="flex justify-end gap-2">
                                                                        {person.linkedin && (
                                                                            <a
                                                                                href={person.linkedin.startsWith('http') ? person.linkedin : `https://${person.linkedin}`}
                                                                                target="_blank"
                                                                                rel="noopener noreferrer"
                                                                                className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white transition-colors"
                                                                            >
                                                                                <Linkedin className="w-3.5 h-3.5" />
                                                                            </a>
                                                                        )}
                                                                        {person.email && (
                                                                            <a
                                                                                href={`mailto:${person.email}`}
                                                                                className="p-1.5 rounded-lg bg-orange-500/10 text-orange-400 hover:bg-orange-500 hover:text-white transition-colors"
                                                                            >
                                                                                <Send className="w-3.5 h-3.5" />
                                                                            </a>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        ) : (
                                            <div className="text-center py-12">
                                                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-3">
                                                    <Users className="w-5 h-5 text-zinc-600" />
                                                </div>
                                                <p className="text-sm text-zinc-500">No people found for this company.</p>
                                            </div>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </motion.div >
                </>
            )}
        </AnimatePresence >
    );
};
