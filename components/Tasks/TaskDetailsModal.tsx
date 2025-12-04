import React from 'react';
import { X, Calendar, Flag, Globe, Lock, Clock, Layout, Type, AlignLeft, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Task } from '@/types/task';
import { Button } from '../ui/Button';
import { format } from 'date-fns';

interface TaskDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    task: Task | null;
}

export const TaskDetailsModal = ({ isOpen, onClose, task }: TaskDetailsModalProps) => {
    if (!task) return null;

    const getPriorityColor = (priority: string) => {
        switch (priority.toLowerCase()) {
            case 'high': return 'text-red-400 bg-red-500/10 border-red-500/20';
            case 'medium': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
            case 'low': return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
            default: return 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20';
        }
    };

    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case 'completed': return 'text-green-400 bg-green-500/10 border-green-500/20';
            case 'in progress': return 'text-orange-400 bg-orange-500/10 border-orange-500/20';
            default: return 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20';
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
                        className="fixed inset-0 bg-black/80 backdrop-blur-md z-50"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
                        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-[#09090b] border border-white/10 rounded-md shadow-2xl z-50 overflow-hidden flex flex-col max-h-[90vh]"
                    >
                        {/* Header */}
                        <div className="p-8 pb-6 border-b border-white/5 flex items-center justify-between bg-gradient-to-b from-white/5 to-transparent">
                            <div className="flex items-center gap-3">
                                <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${getPriorityColor(task.priority)}`}>
                                    {task.priority}
                                </div>
                                <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${getStatusColor(task.status)}`}>
                                    {task.status}
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2.5 hover:bg-white/10 rounded-full text-zinc-400 hover:text-white transition-all hover:rotate-90 duration-300 border border-transparent hover:border-white/10"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Scrollable Content */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
                            <div className="space-y-8">
                                {/* Title & Description */}
                                <div className="space-y-4">
                                    <h2 className="text-2xl font-bold text-white leading-tight">{task.title}</h2>
                                    <div className="prose prose-invert max-w-none">
                                        <p className="text-zinc-400 text-base leading-relaxed whitespace-pre-wrap">
                                            {task.description || "No description provided."}
                                        </p>
                                    </div>
                                </div>

                                <div className="h-px bg-white/5" />

                                {/* Meta Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                                            <Calendar className="w-3.5 h-3.5" />
                                            Due Date
                                        </label>
                                        <p className="text-zinc-200 font-medium">
                                            {task.due_date ? format(new Date(task.due_date), 'MMMM d, yyyy') : 'No due date'}
                                        </p>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                                            <Layout className="w-3.5 h-3.5" />
                                            Related To
                                        </label>
                                        <p className="text-zinc-200 font-medium">
                                            {task.related_to || 'Not specified'}
                                        </p>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                                            <User className="w-3.5 h-3.5" />
                                            Created By
                                        </label>
                                        <div className="flex items-center gap-2">
                                            <img
                                                src={`https://ui-avatars.com/api/?name=${encodeURIComponent(task.created_by || 'U')}&background=random&color=fff`}
                                                alt={task.created_by}
                                                className="w-5 h-5 rounded-full ring-1 ring-white/10"
                                            />
                                            <span className="text-zinc-200 font-medium">{task.created_by}</span>
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                                            {task.visibility === 'Public' ? <Globe className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                                            Visibility
                                        </label>
                                        <p className="text-zinc-200 font-medium">
                                            {task.visibility}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-white/5 bg-zinc-900/50 backdrop-blur-xl flex justify-end">
                            <Button
                                variant="secondary"
                                onClick={onClose}
                                className="glass-button border-white/10 hover:border-white/20 text-zinc-400 hover:text-white px-6"
                            >
                                Close
                            </Button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
