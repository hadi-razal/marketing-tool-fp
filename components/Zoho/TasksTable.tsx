/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw, Trash2, Edit2, Plus, Search, Filter, CheckCircle2, Circle, Clock, Globe, Lock, ChevronDown, MoreHorizontal, Calendar, User, AlertCircle, ArrowUpCircle, ArrowDownCircle, MinusCircle, LayoutGrid, List, Sparkles } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { Task } from '@/types/task';
import { TaskModal } from '../Tasks/TaskModal';
import { TaskDetailsModal } from '../Tasks/TaskDetailsModal';
import { motion, AnimatePresence } from 'framer-motion';
import { format, formatDistanceToNow, isPast, parseISO, isValid } from 'date-fns';

export const TasksTable = () => {
    const [data, setData] = useState<Task[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [viewTask, setViewTask] = useState<Task | null>(null);
    const [currentUserEmail, setCurrentUserEmail] = useState<string>('');
    const [currentUserName, setCurrentUserName] = useState<string>('');
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [openStatusDropdownId, setOpenStatusDropdownId] = useState<string | null>(null);
    const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [showMyTasksOnly, setShowMyTasksOnly] = useState(false);

    // Filter States
    const [statusFilter, setStatusFilter] = useState<string[]>([]);
    const [priorityFilter, setPriorityFilter] = useState<string[]>([]);

    const dropdownRef = useRef<HTMLDivElement>(null);
    const actionMenuRef = useRef<HTMLDivElement>(null);
    const filterRef = useRef<HTMLDivElement>(null);
    const supabase = createClient();

    const fetchUser = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            setCurrentUserEmail(user.email || '');
            setCurrentUserId(user.id);

            const { data: userData } = await supabase
                .from('users')
                .select('name')
                .eq('uid', user.id)
                .single();

            if (userData) {
                setCurrentUserName(userData.name || '');
            }
        }
    };

    const fetchTasks = async () => {
        setLoading(true);
        try {
            const { data: tasks, error } = await supabase
                .from('tasks')
                .select('*')
                .order('created_at', { ascending: false }) as any;

            if (error) throw error;

            // Collect all unique user IDs (both creators, closers, and assignees)
            const creators = tasks?.map((t: any) => t.uid).filter(Boolean) || [];
            const closers = tasks?.map((t: any) => t.closed_by).filter((id: any) => typeof id === 'string' && id.length > 0) || [];
            const assignees = tasks?.flatMap((t: any) => t.assigned_to || []).filter(Boolean) || [];
            const userIds = [...new Set([...creators, ...closers, ...assignees])];

            let userMap: Record<string, any> = {};

            if (userIds.length > 0) {
                const { data: users } = await supabase
                    .from('users')
                    .select('uid, name, email, profile_url')
                    .in('uid', userIds);

                if (users) {
                    userMap = users.reduce((acc: any, user: any) => {
                        acc[user.uid] = user;
                        return acc;
                    }, {});
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

    useEffect(() => {
        fetchUser();
        fetchTasks();
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setOpenStatusDropdownId(null);
            }
            if (actionMenuRef.current && !actionMenuRef.current.contains(event.target as Node)) {
                setOpenActionMenuId(null);
            }
            if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
                setIsFilterOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const logActivity = async (label: string, actionDescription: string) => {
        if (!currentUserId) return;
        const name = currentUserName || currentUserEmail || 'User';
        const statusMessage = `${name} ${actionDescription}`;
        try {
            await supabase
                .from('activities')
                .insert([{
                    label,
                    status: statusMessage,
                    uid: currentUserId,
                    created_at: new Date().toISOString()
                }]);
        } catch (error) {
            console.error('Error logging activity:', error);
        }
    };

    const handleSaveTask = async (taskData: Partial<Task>) => {
        try {
            if (!currentUserId) {
                alert('User not found. Please log in again.');
                return;
            }

            const payload: any = {
                title: taskData.title,
                description: taskData.description,
                due_date: taskData.due_date,
                priority: taskData.priority,
                status: taskData.status,
                visibility: taskData.visibility,
                related_to: taskData.related_to,
                assigned_to: taskData.assigned_to,
                uid: currentUserId,
                closed_by: taskData.status === 'Completed' ? currentUserId : null
            };

            if (selectedTask) {
                const { error } = await supabase
                    .from('tasks')
                    .update(payload)
                    .eq('id', selectedTask.id) as any;
                if (error) throw error;
                logActivity('Edited', 'edited a task');
            } else {
                const { error } = await supabase
                    .from('tasks')
                    .insert([payload]) as any;
                if (error) throw error;
                logActivity('Added', 'added a new task');
            }
            fetchTasks();
        } catch (error) {
            console.error('Error saving task:', error);
            throw error;
        }
    };

    const handleStatusUpdate = async (id: string, newStatus: Task['status']) => {
        try {
            setOpenStatusDropdownId(null);

            const updates: any = { status: newStatus };
            if (newStatus === 'Completed') {
                updates.closed_by = currentUserId;
            } else {
                updates.closed_by = null;
            }

            setData(prev => prev.map(t => t.id === id ? {
                ...t,
                ...updates,
                closed_by_name: newStatus === 'Completed' ? currentUserName : undefined
            } : t));

            const { error } = await supabase
                .from('tasks')
                .update(updates)
                .eq('id', id) as any;

            if (error) {
                throw error;
                fetchTasks();
            } else {
                logActivity(`Marked as ${newStatus}`, `marked a task as ${newStatus}`);
                fetchTasks();
            }
        } catch (error) {
            console.error('Error updating status:', error);
        }
    };

    const handleVisibilityToggle = async (task: Task) => {
        try {
            setOpenActionMenuId(null);
            const newVisibility = task.visibility === 'Public' ? 'Private' : 'Public';
            setData(prev => prev.map(t => t.id === task.id ? { ...t, visibility: newVisibility } : t));
            const { error } = await supabase
                .from('tasks')
                .update({ visibility: newVisibility })
                .eq('id', task.id) as any;

            if (error) {
                throw error;
                fetchTasks();
            } else {
                logActivity(`Visibility changed to ${newVisibility}`, `changed task visibility to ${newVisibility}`);
            }
        } catch (error) {
            console.error('Error updating visibility:', error);
        }
    };

    const handleDeleteTask = async (id: string) => {
        setOpenActionMenuId(null);
        if (!confirm('Are you sure you want to delete this task?')) return;
        try {
            const { error } = await supabase
                .from('tasks')
                .delete()
                .eq('id', id) as any;
            if (error) throw error;
            logActivity('Deleted', 'deleted a task');
            fetchTasks();
        } catch (error) {
            console.error('Error deleting task:', error);
        }
    };

    const handleEditClick = (task: Task) => {
        setOpenActionMenuId(null);
        setSelectedTask(task);
        setIsModalOpen(true);
    };

    const handleAddClick = () => {
        setSelectedTask(null);
        setIsModalOpen(true);
    };

    const handleViewTask = (task: Task) => {
        setViewTask(task);
        setIsViewModalOpen(true);
    };

    const getPriorityIcon = (priority: string) => {
        switch (priority.toLowerCase()) {
            case 'high': return <ArrowUpCircle className="w-3.5 h-3.5" />;
            case 'medium': return <AlertCircle className="w-3.5 h-3.5" />;
            case 'low': return <ArrowDownCircle className="w-3.5 h-3.5" />;
            default: return <MinusCircle className="w-3.5 h-3.5" />;
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority.toLowerCase()) {
            case 'high': return 'text-red-500';
            case 'medium': return 'text-amber-500';
            case 'low': return 'text-blue-500';
            default: return 'text-zinc-500';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status.toLowerCase()) {
            case 'completed': return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
            case 'in progress': return <Clock className="w-5 h-5 text-amber-500" />;
            default: return <Circle className="w-5 h-5 text-zinc-600 group-hover:text-zinc-500 transition-colors" />;
        }
    };

    const formatDueDate = (dateString?: string) => {
        if (!dateString) return null;
        const date = parseISO(dateString);
        if (!isValid(date)) return null;

        const isOverdue = isPast(date) && !isPast(new Date(date.getTime() + 86400000));

        return (
            <div className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-md border ${isOverdue ? 'bg-red-500/10 text-red-400 border-red-500/10' : 'bg-zinc-800/50 text-zinc-400 border-white/5'}`}>
                <Calendar className="w-3.5 h-3.5" />
                <span>{format(date, 'MMM d')}</span>
            </div>
        );
    };

    const toggleFilter = (type: 'status' | 'priority', value: string) => {
        if (type === 'status') {
            setStatusFilter(prev => prev.includes(value) ? prev.filter(item => item !== value) : [...prev, value]);
        } else {
            setPriorityFilter(prev => prev.includes(value) ? prev.filter(item => item !== value) : [...prev, value]);
        }
    };

    const clearFilters = () => {
        setStatusFilter([]);
        setPriorityFilter([]);
        setShowMyTasksOnly(false);
    };

    const filteredData = data.filter(item => {
        const matchesSearch = item.title.toLowerCase().includes(search.toLowerCase()) ||
            (item.description && item.description.toLowerCase().includes(search.toLowerCase()));

        const isVisible = item.visibility === 'Public' || item.uid === currentUserId;

        const matchesStatus = statusFilter.length === 0 || statusFilter.includes(item.status);
        const matchesPriority = priorityFilter.length === 0 || priorityFilter.includes(item.priority);
        const matchesMyTasks = !showMyTasksOnly || item.uid === currentUserId;

        return matchesSearch && isVisible && matchesStatus && matchesPriority && matchesMyTasks;
    });

    const activeFiltersCount = statusFilter.length + priorityFilter.length + (showMyTasksOnly ? 1 : 0);

    return (
        <div className="h-full flex flex-col">
            <TaskModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveTask}
                initialData={selectedTask}
            />

            <TaskDetailsModal
                isOpen={isViewModalOpen}
                onClose={() => setIsViewModalOpen(false)}
                task={viewTask}
            />

            {/* Controls Toolbar */}
            <div className="relative z-30 flex flex-col lg:flex-row gap-4 p-4 bg-zinc-900/50 border border-white/5 rounded-md backdrop-blur-xl shadow-xl mb-6">
                {/* Search */}
                <div className="relative flex-1 group">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="relative flex items-center">
                        <Search className="absolute left-4 w-4 h-4 text-zinc-400 group-hover:text-blue-400 transition-colors" />
                        <input
                            type="text"
                            placeholder="Search tasks..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-black/20 border border-white/10 rounded-md pl-11 pr-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all placeholder:text-zinc-600 hover:border-white/20"
                        />
                    </div>
                </div>

                {/* Actions Group */}
                <div className="flex items-center gap-3">
                    {/* Filter Button */}
                    <div className="relative" ref={filterRef}>
                        <button
                            onClick={() => setIsFilterOpen(!isFilterOpen)}
                            className={`h-11 px-5 flex items-center gap-2 rounded-md font-medium text-xs transition-colors border ${activeFiltersCount > 0
                                ? 'bg-blue-500/10 border-blue-500/50 text-blue-500'
                                : 'bg-transparent border-white/10 text-zinc-400 hover:text-white hover:border-white/20'
                                }`}
                        >
                            <Filter className="w-4 h-4" />
                            <span>Filters {activeFiltersCount > 0 && `(${activeFiltersCount})`}</span>
                        </button>

                        <AnimatePresence>
                            {isFilterOpen && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    className="absolute right-0 top-full mt-3 w-72 bg-[#121214] border border-white/10 rounded-md shadow-2xl z-50 p-5 backdrop-blur-xl"
                                >
                                    <div className="flex items-center justify-between mb-5">
                                        <h3 className="text-xs font-bold text-white uppercase tracking-wider">Active Filters</h3>
                                        {activeFiltersCount > 0 && (
                                            <button onClick={clearFilters} className="text-[10px] text-zinc-500 hover:text-white transition-colors">
                                                Clear all
                                            </button>
                                        )}
                                    </div>

                                    <div className="space-y-5">
                                        <div>
                                            <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-2.5 block">Show Only</label>
                                            <button
                                                onClick={() => setShowMyTasksOnly(!showMyTasksOnly)}
                                                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-md text-xs font-medium transition-all border ${showMyTasksOnly
                                                    ? 'bg-zinc-800 text-white border-zinc-700'
                                                    : 'bg-zinc-900/50 text-zinc-400 border-white/5 hover:bg-white/5'
                                                    }`}
                                            >
                                                <span>My Tasks</span>
                                                {showMyTasksOnly && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                                            </button>
                                        </div>

                                        <div>
                                            <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-2.5 block">Status</label>
                                            <div className="flex flex-wrap gap-2">
                                                {['Pending', 'In Progress', 'Completed'].map(status => (
                                                    <button
                                                        key={status}
                                                        onClick={() => toggleFilter('status', status)}
                                                        className={`px-3 py-1.5 rounded-md text-[10px] font-medium transition-all border ${statusFilter.includes(status)
                                                            ? 'bg-white text-black border-white'
                                                            : 'bg-transparent text-zinc-500 border-zinc-800 hover:border-zinc-700 hover:text-zinc-300'
                                                            }`}
                                                    >
                                                        {status}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div>
                                            <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-2.5 block">Priority</label>
                                            <div className="flex flex-wrap gap-2">
                                                {['High', 'Medium', 'Low'].map(priority => (
                                                    <button
                                                        key={priority}
                                                        onClick={() => toggleFilter('priority', priority)}
                                                        className={`px-3 py-1.5 rounded-md text-[10px] font-medium transition-all border ${priorityFilter.includes(priority)
                                                            ? 'bg-white text-black border-white'
                                                            : 'bg-transparent text-zinc-500 border-zinc-800 hover:border-zinc-700 hover:text-zinc-300'
                                                            }`}
                                                    >
                                                        {priority}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <div className="w-px h-8 bg-white/10 mx-1 hidden md:block" />

                    {/* Refresh */}
                    <button
                        onClick={fetchTasks}
                        disabled={loading}
                        className="h-11 w-11 flex items-center justify-center rounded-md bg-transparent border border-white/10 text-zinc-400 hover:text-white hover:bg-white/5 hover:border-white/20 transition-all disabled:opacity-50"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>

                    {/* Add Button */}
                    <button
                        onClick={handleAddClick}
                        className="h-11 px-6 flex items-center gap-2 rounded-md bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-medium shadow-lg shadow-blue-500/20 transition-all active:scale-95 group"
                    >
                        <Plus className="w-4 h-4 transition-transform group-hover:rotate-90" />
                        <span className="hidden sm:inline">Add Task</span>
                    </button>
                </div>
            </div>

            {/* Table Container */}
            <div className="flex-1 glass-panel rounded-md overflow-hidden flex flex-col border border-white/5 bg-black/40">
                <div className="overflow-x-auto custom-scrollbar flex-1">
                    <table className="w-full text-left text-sm text-zinc-400">
                        <thead className="bg-zinc-900/80 text-zinc-400 uppercase text-[10px] font-bold sticky top-0 z-10 backdrop-blur-md border-b border-white/5 tracking-wider">
                            <tr>
                                <th className="px-6 py-4 w-12">Status</th>
                                <th className="px-6 py-4">Task</th>
                                <th className="px-6 py-4 hidden md:table-cell">Assigned To</th>
                                <th className="px-6 py-4 hidden lg:table-cell">Priority</th>
                                <th className="px-6 py-4 hidden xl:table-cell">Due Date</th>
                                <th className="px-6 py-4 hidden xl:table-cell">Created By</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading && data.length === 0 ? (
                                [...Array(5)].map((_, i) => (
                                    <tr key={i}>
                                        <td className="px-6 py-4"><div className="w-5 h-5 rounded-full bg-zinc-800 animate-pulse" /></td>
                                        <td className="px-6 py-4">
                                            <div className="h-4 w-48 bg-zinc-800 rounded animate-pulse mb-2" />
                                            <div className="h-3 w-32 bg-zinc-800/50 rounded animate-pulse" />
                                        </td>
                                        <td className="px-6 py-4 hidden md:table-cell"><div className="flex -space-x-1"><div className="h-6 w-6 rounded-full bg-zinc-800 animate-pulse ring-2 ring-black" /><div className="h-6 w-6 rounded-full bg-zinc-800 animate-pulse ring-2 ring-black" /></div></td>
                                        <td className="px-6 py-4 hidden lg:table-cell"><div className="h-4 w-16 bg-zinc-800 rounded animate-pulse" /></td>
                                        <td className="px-6 py-4 hidden xl:table-cell"><div className="h-4 w-20 bg-zinc-800 rounded animate-pulse" /></td>
                                        <td className="px-6 py-4 hidden xl:table-cell"><div className="h-8 w-8 rounded-full bg-zinc-800 animate-pulse" /></td>
                                        <td className="px-6 py-4"><div className="h-8 w-8 rounded-md bg-zinc-800 animate-pulse ml-auto" /></td>
                                    </tr>
                                ))
                            ) : filteredData.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-20 text-center text-zinc-500">
                                        <div className="flex flex-col items-center justify-center">
                                            <div className="w-16 h-16 rounded-full bg-zinc-900/50 border border-white/5 flex items-center justify-center mb-4">
                                                <Sparkles className="w-6 h-6 text-zinc-700" />
                                            </div>
                                            <p className="font-medium text-zinc-400">No tasks found</p>
                                            <p className="text-xs text-zinc-600 mt-1">Get started by creating a new task</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredData.map((item) => (
                                    <tr
                                        key={item.id}
                                        onClick={() => handleViewTask(item)}
                                        className="hover:bg-white/[0.02] transition-colors group cursor-pointer"
                                    >
                                        {/* Status Checkbox */}
                                        <td className="px-6 py-4 align-top pt-5">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    const nextStatus = item.status === 'Completed' ? 'Pending' : 'Completed';
                                                    handleStatusUpdate(item.id, nextStatus);
                                                }}
                                                className="text-zinc-600 hover:text-white transition-colors hover:scale-110 active:scale-90"
                                            >
                                                {getStatusIcon(item.status)}
                                            </button>
                                        </td>

                                        {/* Task Title & Description */}
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 mb-1">
                                                {item.visibility === 'Private' && <Lock className="w-3 h-3 text-zinc-600" />}
                                                <span className={`text-sm font-bold ${item.status === 'Completed' ? 'text-zinc-500 line-through' : 'text-zinc-200'}`}>
                                                    {item.title}
                                                </span>
                                            </div>
                                            {item.description && (
                                                <p className="text-xs text-zinc-500 line-clamp-1 max-w-sm">{item.description}</p>
                                            )}
                                        </td>

                                        {/* Assigned To */}
                                        <td className="px-6 py-4 hidden md:table-cell align-middle">
                                            <div className="flex -space-x-2 overflow-visible">
                                                {item.assigned_to_profiles && item.assigned_to_profiles.length > 0 ? (
                                                    item.assigned_to_profiles.map((profile, i) => (
                                                        <div key={i} className="relative inline-block h-6 w-6 rounded-full ring-2 ring-[#09090b] bg-zinc-800 shadow-sm" title={profile.name}>
                                                            {profile.photo_url ? (
                                                                <img src={profile.photo_url} alt={profile.name} className="h-full w-full object-cover rounded-full" />
                                                            ) : (
                                                                <div className="flex items-center justify-center w-full h-full text-[9px] text-zinc-400 font-bold uppercase">
                                                                    {profile.name.charAt(0)}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-zinc-800/50 border border-white/5 text-[10px] text-zinc-400 whitespace-nowrap">
                                                        <Globe className="w-3 h-3" />
                                                        <span>All</span>
                                                    </div>
                                                )}
                                            </div>
                                        </td>

                                        {/* Priority */}
                                        <td className="px-6 py-4 hidden lg:table-cell align-middle">
                                            <div className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider ${getPriorityColor(item.priority)}`}>
                                                {getPriorityIcon(item.priority)}
                                                <span>{item.priority}</span>
                                            </div>
                                        </td>

                                        {/* Due Date */}
                                        <td className="px-6 py-4 hidden xl:table-cell align-middle">
                                            {formatDueDate(item.due_date)}
                                        </td>

                                        {/* Created By */}
                                        <td className="px-6 py-4 hidden xl:table-cell align-middle">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-zinc-800 border border-white/5 flex items-center justify-center text-[10px] font-bold text-zinc-400 overflow-hidden ring-1 ring-black">
                                                    {item.profile_url ? (
                                                        <img src={item.profile_url} alt={item.created_by} className="w-full h-full object-cover" />
                                                    ) : (
                                                        (item.created_by || 'U').charAt(0).toUpperCase()
                                                    )}
                                                </div>
                                                <span className="text-xs text-zinc-500 group-hover:text-zinc-400 transition-colors">
                                                    {item.created_by === currentUserEmail ? 'You' : (item.created_by || 'Unknown')}
                                                </span>
                                            </div>
                                        </td>

                                        {/* Actions */}
                                        <td className="px-6 py-4 text-right align-middle">
                                            <div className="relative inline-block" onClick={e => e.stopPropagation()}>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setOpenActionMenuId(openActionMenuId === item.id ? null : item.id);
                                                    }}
                                                    className="p-2 rounded-md hover:bg-white/5 text-zinc-500 hover:text-white transition-colors"
                                                >
                                                    <MoreHorizontal className="w-4 h-4" />
                                                </button>

                                                <AnimatePresence>
                                                    {openActionMenuId === item.id && (
                                                        <motion.div
                                                            initial={{ opacity: 0, scale: 0.95, x: -10 }}
                                                            animate={{ opacity: 1, scale: 1, x: 0 }}
                                                            exit={{ opacity: 0, scale: 0.95 }}
                                                            className="absolute right-full top-0 mr-2 w-48 bg-[#121214] border border-white/10 rounded-md shadow-2xl z-50 p-1.5 overflow-hidden backdrop-blur-xl"
                                                        >
                                                            {item.uid === currentUserId ? (
                                                                <>
                                                                    <button
                                                                        onClick={() => handleEditClick(item)}
                                                                        className="w-full text-left px-3 py-2.5 rounded-md text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/5 flex items-center gap-2.5 transition-colors"
                                                                    >
                                                                        <Edit2 className="w-3.5 h-3.5" />
                                                                        Edit Task
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleVisibilityToggle(item)}
                                                                        className="w-full text-left px-3 py-2.5 rounded-md text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/5 flex items-center gap-2.5 transition-colors"
                                                                    >
                                                                        {item.visibility === 'Public' ? (
                                                                            <><Lock className="w-3.5 h-3.5" /> Make Private</>
                                                                        ) : (
                                                                            <><Globe className="w-3.5 h-3.5" /> Make Public</>
                                                                        )}
                                                                    </button>
                                                                    <div className="h-px bg-white/5 my-1" />
                                                                    <button
                                                                        onClick={() => handleDeleteTask(item.id)}
                                                                        className="w-full text-left px-3 py-2.5 rounded-md text-xs font-medium text-red-500 hover:bg-red-500/10 flex items-center gap-2.5 transition-colors"
                                                                    >
                                                                        <Trash2 className="w-3.5 h-3.5" />
                                                                        Delete Task
                                                                    </button>
                                                                </>
                                                            ) : (
                                                                <div className="px-3 py-3 text-xs text-zinc-500 text-center italic">
                                                                    Read only
                                                                </div>
                                                            )}
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Footer Stats */}
            {!loading && data.length > 0 && (
                <div className="mt-4 p-4 bg-zinc-900/50 border border-white/5 rounded-md backdrop-blur-xl flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-medium text-zinc-400">
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
                            <span>Total: <span className="text-white ml-1">{data.length}</span></span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span>Completed: <span className="text-white ml-1">{data.filter(t => t.status === 'Completed').length}</span></span>
                        </div>
                    </div>

                    <div className="text-[10px] uppercase tracking-wider opacity-50">
                        {filteredData.length} Shown
                    </div>
                </div>
            )}
        </div>
    );
};
