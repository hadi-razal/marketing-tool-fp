/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw, Trash2, Edit2, Plus, Search, Filter, CheckCircle2, Circle, Clock, Globe, Lock, MoreHorizontal, Calendar, AlertCircle, ArrowUpCircle, ArrowDownCircle, MinusCircle, Sparkles } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { Task } from '@/types/task';
import { TaskModal } from '../Tasks/TaskModal';
import { TaskDetailsModal } from '../Tasks/TaskDetailsModal';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { motion, AnimatePresence } from 'framer-motion';
import { format, isPast, parseISO, isValid } from 'date-fns';
import { toast } from 'sonner';

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

    const actionMenuRef = useRef<HTMLDivElement>(null);
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

    const filteredData = data.filter(item => {
        const matchesSearch = item.title.toLowerCase().includes(search.toLowerCase()) || (item.description && item.description.toLowerCase().includes(search.toLowerCase()));
        const isVisible = item.visibility === 'Public' || item.uid === currentUserId;
        const matchesTab = activeTab === 'all' || (activeTab === 'pending' && item.status !== 'Completed') || (activeTab === 'completed' && item.status === 'Completed');
        return matchesSearch && isVisible && matchesTab;
    });

    const pendingCount = data.filter(t => t.status !== 'Completed' && (t.visibility === 'Public' || t.uid === currentUserId)).length;
    const completedCount = data.filter(t => t.status === 'Completed' && (t.visibility === 'Public' || t.uid === currentUserId)).length;

    const tabs = [
        { id: 'all' as const, label: 'All', count: data.filter(t => t.visibility === 'Public' || t.uid === currentUserId).length },
        { id: 'pending' as const, label: 'Active', count: pendingCount },
        { id: 'completed' as const, label: 'Done', count: completedCount },
    ];

    return (
        <div className="flex flex-col h-full">
            <ConfirmModal isOpen={confirmModal.isOpen} onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })} onConfirm={confirmDeleteTask} title="Delete Task" message="Are you sure you want to delete this task? This action cannot be undone." confirmText="Delete Task" isDestructive={true} />
            <TaskModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSaveTask} initialData={selectedTask} />
            <TaskDetailsModal isOpen={isViewModalOpen} onClose={() => setIsViewModalOpen(false)} task={viewTask} />

            {/* Fixed Header */}
            <div className="shrink-0 space-y-6 pb-6">
                {/* Page Header */}
                <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                    <div>
                        <p className="text-xs font-bold text-orange-600 uppercase tracking-[0.22em] mb-1">Productivity</p>
                        <h1 className="text-3xl lg:text-4xl font-bold text-zinc-950 tracking-tight">Tasks</h1>
                        <p className="text-zinc-500 text-sm mt-1.5">Stay organized and on track.</p>
                    </div>
                    <button
                        onClick={handleAddClick}
                        className="h-11 px-6 flex items-center gap-2 rounded-2xl bg-zinc-950 hover:bg-zinc-800 text-white font-medium shadow-lg shadow-zinc-950/15 transition-all active:scale-95 self-start sm:self-auto"
                    >
                        <Plus className="w-4 h-4" />
                        <span>New Task</span>
                    </button>
                </div>

                {/* Search + Tabs bar */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                        <input
                            type="text"
                            placeholder="Search tasks..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-white border border-zinc-200 rounded-2xl pl-10 pr-4 py-2.5 text-sm text-zinc-950 focus:outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100 transition-all placeholder:text-zinc-400 shadow-sm"
                        />
                    </div>
                    <div className="flex bg-zinc-100 rounded-2xl p-1 shadow-inner">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${activeTab === tab.id ? 'bg-white text-zinc-950 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
                            >
                                {tab.label}
                                <span className={`ml-1.5 text-[10px] ${activeTab === tab.id ? 'text-orange-600' : 'text-zinc-400'}`}>{tab.count}</span>
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={fetchTasks}
                        disabled={loading}
                        className="h-10 w-10 shrink-0 flex items-center justify-center rounded-2xl bg-white border border-zinc-200 text-zinc-500 hover:text-zinc-950 hover:border-orange-200 hover:bg-orange-50 transition-all disabled:opacity-50 shadow-sm"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                {/* Stats */}
                {!loading && data.length > 0 && (
                    <div className="flex items-center justify-between text-xs text-zinc-500">
                        <div className="flex items-center gap-4">
                            <span>{pendingCount} active</span>
                            <span className="text-zinc-300">·</span>
                            <span>{completedCount} done</span>
                        </div>
                        <span>{filteredData.length} shown</span>
                    </div>
                )}
            </div>

            {/* Scrollable Task List */}
            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pb-6 space-y-2">
                {loading && data.length === 0 ? (
                    <div className="space-y-2">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="rounded-2xl border border-zinc-100 bg-white p-5 animate-pulse">
                                <div className="flex items-center gap-4">
                                    <div className="w-6 h-6 rounded-full bg-zinc-200" />
                                    <div className="flex-1 space-y-2">
                                        <div className="h-4 w-56 bg-zinc-200 rounded-lg" />
                                        <div className="h-3 w-36 bg-zinc-100 rounded-lg" />
                                    </div>
                                    <div className="h-6 w-16 bg-zinc-100 rounded-full" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : filteredData.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="w-16 h-16 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center mb-4">
                            <Sparkles className="w-7 h-7" />
                        </div>
                        <p className="font-semibold text-zinc-700 text-lg">No tasks yet</p>
                        <p className="text-zinc-500 text-sm mt-1 max-w-xs">Create your first task to start tracking your work.</p>
                        <button onClick={handleAddClick} className="mt-5 px-5 py-2.5 rounded-2xl bg-zinc-950 text-white text-sm font-medium hover:bg-zinc-800 transition-all shadow-lg shadow-zinc-950/10">
                            <Plus className="w-4 h-4 inline mr-1.5 -mt-0.5" />Create Task
                        </button>
                    </div>
                ) : (
                    <AnimatePresence initial={false}>
                        {filteredData.map((item) => {
                            const isCompleted = item.status === 'Completed';
                            const dueDateObj = item.due_date ? parseISO(item.due_date) : null;
                            const isOverdue = dueDateObj && isValid(dueDateObj) && isPast(dueDateObj) && !isCompleted;

                            return (
                                <motion.div
                                    key={item.id}
                                    layout
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -8 }}
                                    transition={{ duration: 0.2 }}
                                    onClick={() => handleViewTask(item)}
                                    className={`group relative rounded-2xl border bg-white p-4 sm:p-5 cursor-pointer transition-all duration-200 hover:shadow-lg hover:shadow-zinc-950/5 ${isCompleted ? 'border-zinc-100 opacity-70 hover:opacity-100' : 'border-zinc-200 hover:border-orange-200'}`}
                                >
                                    <div className="flex items-start gap-4">
                                        {/* Status toggle */}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleStatusUpdate(item.id, isCompleted ? 'Pending' : 'Completed');
                                            }}
                                            className="mt-0.5 shrink-0 transition-transform hover:scale-110 active:scale-90"
                                        >
                                            {isCompleted
                                                ? <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                                                : item.status === 'In Progress'
                                                    ? <Clock className="w-6 h-6 text-amber-500" />
                                                    : <Circle className="w-6 h-6 text-zinc-300 group-hover:text-zinc-400 transition-colors" />
                                            }
                                        </button>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                {item.visibility === 'Private' && <Lock className="w-3 h-3 text-zinc-400 shrink-0" />}
                                                <span className={`text-[15px] font-semibold leading-snug ${isCompleted ? 'line-through text-zinc-400' : 'text-zinc-950'}`}>
                                                    {item.title}
                                                </span>
                                            </div>

                                            {item.description && (
                                                <p className={`text-sm mt-1 line-clamp-1 ${isCompleted ? 'text-zinc-400' : 'text-zinc-500'}`}>{item.description}</p>
                                            )}

                                            {/* Metadata row */}
                                            <div className="flex items-center gap-3 mt-3 flex-wrap">
                                                {/* Priority */}
                                                <span className="flex items-center gap-1.5 text-xs text-zinc-500">
                                                    <span className={`w-2 h-2 rounded-full ${getPriorityDot(item.priority)}`} />
                                                    {item.priority}
                                                </span>

                                                {/* Due date */}
                                                {dueDateObj && isValid(dueDateObj) && (
                                                    <span className={`flex items-center gap-1 text-xs ${isOverdue ? 'text-red-600 font-medium' : 'text-zinc-500'}`}>
                                                        <Calendar className="w-3 h-3" />
                                                        {format(dueDateObj, 'MMM d')}
                                                    </span>
                                                )}

                                                {/* Assignees */}
                                                {item.assigned_to_profiles && item.assigned_to_profiles.length > 0 ? (
                                                    <div className="flex -space-x-1.5">
                                                        {item.assigned_to_profiles.slice(0, 3).map((profile, i) => (
                                                            <div key={i} className="w-5 h-5 rounded-full ring-2 ring-white bg-zinc-200 overflow-hidden" title={profile.name}>
                                                                {profile.photo_url
                                                                    ? <img src={profile.photo_url} alt={profile.name} className="w-full h-full object-cover" />
                                                                    : <span className="flex items-center justify-center w-full h-full text-[8px] font-bold text-zinc-600">{profile.name?.charAt(0)}</span>
                                                                }
                                                            </div>
                                                        ))}
                                                        {item.assigned_to_profiles.length > 3 && (
                                                            <div className="w-5 h-5 rounded-full ring-2 ring-white bg-zinc-100 flex items-center justify-center text-[8px] font-bold text-zinc-500">+{item.assigned_to_profiles.length - 3}</div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="flex items-center gap-1 text-xs text-zinc-400">
                                                        <Globe className="w-3 h-3" /> Everyone
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="relative shrink-0" ref={openActionMenuId === item.id ? actionMenuRef : undefined} onClick={e => e.stopPropagation()}>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setOpenActionMenuId(openActionMenuId === item.id ? null : item.id);
                                                }}
                                                className="p-2 rounded-xl text-zinc-400 hover:text-zinc-950 hover:bg-orange-50 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                                            >
                                                <MoreHorizontal className="w-4 h-4" />
                                            </button>

                                            <AnimatePresence>
                                                {openActionMenuId === item.id && (
                                                    <motion.div
                                                        initial={{ opacity: 0, scale: 0.95, y: 4 }}
                                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                                        exit={{ opacity: 0, scale: 0.95 }}
                                                        className="absolute right-0 top-full mt-1 w-44 bg-white border border-zinc-200 rounded-xl shadow-xl shadow-zinc-950/10 z-50 p-1 overflow-hidden"
                                                    >
                                                        {item.uid === currentUserId ? (
                                                            <>
                                                                <button onClick={() => handleEditClick(item)} className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-zinc-700 hover:text-zinc-950 hover:bg-orange-50 flex items-center gap-2 transition-colors">
                                                                    <Edit2 className="w-3.5 h-3.5" /> Edit
                                                                </button>
                                                                <button onClick={() => handleVisibilityToggle(item)} className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-zinc-700 hover:text-zinc-950 hover:bg-orange-50 flex items-center gap-2 transition-colors">
                                                                    {item.visibility === 'Public' ? <><Lock className="w-3.5 h-3.5" /> Make Private</> : <><Globe className="w-3.5 h-3.5" /> Make Public</>}
                                                                </button>
                                                                <div className="h-px bg-zinc-100 my-0.5" />
                                                                <button onClick={() => handleDeleteTaskClick(item.id)} className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors">
                                                                    <Trash2 className="w-3.5 h-3.5" /> Delete
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <div className="px-3 py-2.5 text-xs text-zinc-500 text-center italic">Read only</div>
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
    );
};
