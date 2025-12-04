import React, { useState, useEffect } from 'react';
import { X, Calendar, Flag, Globe, Lock, AlertCircle, Check, Layout, Type, AlignLeft } from 'lucide-react';
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
                        className="fixed inset-0 bg-black/80 backdrop-blur-md z-50"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
                        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-[#09090b] border border-white/10 rounded-md shadow-2xl z-50 overflow-hidden flex flex-col max-h-[90vh]"
                    >
                        {/* Header */}
                        <div className="p-8 pb-6 border-b border-white/5 flex items-center justify-between bg-gradient-to-b from-white/5 to-transparent">
                            <div>
                                <h2 className="text-2xl font-bold text-white mb-1">
                                    {initialData ? 'Edit Task' : 'New Task'}
                                </h2>
                                <p className="text-sm text-zinc-400">
                                    {initialData ? 'Update the details of your task below.' : 'Create a new task to track your progress.'}
                                </p>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2.5 hover:bg-white/10 rounded-full text-zinc-400 hover:text-white transition-all hover:rotate-90 duration-300 border border-transparent hover:border-white/10"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Scrollable Content */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-8 pt-6">
                            <form id="task-form" onSubmit={handleSubmit} className="space-y-8">
                                {/* Main Info Section */}
                                <div className="space-y-6">
                                    {/* Title */}
                                    <div className="space-y-3">
                                        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                                            <Type className="w-3.5 h-3.5" />
                                            Task Title
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.title}
                                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                            className="w-full bg-zinc-900/50 border border-white/10 rounded-2xl px-5 py-4 text-lg text-white focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 transition-all placeholder:text-zinc-700 hover:border-white/20"
                                            placeholder="What needs to be done?"
                                        />
                                    </div>

                                    {/* Description */}
                                    <div className="space-y-3">
                                        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                                            <AlignLeft className="w-3.5 h-3.5" />
                                            Description
                                        </label>
                                        <textarea
                                            value={formData.description}
                                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                            className="w-full bg-zinc-900/50 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 transition-all placeholder:text-zinc-700 min-h-[120px] resize-none hover:border-white/20 leading-relaxed"
                                            placeholder="Add more details about this task..."
                                        />
                                    </div>
                                </div>

                                <div className="h-px bg-white/5" />

                                {/* Details Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {/* Left Column */}
                                    <div className="space-y-6">
                                        {/* Due Date */}
                                        <div className="space-y-3">
                                            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                                                <Calendar className="w-3.5 h-3.5" />
                                                Due Date
                                            </label>
                                            <div className="relative group">
                                                <input
                                                    type="date"
                                                    value={formData.due_date}
                                                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                                                    className="w-full bg-zinc-900/50 border border-white/10 rounded-md px-4 py-3 text-white focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 transition-all [color-scheme:dark] hover:border-white/20"
                                                />
                                            </div>
                                        </div>

                                        {/* Related To */}
                                        <div className="space-y-3">
                                            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                                                <Layout className="w-3.5 h-3.5" />
                                                Related To
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.related_to}
                                                onChange={(e) => setFormData({ ...formData, related_to: e.target.value })}
                                                className="w-full bg-zinc-900/50 border border-white/10 rounded-md px-4 py-3 text-white focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 transition-all placeholder:text-zinc-700 hover:border-white/20"
                                                placeholder="e.g., Project X"
                                            />
                                        </div>
                                    </div>

                                    {/* Right Column */}
                                    <div className="space-y-6">
                                        {/* Priority */}
                                        <div className="space-y-3">
                                            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                                                <Flag className="w-3.5 h-3.5" />
                                                Priority
                                            </label>
                                            <div className="grid grid-cols-3 gap-2">
                                                {(['Low', 'Medium', 'High'] as const).map((p) => (
                                                    <button
                                                        key={p}
                                                        type="button"
                                                        onClick={() => setFormData({ ...formData, priority: p })}
                                                        className={`relative py-2.5 rounded-md text-xs font-medium border transition-all duration-300 overflow-hidden group ${formData.priority === p
                                                            ? p === 'High' ? 'bg-red-500/10 border-red-500/50 text-red-400'
                                                                : p === 'Medium' ? 'bg-yellow-500/10 border-yellow-500/50 text-yellow-400'
                                                                    : 'bg-blue-500/10 border-blue-500/50 text-blue-400'
                                                            : 'bg-zinc-900/50 border-white/5 text-zinc-500 hover:bg-white/5 hover:text-zinc-300'
                                                            }`}
                                                    >
                                                        <span className="relative z-10">{p}</span>
                                                        {formData.priority === p && (
                                                            <motion.div
                                                                layoutId="priority-glow"
                                                                className={`absolute inset-0 opacity-20 ${p === 'High' ? 'bg-red-500' : p === 'Medium' ? 'bg-yellow-500' : 'bg-blue-500'
                                                                    }`}
                                                            />
                                                        )}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Visibility */}
                                        <div className="space-y-3">
                                            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                                                <Globe className="w-3.5 h-3.5" />
                                                Visibility
                                            </label>
                                            <div className="grid grid-cols-2 gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, visibility: 'Private' })}
                                                    className={`relative py-2.5 rounded-md text-xs font-medium border flex items-center justify-center gap-2 transition-all duration-300 ${formData.visibility === 'Private'
                                                        ? 'bg-zinc-800 border-zinc-600 text-white shadow-lg shadow-black/20'
                                                        : 'bg-zinc-900/50 border-white/5 text-zinc-500 hover:bg-white/5 hover:text-zinc-300'
                                                        }`}
                                                >
                                                    <Lock className="w-3.5 h-3.5" /> Private
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, visibility: 'Public' })}
                                                    className={`relative py-2.5 rounded-md text-xs font-medium border flex items-center justify-center gap-2 transition-all duration-300 ${formData.visibility === 'Public'
                                                        ? 'bg-green-500/10 border-green-500/50 text-green-400 shadow-lg shadow-green-900/20'
                                                        : 'bg-zinc-900/50 border-white/5 text-zinc-500 hover:bg-white/5 hover:text-zinc-300'
                                                        }`}
                                                >
                                                    <Globe className="w-3.5 h-3.5" /> Public
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </form>
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-white/5 bg-zinc-900/50 backdrop-blur-xl flex justify-end gap-3">
                            <Button
                                variant="secondary"
                                onClick={onClose}
                                type="button"
                                className="glass-button border-white/10 hover:border-white/20 text-zinc-400 hover:text-white px-6"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={() => document.getElementById('task-form')?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))}
                                isLoading={loading}
                                className="bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white border-0 shadow-lg shadow-orange-500/20 px-8"
                            >
                                {initialData ? 'Save Changes' : 'Create Task'}
                            </Button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
