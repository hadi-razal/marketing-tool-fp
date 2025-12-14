import React, { useState } from 'react';
import { X, User, Briefcase, Building2, Mail, Phone, MapPin, Loader2, Globe, Linkedin, Hash } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface PersonFormData {
    full_name: string;
    first_name?: string;
    last_name?: string;
    title: string;
    headline?: string;
    organization_name: string;
    company?: string;
    email: string;
    phone: string;
    city?: string;
    state?: string;
    country?: string;
    formatted_address?: string;
    location?: string;
    linkedin_url?: string;
    linkedin?: string;
    company_website?: string;
    company_industry?: string;
    photo_url?: string;
    image?: string;
    id?: string;
    created_at?: string;
}

interface CreatePersonModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: PersonFormData) => void;
}

export const CreatePersonModal: React.FC<CreatePersonModalProps> = ({ isOpen, onClose, onSubmit }) => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        full_name: '',
        first_name: '',
        last_name: '',
        title: '',
        headline: '',
        organization_name: '',
        email: '',
        phone: '',
        city: '',
        state: '',
        country: '',
        formatted_address: '',
        linkedin_url: '',
        company_website: '',
        company_industry: '',
        photo_url: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        
        // Split full name into first and last if not provided separately
        const nameParts = formData.full_name.trim().split(' ');
        const firstName = formData.first_name || nameParts[0] || '';
        const lastName = formData.last_name || nameParts.slice(1).join(' ') || '';
        
        // Build location string from city, state, country
        const locationParts = [formData.city, formData.state, formData.country].filter(Boolean);
        const locationString = locationParts.join(', ') || formData.formatted_address;
        
        const personData: PersonFormData = {
            full_name: formData.full_name,
            first_name: firstName,
            last_name: lastName,
            title: formData.title,
            headline: formData.headline,
            organization_name: formData.organization_name,
            company: formData.organization_name, // Alias
            email: formData.email,
            phone: formData.phone,
            city: formData.city,
            state: formData.state,
            country: formData.country,
            formatted_address: locationString,
            location: locationString, // Alias
            linkedin_url: formData.linkedin_url,
            linkedin: formData.linkedin_url, // Alias
            company_website: formData.company_website,
            company_industry: formData.company_industry,
            photo_url: formData.photo_url,
            image: formData.photo_url, // Alias
            id: `person_${Date.now()}`,
            created_at: new Date().toISOString()
        };
        
        onSubmit(personData);
        setLoading(false);
        onClose();
        setFormData({
            full_name: '',
            first_name: '',
            last_name: '',
            title: '',
            headline: '',
            organization_name: '',
            email: '',
            phone: '',
            city: '',
            state: '',
            country: '',
            formatted_address: '',
            linkedin_url: '',
            company_website: '',
            company_industry: '',
            photo_url: ''
        });
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
                            <h2 className="text-lg font-bold text-white">Add New Person</h2>
                            <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-zinc-400 hover:text-white transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto custom-scrollbar max-h-[70vh]">
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Full Name *</label>
                                        <div className="relative">
                                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                                            <input
                                                required
                                                type="text"
                                                value={formData.full_name}
                                                onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                                                className="w-full bg-zinc-900/50 border border-white/5 rounded-xl px-10 py-2.5 text-sm text-white focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 outline-none transition-all placeholder:text-zinc-600"
                                                placeholder="John Doe"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Job Title *</label>
                                            <div className="relative">
                                                <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                                                <input
                                                    required
                                                    type="text"
                                                    value={formData.title}
                                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                                    className="w-full bg-zinc-900/50 border border-white/5 rounded-xl px-10 py-2.5 text-sm text-white focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 outline-none transition-all placeholder:text-zinc-600"
                                                    placeholder="CEO"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Headline</label>
                                            <div className="relative">
                                                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                                                <input
                                                    type="text"
                                                    value={formData.headline}
                                                    onChange={e => setFormData({ ...formData, headline: e.target.value })}
                                                    className="w-full bg-zinc-900/50 border border-white/5 rounded-xl px-10 py-2.5 text-sm text-white focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 outline-none transition-all placeholder:text-zinc-600"
                                                    placeholder="Senior Executive"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Company *</label>
                                            <div className="relative">
                                                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                                                <input
                                                    required
                                                    type="text"
                                                    value={formData.organization_name}
                                                    onChange={e => setFormData({ ...formData, organization_name: e.target.value })}
                                                    className="w-full bg-zinc-900/50 border border-white/5 rounded-xl px-10 py-2.5 text-sm text-white focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 outline-none transition-all placeholder:text-zinc-600"
                                                    placeholder="Acme Inc."
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Company Industry *</label>
                                            <div className="relative">
                                                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                                                <input
                                                    required
                                                    type="text"
                                                    value={formData.company_industry}
                                                    onChange={e => setFormData({ ...formData, company_industry: e.target.value })}
                                                    className="w-full bg-zinc-900/50 border border-white/5 rounded-xl px-10 py-2.5 text-sm text-white focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 outline-none transition-all placeholder:text-zinc-600"
                                                    placeholder="Technology"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Company Website</label>
                                        <div className="relative">
                                            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                                            <input
                                                type="url"
                                                value={formData.company_website}
                                                onChange={e => setFormData({ ...formData, company_website: e.target.value })}
                                                className="w-full bg-zinc-900/50 border border-white/5 rounded-xl px-10 py-2.5 text-sm text-white focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 outline-none transition-all placeholder:text-zinc-600"
                                                placeholder="https://example.com"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Email Address</label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                                            <input
                                                type="email"
                                                value={formData.email}
                                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                                                className="w-full bg-zinc-900/50 border border-white/5 rounded-xl px-10 py-2.5 text-sm text-white focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 outline-none transition-all placeholder:text-zinc-600"
                                                placeholder="john@example.com"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Phone</label>
                                        <div className="relative">
                                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                                            <input
                                                type="tel"
                                                value={formData.phone}
                                                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                                className="w-full bg-zinc-900/50 border border-white/5 rounded-xl px-10 py-2.5 text-sm text-white focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 outline-none transition-all placeholder:text-zinc-600"
                                                placeholder="+1 234 567 890"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-xs font-medium text-zinc-400 mb-1.5 block">LinkedIn URL</label>
                                        <div className="relative">
                                            <Linkedin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                                            <input
                                                type="url"
                                                value={formData.linkedin_url}
                                                onChange={e => setFormData({ ...formData, linkedin_url: e.target.value })}
                                                className="w-full bg-zinc-900/50 border border-white/5 rounded-xl px-10 py-2.5 text-sm text-white focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 outline-none transition-all placeholder:text-zinc-600"
                                                placeholder="https://linkedin.com/in/johndoe"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-3 gap-4">
                                        <div>
                                            <label className="text-xs font-medium text-zinc-400 mb-1.5 block">City</label>
                                            <div className="relative">
                                                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                                                <input
                                                    type="text"
                                                    value={formData.city}
                                                    onChange={e => setFormData({ ...formData, city: e.target.value })}
                                                    className="w-full bg-zinc-900/50 border border-white/5 rounded-xl px-10 py-2.5 text-sm text-white focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 outline-none transition-all placeholder:text-zinc-600"
                                                    placeholder="New York"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-xs font-medium text-zinc-400 mb-1.5 block">State</label>
                                            <div className="relative">
                                                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                                                <input
                                                    type="text"
                                                    value={formData.state}
                                                    onChange={e => setFormData({ ...formData, state: e.target.value })}
                                                    className="w-full bg-zinc-900/50 border border-white/5 rounded-xl px-10 py-2.5 text-sm text-white focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 outline-none transition-all placeholder:text-zinc-600"
                                                    placeholder="NY"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Country</label>
                                            <div className="relative">
                                                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                                                <input
                                                    type="text"
                                                    value={formData.country}
                                                    onChange={e => setFormData({ ...formData, country: e.target.value })}
                                                    className="w-full bg-zinc-900/50 border border-white/5 rounded-xl px-10 py-2.5 text-sm text-white focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 outline-none transition-all placeholder:text-zinc-600"
                                                    placeholder="USA"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Photo URL</label>
                                        <div className="relative">
                                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                                            <input
                                                type="url"
                                                value={formData.photo_url}
                                                onChange={e => setFormData({ ...formData, photo_url: e.target.value })}
                                                className="w-full bg-zinc-900/50 border border-white/5 rounded-xl px-10 py-2.5 text-sm text-white focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 outline-none transition-all placeholder:text-zinc-600"
                                                placeholder="https://example.com/photo.jpg"
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
                                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Person'}
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
