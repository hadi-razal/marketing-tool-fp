/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw, Trash2, Edit2, Plus, Search, Filter, CheckCircle2, Circle, Clock, Globe, Lock, Play, Check, RotateCcw, ChevronDown, User, Calendar, MoreHorizontal } from 'lucide-react';
import { Button } from '../ui/Button';
import { Skeleton } from '../ui/Skeleton';
import { TableSkeleton } from '../ui/TableSkeleton';
import { supabase } from '@/lib/supabase';
import { Task } from '@/types/task';
import { TaskModal } from '../Tasks/TaskModal';

export const TasksTable = () => {
    const [data, setData] = useState<Task[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [currentUserEmail, setCurrentUserEmail] = useState<string>('hadi@fairplatz.com'); // Default mock user
    const [openStatusDropdownId, setOpenStatusDropdownId] = useState<string | null>(null);
    const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const actionMenuRef = useRef<HTMLDivElement>(null);

    const fetchTasks = async () => {
        setLoading(true);
        try {
            // In a real app, we'd get the user from supabase.auth.getUser()
            // For now, we assume 'admin' as per the mock setup
            const { data: tasks, error } = await supabase
                .from('tasks')
                .select('*')
                .order('created_at', { ascending: false }) as any;

            if (error) throw error;
            setData(tasks || []);
        } catch (error) {
            console.error('Error fetching tasks:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTasks();
    }, []);

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setOpenStatusDropdownId(null);
            }
            if (actionMenuRef.current && !actionMenuRef.current.contains(event.target as Node)) {
                setOpenActionMenuId(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSaveTask = async (taskData: Partial<Task>) => {
        try {
            if (selectedTask) {
                // Update
                const { error } = await supabase
                    .from('tasks')
                    .update(taskData)
                    .eq('id', selectedTask.id) as any;
                if (error) throw error;
            } else {
                // Create
                const { error } = await supabase
                    .from('tasks')
                    .insert([{ ...taskData, created_by: currentUserEmail }]) as any;
                if (error) throw error;
            }
            fetchTasks();
        } catch (error) {
            console.error('Error saving task:', error);
            throw error;
        }
    };

    const handleStatusUpdate = async (id: string, newStatus: Task['status']) => {
        try {
            setOpenStatusDropdownId(null); // Close dropdown
            // Optimistic update
            setData(prev => prev.map(t => t.id === id ? { ...t, status: newStatus } : t));

            const { error } = await supabase
                .from('tasks')
                .update({ status: newStatus })
                .eq('id', id) as any;

            if (error) {
                throw error;
                fetchTasks(); // Revert on error
            }
        } catch (error) {
            console.error('Error updating status:', error);
        }
    };

    const handleVisibilityToggle = async (task: Task) => {
        try {
            setOpenActionMenuId(null);
            const newVisibility = task.visibility === 'Public' ? 'Private' : 'Public';

            // Optimistic update
            setData(prev => prev.map(t => t.id === task.id ? { ...t, visibility: newVisibility } : t));

            const { error } = await supabase
                .from('tasks')
                .update({ visibility: newVisibility })
                .eq('id', task.id) as any;

            if (error) {
                throw error;
                fetchTasks();
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

    const getPriorityColor = (priority: string) => {
        switch (priority.toLowerCase()) {
            case 'high': return 'text-red-400 bg-red-400/10 border-red-400/20';
            case 'medium': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
            case 'low': return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
            default: return 'text-zinc-400 bg-zinc-400/10 border-zinc-400/20';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status.toLowerCase()) {
            case 'completed': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
            case 'in progress': return <Clock className="w-4 h-4 text-yellow-500" />;
            default: return <Circle className="w-4 h-4 text-zinc-500" />;
        }
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Filter logic: Show Public tasks OR Private tasks created by current user
    const filteredData = data.filter(item => {
        const matchesSearch = item.title.toLowerCase().includes(search.toLowerCase()) ||
            (item.description && item.description.toLowerCase().includes(search.toLowerCase()));

        const isVisible = item.visibility === 'Public' || item.created_by === currentUserEmail;

        return matchesSearch && isVisible;
    });

    return (
        <div className="h-full flex flex-col gap-6">
            <TaskModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveTask}
                initialData={selectedTask}
            />

            {/* Controls Toolbar */}
            <div className="relative z-30 flex flex-col lg:flex-row gap-4 p-4 bg-zinc-900/50 border border-white/5 rounded-2xl backdrop-blur-xl shadow-xl">
                {/* Search */}
                <div className="relative flex-1 group">
                    <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 to-purple-500/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="relative flex items-center">
                        <Search className="absolute left-4 w-4 h-4 text-zinc-400 group-hover:text-orange-400 transition-colors" />
                        <input
                            type="text"
                            placeholder="Search tasks..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-black/20 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm text-white focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 transition-all placeholder:text-zinc-600 hover:border-white/20"
                        />
                    </div>
                </div>

                {/* Actions Group */}
                <div className="flex items-center gap-3">
                    {/* Filter */}
                    <Button
                        variant="secondary"
                        className="glass-button h-11 px-5 border-white/10 hover:border-white/20 text-zinc-400 hover:text-white"
                        leftIcon={<Filter className="w-4 h-4" />}
                    >
                        Filters
                    </Button>

                    <div className="w-px h-8 bg-white/10 mx-1 hidden md:block" />

                    {/* Refresh */}
                    <Button
                        variant="secondary"
                        onClick={fetchTasks}
                        isLoading={loading}
                        className="glass-button h-11 w-11 p-0 flex items-center justify-center border-white/10 hover:border-white/20 text-zinc-400 hover:text-white"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </Button>

                    {/* Add Button */}
                    <Button
                        onClick={handleAddClick}
                        leftIcon={<Plus className="w-4 h-4" />}
                        className="h-11 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white border-0 shadow-lg shadow-orange-500/20 px-6 font-medium"
                    >
                        Add Task
                    </Button>
                </div>
            </div>

            {/* Table */}
            <div className="flex-1 glass-panel rounded-2xl overflow-hidden flex flex-col border border-white/5 bg-black/40">
                <div className="overflow-x-auto custom-scrollbar flex-1">
                    <table className="w-full text-left text-sm text-zinc-400">
                        <thead className="bg-zinc-900/80 text-zinc-400 uppercase text-[10px] font-bold sticky top-0 z-10 backdrop-blur-md border-b border-white/5 tracking-wider">
                            <tr>
                                <th className="px-6 py-3">Task Name</th>
                                <th className="px-6 py-3">Created By</th>
                                <th className="px-6 py-3">Created At</th>
                                <th className="px-6 py-3">Due Date</th>
                                <th className="px-6 py-3">Priority</th>
                                <th className="px-6 py-3">Status</th>
                                <th className="px-6 py-3">Visibility</th>
                                <th className="px-6 py-3 text-right"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading ? (
                                <tr>
                                    <td colSpan={8} className="p-0">
                                        <TableSkeleton columns={8} rows={5} />
                                    </td>
                                </tr>
                            ) : (
                                filteredData.map((item) => (
                                    <tr
                                        key={item.id}
                                        className="hover:bg-white/[0.02] transition-colors group cursor-pointer border-b border-white/[0.02] last:border-0"
                                    >
                                        <td className="px-6 py-4 font-medium text-zinc-200">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-semibold">{item.title}</span>
                                                {item.description && (
                                                    <span className="text-xs text-zinc-500 truncate max-w-[200px]">{item.description}</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-zinc-400">
                                                <User className="w-3.5 h-3.5" />
                                                <span className="text-xs">{item.created_by === currentUserEmail ? 'Me' : item.created_by}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-zinc-400">
                                                <Calendar className="w-3.5 h-3.5" />
                                                <span className="text-xs font-mono">{formatDate(item.created_at)}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-zinc-400 font-mono text-xs">{item.due_date || '-'}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getPriorityColor(item.priority)}`}>
                                                {item.priority}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 relative">
                                            {/* Status Badge / Dropdown Trigger */}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setOpenStatusDropdownId(openStatusDropdownId === item.id ? null : item.id);
                                                }}
                                                className="flex items-center gap-2 text-zinc-300 hover:text-white hover:bg-white/5 px-2 py-1 rounded-lg transition-colors"
                                            >
                                                {getStatusIcon(item.status)}
                                                <span>{item.status}</span>
                                                <ChevronDown className="w-3 h-3 opacity-50" />
                                            </button>

                                            {/* Status Dropdown Menu */}
                                            {openStatusDropdownId === item.id && (
                                                <div
                                                    ref={dropdownRef}
                                                    className="absolute left-6 top-full mt-1 w-40 bg-zinc-900 border border-white/10 rounded-xl shadow-xl z-50 overflow-hidden"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    {['Pending', 'In Progress', 'Completed'].map((status) => (
                                                        <button
                                                            key={status}
                                                            onClick={() => handleStatusUpdate(item.id, status as Task['status'])}
                                                            className={`w-full text-left px-4 py-2.5 text-sm hover:bg-white/5 flex items-center gap-2 ${item.status === status ? 'text-orange-400 bg-orange-400/5' : 'text-zinc-400'}`}
                                                        >
                                                            {getStatusIcon(status)}
                                                            {status}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            {item.created_by === currentUserEmail && (
                                                <div className="flex items-center gap-2 text-zinc-400 text-xs">
                                                    {item.visibility === 'Public' ? (
                                                        <><Globe className="w-3 h-3 text-green-500" /> Public</>
                                                    ) : (
                                                        <><Lock className="w-3 h-3 text-zinc-500" /> Private</>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right relative">
                                            {/* Action Menu Trigger */}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setOpenActionMenuId(openActionMenuId === item.id ? null : item.id);
                                                }}
                                                className="p-1.5 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-white transition-colors"
                                            >
                                                <MoreHorizontal className="w-4 h-4" />
                                            </button>

                                            {/* Action Menu Dropdown */}
                                            {openActionMenuId === item.id && (
                                                <div
                                                    ref={actionMenuRef}
                                                    className="absolute right-0 top-full mt-1 w-48 bg-zinc-900 border border-white/10 rounded-xl shadow-xl z-50 overflow-hidden"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <button
                                                        onClick={() => handleEditClick(item)}
                                                        className="w-full text-left px-4 py-2.5 text-sm text-zinc-400 hover:text-white hover:bg-white/5 flex items-center gap-2"
                                                    >
                                                        <Edit2 className="w-3.5 h-3.5" />
                                                        Edit Task
                                                    </button>

                                                    {item.created_by === currentUserEmail && (
                                                        <button
                                                            onClick={() => handleVisibilityToggle(item)}
                                                            className="w-full text-left px-4 py-2.5 text-sm text-zinc-400 hover:text-white hover:bg-white/5 flex items-center gap-2"
                                                        >
                                                            {item.visibility === 'Public' ? (
                                                                <><Lock className="w-3.5 h-3.5" /> Make Private</>
                                                            ) : (
                                                                <><Globe className="w-3.5 h-3.5" /> Make Public</>
                                                            )}
                                                        </button>
                                                    )}

                                                    <div className="h-px bg-white/10 my-1" />

                                                    <button
                                                        onClick={() => handleDeleteTask(item.id)}
                                                        className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                        Delete Task
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                {!loading && filteredData.length === 0 && (
                    <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 gap-4 min-h-[400px] pb-32">
                        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
                            <CheckCircle2 className="w-8 h-8 opacity-40" />
                        </div>
                        <p className="text-lg font-medium">No tasks found</p>
                        <Button onClick={handleAddClick} variant="secondary" className="mt-2">
                            Create your first task
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
};
