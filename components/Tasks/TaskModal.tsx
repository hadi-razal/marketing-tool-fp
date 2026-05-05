import React, { useState, useEffect, useRef, useMemo } from 'react';
import { X, Calendar, Globe, Lock, User, ChevronDown, CheckCircle2, Loader2, ListTodo, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Task } from '@/types/task';
import { createClient } from '@/lib/supabase';

interface TaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (task: Partial<Task>) => Promise<void>;
    initialData?: Task | null;
}

interface UserProfile {
    uid: string;
    name: string;
    profile_url: string;
    email: string;
}

const defaultForm = (): Partial<Task> => ({
    title: '',
    description: '',
    due_date: '',
    priority: 'Medium',
    status: 'Pending',
    visibility: 'Private',
    related_to: '',
    assigned_to: [],
});

export const TaskModal = ({ isOpen, onClose, onSave, initialData }: TaskModalProps) => {
    const [formData, setFormData] = useState<Partial<Task>>(defaultForm);
    const [loading, setLoading] = useState(false);
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [isAssigneeDropdownOpen, setIsAssigneeDropdownOpen] = useState(false);
    const [assigneeSearch, setAssigneeSearch] = useState('');
    const assigneeRef = useRef<HTMLDivElement>(null);
    const titleInputRef = useRef<HTMLInputElement>(null);
    const supabase = createClient();

    useEffect(() => {
        fetchUsers();
    }, []);

    useEffect(() => {
        if (!isOpen) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [isOpen, onClose]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (assigneeRef.current && !assigneeRef.current.contains(event.target as Node)) {
                setIsAssigneeDropdownOpen(false);
                setAssigneeSearch('');
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (!isOpen) return;
        if (initialData) {
            setFormData({ ...defaultForm(), ...initialData });
        } else {
            setFormData(defaultForm());
        }
        setAssigneeSearch('');
        const t = requestAnimationFrame(() => {
            if (!initialData) titleInputRef.current?.focus();
        });
        return () => cancelAnimationFrame(t);
    }, [initialData, isOpen]);

    const fetchUsers = async () => {
        const { data } = await supabase.from('users').select('uid, name, profile_url, email');
        if (data) setUsers(data);
    };

    const filteredUsers = useMemo(() => {
        const q = assigneeSearch.trim().toLowerCase();
        if (!q) return users;
        return users.filter(
            (u) =>
                (u.name || '').toLowerCase().includes(q) ||
                (u.email || '').toLowerCase().includes(q)
        );
    }, [users, assigneeSearch]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await onSave(formData);
            onClose();
        } catch (error) {
            console.error('Failed to save task', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleAssignee = (uid: string) => {
        setFormData((prev) => {
            const current = prev.assigned_to || [];
            if (current.includes(uid)) {
                return { ...prev, assigned_to: current.filter((id) => id !== uid) };
            }
            return { ...prev, assigned_to: [...current, uid] };
        });
    };

    const clearAssignees = () => {
        setFormData((prev) => ({ ...prev, assigned_to: [] }));
    };

    const statusOptions: { value: Task['status']; label: string; hint: string }[] = [
        { value: 'Pending', label: 'To do', hint: 'Not started' },
        { value: 'In Progress', label: 'Active', hint: 'Working on it' },
        { value: 'Completed', label: 'Done', hint: 'Completed' },
    ];

    const priorityMeta: Record<Task['priority'], { dot: string; ring: string }> = {
        High: { dot: 'bg-red-500', ring: 'ring-red-200' },
        Medium: { dot: 'bg-amber-500', ring: 'ring-amber-200' },
        Low: { dot: 'bg-sky-500', ring: 'ring-sky-200' },
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
                        className="fixed inset-0 z-100 bg-zinc-950/50 backdrop-blur-sm"
                        aria-hidden
                    />
                    <motion.div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="task-modal-title"
                        initial={{ opacity: 0, scale: 0.96, y: 16 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.96, y: 16 }}
                        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                        className="fixed left-1/2 top-1/2 z-101 flex max-h-[min(92vh,860px)] w-[calc(100%-1.5rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-2xl shadow-zinc-950/25"
                    >
                        <div className="relative shrink-0 border-b border-zinc-100 bg-linear-to-br from-zinc-50 to-white px-5 pb-5 pt-5 sm:px-6 sm:pt-6">
                            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_80%_at_100%_0%,rgba(251,146,60,0.08),transparent)]" />
                            <div className="relative flex items-start justify-between gap-3">
                                <div className="min-w-0 space-y-1">
                                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-orange-600">Productivity</p>
                                    <h2 id="task-modal-title" className="text-xl font-bold tracking-tight text-zinc-950 sm:text-2xl">
                                        {initialData ? 'Edit task' : 'New task'}
                                    </h2>
                                    <p className="text-sm text-zinc-500">
                                        {initialData ? 'Update details and save when you are ready.' : 'Capture the work once—priority, dates, and owners stay visible on the board.'}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="shrink-0 rounded-xl border border-zinc-200 bg-white/80 p-2 text-zinc-500 transition hover:border-orange-200 hover:bg-orange-50 hover:text-zinc-950"
                                    aria-label="Close"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                        </div>

                        <div className="min-h-0 flex-1 overflow-y-auto custom-scrollbar">
                            <form id="task-form" onSubmit={handleSubmit} className="space-y-5 p-5 sm:p-6">
                                <section className="rounded-2xl border border-zinc-100 bg-zinc-50/40 p-4 sm:p-5">
                                    <div className="mb-3 flex items-center gap-2 text-zinc-800">
                                        <ListTodo className="h-4 w-4 text-orange-500" />
                                        <span className="text-xs font-bold uppercase tracking-wide text-zinc-500">Essentials</span>
                                    </div>
                                    <div className="space-y-4">
                                        <div>
                                            <label htmlFor="task-title" className="mb-1.5 block text-xs font-semibold text-zinc-600">
                                                Title <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                ref={titleInputRef}
                                                id="task-title"
                                                type="text"
                                                value={formData.title}
                                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                                placeholder="What needs to happen?"
                                                className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-950 shadow-sm placeholder:text-zinc-400 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor="task-desc" className="mb-1.5 block text-xs font-semibold text-zinc-600">
                                                Notes <span className="font-normal text-zinc-400">(optional)</span>
                                            </label>
                                            <textarea
                                                id="task-desc"
                                                value={formData.description || ''}
                                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                                placeholder="Context, links, or checklist items…"
                                                rows={4}
                                                className="w-full resize-y rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm leading-relaxed text-zinc-950 shadow-sm placeholder:text-zinc-400 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor="task-related" className="mb-1.5 block text-xs font-semibold text-zinc-600">
                                                Related to <span className="font-normal text-zinc-400">(optional)</span>
                                            </label>
                                            <input
                                                id="task-related"
                                                type="text"
                                                value={formData.related_to || ''}
                                                onChange={(e) => setFormData({ ...formData, related_to: e.target.value })}
                                                placeholder="Company, deal, or campaign name"
                                                className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-950 shadow-sm placeholder:text-zinc-400 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                                            />
                                        </div>
                                    </div>
                                </section>

                                <section className="rounded-2xl border border-zinc-100 bg-zinc-50/40 p-4 sm:p-5">
                                    <div className="mb-3 flex items-center gap-2">
                                        <Sparkles className="h-4 w-4 text-amber-500" />
                                        <span className="text-xs font-bold uppercase tracking-wide text-zinc-500">Status & priority</span>
                                    </div>
                                    <div className="space-y-4">
                                        <div>
                                            <p className="mb-2 text-xs font-semibold text-zinc-600">Status</p>
                                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                                                {statusOptions.map((opt) => {
                                                    const active = formData.status === opt.value;
                                                    return (
                                                        <button
                                                            key={opt.value}
                                                            type="button"
                                                            onClick={() => setFormData({ ...formData, status: opt.value })}
                                                            className={`rounded-xl border px-3 py-2.5 text-left transition-all ${active ? 'border-orange-300 bg-orange-50 ring-1 ring-orange-200/80' : 'border-zinc-200 bg-white hover:border-zinc-300'}`}
                                                        >
                                                            <span className={`block text-sm font-semibold ${active ? 'text-orange-900' : 'text-zinc-900'}`}>{opt.label}</span>
                                                            <span className="mt-0.5 block text-[11px] text-zinc-500">{opt.hint}</span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                        <div>
                                            <p className="mb-2 text-xs font-semibold text-zinc-600">Priority</p>
                                            <div className="flex gap-2">
                                                {(['Low', 'Medium', 'High'] as const).map((p) => {
                                                    const active = formData.priority === p;
                                                    const m = priorityMeta[p];
                                                    return (
                                                        <button
                                                            key={p}
                                                            type="button"
                                                            onClick={() => setFormData({ ...formData, priority: p })}
                                                            className={`flex flex-1 items-center justify-center gap-2 rounded-xl border py-2.5 text-xs font-semibold transition-all ${active ? `bg-white ring-2 ${m.ring} border-zinc-200` : 'border-zinc-200 bg-white/60 text-zinc-600 hover:bg-white'}`}
                                                        >
                                                            <span className={`h-2 w-2 rounded-full ${m.dot}`} />
                                                            {p}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                </section>

                                <section className="rounded-2xl border border-zinc-100 bg-zinc-50/40 p-4 sm:p-5">
                                    <div className="mb-3 flex items-center gap-2">
                                        <Calendar className="h-4 w-4 text-zinc-500" />
                                        <span className="text-xs font-bold uppercase tracking-wide text-zinc-500">Due date</span>
                                    </div>
                                    <div className="relative">
                                        <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                                        <input
                                            type="date"
                                            value={formData.due_date || ''}
                                            onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                                            className="w-full rounded-xl border border-zinc-200 bg-white py-2.5 pl-10 pr-3 text-sm text-zinc-950 shadow-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                                        />
                                    </div>
                                </section>

                                <section className="rounded-2xl border border-zinc-100 bg-zinc-50/40 p-4 sm:p-5" ref={assigneeRef}>
                                    <div className="mb-3 flex items-center gap-2">
                                        <User className="h-4 w-4 text-zinc-500" />
                                        <span className="text-xs font-bold uppercase tracking-wide text-zinc-500">Assignees</span>
                                    </div>
                                    <p className="mb-3 text-xs leading-relaxed text-zinc-500">Leave empty so the task stays open to everyone, or pick specific teammates.</p>
                                    <div className="relative">
                                        <button
                                            type="button"
                                            onClick={() => setIsAssigneeDropdownOpen((o) => !o)}
                                            className="flex w-full items-center justify-between gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-left text-sm shadow-sm transition hover:border-zinc-300"
                                        >
                                            <div className="flex min-w-0 items-center gap-2">
                                                <User className="h-4 w-4 shrink-0 text-zinc-400" />
                                                {(formData.assigned_to?.length || 0) === 0 ? (
                                                    <span className="truncate text-zinc-500">Everyone (no assignees)</span>
                                                ) : (
                                                    <div className="flex -space-x-2">
                                                        {formData.assigned_to?.slice(0, 6).map((uid) => {
                                                            const user = users.find((u) => u.uid === uid);
                                                            return (
                                                                <div
                                                                    key={uid}
                                                                    className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-zinc-200 text-[10px] font-bold text-zinc-600"
                                                                    title={user?.name}
                                                                >
                                                                    {user?.profile_url ? (
                                                                        <img src={user.profile_url} alt="" className="h-full w-full object-cover" />
                                                                    ) : (
                                                                        user?.name?.[0] || '?'
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                        {(formData.assigned_to?.length || 0) > 6 && (
                                                            <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-zinc-100 text-[10px] font-bold text-zinc-500">
                                                                +{(formData.assigned_to?.length || 0) - 6}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                            <ChevronDown className={`h-4 w-4 shrink-0 text-zinc-400 transition-transform ${isAssigneeDropdownOpen ? 'rotate-180' : ''}`} />
                                        </button>

                                        <AnimatePresence>
                                            {isAssigneeDropdownOpen && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: 8 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: 8 }}
                                                    transition={{ duration: 0.15 }}
                                                    className="absolute left-0 right-0 top-full z-20 mt-2 max-h-64 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl shadow-zinc-950/15"
                                                >
                                                    <div className="border-b border-zinc-100 p-2">
                                                        <input
                                                            type="search"
                                                            value={assigneeSearch}
                                                            onChange={(e) => setAssigneeSearch(e.target.value)}
                                                            placeholder="Search people…"
                                                            className="w-full rounded-lg border border-zinc-200 px-2.5 py-2 text-xs focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-100"
                                                            onClick={(e) => e.stopPropagation()}
                                                        />
                                                    </div>
                                                    <div className="max-h-48 overflow-y-auto custom-scrollbar p-1.5">
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                clearAssignees();
                                                                setIsAssigneeDropdownOpen(false);
                                                                setAssigneeSearch('');
                                                            }}
                                                            className={`flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-sm transition-colors ${(formData.assigned_to?.length || 0) === 0 ? 'bg-orange-50 text-orange-700' : 'text-zinc-700 hover:bg-orange-50'}`}
                                                        >
                                                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-zinc-50">
                                                                <Globe className="h-4 w-4 text-zinc-500" />
                                                            </div>
                                                            <div className="min-w-0 flex-1">
                                                                <div className="font-medium">Everyone</div>
                                                                <div className="text-[11px] text-zinc-500">No specific assignees</div>
                                                            </div>
                                                            {(formData.assigned_to?.length || 0) === 0 && <CheckCircle2 className="h-4 w-4 shrink-0 text-orange-600" />}
                                                        </button>
                                                        <div className="my-1.5 h-px bg-zinc-100" />
                                                        {filteredUsers.map((user) => {
                                                            const isSelected = formData.assigned_to?.includes(user.uid);
                                                            return (
                                                                <button
                                                                    key={user.uid}
                                                                    type="button"
                                                                    onClick={() => toggleAssignee(user.uid)}
                                                                    className={`flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-sm transition-colors ${isSelected ? 'bg-orange-50 text-orange-800' : 'text-zinc-700 hover:bg-zinc-50'}`}
                                                                >
                                                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-zinc-200 bg-zinc-100">
                                                                        {user.profile_url ? (
                                                                            <img src={user.profile_url} alt="" className="h-full w-full object-cover" />
                                                                        ) : (
                                                                            <span className="text-xs font-bold text-zinc-600">{user.name?.[0]}</span>
                                                                        )}
                                                                    </div>
                                                                    <div className="min-w-0 flex-1">
                                                                        <div className="truncate font-medium">{user.name}</div>
                                                                        <div className="truncate text-[11px] text-zinc-500">{user.email}</div>
                                                                    </div>
                                                                    {isSelected && <CheckCircle2 className="h-4 w-4 shrink-0 text-orange-600" />}
                                                                </button>
                                                            );
                                                        })}
                                                        {filteredUsers.length === 0 && (
                                                            <p className="px-2 py-4 text-center text-xs text-zinc-500">No people match that search.</p>
                                                        )}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </section>

                                <section className="rounded-2xl border border-zinc-100 bg-zinc-50/40 p-4 sm:p-5">
                                    <div className="mb-3 flex items-center gap-2">
                                        {formData.visibility === 'Private' ? (
                                            <Lock className="h-4 w-4 text-zinc-500" />
                                        ) : (
                                            <Globe className="h-4 w-4 text-zinc-500" />
                                        )}
                                        <span className="text-xs font-bold uppercase tracking-wide text-zinc-500">Visibility</span>
                                    </div>
                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                        {(['Private', 'Public'] as const).map((v) => {
                                            const active = formData.visibility === v;
                                            return (
                                                <button
                                                    key={v}
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, visibility: v })}
                                                    className={`flex flex-col items-start gap-1 rounded-2xl border px-4 py-3 text-left transition-all ${active ? 'border-orange-300 bg-orange-50 ring-1 ring-orange-200/80' : 'border-zinc-200 bg-white hover:border-zinc-300'}`}
                                                >
                                                    <span className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
                                                        {v === 'Private' ? <Lock className="h-4 w-4" /> : <Globe className="h-4 w-4" />}
                                                        {v}
                                                    </span>
                                                    <span className="text-xs leading-relaxed text-zinc-500">
                                                        {v === 'Private' ? 'Only you and assignees see full details in lists.' : 'Visible to the whole workspace in task lists.'}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </section>
                            </form>
                        </div>

                        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-zinc-100 bg-zinc-50/90 px-5 py-4 backdrop-blur-sm sm:px-6">
                            <button
                                type="button"
                                onClick={onClose}
                                className="rounded-xl px-4 py-2.5 text-sm font-semibold text-zinc-600 transition hover:bg-white hover:text-zinc-950"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                form="task-form"
                                disabled={loading || !formData.title?.trim()}
                                className="inline-flex min-w-[132px] items-center justify-center gap-2 rounded-xl bg-zinc-950 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-zinc-950/20 transition hover:bg-zinc-800 disabled:pointer-events-none disabled:opacity-40"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Saving…
                                    </>
                                ) : initialData ? (
                                    'Save changes'
                                ) : (
                                    'Create task'
                                )}
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
