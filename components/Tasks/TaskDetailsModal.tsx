import React from 'react';
import { X, Calendar, Flag, Globe, Lock, Layout, User, Clock, CheckCircle2, AlertCircle, ArrowUpCircle, ArrowDownCircle, MinusCircle, Users } from 'lucide-react';
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
            case 'high': return 'bg-red-50 text-red-600 border-red-200';
            case 'medium': return 'bg-amber-50 text-amber-600 border-amber-200';
            case 'low': return 'bg-blue-50 text-blue-600 border-blue-200';
            default: return 'bg-zinc-100 text-zinc-600 border-zinc-200';
        }
    };

    const getStatusStyles = (status: string) => {
        switch (status.toLowerCase()) {
            case 'completed': return 'bg-emerald-50 text-emerald-600 border-emerald-200';
            case 'in progress': return 'bg-amber-50 text-amber-600 border-amber-200';
            default: return 'bg-zinc-100 text-zinc-600 border-zinc-200';
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
                        className="fixed inset-0 bg-zinc-950/45 backdrop-blur-sm z-50 pointer-events-auto"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
                        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-white border border-zinc-200 rounded-3xl shadow-2xl shadow-zinc-950/20 z-50 overflow-hidden flex flex-col max-h-[90vh] pointer-events-auto"
                    >
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
                                <h2 className="text-2xl font-bold text-zinc-950 leading-tight wrap-break-word">{task.title}</h2>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2.5 rounded-full bg-zinc-50 border border-zinc-200 hover:bg-orange-50 hover:border-orange-200 text-zinc-500 hover:text-zinc-950 transition-all shadow-sm shrink-0"
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
                                        <p className="text-zinc-700 text-sm leading-relaxed whitespace-pre-wrap">
                                            {task.description}
                                        </p>
                                    </div>
                                )}

                                {task.description && <div className="h-px bg-zinc-200" />}

                                {/* Meta Grid */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-8 gap-x-4">
                                    {/* Due Date */}
                                    <div className="flex items-start gap-3">
                                        <Calendar className="w-5 h-5 text-zinc-400 mt-0.5" />
                                        <div>
                                            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Due Date</p>
                                            <p className="text-zinc-950 font-medium text-sm">
                                                {task.due_date ? format(new Date(task.due_date), 'MMMM d, yyyy') : 'No due date'}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Related To */}
                                    <div className="flex items-start gap-3">
                                        <Layout className="w-5 h-5 text-zinc-400 mt-0.5" />
                                        <div>
                                            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Related To</p>
                                            <p className="text-zinc-950 font-medium text-sm">
                                                {task.related_to || 'Not specified'}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Created By */}
                                    <div className="flex items-start gap-3">
                                        <div className="w-5 h-5 mt-0.5 rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center text-[10px] font-bold text-zinc-600 overflow-hidden">
                                            {task.profile_url ? (
                                                <img src={task.profile_url} alt={task.created_by} className="w-full h-full object-cover" />
                                            ) : (
                                                (task.created_by || 'U').charAt(0).toUpperCase()
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Created By</p>
                                            <p className="text-zinc-950 font-medium text-sm">{task.created_by}</p>
                                            {task.created_at && (
                                                <p className="text-[10px] text-zinc-500 mt-0.5">
                                                    {format(new Date(task.created_at), 'MMM d, yyyy')}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Closed By */}
                                    {(task.status === 'Completed' || task.closed_by) && (
                                        <div className="flex items-start gap-3">
                                            <div className="w-5 h-5 mt-0.5 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
                                                <CheckCircle2 className="w-3 h-3" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Closed By</p>
                                                <div className="flex items-center gap-2">
                                                    {task.closed_by_profile_url ? (
                                                        <img
                                                            src={task.closed_by_profile_url}
                                                            alt={task.closed_by_name || 'User'}
                                                            className="w-5 h-5 rounded-full object-cover border border-zinc-200"
                                                        />
                                                    ) : (
                                                        <div className="w-5 h-5 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-[10px] font-bold text-emerald-600">
                                                            {(task.closed_by_name?.[0] || '?').toUpperCase()}
                                                        </div>
                                                    )}
                                                    <p className="text-zinc-950 font-medium text-sm">
                                                        {task.closed_by_name || 'Unknown'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Assigned People */}
                                    <div className="flex items-start gap-3">
                                        <Users className="w-5 h-5 text-zinc-400 mt-0.5" />
                                        <div className="flex-1">
                                            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Assigned People</p>
                                            {task.assigned_to_profiles && task.assigned_to_profiles.length > 0 ? (
                                                <div className="flex flex-wrap gap-1.5">
                                                    {task.assigned_to_profiles.map((profile, i) => (
                                                        <div
                                                            key={profile.uid || i}
                                                            className="relative h-6 w-6 rounded-full ring-1 ring-white bg-zinc-100 border border-zinc-200 shadow-sm overflow-hidden hover:ring-orange-400 transition-all cursor-pointer group"
                                                            title={profile.name || 'Unknown'}
                                                        >
                                                            {profile.photo_url ? (
                                                                <img
                                                                    src={profile.photo_url}
                                                                    alt={profile.name}
                                                                    className="h-full w-full object-cover"
                                                                />
                                                            ) : (
                                                                <div className="flex items-center justify-center w-full h-full text-[9px] text-zinc-600 font-bold uppercase">
                                                                    {profile.name?.charAt(0) || '?'}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-50 border border-zinc-200">
                                                    <Globe className="w-4 h-4 text-zinc-400" />
                                                    <span className="text-zinc-600 text-sm">All (Default)</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-8 border-t border-zinc-200 bg-zinc-50 flex justify-end z-10">
                            <button
                                onClick={onClose}
                                className="px-8 py-3 rounded-2xl bg-white hover:bg-orange-50 text-zinc-950 text-sm font-bold transition-all border border-zinc-200 hover:border-orange-200 shadow-sm"
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
