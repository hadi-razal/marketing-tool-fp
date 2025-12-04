/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw, Trash2, Edit2, Plus, Search, Filter, CheckCircle2, Circle, Clock, Globe, Lock, ChevronDown, Calendar, MoreHorizontal, AlertCircle, ArrowUpCircle, ArrowDownCircle, MinusCircle, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { TableSkeleton } from '../ui/TableSkeleton';
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
                    .select('uid, name, email')
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
            case 'high': return <ArrowUpCircle className="w-4 h-4 text-red-500" />;
            case 'medium': return <AlertCircle className="w-4 h-4 text-yellow-500" />;
            case 'low': return <ArrowDownCircle className="w-4 h-4 text-blue-500" />;
            default: return <MinusCircle className="w-4 h-4 text-zinc-500" />;
        }
    };

    const getPriorityStyles = (priority: string) => {
        switch (priority.toLowerCase()) {
            case 'high': return 'bg-red-500/10 text-red-400 border-red-500/20';
            case 'medium': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
            case 'low': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
            default: return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status.toLowerCase()) {
            case 'completed': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
            case 'in progress': return <Clock className="w-4 h-4 text-yellow-500" />;
            default: return <Circle className="w-4 h-4 text-zinc-500" />;
        }
    };

    const formatDueDate = (dateString?: string) => {
        if (!dateString) return '-';
        const date = parseISO(dateString);
        if (!isValid(date)) return dateString;

        const isOverdue = isPast(date) && !isPast(new Date(date.getTime() + 86400000)); // Simple check, can be refined
        const distance = formatDistanceToNow(date, { addSuffix: true });

        // Color coding
        let colorClass = 'text-zinc-400';
        if (isPast(date)) colorClass = 'text-red-400';
        else if (distance.includes('hours') || distance.includes('minutes')) colorClass = 'text-orange-400';
        else colorClass = 'text-green-400';

        return (
            <div className="flex flex-col">
                <span className="text-xs font-mono text-zinc-300">{format(date, 'MMM d, yyyy')}</span>
                <span className={`text-[10px] font-medium ${colorClass}`}>{distance}</span>
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

    const activeFiltersCount = statusFilter.length + priorityFilter.length;

    return (
        <div className="h-full flex flex-col gap-6">
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
            <div className="relative z-30 flex flex-col lg:flex-row gap-4 p-4 bg-zinc-900/50 border border-white/5 rounded-md backdrop-blur-xl shadow-xl">
                {/* Search */}
                <div className="relative flex-1 group">
                    <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 to-purple-500/10 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="relative flex items-center">
                        <Search className="absolute left-4 w-4 h-4 text-zinc-400 group-hover:text-orange-400 transition-colors" />
                        <input
                            type="text"
                            placeholder="Search tasks..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-black/20 border border-white/10 rounded-md pl-11 pr-4 py-3 text-sm text-white focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 transition-all placeholder:text-zinc-600 hover:border-white/20"
                        />
                    </div>
                </div>

                {/* Actions Group */}
                <div className="flex items-center gap-3">
                    <Button
                        variant="secondary"
                        onClick={() => setShowMyTasksOnly(!showMyTasksOnly)}
                        className={`glass-button h-11 px-5 border-white/10 hover:border-white/20 text-zinc-400 hover:text-white rounded-md ${showMyTasksOnly ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : ''}`}
                    >
                        My Tasks
                    </Button>

                    {/* Filter Dropdown */}
                    <div className="relative" ref={filterRef}>
                        <Button
                            variant="secondary"
                            onClick={() => setIsFilterOpen(!isFilterOpen)}
                            className={`glass-button h-11 px-5 border-white/10 hover:border-white/20 text-zinc-400 hover:text-white rounded-md ${isFilterOpen || activeFiltersCount > 0 ? 'bg-white/10 text-white border-white/20' : ''}`}
                            leftIcon={<Filter className="w-4 h-4" />}
                        >
                            Filters
                            {activeFiltersCount > 0 && (
                                <span className="ml-2 bg-orange-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                                    {activeFiltersCount}
                                </span>
                            )}
                        </Button>

                        <AnimatePresence>
                            {isFilterOpen && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    className="absolute right-0 top-full mt-2 w-64 bg-[#09090b] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden p-4"
                                >
                                    <div className="flex items-center justify-between mb-4">
                                        <span className="text-sm font-bold text-zinc-300">Filters</span>
                                        {activeFiltersCount > 0 && (
                                            <button onClick={clearFilters} className="text-xs text-orange-400 hover:text-orange-300">
                                                Clear all
                                            </button>
                                        )}
                                    </div>

                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2 block">Status</label>
                                            <div className="flex flex-wrap gap-2">
                                                {['Pending', 'In Progress', 'Completed'].map(status => (
                                                    <button
                                                        key={status}
                                                        onClick={() => toggleFilter('status', status)}
                                                        className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${statusFilter.includes(status) ? 'bg-orange-500/20 border-orange-500/50 text-orange-400' : 'bg-white/5 border-white/5 text-zinc-400 hover:bg-white/10'}`}
                                                    >
                                                        {status}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div>
                                            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2 block">Priority</label>
                                            <div className="flex flex-wrap gap-2">
                                                {['High', 'Medium', 'Low'].map(priority => (
                                                    <button
                                                        key={priority}
                                                        onClick={() => toggleFilter('priority', priority)}
                                                        className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${priorityFilter.includes(priority) ? 'bg-orange-500/20 border-orange-500/50 text-orange-400' : 'bg-white/5 border-white/5 text-zinc-400 hover:bg-white/10'}`}
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

                    <Button
                        variant="secondary"
                        onClick={fetchTasks}
                        isLoading={loading}
                        className="glass-button h-11 w-11 p-0 flex items-center justify-center border-white/10 hover:border-white/20 text-zinc-400 hover:text-white rounded-md"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </Button>

                    <Button
                        onClick={handleAddClick}
                        leftIcon={<Plus className="w-4 h-4" />}
                        className="h-11 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white border-0 shadow-lg shadow-orange-500/20 px-6 font-medium rounded-md"
                    >
                        Add Task
                    </Button>
                </div>
            </div>

            {/* Table */}
            <div className="flex-1 glass-panel rounded-md overflow-hidden flex flex-col border border-white/5 bg-black/40 shadow-2xl">
                <div className="overflow-auto custom-scrollbar flex-1 p-2">
                    <table className="w-full text-left text-sm text-zinc-400 border-separate border-spacing-y-2">
                        <thead className="text-zinc-500 uppercase text-[11px] font-bold tracking-wider [&_th]:sticky [&_th]:top-0 [&_th]:z-10 [&_th]:bg-[#09090b]/80 [&_th]:backdrop-blur-xl [&_th]:border-b [&_th]:border-white/5">
                            <tr>
                                <th className="px-6 py-4">Task Name</th>
                                <th className="px-6 py-4">Created By</th>
                                <th className="px-6 py-4">Created At</th>
                                <th className="px-6 py-4">Due Date</th>
                                <th className="px-6 py-4">Priority</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right"></th>
                            </tr>
                        </thead>
                        <tbody>
                            <AnimatePresence>
                                {loading ? (
                                    <tr>
                                        <td colSpan={7} className="p-0">
                                            <TableSkeleton columns={7} rows={5} />
                                        </td>
                                    </tr>
                                ) : (
                                    filteredData.map((item, index) => (
                                        <motion.tr
                                            key={item.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                            transition={{ delay: index * 0.05 }}
                                            onClick={() => handleViewTask(item)}
                                            className="group relative bg-gradient-to-r from-zinc-900/40 to-zinc-900/20 hover:from-zinc-800/60 hover:to-zinc-800/40 transition-all duration-300 rounded-md shadow-sm hover:shadow-lg hover:shadow-black/20 cursor-pointer border border-transparent hover:border-white/5"
                                        >
                                            <td className="px-6 py-4 first:rounded-l-xl last:rounded-r-xl border-y border-l border-white/5 group-hover:border-white/10 transition-colors">
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-sm font-semibold text-zinc-200 group-hover:text-white transition-colors">{item.title}</span>
                                                    {item.description && (
                                                        <span className="text-xs text-zinc-500 truncate max-w-[200px]">{item.description}</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 border-y border-white/5 group-hover:border-white/10 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <img
                                                        src={`https://ui-avatars.com/api/?name=${encodeURIComponent(item.created_by || 'U')}&background=random&color=fff`}
                                                        alt={item.created_by}
                                                        className="w-6 h-6 rounded-full ring-2 ring-black"
                                                    />
                                                    <span className="text-xs font-medium text-zinc-300">{item.created_by === currentUserEmail ? 'You' : item.created_by}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 border-y border-white/5 group-hover:border-white/10 transition-colors">
                                                <div className="flex items-center gap-2 text-zinc-400">
                                                    <Calendar className="w-3.5 h-3.5 opacity-50" />
                                                    <span className="text-xs font-mono">{item.created_at ? format(new Date(item.created_at), 'MMM d, h:mm a') : '-'}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 border-y border-white/5 group-hover:border-white/10 transition-colors">
                                                {formatDueDate(item.due_date)}
                                            </td>
                                            <td className="px-6 py-4 border-y border-white/5 group-hover:border-white/10 transition-colors">
                                                <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border shadow-sm ${getPriorityStyles(item.priority)}`}>
                                                    {getPriorityIcon(item.priority)}
                                                    {item.priority}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 border-y border-white/5 group-hover:border-white/10 transition-colors relative">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setOpenStatusDropdownId(openStatusDropdownId === item.id ? null : item.id);
                                                    }}
                                                    className="flex items-center gap-2 text-zinc-300 hover:text-white bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg transition-all border border-white/5 hover:border-white/20 text-xs font-medium shadow-sm"
                                                >
                                                    {getStatusIcon(item.status)}
                                                    <span>{item.status}</span>
                                                    <ChevronDown className="w-3 h-3 opacity-50" />
                                                </button>

                                                {openStatusDropdownId === item.id && (
                                                    <div
                                                        ref={dropdownRef}
                                                        className="absolute left-6 top-full mt-2 w-44 bg-[#09090b] border border-white/10 rounded-md shadow-2xl z-50 overflow-hidden p-1"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        {['Pending', 'In Progress', 'Completed'].map((status) => (
                                                            <button
                                                                key={status}
                                                                onClick={() => handleStatusUpdate(item.id, status as Task['status'])}
                                                                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2 transition-colors ${item.status === status ? 'bg-white/10 text-white' : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'}`}
                                                            >
                                                                {getStatusIcon(status)}
                                                                {status}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </td>

                                            <td className="px-6 py-4 border-y border-r border-white/5 group-hover:border-white/10 transition-colors text-right first:rounded-l-xl last:rounded-r-xl relative">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setOpenActionMenuId(openActionMenuId === item.id ? null : item.id);
                                                    }}
                                                    className="p-2 hover:bg-white/10 rounded-md text-zinc-500 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
                                                >
                                                    <MoreHorizontal className="w-4 h-4" />
                                                </button>

                                                {openActionMenuId === item.id && (
                                                    <div
                                                        ref={actionMenuRef}
                                                        className="absolute right-4 top-full mt-2 w-48 bg-[#09090b] border border-white/10 rounded-md shadow-2xl z-50 overflow-hidden p-1"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        {item.uid === currentUserId && (
                                                            <>
                                                                <button
                                                                    onClick={() => handleEditClick(item)}
                                                                    className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/5 flex items-center gap-2 transition-colors"
                                                                >
                                                                    <Edit2 className="w-3.5 h-3.5" />
                                                                    Edit Task
                                                                </button>

                                                                <button
                                                                    onClick={() => handleVisibilityToggle(item)}
                                                                    className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/5 flex items-center gap-2 transition-colors"
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
                                                                    className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-red-400 hover:bg-red-500/10 flex items-center gap-2 transition-colors"
                                                                >
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                    Delete Task
                                                                </button>
                                                            </>
                                                        )}
                                                        {item.uid !== currentUserId && (
                                                            <div className="px-3 py-2 text-xs text-zinc-500 text-center">
                                                                No actions available
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </td>
                                        </motion.tr>
                                    ))
                                )}
                            </AnimatePresence>
                        </tbody>
                    </table>
                </div>
                {!loading && filteredData.length === 0 && (
                    <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 gap-4 min-h-[400px] pb-32">
                        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-zinc-800 to-zinc-900 border border-white/5 flex items-center justify-center shadow-2xl">
                            <CheckCircle2 className="w-10 h-10 opacity-20" />
                        </div>
                        <div className="text-center">
                            <p className="text-lg font-bold text-white">No tasks found</p>
                            <p className="text-sm text-zinc-500 mt-1">Get started by creating a new task.</p>
                        </div>
                        <Button onClick={handleAddClick} variant="secondary" className="mt-4 glass-button border-white/10 hover:border-white/20">
                            Create Task
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
};
