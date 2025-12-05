/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw, Trash2, Edit2, Plus, Search, Filter, CheckCircle2, Circle, Clock, Globe, Lock, ChevronDown, MoreHorizontal, Calendar, User, AlertCircle, ArrowUpCircle, ArrowDownCircle, MinusCircle, LayoutGrid, List } from 'lucide-react';
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

            const userIds = [...new Set(tasks?.map((t: any) => t.uid).filter(Boolean))];
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
                const user = userMap[t.uid];
                return {
                    ...t,
                    created_by: user?.name || user?.email || 'Unknown',
                    profile_url: user?.profile_url,
                    status: t.status || 'Pending'
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

            const payload = {
                title: taskData.title,
                description: taskData.description,
                due_date: taskData.due_date,
                priority: taskData.priority,
                status: taskData.status,
                visibility: taskData.visibility,
                related_to: taskData.related_to,
                uid: currentUserId
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
            setData(prev => prev.map(t => t.id === id ? { ...t, status: newStatus } : t));
            const { error } = await supabase
                .from('tasks')
                .update({ status: newStatus })
                .eq('id', id) as any;

            if (error) {
                throw error;
                fetchTasks();
            } else {
                logActivity(`Marked as ${newStatus}`, `marked a task as ${newStatus}`);
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
            case 'high': return <ArrowUpCircle className="w-3.5 h-3.5 text-red-500" />;
            case 'medium': return <AlertCircle className="w-3.5 h-3.5 text-amber-500" />;
            case 'low': return <ArrowDownCircle className="w-3.5 h-3.5 text-blue-500" />;
            default: return <MinusCircle className="w-3.5 h-3.5 text-zinc-500" />;
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

    const getStatusIcon = (status: string) => {
        switch (status.toLowerCase()) {
            case 'completed': return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
            case 'in progress': return <Clock className="w-5 h-5 text-amber-500" />;
            default: return <Circle className="w-5 h-5 text-zinc-500" />;
        }
    };

    const formatDueDate = (dateString?: string) => {
        if (!dateString) return <span className="text-zinc-600 text-xs">—</span>;
        const date = parseISO(dateString);
        if (!isValid(date)) return <span className="text-zinc-500 text-xs">{dateString}</span>;

        const isOverdue = isPast(date) && !isPast(new Date(date.getTime() + 86400000));

        return (
            <div className={`flex items-center gap-1.5 text-xs ${isOverdue ? 'text-red-400' : 'text-zinc-400'}`}>
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

            {/* Professional Toolbar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
                {/* Search */}
                <div className="relative flex-1 w-full sm:w-auto">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <input
                        type="text"
                        placeholder="Search tasks..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-md pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-zinc-700 transition-colors placeholder:text-zinc-600"
                    />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                    {/* Filter Dropdown */}
                    <div className="relative" ref={filterRef}>
                        <button
                            onClick={() => setIsFilterOpen(!isFilterOpen)}
                            className={`flex items-center gap-2 px-3 py-2.5 rounded-md text-sm font-medium transition-all border ${activeFiltersCount > 0
                                ? 'bg-zinc-800 border-zinc-700 text-white'
                                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
                                }`}
                        >
                            <Filter className="w-4 h-4" />
                            <span className="hidden sm:inline">Filters</span>
                            {activeFiltersCount > 0 && (
                                <span className="ml-1 text-[10px] font-bold bg-white text-black px-1.5 py-0.5 rounded-full">
                                    {activeFiltersCount}
                                </span>
                            )}
                        </button>

                        <AnimatePresence>
                            {isFilterOpen && (
                                <motion.div
                                    initial={{ opacity: 0, y: 4, scale: 0.98 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 4, scale: 0.98 }}
                                    transition={{ duration: 0.1 }}
                                    className="absolute right-0 top-full mt-2 w-64 bg-[#09090b] border border-zinc-800 rounded-md shadow-xl z-50 p-4"
                                >
                                    <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-800">
                                        <span className="text-xs font-bold text-white uppercase tracking-wider">Filters</span>
                                        {activeFiltersCount > 0 && (
                                            <button onClick={clearFilters} className="text-[10px] text-zinc-500 hover:text-white transition-colors">
                                                Clear all
                                            </button>
                                        )}
                                    </div>

                                    <div className="space-y-4">
                                        <button
                                            onClick={() => setShowMyTasksOnly(!showMyTasksOnly)}
                                            className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-all ${showMyTasksOnly ? 'bg-zinc-800 text-white' : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'
                                                }`}
                                        >
                                            <span>My Tasks Only</span>
                                            {showMyTasksOnly && <CheckCircle2 className="w-3.5 h-3.5" />}
                                        </button>

                                        <div>
                                            <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-2 block">Status</label>
                                            <div className="flex flex-wrap gap-2">
                                                {['Pending', 'In Progress', 'Completed'].map(status => (
                                                    <button
                                                        key={status}
                                                        onClick={() => toggleFilter('status', status)}
                                                        className={`text-[10px] px-2.5 py-1.5 rounded-md border transition-all ${statusFilter.includes(status)
                                                            ? 'bg-zinc-800 border-zinc-700 text-white'
                                                            : 'bg-transparent border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700'
                                                            }`}
                                                    >
                                                        {status}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div>
                                            <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-2 block">Priority</label>
                                            <div className="flex flex-wrap gap-2">
                                                {['High', 'Medium', 'Low'].map(priority => (
                                                    <button
                                                        key={priority}
                                                        onClick={() => toggleFilter('priority', priority)}
                                                        className={`text-[10px] px-2.5 py-1.5 rounded-md border transition-all ${priorityFilter.includes(priority)
                                                            ? 'bg-zinc-800 border-zinc-700 text-white'
                                                            : 'bg-transparent border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700'
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

                    {/* Refresh */}
                    <button
                        onClick={fetchTasks}
                        disabled={loading}
                        className="p-2.5 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 transition-all disabled:opacity-50"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>

                    {/* Add Task */}
                    <button
                        onClick={handleAddClick}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-md bg-white text-black text-sm font-semibold hover:bg-zinc-200 transition-all shadow-sm active:scale-95"
                    >
                        <Plus className="w-4 h-4" />
                        <span className="hidden sm:inline">New Task</span>
                    </button>
                </div>
            </div>

            {/* Detailed Task List */}
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4 pb-10">
                {loading ? (
                    [...Array(5)].map((_, i) => (
                        <div key={i} className="h-32 rounded-md bg-zinc-900 border border-zinc-800 animate-pulse" />
                    ))
                ) : filteredData.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
                        <div className="w-16 h-16 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-4">
                            <CheckCircle2 className="w-8 h-8 text-zinc-700" />
                        </div>
                        <p className="text-sm font-medium text-zinc-400">No tasks found</p>
                        <p className="text-xs text-zinc-600 mt-1">Create a new task to get started</p>
                    </div>
                ) : (
                    <AnimatePresence mode='popLayout'>
                        {filteredData.map((item, index) => (
                            <motion.div
                                key={item.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.98 }}
                                transition={{ delay: index * 0.03 }}
                                onClick={() => handleViewTask(item)}
                                className="group relative flex gap-6 p-6 rounded-md bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-all duration-200 cursor-pointer shadow-sm"
                            >
                                {/* Status Indicator */}
                                <div className="flex-shrink-0 pt-1">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            const nextStatus = item.status === 'Completed' ? 'Pending' : 'Completed';
                                            handleStatusUpdate(item.id, nextStatus);
                                        }}
                                        className="text-zinc-500 hover:text-white transition-colors"
                                    >
                                        {getStatusIcon(item.status)}
                                    </button>
                                </div>

                                {/* Main Content */}
                                <div className="flex-1 min-w-0 flex flex-col gap-3">
                                    {/* Header: Title & Priority */}
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex items-center gap-2">
                                            {item.visibility === 'Private' && (
                                                <Lock className="w-3.5 h-3.5 text-zinc-500" />
                                            )}
                                            <h3 className={`text-base font-semibold transition-colors ${item.status === 'Completed' ? 'text-zinc-500 line-through' : 'text-zinc-100 group-hover:text-white'}`}>
                                                {item.title}
                                            </h3>
                                        </div>

                                        <div className={`flex-shrink-0 px-2.5 py-1 rounded-md border text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${getPriorityStyles(item.priority)}`}>
                                            {getPriorityIcon(item.priority)}
                                            {item.priority}
                                        </div>
                                    </div>

                                    {/* Description */}
                                    {item.description && (
                                        <p className="text-sm text-zinc-500 line-clamp-2 leading-relaxed group-hover:text-zinc-400 transition-colors">
                                            {item.description}
                                        </p>
                                    )}

                                    {/* Metadata Row */}
                                    <div className="flex items-center gap-6 pt-1 mt-auto">
                                        {/* Assignee */}
                                        <div className="flex items-center gap-2 text-xs text-zinc-500">
                                            <div className="w-5 h-5 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-[10px] font-bold text-zinc-400 overflow-hidden">
                                                {(item as any).profile_url ? (
                                                    <img src={(item as any).profile_url} alt={item.created_by} className="w-full h-full object-cover" />
                                                ) : (
                                                    (item.created_by || 'U').charAt(0).toUpperCase()
                                                )}
                                            </div>
                                            <span>{item.created_by === currentUserEmail ? 'You' : (item.created_by || 'Unknown')}</span>
                                        </div>

                                        {/* Due Date */}
                                        <div className="flex items-center gap-2 text-xs text-zinc-500">
                                            <Calendar className="w-3.5 h-3.5" />
                                            {formatDueDate(item.due_date)}
                                        </div>

                                        {/* Created At */}
                                        <div className="flex items-center gap-2 text-xs text-zinc-500">
                                            <Clock className="w-3.5 h-3.5" />
                                            <span>{item.created_at ? format(new Date(item.created_at), 'MMM d') : '-'}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Actions (Hover) */}
                                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <div className="relative">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setOpenActionMenuId(openActionMenuId === item.id ? null : item.id);
                                            }}
                                            className="p-2 rounded-md text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
                                        >
                                            <MoreHorizontal className="w-4 h-4" />
                                        </button>

                                        {openActionMenuId === item.id && (
                                            <div
                                                ref={actionMenuRef}
                                                className="absolute right-0 top-full mt-2 w-40 bg-[#09090b] border border-zinc-800 rounded-md shadow-xl z-50 py-1 overflow-hidden"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                {item.uid === currentUserId ? (
                                                    <>
                                                        <button
                                                            onClick={() => handleEditClick(item)}
                                                            className="w-full text-left px-3 py-2 text-xs text-zinc-400 hover:text-white hover:bg-zinc-800 flex items-center gap-2 transition-colors"
                                                        >
                                                            <Edit2 className="w-3.5 h-3.5" />
                                                            Edit Task
                                                        </button>
                                                        <button
                                                            onClick={() => handleVisibilityToggle(item)}
                                                            className="w-full text-left px-3 py-2 text-xs text-zinc-400 hover:text-white hover:bg-zinc-800 flex items-center gap-2 transition-colors"
                                                        >
                                                            {item.visibility === 'Public' ? (
                                                                <><Lock className="w-3.5 h-3.5" /> Make Private</>
                                                            ) : (
                                                                <><Globe className="w-3.5 h-3.5" /> Make Public</>
                                                            )}
                                                        </button>
                                                        <div className="h-px bg-zinc-800 my-1" />
                                                        <button
                                                            onClick={() => handleDeleteTask(item.id)}
                                                            className="w-full text-left px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 flex items-center gap-2 transition-colors"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                            Delete Task
                                                        </button>
                                                    </>
                                                ) : (
                                                    <div className="px-3 py-2 text-xs text-zinc-600 text-center">
                                                        No actions available
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                )}
            </div>

            {/* Footer Stats */}
            {!loading && filteredData.length > 0 && (
                <div className="mt-auto pt-4 border-t border-zinc-800 flex items-center justify-between text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
                    <span>{filteredData.length} Total Tasks</span>
                    <span>{filteredData.filter(t => t.status === 'Completed').length} Completed</span>
                </div>
            )}
        </div>
    );
};
