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
                        className="fixed inset-0 m-auto w-full max-w-4xl h-[90vh] bg-[#09090b] border border-white/10 rounded-3xl shadow-2xl z-50 overflow-hidden flex flex-col"
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
                                <div className="w-32 h-32 rounded-2xl bg-white p-3 border-4 border-[#09090b] shadow-2xl flex items-center justify-center overflow-hidden shrink-0 relative z-10">
                                    {company.logo ? (
                                        <img src={company.logo} alt={company.name} className="w-full h-full object-contain" />
                                    ) : (
                                        <Building2 className="w-16 h-16 text-zinc-400" />
                                    )}
                                </div>
                                <div className="mb-2 flex-1">
                                    <div className="flex items-center gap-4 mb-2">
                                        <h2 className="text-4xl font-bold text-white tracking-tight">{company.name}</h2>
                                        {/* {company.isSaved && (
                                            <span className="bg-green-500/10 border border-green-500/20 text-green-500 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5">
                                                <CheckCircle2 className="w-3.5 h-3.5" /> Saved
                                            </span>
                                        )} */}
                                    </div>
                                    <div className="flex flex-wrap items-center gap-4 text-sm">
                                        {company.industry && (
                                            <span className="px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 font-medium">
                                                {company.industry}
                                            </span>
                                        )}
                                        {company.location && (
                                            <span className="flex items-center gap-1.5 text-zinc-400">
                                                <MapPin className="w-4 h-4 text-zinc-500" /> {company.location}
                                            </span>
                                        )}
                                        {company.founded_year && (
                                            <span className="flex items-center gap-1.5 text-zinc-400">
                                                <Calendar className="w-4 h-4 text-zinc-500" /> Est. {company.founded_year}
                                            </span>
                                        )}
                                        {company.saved_by && (
                                            <span className="flex items-center gap-1.5 text-zinc-500">
                                                {company.saved_by_profile_url ? (
                                                    <div className="w-4 h-4 rounded-full overflow-hidden border border-zinc-700">
                                                        <img src={company.saved_by_profile_url} alt={company.saved_by} className="w-full h-full object-cover" />
                                                    </div>
                                                ) : (
                                                    <span className="w-1 h-1 rounded-full bg-zinc-600" />
                                                )}
                                                Saved by {company.saved_by}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Save Button */}
                                {onSave && (
                                    <button
                                        onClick={handleSave}
                                        disabled={company.isSaved || isSaving}
                                        className={`px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-all shadow-lg mb-2 ${company.isSaved
                                            ? 'bg-zinc-800 text-zinc-500 cursor-default border border-white/5'
                                            : 'bg-white hover:bg-zinc-200 text-black shadow-white/10 active:scale-95'
                                            }`}
                                    >
                                        {isSaving ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : company.isSaved ? (
                                            <CheckCircle2 className="w-4 h-4" />
                                        ) : (
                                            <Save className="w-4 h-4" />
                                        )}
                                        {isSaving ? 'Saving...' : company.isSaved ? 'Saved to Database' : 'Save Company'}
                                    </button>
                                )}
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
                                    onClick={() => setActiveTab('people')}
                                    className={`pb-4 text-sm font-bold transition-all relative ${activeTab === 'people' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                                >
                                    People
                                    {activeTab === 'people' && (
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
                                                        {company.description || 'No description available for this company.'}
                                                    </p>
                                                </section>

                                                {company.keywords && company.keywords.length > 0 && (
                                                    <section>
                                                        <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                                                            <span className="w-8 h-[1px] bg-zinc-800"></span> Keywords
                                                        </h3>
                                                        <div className="flex flex-wrap gap-2">
                                                            {company.keywords.slice(0, showAllKeywords ? undefined : 8).map((keyword, idx) => (
                                                                <span key={idx} className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 text-zinc-400 text-sm hover:bg-white/10 transition-colors cursor-default">
                                                                    {keyword}
                                                                </span>
                                                            ))}
                                                            {company.keywords.length > 8 && (
                                                                <button
                                                                    onClick={() => setShowAllKeywords(!showAllKeywords)}
                                                                    className="px-3 py-1.5 rounded-lg bg-zinc-800/50 border border-zinc-700/50 text-zinc-400 text-sm hover:bg-zinc-800 hover:text-white transition-colors"
                                                                >
                                                                    {showAllKeywords ? 'Show Less' : `+${company.keywords.length - 8} more`}
                                                                </button>
                                                            )}
                                                        </div>
                                                    </section>
                                                )}
                                            </div>

                                            {/* Sidebar Info Column */}
                                            <div className="space-y-6">
                                                <div className="bg-zinc-900/50 rounded-2xl p-6 border border-white/5 space-y-5">
                                                    <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Company Details</h3>

                                                    {company.website && (
                                                        <a href={company.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-sm text-zinc-300 hover:text-blue-400 transition-colors group p-2 hover:bg-white/5 rounded-lg -mx-2">
                                                            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center border border-white/5 group-hover:border-blue-500/30 transition-colors">
                                                                <Globe className="w-4 h-4 text-zinc-500 group-hover:text-blue-400" />
                                                            </div>
                                                            <span className="truncate flex-1">Website</span>
                                                            <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                        </a>
                                                    )}

                                                    {company.employees && (
                                                        <div className="flex items-center gap-3 text-sm text-zinc-300 p-2 -mx-2">
                                                            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center border border-white/5">
                                                                <Users className="w-4 h-4 text-zinc-500" />
                                                            </div>
                                                            <span>{company.employees.toLocaleString()} Employees</span>
                                                        </div>
                                                    )}

                                                    {company.revenue && (
                                                        <div className="flex items-center gap-3 text-sm text-zinc-300 p-2 -mx-2">
                                                            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center border border-white/5">
                                                                <DollarSign className="w-4 h-4 text-zinc-500" />
                                                            </div>
                                                            <span>{company.revenue} Revenue</span>
                                                        </div>
                                                    )}

                                                    {company.phone && (
                                                        <div className="flex items-center gap-3 text-sm text-zinc-300 p-2 -mx-2">
                                                            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center border border-white/5">
                                                                <Phone className="w-4 h-4 text-zinc-500" />
                                                            </div>
                                                            <span>{company.phone}</span>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="bg-zinc-900/50 rounded-2xl p-6 border border-white/5">
                                                    <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-4">Social Profiles</h3>
                                                    <div className="flex gap-3">
                                                        {company.linkedin && (
                                                            <a href={company.linkedin} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-xl bg-[#0077b5]/10 border border-[#0077b5]/20 flex items-center justify-center text-[#0077b5] hover:bg-[#0077b5] hover:text-white transition-all duration-300">
                                                                <Linkedin className="w-5 h-5" />
                                                            </a>
                                                        )}
                                                        {company.twitter && (
                                                            <a href={company.twitter} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-xl bg-[#1da1f2]/10 border border-[#1da1f2]/20 flex items-center justify-center text-[#1da1f2] hover:bg-[#1da1f2] hover:text-white transition-all duration-300">
                                                                <Twitter className="w-5 h-5" />
                                                            </a>
                                                        )}
                                                        {company.facebook && (
                                                            <a href={company.facebook} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-xl bg-[#1877f2]/10 border border-[#1877f2]/20 flex items-center justify-center text-[#1877f2] hover:bg-[#1877f2] hover:text-white transition-all duration-300">
                                                                <Facebook className="w-5 h-5" />
                                                            </a>
                                                        )}
                                                        {!company.linkedin && !company.twitter && !company.facebook && (
                                                            <span className="text-zinc-500 text-sm italic">No social profiles found.</span>
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
