import React, { useState, useEffect } from 'react';
import { X, Calendar, Flag, Globe, Lock, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Task } from '@/types/task';
import { Button } from '../ui/Button';

interface TaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (task: Partial<Task>) => Promise<void>;
    initialData?: Task | null;
}

export const TaskModal = ({ isOpen, onClose, onSave, initialData }: TaskModalProps) => {
    const [formData, setFormData] = useState<Partial<Task>>({
        title: '',
        description: '',
        due_date: '',
        priority: 'Medium',
        status: 'Pending',
        visibility: 'Private',
        related_to: ''
    });
    const [loading, setLoading] = useState(false);

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
                related_to: ''
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

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden"
                    >
                        <div className="p-6 border-b border-white/5 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-white">
                                {initialData ? 'Edit Task' : 'New Task'}
                            </h2>
                            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-white transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            {/* Title */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-zinc-400">Task Title</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 transition-all placeholder:text-zinc-600"
                                    placeholder="e.g., Review Q4 Marketing Plan"
                                />
                            </div>

                            {/* Description */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-zinc-400">Description</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 transition-all placeholder:text-zinc-600 min-h-[100px] resize-none"
                                    placeholder="Add details about this task..."
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {/* Due Date */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-zinc-400">Due Date</label>
                                    <div className="relative">
                                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                                        <input
                                            type="date"
                                            value={formData.due_date}
                                            onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                                            className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 transition-all [color-scheme:dark]"
                                        />
                                    </div>
                                </div>

                                {/* Related To */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-zinc-400">Related To</label>
                                    <input
                                        type="text"
                                        value={formData.related_to}
                                        onChange={(e) => setFormData({ ...formData, related_to: e.target.value })}
                                        className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 transition-all placeholder:text-zinc-600"
                                        placeholder="e.g., Tech Expo"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {/* Priority */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-zinc-400">Priority</label>
                                    <div className="flex gap-2">
                                        {(['Low', 'Medium', 'High'] as const).map((p) => (
                                            <button
                                                key={p}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, priority: p })}
                                                className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-all ${formData.priority === p
                                                    ? p === 'High' ? 'bg-red-500/20 border-red-500 text-red-500'
                                                        : p === 'Medium' ? 'bg-yellow-500/20 border-yellow-500 text-yellow-500'
                                                            : 'bg-blue-500/20 border-blue-500 text-blue-500'
                                                    : 'bg-white/5 border-white/10 text-zinc-400 hover:bg-white/10'
                                                    }`}
                                            >
                                                {p}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Visibility */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-zinc-400">Visibility</label>
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, visibility: 'Private' })}
                                            className={`flex-1 py-2 rounded-lg text-xs font-medium border flex items-center justify-center gap-2 transition-all ${formData.visibility === 'Private'
                                                ? 'bg-zinc-700/50 border-zinc-500 text-white'
                                                : 'bg-white/5 border-white/10 text-zinc-400 hover:bg-white/10'
                                                }`}
                                        >
                                            <Lock className="w-3 h-3" /> Private
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, visibility: 'Public' })}
                                            className={`flex-1 py-2 rounded-lg text-xs font-medium border flex items-center justify-center gap-2 transition-all ${formData.visibility === 'Public'
                                                ? 'bg-green-500/20 border-green-500 text-green-500'
                                                : 'bg-white/5 border-white/10 text-zinc-400 hover:bg-white/10'
                                                }`}
                                        >
                                            <Globe className="w-3 h-3" /> Public
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 flex justify-end gap-3">
                                <Button variant="secondary" onClick={onClose} type="button">
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    isLoading={loading}
                                    className="bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white border-0"
                                >
                                    {initialData ? 'Update Task' : 'Create Task'}
                                </Button>
                            </div>
                        </form>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
