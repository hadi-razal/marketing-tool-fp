import React, { useEffect } from 'react';
import { X, Globe, Lock, Layout } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Task } from '@/types/task';
import { format, isPast, isValid, parseISO } from 'date-fns';

interface TaskDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    task: Task | null;
}

const priorityChip = (priority: string) => {
    switch (priority.toLowerCase()) {
        case 'high':
            return 'bg-red-50 text-red-800 ring-red-200/80';
        case 'medium':
            return 'bg-amber-50 text-amber-900 ring-amber-200/80';
        case 'low':
            return 'bg-sky-50 text-sky-900 ring-sky-200/80';
        default:
            return 'bg-zinc-100 text-zinc-700 ring-zinc-200/80';
    }
};

const priorityDot = (priority: string) => {
    switch (priority.toLowerCase()) {
        case 'high':
            return 'bg-red-500';
        case 'medium':
            return 'bg-amber-500';
        case 'low':
            return 'bg-sky-500';
        default:
            return 'bg-zinc-400';
    }
};

const statusChip = (status: string) => {
    switch (status.toLowerCase()) {
        case 'completed':
            return 'bg-emerald-50 text-emerald-800 ring-emerald-200/80';
        case 'in progress':
            return 'bg-amber-50 text-amber-900 ring-amber-200/80';
        default:
            return 'bg-zinc-100 text-zinc-800 ring-zinc-200/80';
    }
};

export const TaskDetailsModal = ({ isOpen, onClose, task }: TaskDetailsModalProps) => {
    useEffect(() => {
        if (!isOpen) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [isOpen, onClose]);

    if (!task) return null;

    const due = task.due_date ? parseISO(task.due_date) : null;
    const dueValid = due && isValid(due);
    const overdue = dueValid && isPast(due) && task.status !== 'Completed';

    const metaCard = (label: string, children: React.ReactNode) => (
        <div className="rounded-2xl border border-zinc-100 bg-zinc-50/50 p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">{label}</p>
            <div className="mt-2">{children}</div>
        </div>
    );

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 z-100 bg-zinc-950/50 backdrop-blur-sm"
                        aria-hidden
                    />
                    <motion.div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="task-detail-title"
                        initial={{ opacity: 0, scale: 0.96, y: 16 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.96, y: 16 }}
                        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                        className="fixed left-1/2 top-1/2 z-101 flex max-h-[min(92vh,880px)] w-[calc(100%-1.5rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-2xl shadow-zinc-950/25"
                    >
                        <div className="relative shrink-0 border-b border-zinc-100 bg-linear-to-br from-zinc-50 via-white to-orange-50/30 px-5 pb-5 pt-5 sm:px-8 sm:pt-7">
                            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_100%_0%,rgba(251,146,60,0.12),transparent)]" />
                            <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                <div className="min-w-0 flex-1 space-y-3 pr-2">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-orange-600">Task</span>
                                        <span
                                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ring-1 ${priorityChip(task.priority)}`}
                                        >
                                            <span className={`h-1.5 w-1.5 rounded-full ${priorityDot(task.priority)}`} />
                                            {task.priority}
                                        </span>
                                        <span
                                            className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ring-1 ${statusChip(task.status)}`}
                                        >
                                            {task.status}
                                        </span>
                                        <span
                                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ring-1 ${task.visibility === 'Private' ? 'bg-zinc-100 text-zinc-700 ring-zinc-200/80' : 'bg-white text-zinc-700 ring-zinc-200/80'}`}
                                        >
                                            {task.visibility === 'Private' ? (
                                                <Lock className="h-3 w-3" aria-hidden />
                                            ) : (
                                                <Globe className="h-3 w-3" aria-hidden />
                                            )}
                                            {task.visibility}
                                        </span>
                                    </div>
                                    <h2 id="task-detail-title" className="text-pretty text-xl font-bold leading-snug tracking-tight text-zinc-950 sm:text-2xl">
                                        {task.title}
                                    </h2>
                                </div>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="shrink-0 self-start rounded-xl border border-zinc-200 bg-white/90 p-2 text-zinc-500 transition hover:border-orange-200 hover:bg-orange-50 hover:text-zinc-950 sm:self-auto"
                                    aria-label="Close"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                        </div>

                        <div className="min-h-0 flex-1 overflow-y-auto custom-scrollbar">
                            <div className="space-y-5 p-5 sm:p-8 sm:pt-6">
                                {task.description ? (
                                    <section>
                                        <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-zinc-400">Notes</h3>
                                        <div className="rounded-2xl border border-zinc-100 bg-zinc-50/60 p-4 text-sm leading-relaxed text-zinc-700 whitespace-pre-wrap">
                                            {task.description}
                                        </div>
                                    </section>
                                ) : (
                                    <p className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/40 px-4 py-6 text-center text-sm text-zinc-500">No notes on this task.</p>
                                )}

                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    {metaCard(
                                        'Due date',
                                        dueValid ? (
                                            <p
                                                className={`text-sm font-semibold ${overdue ? 'text-red-700' : 'text-zinc-900'}`}
                                            >
                                                {format(due, 'EEEE, MMMM d, yyyy')}
                                                {overdue && (
                                                    <span className="mt-1 block text-xs font-medium text-red-600">Overdue</span>
                                                )}
                                            </p>
                                        ) : (
                                            <p className="text-sm font-medium text-zinc-500">No due date</p>
                                        )
                                    )}

                                    {metaCard(
                                        'Related to',
                                        <p className="text-sm font-semibold text-zinc-900">{task.related_to?.trim() || '—'}</p>
                                    )}

                                    {metaCard(
                                        'Created by',
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-zinc-200 bg-zinc-100 text-sm font-bold text-zinc-600">
                                                {task.profile_url ? (
                                                    <img src={task.profile_url} alt="" className="h-full w-full object-cover" />
                                                ) : (
                                                    (task.created_by || 'U').charAt(0).toUpperCase()
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-semibold text-zinc-900">{task.created_by}</p>
                                                {task.created_at && (
                                                    <p className="text-xs text-zinc-500">{format(new Date(task.created_at), 'MMM d, yyyy · HH:mm')}</p>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {(task.status === 'Completed' || task.closed_by) &&
                                        metaCard(
                                            'Completed by',
                                            <div className="flex items-center gap-3">
                                                {task.closed_by_profile_url ? (
                                                    <img
                                                        src={task.closed_by_profile_url}
                                                        alt=""
                                                        className="h-10 w-10 shrink-0 rounded-full border border-emerald-200 object-cover"
                                                    />
                                                ) : (
                                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 text-sm font-bold text-emerald-700">
                                                        {(task.closed_by_name?.[0] || '?').toUpperCase()}
                                                    </div>
                                                )}
                                                <p className="truncate text-sm font-semibold text-zinc-900">{task.closed_by_name || 'Unknown'}</p>
                                            </div>
                                        )}

                                    {metaCard(
                                        'Assignees',
                                        task.assigned_to_profiles && task.assigned_to_profiles.length > 0 ? (
                                            <ul className="flex flex-col gap-2">
                                                {task.assigned_to_profiles.map((profile, i) => (
                                                    <li key={profile.uid || i} className="flex items-center gap-2.5">
                                                        <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-zinc-200 bg-zinc-100">
                                                            {profile.photo_url ? (
                                                                <img src={profile.photo_url} alt="" className="h-full w-full object-cover" />
                                                            ) : (
                                                                <span className="text-xs font-bold text-zinc-600">{profile.name?.charAt(0) || '?'}</span>
                                                            )}
                                                        </div>
                                                        <span className="truncate text-sm font-medium text-zinc-800">{profile.name || 'Unknown'}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <div className="flex items-center gap-2 text-sm text-zinc-600">
                                                <Globe className="h-4 w-4 shrink-0 text-zinc-400" />
                                                Open to everyone
                                            </div>
                                        )
                                    )}
                                </div>

                                <div className="rounded-2xl border border-zinc-100 bg-white p-4 shadow-sm">
                                    <div className="flex items-start gap-3">
                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-500">
                                            <Layout className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">How this appears</p>
                                            <p className="mt-1 text-sm leading-relaxed text-zinc-600">
                                                {task.visibility === 'Private'
                                                    ? 'This task is private: others may still see it exists depending on list rules, but details stay limited to you and assignees where applicable.'
                                                    : 'This task is public: teammates who can see the task list will see title, status, and scheduling at a glance.'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex shrink-0 justify-end border-t border-zinc-100 bg-zinc-50/90 px-5 py-4 backdrop-blur-sm sm:px-8">
                            <button
                                type="button"
                                onClick={onClose}
                                className="rounded-xl bg-zinc-950 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-zinc-950/15 transition hover:bg-zinc-800"
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
