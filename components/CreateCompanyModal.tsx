import React, { useState } from 'react';
import { X, Building2, Globe, MapPin, Users, FileText, Loader2, DollarSign, Calendar, Linkedin, Twitter, Facebook, Hash, CheckCircle2, LucideIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface CompanyFormData {
    name: string;
    industry: string;
    website: string;
    location: string;
    size: string;
    description: string;
    logo: string;
    revenue: string;
    founded_year: string;
    phone: string;
    linkedin: string;
    twitter: string;
    facebook: string;
    keywords: string;
    id?: string;
}

interface CreateCompanyModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: CompanyFormData) => void;
}

interface InputFieldProps {
    label: string;
    icon: LucideIcon;
    value: string | number;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder?: string;
    type?: string;
    required?: boolean;
    className?: string;
}

const InputField: React.FC<InputFieldProps> = ({
    label,
    icon: Icon,
    value,
    onChange,
    placeholder,
    type = 'text',
    required = false,
    className = '',
}) => (
    <div className={`space-y-1.5 ${className}`}>
        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1">
            {label} {required && <span className="text-red-500">*</span>}
        </label>
        <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Icon className="h-4 w-4 text-zinc-400 group-focus-within:text-orange-500 transition-colors" />
            </div>
            <input
                type={type}
                required={required}
                value={value}
                onChange={onChange}
                className="block w-full pl-10 pr-3 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm text-zinc-950 placeholder:text-zinc-400 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-500/20 transition-all hover:border-zinc-300"
                placeholder={placeholder}
            />
        </div>
    </div>
);

export const CreateCompanyModal: React.FC<CreateCompanyModalProps> = ({ isOpen, onClose, onSubmit }) => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState<CompanyFormData>({
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
        keywords: '',
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        await new Promise((resolve) => setTimeout(resolve, 1000));
        onSubmit({ ...formData, id: `company_${Date.now()}` });
        setLoading(false);
        onClose();
        setFormData({
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
            keywords: '',
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
                        className="fixed inset-0 bg-zinc-950/45 backdrop-blur-sm z-150"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        onClick={(e) => e.stopPropagation()}
                        className="fixed inset-0 m-auto w-full max-w-2xl h-fit max-h-[90vh] bg-white border border-zinc-200 rounded-3xl shadow-2xl shadow-zinc-950/20 z-150 flex flex-col overflow-hidden"
                    >
                        <div
                            className="relative h-32 shrink-0 overflow-hidden border-b border-zinc-200"
                            style={{
                                background:
                                    'linear-gradient(135deg, #ffffff 0%, #fafafa 45%, rgba(249, 115, 22, 0.08) 100%)',
                            }}
                        >
                            <div className="relative z-10 p-6 flex justify-between items-start">
                                <div>
                                    <h2 className="text-2xl font-bold text-zinc-950 tracking-tight mb-1">Add New Company</h2>
                                    <p className="text-zinc-600 text-sm">
                                        Enter the details to add a new company to the database.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="p-2 bg-zinc-100 hover:bg-orange-50 rounded-full text-zinc-500 hover:text-zinc-950 transition-colors border border-zinc-200"
                                    aria-label="Close"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 relative z-20 bg-white">
                            <form onSubmit={handleSubmit} className="space-y-8">
                                <section className="space-y-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center border border-orange-200">
                                            <Building2 className="w-4 h-4 text-orange-600" />
                                        </div>
                                        <h3 className="text-sm font-bold text-zinc-950">Company Information</h3>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <InputField
                                            label="Company Name"
                                            icon={Building2}
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            placeholder="Acme Inc."
                                            required
                                            className="md:col-span-2"
                                        />
                                        <InputField
                                            label="Industry"
                                            icon={Hash}
                                            value={formData.industry}
                                            onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                                            placeholder="Technology, SaaS..."
                                            required
                                        />
                                        <InputField
                                            label="Website"
                                            icon={Globe}
                                            value={formData.website}
                                            onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                                            placeholder="https://example.com"
                                            type="url"
                                        />
                                    </div>
                                </section>

                                <section className="space-y-4 pt-4 border-t border-zinc-200">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center border border-zinc-200">
                                            <FileText className="w-4 h-4 text-zinc-600" />
                                        </div>
                                        <h3 className="text-sm font-bold text-zinc-950">Key Details</h3>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <InputField
                                            label="Location"
                                            icon={MapPin}
                                            value={formData.location}
                                            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                            placeholder="San Francisco, CA"
                                        />

                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1">
                                                Company Size
                                            </label>
                                            <div className="relative group">
                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                    <Users className="h-4 w-4 text-zinc-400 group-focus-within:text-orange-500 transition-colors" />
                                                </div>
                                                <select
                                                    value={formData.size}
                                                    onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                                                    className="block w-full pl-10 pr-3 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm text-zinc-950 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-500/20 transition-all hover:border-zinc-300 appearance-none cursor-pointer"
                                                >
                                                    <option value="">Select size</option>
                                                    <option value="1-10">1–10 employees</option>
                                                    <option value="11-50">11–50 employees</option>
                                                    <option value="51-200">51–200 employees</option>
                                                    <option value="201-500">201–500 employees</option>
                                                    <option value="500+">500+ employees</option>
                                                </select>
                                            </div>
                                        </div>

                                        <InputField
                                            label="Revenue"
                                            icon={DollarSign}
                                            value={formData.revenue}
                                            onChange={(e) => setFormData({ ...formData, revenue: e.target.value })}
                                            placeholder="$1M - $10M"
                                        />
                                        <InputField
                                            label="Founded Year"
                                            icon={Calendar}
                                            value={formData.founded_year}
                                            onChange={(e) => setFormData({ ...formData, founded_year: e.target.value })}
                                            placeholder="2020"
                                            type="number"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1">
                                            Description
                                        </label>
                                        <textarea
                                            rows={3}
                                            value={formData.description}
                                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                            className="block w-full p-3 bg-white border border-zinc-200 rounded-xl text-sm text-zinc-950 placeholder:text-zinc-400 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-500/20 transition-all hover:border-zinc-300 resize-none"
                                            placeholder="Brief description of the company..."
                                        />
                                    </div>
                                </section>

                                <section className="space-y-4 pt-4 border-t border-zinc-200">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center border border-blue-200">
                                            <Globe className="w-4 h-4 text-blue-600" />
                                        </div>
                                        <h3 className="text-sm font-bold text-zinc-950">Social Profiles</h3>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <InputField
                                            label="LinkedIn"
                                            icon={Linkedin}
                                            value={formData.linkedin}
                                            onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })}
                                            placeholder="LinkedIn URL"
                                            type="url"
                                        />
                                        <InputField
                                            label="Twitter"
                                            icon={Twitter}
                                            value={formData.twitter}
                                            onChange={(e) => setFormData({ ...formData, twitter: e.target.value })}
                                            placeholder="Twitter URL"
                                            type="url"
                                        />
                                        <InputField
                                            label="Facebook"
                                            icon={Facebook}
                                            value={formData.facebook}
                                            onChange={(e) => setFormData({ ...formData, facebook: e.target.value })}
                                            placeholder="Facebook URL"
                                            type="url"
                                        />
                                    </div>

                                    <InputField
                                        label="Keywords"
                                        icon={Hash}
                                        value={formData.keywords}
                                        onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                                        placeholder="SaaS, B2B, Marketing, AI (comma separated)"
                                    />
                                </section>

                                <div className="pt-6 border-t border-zinc-200 flex justify-end gap-3 sticky bottom-0 bg-white pb-2">
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="px-5 py-2.5 rounded-xl text-sm font-medium text-zinc-600 hover:text-zinc-950 hover:bg-orange-50 border border-transparent hover:border-orange-200 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="bg-zinc-950 hover:bg-zinc-800 text-white px-8 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-zinc-950/20"
                                    >
                                        {loading ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <CheckCircle2 className="w-4 h-4" />
                                        )}
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
