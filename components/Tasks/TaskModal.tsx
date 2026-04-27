import React, { useState, useEffect, useRef } from 'react';
import { X, Calendar, Flag, Globe, Lock, AlertCircle, Check, Layout, Type, AlignLeft, User, ChevronDown, CheckCircle2 } from 'lucide-react';
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

export const TaskModal = ({ isOpen, onClose, onSave, initialData }: TaskModalProps) => {
    const [formData, setFormData] = useState<Partial<Task>>({
        title: '',
        description: '',
        due_date: '',
        priority: 'Medium',
        status: 'Pending',
        visibility: 'Private',
        related_to: '',
        assigned_to: []
    });
    const [loading, setLoading] = useState(false);
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [isAssigneeDropdownOpen, setIsAssigneeDropdownOpen] = useState(false);
    const assigneeRef = useRef<HTMLDivElement>(null);
    const supabase = createClient();

    useEffect(() => {
        fetchUsers();
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (assigneeRef.current && !assigneeRef.current.contains(event.target as Node)) {
                setIsAssigneeDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchUsers = async () => {
        const { data } = await supabase
            .from('users')
            .select('uid, name, profile_url, email');
        if (data) setUsers(data);
    };

    useEffect(() => {
        if (initialData) {
            setFormData(initialData);
        } else {
            setFormData({
                title: '',
                description: '',
                due_date: '',
                priority: 'Medium',
                status: 'Pending',
                visibility: 'Private',
                related_to: '',
                assigned_to: []
            });
        }
    }, [initialData, isOpen]);

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
        setFormData(prev => {
            const current = prev.assigned_to || [];
            if (current.includes(uid)) {
                return { ...prev, assigned_to: current.filter(id => id !== uid) };
            } else {
                return { ...prev, assigned_to: [...current, uid] };
            }
        });
    };

    const clearAssignees = () => {
        setFormData(prev => ({ ...prev, assigned_to: [] }));
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-zinc-950/45 backdrop-blur-sm z-50"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
                        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white border border-zinc-200 rounded-3xl shadow-2xl shadow-zinc-950/20 z-50 overflow-hidden flex flex-col max-h-[90vh]"
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-zinc-200 bg-zinc-50 flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-bold text-zinc-950 tracking-tight">
                                    {initialData ? 'Edit Task' : 'New Task'}
                                </h2>
                                <p className="text-xs text-zinc-500 mt-1">
                                    {initialData ? 'Update task details below.' : 'Create a new task to track progress.'}
                                </p>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 rounded-full hover:bg-orange-50 text-zinc-500 hover:text-zinc-950 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                            <form id="task-form" onSubmit={handleSubmit} className="space-y-6">
                                {/* Title */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Task Title</label>
                                    <input
                                        type="text"
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        placeholder="What needs to be done?"
                                        className="w-full bg-white border border-zinc-200 rounded-xl px-4 py-3 text-sm text-zinc-950 focus:outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100 transition-all placeholder:text-zinc-400 shadow-sm"
                                        required
                                    />
                                </div>

                                {/* Description */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Description</label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        placeholder="Add more details..."
                                        rows={4}
                                        className="w-full bg-white border border-zinc-200 rounded-xl px-4 py-3 text-sm text-zinc-950 focus:outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100 transition-all placeholder:text-zinc-400 resize-none shadow-sm"
                                    />
                                </div>

                                {/* Assigned To */}
                                <div className="space-y-2" ref={assigneeRef}>
                                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Assigned To</label>
                                    <div className="relative">
                                        <button
                                            type="button"
                                            onClick={() => setIsAssigneeDropdownOpen(!isAssigneeDropdownOpen)}
                                            className="w-full flex items-center justify-between bg-white border border-zinc-200 rounded-xl px-4 py-3 text-sm text-zinc-700 hover:border-zinc-300 transition-all shadow-sm"
                                        >
                                            <div className="flex items-center gap-2 overflow-hidden">
                                                <User className="w-4 h-4 text-zinc-400 shrink-0" />
                                                {(formData.assigned_to?.length || 0) === 0 ? (
                                                    <span className="text-zinc-400">All (Default)</span>
                                                ) : (
                                                    <div className="flex -space-x-2">
                                                        {formData.assigned_to?.slice(0, 5).map(uid => {
                                                            const user = users.find(u => u.uid === uid);
                                                            return (
                                                                <div key={uid} className="w-5 h-5 rounded-full ring-2 ring-white bg-zinc-200 flex items-center justify-center overflow-hidden" title={user?.name}>
                                                                    {user?.profile_url ? <img src={user.profile_url} alt="" className="w-full h-full object-cover" /> : <span className="text-[8px] font-bold text-zinc-600">{user?.name?.[0]}</span>}
                                                                </div>
                                                            );
                                                        })}
                                                        {(formData.assigned_to?.length || 0) > 5 && (
                                                            <div className="w-5 h-5 rounded-full ring-2 ring-white bg-zinc-200 flex items-center justify-center text-[8px] font-bold text-zinc-600">
                                                                +{(formData.assigned_to?.length || 0) - 5}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                            <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform ${isAssigneeDropdownOpen ? 'rotate-180' : ''}`} />
                                        </button>

                                        <AnimatePresence>
                                            {isAssigneeDropdownOpen && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                                    className="absolute top-full left-0 right-0 mt-2 bg-white border border-zinc-200 rounded-xl shadow-2xl shadow-zinc-950/15 z-50 p-2 max-h-60 overflow-y-auto custom-scrollbar"
                                                >
                                                    <button
                                                        type="button"
                                                        onClick={() => { clearAssignees(); setIsAssigneeDropdownOpen(false); }}
                                                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${(formData.assigned_to?.length || 0) === 0 ? 'bg-orange-50 text-orange-600' : 'text-zinc-600 hover:bg-orange-50 hover:text-zinc-950'
                                                            }`}
                                                    >
                                                        <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center border border-zinc-200">
                                                            <Globe className="w-4 h-4" />
                                                        </div>
                                                        <div className="flex-1 text-left">
                                                            <div className="font-medium">All Users</div>
                                                            <div className="text-[10px] opacity-70">Task visible to everyone</div>
                                                        </div>
                                                        {(formData.assigned_to?.length || 0) === 0 && <CheckCircle2 className="w-4 h-4" />}
                                                    </button>

                                                    <div className="h-px bg-zinc-100 my-2" />

                                                    {users.map(user => {
                                                        const isSelected = formData.assigned_to?.includes(user.uid);
                                                        return (
                                                            <button
                                                                key={user.uid}
                                                                type="button"
                                                                onClick={() => toggleAssignee(user.uid)}
                                                                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${isSelected ? 'bg-orange-50 text-orange-600' : 'text-zinc-600 hover:bg-orange-50 hover:text-zinc-950'
                                                                    }`}
                                                            >
                                                                <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center overflow-hidden border border-zinc-200">
                                                                    {user.profile_url ? (
                                                                        <img src={user.profile_url} alt="" className="w-full h-full object-cover" />
                                                                    ) : (
                                                                        <span className="font-bold text-zinc-600">{user.name?.[0]}</span>
                                                                    )}
                                                                </div>
                                                                <div className="flex-1 text-left">
                                                                    <div className="font-medium">{user.name}</div>
                                                                    <div className="text-[10px] opacity-70">{user.email}</div>
                                                                </div>
                                                                {isSelected && <CheckCircle2 className="w-4 h-4" />}
                                                            </button>
                                                        );
                                                    })}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    {/* Due Date */}
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Due Date</label>
                                        <div className="relative">
                                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                                            <input
                                                type="date"
                                                value={formData.due_date}
                                                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                                                className="w-full bg-white border border-zinc-200 rounded-xl pl-10 pr-4 py-3 text-sm text-zinc-950 focus:outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100 transition-all shadow-sm"
                                            />
                                        </div>
                                    </div>

                                    {/* Priority */}
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Priority</label>
                                        <div className="flex bg-zinc-50 border border-zinc-200 rounded-xl p-1 shadow-sm">
                                            {['Low', 'Medium', 'High'].map(p => (
                                                <button
                                                    key={p}
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, priority: p as Task['priority'] })}
                                                    className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all ${formData.priority === p
                                                            ? 'bg-white text-zinc-950 shadow-sm border border-zinc-200'
                                                            : 'text-zinc-500 hover:text-zinc-700'
                                                        }`}
                                                >
                                                    {p}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Visibility */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Visibility</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        {['Private', 'Public'].map(v => (
                                            <button
                                                key={v}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, visibility: v as Task['visibility'] })}
                                                className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl border text-sm font-medium transition-all ${formData.visibility === v
                                                        ? 'bg-orange-50 border-orange-300 text-orange-600'
                                                        : 'bg-white border-zinc-200 text-zinc-600 hover:bg-orange-50 hover:border-orange-200'
                                                    }`}
                                            >
                                                {v === 'Private' ? <Lock className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
                                                {v}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </form>
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-zinc-200 flex items-center justify-end gap-3 bg-zinc-50">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-5 py-2.5 rounded-xl text-xs font-bold text-zinc-600 hover:text-zinc-950 hover:bg-orange-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                form="task-form"
                                disabled={loading}
                                className="px-6 py-2.5 rounded-xl bg-linear-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white text-xs font-bold shadow-lg shadow-orange-500/20 transition-all disabled:opacity-50 flex items-center gap-2"
                            >
                                {loading ? 'Saving...' : initialData ? 'Save Changes' : 'Create Task'}
                                {!loading && <Check className="w-3.5 h-3.5" />}
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
