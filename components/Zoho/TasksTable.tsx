/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { RefreshCw, Trash2, Edit2, Plus, Search, CheckCircle2, Circle, Clock, Globe, Lock, MoreHorizontal, Calendar, Sparkles, ListChecks, Users, User, ChevronDown } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { Task } from '@/types/task';
import { TaskModal } from '../Tasks/TaskModal';
import { TaskDetailsModal } from '../Tasks/TaskDetailsModal';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { motion, AnimatePresence } from 'framer-motion';
import { format, isPast, parseISO, isValid } from 'date-fns';
import { toast } from 'sonner';

function computeTaskBucketStats(tasks: Task[]) {
    const total = tasks.length;
    const done = tasks.filter((t) => t.status === 'Completed').length;
    const open = total - done;
    const pct = total === 0 ? 0 : Math.round((done / total) * 100);
    return { total, done, open, pct };
}

export const TasksTable = () => {
    const [data, setData] = useState<Task[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [viewTask, setViewTask] = useState<Task | null>(null);
    const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; taskId: string | null }>({ isOpen: false, taskId: null });
    const [currentUserEmail, setCurrentUserEmail] = useState<string>('');
    const [currentUserName, setCurrentUserName] = useState<string>('');
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'completed'>('all');
    const [sortBy, setSortBy] = useState<'recent' | 'due' | 'priority'>('recent');

    const actionMenuRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const supabase = createClient();

    const fetchUser = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            setCurrentUserEmail(user.email || '');
            setCurrentUserId(user.id);
            const { data: userData } = await supabase.from('users').select('name').eq('uid', user.id).single();
            if (userData) setCurrentUserName(userData.name || '');
        }
    };

    const fetchTasks = async () => {
        setLoading(true);
        try {
            const { data: tasks, error } = await supabase.from('tasks').select('*').order('created_at', { ascending: false }) as any;
            if (error) throw error;

            const creators = tasks?.map((t: any) => t.uid).filter(Boolean) || [];
            const closers = tasks?.map((t: any) => t.closed_by).filter((id: any) => typeof id === 'string' && id.length > 0) || [];
            const assignees = tasks?.flatMap((t: any) => t.assigned_to || []).filter(Boolean) || [];
            const userIds = [...new Set([...creators, ...closers, ...assignees])];
            let userMap: Record<string, any> = {};

            if (userIds.length > 0) {
                const { data: users } = await supabase.from('users').select('uid, name, email, profile_url').in('uid', userIds);
                if (users) {
                    userMap = users.reduce((acc: any, user: any) => { acc[user.uid] = user; return acc; }, {});
                }
            }

            const mappedTasks = tasks?.map((t: any) => {
                const creator = userMap[t.uid];
                const closer = t.closed_by ? userMap[t.closed_by] : null;
                const assignedProfiles = (t.assigned_to || []).map((uid: string) => {
                    const user = userMap[uid];
                    return user ? { uid: user.uid, name: user.name, photo_url: user.profile_url } : null;
                }).filter(Boolean);

                return {
                    ...t,
                    created_by: creator?.name || creator?.email || 'Unknown',
                    profile_url: creator?.profile_url,
                    status: t.status || 'Pending',
                    closed_by_name: closer?.name || closer?.email || 'Unknown',
                    closed_by_profile_url: closer?.profile_url,
                    assigned_to_profiles: assignedProfiles
                };
            }) || [];

            setData(mappedTasks);
        } catch (error) {
            console.error('Error fetching tasks:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchUser(); fetchTasks(); }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (actionMenuRef.current && !actionMenuRef.current.contains(event.target as Node)) {
                setOpenActionMenuId(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return;
            const t = e.target as HTMLElement;
            if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable) return;
            e.preventDefault();
            searchInputRef.current?.focus();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    const logActivity = async (label: string, actionDescription: string) => {
        if (!currentUserId) return;
        const name = currentUserName || currentUserEmail || 'User';
        try {
            await supabase.from('activities').insert([{ label, status: `${name} ${actionDescription}`, uid: currentUserId, created_at: new Date().toISOString() }]);
        } catch (error) { console.error('Error logging activity:', error); }
    };

    const handleSaveTask = async (taskData: Partial<Task>) => {
        try {
            if (!currentUserId) { toast.error('User not found. Please log in again.'); return; }
            const payload: any = { title: taskData.title, description: taskData.description, due_date: taskData.due_date, priority: taskData.priority, status: taskData.status, visibility: taskData.visibility, related_to: taskData.related_to, assigned_to: taskData.assigned_to, uid: currentUserId, closed_by: taskData.status === 'Completed' ? currentUserId : null };

            if (selectedTask) {
                const { error } = await supabase.from('tasks').update(payload).eq('id', selectedTask.id) as any;
                if (error) throw error;
                logActivity('Edited', 'edited a task');
                toast.success('Task updated successfully');
            } else {
                const { error } = await supabase.from('tasks').insert([payload]) as any;
                if (error) throw error;
                logActivity('Added', 'added a new task');
                toast.success('Task created successfully');
            }
            fetchTasks();
        } catch (error) { console.error('Error saving task:', error); throw error; }
    };

    const handleStatusUpdate = async (id: string, newStatus: Task['status']) => {
        try {
            setOpenActionMenuId(null);
            const updates: any = { status: newStatus };
            if (newStatus === 'Completed') updates.closed_by = currentUserId; else updates.closed_by = null;
            setData(prev => prev.map(t => t.id === id ? { ...t, ...updates, closed_by_name: newStatus === 'Completed' ? currentUserName : undefined } : t));
            const { error } = await supabase.from('tasks').update(updates).eq('id', id) as any;
            if (error) { fetchTasks(); throw error; }
            logActivity(`Marked as ${newStatus}`, `marked a task as ${newStatus}`);
            toast.success(`Task marked as ${newStatus}`);
            fetchTasks();
        } catch (error) { console.error('Error updating status:', error); }
    };

    const handleVisibilityToggle = async (task: Task) => {
        try {
            setOpenActionMenuId(null);
            const newVisibility = task.visibility === 'Public' ? 'Private' : 'Public';
            setData(prev => prev.map(t => t.id === task.id ? { ...t, visibility: newVisibility } : t));
            const { error } = await supabase.from('tasks').update({ visibility: newVisibility }).eq('id', task.id) as any;
            if (error) { fetchTasks(); throw error; }
            logActivity(`Visibility changed to ${newVisibility}`, `changed task visibility to ${newVisibility}`);
            toast.success(`Task visibility changed to ${newVisibility}`);
        } catch (error) { console.error('Error updating visibility:', error); }
    };

    const handleDeleteTaskClick = (id: string) => { setOpenActionMenuId(null); setConfirmModal({ isOpen: true, taskId: id }); };
    const confirmDeleteTask = async () => {
        if (!confirmModal.taskId) return;
        try {
            const { error } = await supabase.from('tasks').delete().eq('id', confirmModal.taskId) as any;
            if (error) throw error;
            logActivity('Deleted', 'deleted a task');
            toast.success('Task deleted');
            fetchTasks();
        } catch (error) { console.error('Error deleting task:', error); }
    };
    const handleEditClick = (task: Task) => { setOpenActionMenuId(null); setSelectedTask(task); setIsModalOpen(true); };
    const handleAddClick = () => { setSelectedTask(null); setIsModalOpen(true); };
    const handleViewTask = (task: Task) => { setViewTask(task); setIsViewModalOpen(true); };

    const getPriorityDot = (priority: string) => {
        switch (priority.toLowerCase()) {
            case 'high': return 'bg-red-500';
            case 'medium': return 'bg-amber-500';
            case 'low': return 'bg-blue-500';
            default: return 'bg-zinc-400';
        }
    };

    const visibleTasks = useMemo(
        () => data.filter(t => t.visibility === 'Public' || t.uid === currentUserId),
        [data, currentUserId]
    );

    const filteredData = useMemo(() => {
        const q = search.trim().toLowerCase();
        return visibleTasks.filter(item => {
            const matchesSearch =
                !q ||
                item.title.toLowerCase().includes(q) ||
                (item.description && item.description.toLowerCase().includes(q));
            const matchesTab =
                activeTab === 'all' ||
                (activeTab === 'pending' && item.status !== 'Completed') ||
                (activeTab === 'completed' && item.status === 'Completed');
            return matchesSearch && matchesTab;
        });
    }, [visibleTasks, search, activeTab]);

    const sortedFilteredData = useMemo(() => {
        const arr = [...filteredData];
        const priorityRank = (p: string) => (p === 'High' ? 0 : p === 'Medium' ? 1 : 2);
        if (sortBy === 'due') {
            arr.sort((a, b) => {
                if (!a.due_date && !b.due_date) return 0;
                if (!a.due_date) return 1;
                if (!b.due_date) return -1;
                return parseISO(a.due_date).getTime() - parseISO(b.due_date).getTime();
            });
        } else if (sortBy === 'priority') {
            arr.sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority));
        } else {
            arr.sort((a, b) => {
                const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
                const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
                return tb - ta;
            });
        }
        return arr;
    }, [filteredData, sortBy]);

    const pendingCount = useMemo(
        () => visibleTasks.filter(t => t.status !== 'Completed').length,
        [visibleTasks]
    );
    const completedCount = useMemo(
        () => visibleTasks.filter(t => t.status === 'Completed').length,
        [visibleTasks]
    );
    const totalVisible = visibleTasks.length;

    /** Public tasks in the shared pool: not specifically assigned to the current user. */
    const teamTasks = useMemo(
        () =>
            visibleTasks.filter((t) => {
                if (t.visibility !== 'Public') return false;
                if (!currentUserId) return true;
                const assignees = t.assigned_to;
                if (!assignees?.length) return true;
                return !assignees.includes(currentUserId);
            }),
        [visibleTasks, currentUserId]
    );

    /** Private tasks (only yours are visible) plus anything explicitly assigned to you. */
    const personalTasks = useMemo(
        () =>
            visibleTasks.filter((t) => {
                if (t.visibility === 'Private') return true;
                if (!currentUserId) return false;
                return Boolean(t.assigned_to?.includes(currentUserId));
            }),
        [visibleTasks, currentUserId]
    );

    const teamStats = useMemo(() => computeTaskBucketStats(teamTasks), [teamTasks]);
    const personalStats = useMemo(() => computeTaskBucketStats(personalTasks), [personalTasks]);

    const progressPct = totalVisible === 0 ? 0 : Math.round((completedCount / totalVisible) * 100);

    const tabs = [
        { id: 'all' as const, label: 'All', count: totalVisible },
        { id: 'pending' as const, label: 'Active', count: pendingCount },
        { id: 'completed' as const, label: 'Done', count: completedCount },
    ];

    const clearFilters = useCallback(() => {
        setSearch('');
        setActiveTab('all');
    }, []);

    const filteredEmptyButHasTasks = !loading && totalVisible > 0 && sortedFilteredData.length === 0;
    const noWorkspaceTasks = !loading && totalVisible === 0;

    return (
        <div className="flex h-full min-h-0 flex-col">
            <ConfirmModal isOpen={confirmModal.isOpen} onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })} onConfirm={confirmDeleteTask} title="Delete Task" message="Are you sure you want to delete this task? This action cannot be undone." confirmText="Delete Task" isDestructive={true} />
            <TaskModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSaveTask} initialData={selectedTask} />
            <TaskDetailsModal isOpen={isViewModalOpen} onClose={() => setIsViewModalOpen(false)} task={viewTask} />

            {/* Hero */}
            <header className="shrink-0 space-y-5 pb-4">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 space-y-1">
                        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-orange-600">Productivity</p>
                        <h1 className="text-balance text-3xl font-bold tracking-tight text-zinc-950 sm:text-4xl">Tasks</h1>
                    </div>
                    <button
                        type="button"
                        onClick={handleAddClick}
                        className="inline-flex h-11 shrink-0 items-center justify-center gap-2 self-start rounded-2xl bg-zinc-950 px-5 text-sm font-semibold text-white shadow-lg shadow-zinc-950/20 transition hover:bg-zinc-800 active:scale-[0.98] sm:self-auto"
                    >
                        <Plus className="h-4 w-4" />
                        New task
                    </button>
                </div>

                {/* Summary: workspace + team vs personal progress */}
                {!loading && totalVisible > 0 && (
                    <div className="space-y-3">
                        <div className="grid gap-3 sm:grid-cols-3">
                            <div className="rounded-2xl border border-zinc-200/80 bg-white/80 p-4 shadow-sm shadow-zinc-950/5 backdrop-blur-sm">
                                <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Workspace</p>
                                <p className="mt-1 text-2xl font-bold tabular-nums text-zinc-950">{totalVisible}</p>
                                <p className="mt-0.5 text-xs text-zinc-500">visible to you</p>
                                <p className="mt-2 flex items-center gap-2 border-t border-zinc-100 pt-2 text-xs text-zinc-600">
                                    <span className="font-semibold text-zinc-900">{pendingCount}</span> active
                                    <span className="text-zinc-300">·</span>
                                    <span className="font-semibold text-emerald-700">{completedCount}</span> done
                                </p>
                            </div>

                            <div className="rounded-2xl border border-sky-200/70 bg-linear-to-br from-white to-sky-50/50 p-4 shadow-sm shadow-zinc-950/5 backdrop-blur-sm">
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-sky-700">
                                            <Users className="h-3.5 w-3.5" aria-hidden />
                                            Team
                                        </p>
                                        <p className="mt-0.5 text-xs leading-snug text-zinc-500">Public tasks not assigned to you—shared with everyone.</p>
                                    </div>
                                    <span className="shrink-0 rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-bold tabular-nums text-sky-900 ring-1 ring-sky-200/80">
                                        {teamStats.total}
                                    </span>
                                </div>
                                {teamStats.total === 0 ? (
                                    <p className="mt-3 text-xs text-zinc-400">No shared-queue tasks right now.</p>
                                ) : (
                                    <>
                                        <p className="mt-2 text-2xl font-bold tabular-nums text-sky-800">{teamStats.pct}%</p>
                                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-sky-100/90">
                                            <div
                                                className="h-full rounded-full bg-linear-to-r from-sky-500 to-cyan-500 transition-[width] duration-500 ease-out"
                                                style={{ width: `${teamStats.pct}%` }}
                                            />
                                        </div>
                                        <p className="mt-1.5 text-xs text-zinc-600">
                                            <span className="font-medium text-zinc-800">{teamStats.done}</span> done ·{' '}
                                            <span className="font-medium text-zinc-800">{teamStats.open}</span> open
                                        </p>
                                    </>
                                )}
                            </div>

                            <div className="rounded-2xl border border-orange-200/80 bg-linear-to-br from-white to-orange-50/40 p-4 shadow-sm shadow-zinc-950/5 backdrop-blur-sm">
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-orange-700">
                                            <User className="h-3.5 w-3.5" aria-hidden />
                                            Yours
                                        </p>
                                        <p className="mt-0.5 text-xs leading-snug text-zinc-500">Private tasks plus anything assigned to you.</p>
                                    </div>
                                    <span className="shrink-0 rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-bold tabular-nums text-orange-950 ring-1 ring-orange-200/80">
                                        {personalStats.total}
                                    </span>
                                </div>
                                {personalStats.total === 0 ? (
                                    <p className="mt-3 text-xs text-zinc-400">Nothing in your personal queue.</p>
                                ) : (
                                    <>
                                        <p className="mt-2 flex items-baseline gap-2 text-2xl font-bold tabular-nums text-orange-900">
                                            {personalStats.pct}%
                                            {personalStats.open > 0 && (
                                                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-orange-500" aria-hidden />
                                            )}
                                        </p>
                                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-orange-100/90">
                                            <div
                                                className="h-full rounded-full bg-linear-to-r from-orange-500 to-amber-500 transition-[width] duration-500 ease-out"
                                                style={{ width: `${personalStats.pct}%` }}
                                            />
                                        </div>
                                        <p className="mt-1.5 text-xs text-zinc-600">
                                            <span className="font-medium text-zinc-800">{personalStats.done}</span> done ·{' '}
                                            <span className="font-medium text-zinc-800">{personalStats.open}</span> open
                                        </p>
                                    </>
                                )}
                            </div>
                        </div>

                        <p className="text-center text-[11px] leading-relaxed text-zinc-400 sm:text-left">
                            Overall <span className="font-semibold text-zinc-600">{progressPct}%</span> complete across all visible tasks.
                            Team and Yours split the list so progress matches how you actually work.
                        </p>
                    </div>
                )}
            </header>

            {/* Scroll: sticky toolbar + list */}
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-zinc-200/90 bg-white/60 shadow-sm shadow-zinc-950/5 backdrop-blur-sm sm:rounded-3xl">
                <div className="flex min-h-0 flex-1 flex-col overflow-y-auto custom-scrollbar">
                    <div className="sticky top-0 z-10 border-b border-zinc-200/80 bg-[#f7f5f2]/95 px-3 py-3 backdrop-blur-md sm:px-4">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                            <div className="relative min-w-0 flex-1">
                                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                                <input
                                    ref={searchInputRef}
                                    type="search"
                                    enterKeyHint="search"
                                    placeholder="Search title or notes…"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="w-full rounded-xl border border-zinc-200 bg-white py-2.5 pl-10 pr-16 text-sm text-zinc-950 shadow-inner shadow-zinc-950/5 placeholder:text-zinc-400 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                                />
                                <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 select-none rounded border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 font-mono text-[10px] font-medium text-zinc-400 sm:inline-block">/</kbd>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                                <div className="flex rounded-xl bg-zinc-100/90 p-1 shadow-inner">
                                    {tabs.map((tab) => (
                                        <button
                                            key={tab.id}
                                            type="button"
                                            onClick={() => setActiveTab(tab.id)}
                                            className={`rounded-lg px-3 py-2 text-xs font-semibold transition-all sm:px-3.5 ${activeTab === tab.id ? 'bg-white text-zinc-950 shadow-sm ring-1 ring-zinc-200/80' : 'text-zinc-500 hover:text-zinc-800'}`}
                                        >
                                            {tab.label}
                                            <span className={`ml-1 tabular-nums ${activeTab === tab.id ? 'text-orange-600' : 'text-zinc-400'}`}>{tab.count}</span>
                                        </button>
                                    ))}
                                </div>

                                <div className="hidden h-6 w-px bg-zinc-200 sm:block" aria-hidden />

                                <div className="relative shrink-0">
                                    <select
                                        id="tasks-sort"
                                        value={sortBy}
                                        onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                                        aria-label="Order tasks by"
                                        className="h-10 min-w-44 cursor-pointer appearance-none rounded-xl border border-zinc-200 bg-white py-0 pl-3 pr-9 text-xs font-semibold text-zinc-900 shadow-sm transition-colors hover:border-zinc-300 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100 sm:min-w-48 sm:text-sm"
                                    >
                                        <option value="recent">Newest first</option>
                                        <option value="due">Due date (soonest)</option>
                                        <option value="priority">Priority (urgent first)</option>
                                    </select>
                                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" aria-hidden />
                                </div>

                                <button
                                    type="button"
                                    onClick={fetchTasks}
                                    disabled={loading}
                                    title="Refresh list"
                                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-500 transition hover:border-orange-200 hover:bg-orange-50 hover:text-zinc-950 disabled:opacity-50"
                                >
                                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                                </button>
                            </div>
                        </div>

                        {!loading && totalVisible > 0 && (
                            <p className="mt-2 text-center text-[11px] text-zinc-400 sm:text-left">
                                Showing <span className="font-semibold text-zinc-600">{sortedFilteredData.length}</span> of {totalVisible}
                                {search.trim() ? ` matching “${search.trim()}”` : ''}
                            </p>
                        )}
                    </div>

                    <div className="flex flex-col gap-3 p-3 pb-8 sm:gap-3.5 sm:p-4 sm:pb-10">
                        {loading && data.length === 0 ? (
                            <div className="space-y-3">
                                {[...Array(5)].map((_, i) => (
                                    <div key={i} className="animate-pulse rounded-2xl border border-zinc-100 bg-white p-5">
                                        <div className="flex gap-4">
                                            <div className="h-7 w-7 shrink-0 rounded-full bg-zinc-200" />
                                            <div className="min-w-0 flex-1 space-y-2">
                                                <div className="h-4 max-w-md rounded-lg bg-zinc-200" />
                                                <div className="h-3 max-w-sm rounded-lg bg-zinc-100" />
                                                <div className="flex gap-2 pt-2">
                                                    <div className="h-5 w-20 rounded-md bg-zinc-100" />
                                                    <div className="h-5 w-24 rounded-md bg-zinc-100" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : noWorkspaceTasks ? (
                            <div className="flex flex-col items-center justify-center px-4 py-16 text-center sm:py-24">
                                <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-linear-to-br from-orange-100 to-amber-50 text-orange-600 shadow-inner">
                                    <ListChecks className="h-8 w-8" />
                                </div>
                                <p className="text-lg font-semibold text-zinc-800">Nothing here yet</p>
                                <p className="mt-2 max-w-sm text-pretty text-sm leading-relaxed text-zinc-500">
                                    Add a task for yourself or the team. You can assign people, set a due date, and keep notes in one place.
                                </p>
                                <button
                                    type="button"
                                    onClick={handleAddClick}
                                    className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-zinc-950 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-zinc-950/15 transition hover:bg-zinc-800"
                                >
                                    <Plus className="h-4 w-4" />
                                    Create your first task
                                </button>
                            </div>
                        ) : filteredEmptyButHasTasks ? (
                            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/50 px-6 py-14 text-center">
                                <Search className="mb-3 h-8 w-8 text-zinc-300" />
                                <p className="font-semibold text-zinc-800">No matches</p>
                                <p className="mt-1 max-w-sm text-sm text-zinc-500">
                                    {search.trim()
                                        ? 'Try a shorter search or different keywords.'
                                        : 'Nothing in this tab right now—switch views or clear filters.'}
                                </p>
                                <button type="button" onClick={clearFilters} className="mt-5 text-sm font-semibold text-orange-600 underline-offset-4 hover:underline">
                                    Clear search & show all
                                </button>
                            </div>
                        ) : (
                            <AnimatePresence initial={false} mode="popLayout">
                                {sortedFilteredData.map((item) => {
                                    const isCompleted = item.status === 'Completed';
                                    const dueDateObj = item.due_date ? parseISO(item.due_date) : null;
                                    const isOverdue = dueDateObj && isValid(dueDateObj) && isPast(dueDateObj) && !isCompleted;

                                    return (
                                        <motion.div
                                            key={item.id}
                                            layout
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.98 }}
                                            transition={{ duration: 0.18 }}
                                            onClick={() => handleViewTask(item)}
                                            className={`group relative cursor-pointer overflow-hidden rounded-2xl border bg-white transition-all duration-200 ${isCompleted ? 'border-zinc-100 opacity-[0.72] hover:opacity-100' : 'border-zinc-200 hover:border-orange-200/90 hover:shadow-md hover:shadow-zinc-950/8'}`}
                                        >
                                            <div className="flex items-start gap-3 p-4 sm:gap-4 sm:p-5">
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleStatusUpdate(item.id, isCompleted ? 'Pending' : 'Completed');
                                                    }}
                                                    className="mt-0.5 shrink-0 rounded-full p-0.5 transition-transform hover:scale-110 active:scale-95"
                                                    title={isCompleted ? 'Mark as active' : 'Mark done'}
                                                >
                                                    {isCompleted ? (
                                                        <CheckCircle2 className="h-7 w-7 text-emerald-500 sm:h-8 sm:w-8" />
                                                    ) : item.status === 'In Progress' ? (
                                                        <Clock className="h-7 w-7 text-amber-500 sm:h-8 sm:w-8" />
                                                    ) : (
                                                        <Circle className="h-7 w-7 text-zinc-300 transition-colors group-hover:text-zinc-400 sm:h-8 sm:w-8" />
                                                    )}
                                                </button>

                                                <div className="min-w-0 flex-1">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        {item.visibility === 'Private' && (
                                                            <span className="inline-flex shrink-0 text-zinc-400" title="Private task">
                                                                <Lock className="h-3.5 w-3.5" aria-hidden />
                                                            </span>
                                                        )}
                                                        <h2 className={`text-[15px] font-semibold leading-snug sm:text-base ${isCompleted ? 'text-zinc-400 line-through decoration-zinc-300' : 'text-zinc-950'}`}>
                                                            {item.title}
                                                        </h2>
                                                        {!isCompleted && item.status === 'In Progress' && (
                                                            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800 ring-1 ring-amber-200/80">
                                                                In progress
                                                            </span>
                                                        )}
                                                    </div>

                                                    {item.description && (
                                                        <p className={`mt-1.5 line-clamp-2 text-sm leading-relaxed ${isCompleted ? 'text-zinc-400' : 'text-zinc-600'}`}>{item.description}</p>
                                                    )}

                                                    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-zinc-500">
                                                        <span className="inline-flex items-center gap-1.5 rounded-md bg-zinc-50 px-2 py-0.5 font-medium text-zinc-600 ring-1 ring-zinc-100">
                                                            <span className={`h-1.5 w-1.5 rounded-full ${getPriorityDot(item.priority)}`} />
                                                            {item.priority}
                                                        </span>

                                                        {dueDateObj && isValid(dueDateObj) && (
                                                            <span
                                                                className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-medium ring-1 ${isOverdue ? 'bg-red-50 text-red-700 ring-red-100' : 'bg-zinc-50 text-zinc-600 ring-zinc-100'}`}
                                                            >
                                                                <Calendar className="h-3 w-3 shrink-0" />
                                                                {format(dueDateObj, 'MMM d, yyyy')}
                                                                {isOverdue && ' · Overdue'}
                                                            </span>
                                                        )}

                                                        {item.assigned_to_profiles && item.assigned_to_profiles.length > 0 ? (
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="text-zinc-400">Assigned</span>
                                                                <div className="flex -space-x-1.5">
                                                                    {item.assigned_to_profiles.slice(0, 4).map((profile, i) => (
                                                                        <div
                                                                            key={i}
                                                                            className="h-6 w-6 overflow-hidden rounded-full bg-zinc-200 ring-2 ring-white"
                                                                            title={profile.name}
                                                                        >
                                                                            {profile.photo_url ? (
                                                                                <img src={profile.photo_url} alt="" className="h-full w-full object-cover" />
                                                                            ) : (
                                                                                <span className="flex h-full w-full items-center justify-center text-[9px] font-bold text-zinc-600">{profile.name?.charAt(0)}</span>
                                                                            )}
                                                                        </div>
                                                                    ))}
                                                                    {item.assigned_to_profiles.length > 4 && (
                                                                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-100 text-[9px] font-bold text-zinc-500 ring-2 ring-white">
                                                                            +{item.assigned_to_profiles.length - 4}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 text-zinc-400">
                                                                <Globe className="h-3 w-3" /> Open to everyone
                                                            </span>
                                                        )}

                                                        <span className="ml-auto flex items-center gap-1.5 text-zinc-400 sm:ml-0">
                                                            {item.profile_url ? (
                                                                <img src={item.profile_url} alt="" className="h-5 w-5 rounded-full object-cover ring-1 ring-zinc-200" />
                                                            ) : (
                                                                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-100 text-[9px] font-bold text-zinc-500 ring-1 ring-zinc-200">
                                                                    {(item.created_by || '?').charAt(0).toUpperCase()}
                                                                </span>
                                                            )}
                                                            <span className="max-w-[140px] truncate sm:max-w-[180px]" title={item.created_by}>
                                                                {item.created_by}
                                                            </span>
                                                        </span>
                                                    </div>
                                                </div>

                                                <div
                                                    className="relative shrink-0 opacity-100 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100 sm:focus-within:opacity-100"
                                                    ref={openActionMenuId === item.id ? actionMenuRef : undefined}
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setOpenActionMenuId(openActionMenuId === item.id ? null : item.id);
                                                        }}
                                                        className="rounded-xl p-2 text-zinc-400 transition-colors hover:bg-orange-50 hover:text-zinc-950"
                                                        aria-label="Task actions"
                                                    >
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </button>

                                                    <AnimatePresence>
                                                        {openActionMenuId === item.id && (
                                                            <motion.div
                                                                initial={{ opacity: 0, scale: 0.96, y: 4 }}
                                                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                                                exit={{ opacity: 0, scale: 0.96 }}
                                                                className="absolute right-0 top-full z-50 mt-1 w-48 overflow-hidden rounded-xl border border-zinc-200 bg-white p-1 shadow-xl shadow-zinc-950/15"
                                                            >
                                                                {item.uid === currentUserId ? (
                                                                    <>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleEditClick(item)}
                                                                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-zinc-700 transition-colors hover:bg-orange-50 hover:text-zinc-950"
                                                                        >
                                                                            <Edit2 className="h-3.5 w-3.5" /> Edit
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleVisibilityToggle(item)}
                                                                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-zinc-700 transition-colors hover:bg-orange-50 hover:text-zinc-950"
                                                                        >
                                                                            {item.visibility === 'Public' ? (
                                                                                <>
                                                                                    <Lock className="h-3.5 w-3.5" /> Make private
                                                                                </>
                                                                            ) : (
                                                                                <>
                                                                                    <Globe className="h-3.5 w-3.5" /> Make public
                                                                                </>
                                                                            )}
                                                                        </button>
                                                                        <div className="my-0.5 h-px bg-zinc-100" />
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleDeleteTaskClick(item.id)}
                                                                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-red-600 transition-colors hover:bg-red-50"
                                                                        >
                                                                            <Trash2 className="h-3.5 w-3.5" /> Delete
                                                                        </button>
                                                                    </>
                                                                ) : (
                                                                    <div className="px-3 py-2.5 text-center text-xs italic text-zinc-500">You can view this task</div>
                                                                )}
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </div>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </AnimatePresence>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
