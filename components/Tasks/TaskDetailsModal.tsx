import React from 'react';
import { X, Calendar, Flag, Globe, Lock, Layout, User, Clock, CheckCircle2, AlertCircle, ArrowUpCircle, ArrowDownCircle, MinusCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Task } from '@/types/task';
import { format } from 'date-fns';

interface TaskDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    task: Task | null;
}

export const TaskDetailsModal = ({ isOpen, onClose, task }: TaskDetailsModalProps) => {
    if (!task) return null;

    const getPriorityIcon = (priority: string) => {
        switch (priority.toLowerCase()) {
            case 'high': return <ArrowUpCircle className="w-3.5 h-3.5" />;
            case 'medium': return <AlertCircle className="w-3.5 h-3.5" />;
            case 'low': return <ArrowDownCircle className="w-3.5 h-3.5" />;
            default: return <MinusCircle className="w-3.5 h-3.5" />;
        }
    };

    const getPriorityStyles = (priority: string) => {
        switch (priority.toLowerCase()) {
            case 'high': return 'bg-red-500/10 text-red-400 border-red-500/20';
            case 'medium': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
            case 'low': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
            default: return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
        }
    };

    const getStatusStyles = (status: string) => {
        switch (status.toLowerCase()) {
            case 'completed': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
            case 'in progress': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
            default: return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
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
                        className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 pointer-events-auto"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
                        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-[#09090b] border border-white/10 rounded-3xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-[90vh] pointer-events-auto"
                    >
                        {/* Status Stripe */}
                        <div className={`h-1 w-full ${task.status === 'Completed' ? 'bg-emerald-500' : task.priority === 'High' ? 'bg-red-500' : 'bg-blue-500'}`} />

                        {/* Subtle Gradient Backglow */}
                        <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />

                        {/* Header */}
                        <div className="relative p-8 pb-4 flex items-start justify-between z-10">
                            <div className="space-y-4 pr-12 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                    <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border flex items-center gap-1.5 ${getPriorityStyles(task.priority)}`}>
                                        {getPriorityIcon(task.priority)}
                                        {task.priority}
                                    </div>
                                    <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getStatusStyles(task.status)}`}>
                                        {task.status}
                                    </div>
                                </div>
                                <h2 className="text-2xl font-bold text-white leading-tight break-words">{task.title}</h2>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2.5 rounded-full bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/20 text-zinc-400 hover:text-white transition-all shadow-lg flex-shrink-0"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Scrollable Content */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-8 pt-0 z-10">
                            <div className="space-y-8">
                                {/* Description */}
                                {task.description && (
                                    <div className="space-y-2">
                                        <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
                                            Description
                                        </h3>
                                        <p className="text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap">
                                            {task.description}
                                        </p>
                                    </div>
                                )}

                                {task.description && <div className="h-px bg-white/5" />}

                                {/* Meta Grid - Clean & Minimal */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-8 gap-x-4">
                                    {/* Due Date */}
                                    <div className="flex items-start gap-3">
                                        <Calendar className="w-5 h-5 text-zinc-500 mt-0.5" />
                                        <div>
                                            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Due Date</p>
                                            <p className="text-white font-medium text-sm">
                                                {task.due_date ? format(new Date(task.due_date), 'MMMM d, yyyy') : 'No due date'}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Related To */}
                                    <div className="flex items-start gap-3">
                                        <Layout className="w-5 h-5 text-zinc-500 mt-0.5" />
                                        <div>
                                            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Related To</p>
                                            <p className="text-white font-medium text-sm">
                                                {task.related_to || 'Not specified'}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Created By */}
                                    <div className="flex items-start gap-3">
                                        <div className="w-5 h-5 mt-0.5 rounded-full bg-zinc-800 border border-white/5 flex items-center justify-center text-[10px] font-bold text-zinc-400 overflow-hidden ring-1 ring-black">
                                            {task.profile_url ? (
                                                <img src={task.profile_url} alt={task.created_by} className="w-full h-full object-cover" />
                                            ) : (
                                                (task.created_by || 'U').charAt(0).toUpperCase()
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Created By</p>
                                            <p className="text-white font-medium text-sm">{task.created_by}</p>
                                            {task.created_at && (
                                                <p className="text-[10px] text-zinc-600 mt-0.5">
                                                    {format(new Date(task.created_at), 'MMM d, yyyy')}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Closed By - Only if Completed */}
                                    {/* Closed By - Only if Completed */}
                                    {(task.status === 'Completed' || task.closed_by) && (
                                        <div className="flex items-start gap-3">
                                            <div className="w-5 h-5 mt-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 shrink-0">
                                                <CheckCircle2 className="w-3 h-3" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Closed By</p>
                                                <div className="flex items-center gap-2">
                                                    {task.closed_by_profile_url ? (
                                                        <img
                                                            src={task.closed_by_profile_url}
                                                            alt={task.closed_by_name || 'User'}
                                                            className="w-5 h-5 rounded-full object-cover border border-white/10"
                                                        />
                                                    ) : (
                                                        <div className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-[10px] font-bold text-emerald-500">
                                                            {(task.closed_by_name?.[0] || '?').toUpperCase()}
                                                        </div>
                                                    )}
                                                    <p className="text-white font-medium text-sm">
                                                        {task.closed_by_name || 'Unknown'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Visibility */}
                                    <div className="flex items-start gap-3">
                                        {task.visibility === 'Public' ?
                                            <Globe className="w-5 h-5 text-zinc-500 mt-0.5" /> :
                                            <Lock className="w-5 h-5 text-zinc-500 mt-0.5" />
                                        }
                                        <div>
                                            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Visibility</p>
                                            <p className="text-white font-medium text-sm">
                                                {task.visibility}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-8 border-t border-white/5 bg-[#09090b] flex justify-end z-10">
                            <button
                                onClick={onClose}
                                className="px-8 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-white text-sm font-bold transition-all border border-white/5 hover:border-white/10"
                            >
                                Close
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
