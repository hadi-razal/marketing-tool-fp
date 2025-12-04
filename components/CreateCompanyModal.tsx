import React, { useState } from 'react';
import { X, Building2, Globe, MapPin, Users, FileText, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface CreateCompanyModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: any) => void;
}

export const CreateCompanyModal: React.FC<CreateCompanyModalProps> = ({ isOpen, onClose, onSubmit }) => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        industry: '',
        website: '',
        location: '',
        size: '',
        description: '',
        logo: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        onSubmit({ ...formData, id: `company_${Date.now()}` });
        setLoading(false);
        onClose();
        setFormData({ name: '', industry: '', website: '', location: '', size: '', description: '', logo: '' });
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
                        className="fixed inset-0 m-auto w-full max-w-lg h-fit max-h-[90vh] bg-[#09090b] border border-white/10 rounded-3xl shadow-2xl z-50 flex flex-col overflow-hidden"
                    >
                        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-zinc-900/50">
                            <h2 className="text-lg font-bold text-white">Add New Company</h2>
                            <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-zinc-400 hover:text-white transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto custom-scrollbar">
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Company Name</label>
                                        <div className="relative">
                                            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                                            <input
                                                required
                                                type="text"
                                                value={formData.name}
                                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                                className="w-full bg-zinc-900/50 border border-white/5 rounded-xl px-10 py-2.5 text-sm text-white focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 outline-none transition-all placeholder:text-zinc-600"
                                                placeholder="Acme Inc."
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Industry</label>
                                            <div className="relative">
                                                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                                                <input
                                                    required
                                                    type="text"
                                                    value={formData.industry}
                                                    onChange={e => setFormData({ ...formData, industry: e.target.value })}
                                                    className="w-full bg-zinc-900/50 border border-white/5 rounded-xl px-10 py-2.5 text-sm text-white focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 outline-none transition-all placeholder:text-zinc-600"
                                                    placeholder="Technology"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Website</label>
                                            <div className="relative">
                                                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                                                <input
                                                    type="url"
                                                    value={formData.website}
                                                    onChange={e => setFormData({ ...formData, website: e.target.value })}
                                                    className="w-full bg-zinc-900/50 border border-white/5 rounded-xl px-10 py-2.5 text-sm text-white focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 outline-none transition-all placeholder:text-zinc-600"
                                                    placeholder="https://example.com"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Location</label>
                                            <div className="relative">
                                                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                                                <input
                                                    type="text"
                                                    value={formData.location}
                                                    onChange={e => setFormData({ ...formData, location: e.target.value })}
                                                    className="w-full bg-zinc-900/50 border border-white/5 rounded-xl px-10 py-2.5 text-sm text-white focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 outline-none transition-all placeholder:text-zinc-600"
                                                    placeholder="San Francisco, CA"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Company Size</label>
                                            <div className="relative">
                                                <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                                                <select
                                                    value={formData.size}
                                                    onChange={e => setFormData({ ...formData, size: e.target.value })}
                                                    className="w-full bg-zinc-900/50 border border-white/5 rounded-xl px-10 py-2.5 text-sm text-white focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 outline-none transition-all appearance-none"
                                                >
                                                    <option value="" className="bg-zinc-900 text-zinc-500">Select Size</option>
                                                    <option value="1-10" className="bg-zinc-900">1-10 employees</option>
                                                    <option value="11-50" className="bg-zinc-900">11-50 employees</option>
                                                    <option value="51-200" className="bg-zinc-900">51-200 employees</option>
                                                    <option value="201-500" className="bg-zinc-900">201-500 employees</option>
                                                    <option value="500+" className="bg-zinc-900">500+ employees</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Description</label>
                                        <div className="relative">
                                            <FileText className="absolute left-3 top-3 w-4 h-4 text-zinc-500" />
                                            <textarea
                                                rows={3}
                                                value={formData.description}
                                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                                className="w-full bg-zinc-900/50 border border-white/5 rounded-xl px-10 py-2.5 text-sm text-white focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 outline-none transition-all placeholder:text-zinc-600 resize-none"
                                                placeholder="Brief description of the company..."
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4 flex justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="px-4 py-2 rounded-xl text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="bg-white hover:bg-zinc-200 text-black px-6 py-2 rounded-xl text-sm font-bold transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Company'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
