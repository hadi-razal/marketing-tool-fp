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
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
                        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-[#09090b] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-[90vh]"
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-white/5 flex items-start justify-between bg-zinc-900/30">
                            <div className="space-y-1 pr-8">
                                <h2 className="text-xl font-bold text-white leading-tight">{task.title}</h2>
                                <div className="flex items-center gap-2 mt-3">
                                    <div className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border flex items-center gap-1.5 ${getPriorityStyles(task.priority)}`}>
                                        {getPriorityIcon(task.priority)}
                                        {task.priority}
                                    </div>
                                    <div className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${getStatusStyles(task.status)}`}>
                                        {task.status}
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 rounded-xl hover:bg-white/5 text-zinc-400 hover:text-white transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Scrollable Content */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                            <div className="space-y-8">
                                {/* Description */}
                                <div className="space-y-3">
                                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                                        Description
                                    </label>
                                    <div className="bg-zinc-900/50 rounded-xl p-4 border border-white/5">
                                        <p className="text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap">
                                            {task.description || "No description provided."}
                                        </p>
                                    </div>
                                </div>

                                {/* Meta Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="bg-zinc-900/30 rounded-xl p-4 border border-white/5 space-y-1">
                                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                                            <Calendar className="w-3.5 h-3.5" />
                                            Due Date
                                        </label>
                                        <p className="text-white font-medium text-sm">
                                            {task.due_date ? format(new Date(task.due_date), 'MMMM d, yyyy') : 'No due date'}
                                        </p>
                                    </div>

                                    <div className="bg-zinc-900/30 rounded-xl p-4 border border-white/5 space-y-1">
                                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                                            <Layout className="w-3.5 h-3.5" />
                                            Related To
                                        </label>
                                        <p className="text-white font-medium text-sm">
                                            {task.related_to || 'Not specified'}
                                        </p>
                                    </div>

                                    <div className="bg-zinc-900/30 rounded-xl p-4 border border-white/5 space-y-1">
                                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                                            <User className="w-3.5 h-3.5" />
                                            Created By
                                        </label>
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-400 overflow-hidden ring-2 ring-black">
                                                {task.profile_url ? (
                                                    <img src={task.profile_url} alt={task.created_by} className="w-full h-full object-cover" />
                                                ) : (
                                                    (task.created_by || 'U').charAt(0).toUpperCase()
                                                )}
                                            </div>
                                            <div>
                                                <p className="text-white font-medium text-sm">{task.created_by}</p>
                                                {task.created_at && (
                                                    <p className="text-[10px] text-zinc-500">
                                                        {format(new Date(task.created_at), 'MMM d, yyyy')}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-zinc-900/30 rounded-xl p-4 border border-white/5 space-y-1">
                                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                                            {task.visibility === 'Public' ? <Globe className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                                            Visibility
                                        </label>
                                        <p className="text-white font-medium text-sm">
                                            {task.visibility}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-white/5 bg-zinc-900/30 flex justify-end">
                            <button
                                onClick={onClose}
                                className="px-6 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-sm font-bold transition-colors border border-white/5"
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
