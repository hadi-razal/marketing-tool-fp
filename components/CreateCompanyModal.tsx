import React, { useState } from 'react';
import { X, Building2, Globe, MapPin, Users, FileText, Loader2, DollarSign, Calendar, Phone, Linkedin, Twitter, Facebook, Hash, CheckCircle2 } from 'lucide-react';
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
        logo: '',
        revenue: '',
        founded_year: '',
        phone: '',
        linkedin: '',
        twitter: '',
        facebook: '',
        keywords: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        onSubmit({ ...formData, id: `company_${Date.now()}` });
        setLoading(false);
        onClose();
        setFormData({
            name: '', industry: '', website: '', location: '', size: '', description: '', logo: '',
            revenue: '', founded_year: '', phone: '', linkedin: '', twitter: '', facebook: '', keywords: ''
        });
    };

    const InputField = ({ label, icon: Icon, value, onChange, placeholder, type = "text", required = false, className = "" }: any) => (
        <div className={`space-y-1.5 ${className}`}>
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1">{label} {required && <span className="text-red-500">*</span>}</label>
            <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Icon className="h-4 w-4 text-zinc-500 group-focus-within:text-indigo-500 transition-colors" />
                </div>
                <input
                    type={type}
                    required={required}
                    value={value}
                    onChange={onChange}
                    className="block w-full pl-10 pr-3 py-2.5 bg-zinc-900/50 border border-white/10 rounded-xl text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all hover:bg-white/5"
                    placeholder={placeholder}
                />
            </div>
        </div>
    );

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="fixed inset-0 m-auto w-full max-w-2xl h-fit max-h-[90vh] bg-[#09090b] border border-white/10 rounded-3xl shadow-2xl z-50 flex flex-col overflow-hidden"
                    >
                        {/* Header */}
                        <div className="relative h-32 shrink-0 overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/40 via-[#09090b] to-[#09090b]" />
                            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />

                            <div className="relative z-10 p-6 flex justify-between items-start">
                                <div>
                                    <h2 className="text-2xl font-bold text-white tracking-tight mb-1">Add New Company</h2>
                                    <p className="text-zinc-400 text-sm">Enter the details to add a new company to the database.</p>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="p-2 bg-black/20 hover:bg-white/10 rounded-full text-white/70 hover:text-white transition-colors border border-white/5 backdrop-blur-md"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 -mt-4 relative z-20">
                            <form onSubmit={handleSubmit} className="space-y-8">
                                {/* Basic Info Section */}
                                <section className="space-y-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                                            <Building2 className="w-4 h-4 text-indigo-400" />
                                        </div>
                                        <h3 className="text-sm font-bold text-white">Company Information</h3>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <InputField
                                            label="Company Name"
                                            icon={Building2}
                                            value={formData.name}
                                            onChange={(e: any) => setFormData({ ...formData, name: e.target.value })}
                                            placeholder="Acme Inc."
                                            required
                                            className="md:col-span-2"
                                        />
                                        <InputField
                                            label="Industry"
                                            icon={Hash}
                                            value={formData.industry}
                                            onChange={(e: any) => setFormData({ ...formData, industry: e.target.value })}
                                            placeholder="Technology, SaaS..."
                                            required
                                        />
                                        <InputField
                                            label="Website"
                                            icon={Globe}
                                            value={formData.website}
                                            onChange={(e: any) => setFormData({ ...formData, website: e.target.value })}
                                            placeholder="https://example.com"
                                            type="url"
                                        />
                                    </div>
                                </section>

                                {/* Details Section */}
                                <section className="space-y-4 pt-4 border-t border-white/5">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                                            <FileText className="w-4 h-4 text-emerald-400" />
                                        </div>
                                        <h3 className="text-sm font-bold text-white">Key Details</h3>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <InputField
                                            label="Location"
                                            icon={MapPin}
                                            value={formData.location}
                                            onChange={(e: any) => setFormData({ ...formData, location: e.target.value })}
                                            placeholder="San Francisco, CA"
                                        />

                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1">Company Size</label>
                                            <div className="relative group">
                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                    <Users className="h-4 w-4 text-zinc-500 group-focus-within:text-indigo-500 transition-colors" />
                                                </div>
                                                <select
                                                    value={formData.size}
                                                    onChange={e => setFormData({ ...formData, size: e.target.value })}
                                                    className="block w-full pl-10 pr-3 py-2.5 bg-zinc-900/50 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all hover:bg-white/5 appearance-none"
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

                                        <InputField
                                            label="Revenue"
                                            icon={DollarSign}
                                            value={formData.revenue}
                                            onChange={(e: any) => setFormData({ ...formData, revenue: e.target.value })}
                                            placeholder="$1M - $10M"
                                        />
                                        <InputField
                                            label="Founded Year"
                                            icon={Calendar}
                                            value={formData.founded_year}
                                            onChange={(e: any) => setFormData({ ...formData, founded_year: e.target.value })}
                                            placeholder="2020"
                                            type="number"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1">Description</label>
                                        <textarea
                                            rows={3}
                                            value={formData.description}
                                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                                            className="block w-full p-3 bg-zinc-900/50 border border-white/10 rounded-xl text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all hover:bg-white/5 resize-none"
                                            placeholder="Brief description of the company..."
                                        />
                                    </div>
                                </section>

                                {/* Socials Section */}
                                <section className="space-y-4 pt-4 border-t border-white/5">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                                            <Globe className="w-4 h-4 text-blue-400" />
                                        </div>
                                        <h3 className="text-sm font-bold text-white">Social Profiles</h3>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <InputField
                                            label="LinkedIn"
                                            icon={Linkedin}
                                            value={formData.linkedin}
                                            onChange={(e: any) => setFormData({ ...formData, linkedin: e.target.value })}
                                            placeholder="LinkedIn URL"
                                            type="url"
                                        />
                                        <InputField
                                            label="Twitter"
                                            icon={Twitter}
                                            value={formData.twitter}
                                            onChange={(e: any) => setFormData({ ...formData, twitter: e.target.value })}
                                            placeholder="Twitter URL"
                                            type="url"
                                        />
                                        <InputField
                                            label="Facebook"
                                            icon={Facebook}
                                            value={formData.facebook}
                                            onChange={(e: any) => setFormData({ ...formData, facebook: e.target.value })}
                                            placeholder="Facebook URL"
                                            type="url"
                                        />
                                    </div>

                                    <InputField
                                        label="Keywords"
                                        icon={Hash}
                                        value={formData.keywords}
                                        onChange={(e: any) => setFormData({ ...formData, keywords: e.target.value })}
                                        placeholder="SaaS, B2B, Marketing, AI (comma separated)"
                                    />
                                </section>

                                {/* Footer Actions */}
                                <div className="pt-6 border-t border-white/5 flex justify-end gap-3 sticky bottom-0 bg-[#09090b] pb-2">
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="px-5 py-2.5 rounded-xl text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="bg-white hover:bg-zinc-200 text-black px-8 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-white/5"
                                    >
                                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                        {loading ? 'Creating...' : 'Create Company'}
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
