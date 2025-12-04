import React, { useState } from 'react';
import { X, Globe, Linkedin, Twitter, Facebook, MapPin, Users, Calendar, DollarSign, Phone, Building2, ExternalLink, Save, CheckCircle2, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Company } from './CompanyCard';

interface CompanyDetailsModalProps {
    company: Company | null;
    isOpen: boolean;
    onClose: () => void;
    onSave?: (company: Company) => Promise<void>; // Async save handler
}

export const CompanyDetailsModal: React.FC<CompanyDetailsModalProps> = ({ company, isOpen, onClose, onSave }) => {
    const [isSaving, setIsSaving] = useState(false);

    if (!company) return null;

    const handleSave = async () => {
        if (onSave && !company.isSaved) {
            setIsSaving(true);
            await onSave(company);
            setIsSaving(false);
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
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="fixed inset-0 m-auto w-full max-w-4xl h-[90vh] bg-[#09090b] border border-white/10 rounded-3xl shadow-2xl z-50 overflow-hidden flex flex-col"
                    >
                        {/* Hero Header */}
                        <div className="relative h-64 bg-gradient-to-br from-zinc-900 via-black to-blue-950/20 border-b border-white/5 shrink-0">
                            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />

                            {/* Close Button */}
                            <button
                                onClick={onClose}
                                className="absolute top-6 right-6 p-2 bg-black/50 hover:bg-white/10 rounded-full text-white/70 hover:text-white transition-colors border border-white/5 backdrop-blur-md z-20"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            {/* Content Container */}
                            <div className="absolute bottom-0 left-0 w-full p-8 flex items-end gap-8 bg-gradient-to-t from-[#09090b] to-transparent">
                                <div className="w-32 h-32 rounded-2xl bg-white p-3 border-4 border-[#09090b] shadow-2xl flex items-center justify-center overflow-hidden shrink-0 relative z-10">
                                    {company.logo ? (
                                        <img src={company.logo} alt={company.name} className="w-full h-full object-contain" />
                                    ) : (
                                        <Building2 className="w-16 h-16 text-zinc-400" />
                                    )}
                                </div>
                                <div className="mb-2 flex-1">
                                    <div className="flex items-center gap-4 mb-2">
                                        <h2 className="text-4xl font-bold text-white tracking-tight">{company.name}</h2>
                                        {company.isSaved && (
                                            <span className="bg-green-500/10 border border-green-500/20 text-green-500 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5">
                                                <CheckCircle2 className="w-3.5 h-3.5" /> Saved
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex flex-wrap items-center gap-4 text-sm">
                                        {company.industry && (
                                            <span className="px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 font-medium">
                                                {company.industry}
                                            </span>
                                        )}
                                        {company.location && (
                                            <span className="flex items-center gap-1.5 text-zinc-400">
                                                <MapPin className="w-4 h-4 text-zinc-500" /> {company.location}
                                            </span>
                                        )}
                                        {company.founded_year && (
                                            <span className="flex items-center gap-1.5 text-zinc-400">
                                                <Calendar className="w-4 h-4 text-zinc-500" /> Est. {company.founded_year}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Save Button */}
                                {onSave && (
                                    <button
                                        onClick={handleSave}
                                        disabled={company.isSaved || isSaving}
                                        className={`px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-all shadow-lg mb-2 ${company.isSaved
                                                ? 'bg-zinc-800 text-zinc-500 cursor-default border border-white/5'
                                                : 'bg-white hover:bg-zinc-200 text-black shadow-white/10 active:scale-95'
                                            }`}
                                    >
                                        {isSaving ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : company.isSaved ? (
                                            <CheckCircle2 className="w-4 h-4" />
                                        ) : (
                                            <Save className="w-4 h-4" />
                                        )}
                                        {isSaving ? 'Saving...' : company.isSaved ? 'Saved to Database' : 'Save Company'}
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Scrollable Content */}
                        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-[#09090b]">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                                {/* Main Info Column */}
                                <div className="lg:col-span-2 space-y-10">
                                    <section>
                                        <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                                            <span className="w-8 h-[1px] bg-zinc-800"></span> About
                                        </h3>
                                        <p className="text-zinc-300 leading-relaxed text-base">
                                            {company.description || 'No description available for this company.'}
                                        </p>
                                    </section>

                                    {company.keywords && company.keywords.length > 0 && (
                                        <section>
                                            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                                                <span className="w-8 h-[1px] bg-zinc-800"></span> Keywords
                                            </h3>
                                            <div className="flex flex-wrap gap-2">
                                                {company.keywords.map((keyword, idx) => (
                                                    <span key={idx} className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 text-zinc-400 text-sm hover:bg-white/10 transition-colors cursor-default">
                                                        {keyword}
                                                    </span>
                                                ))}
                                            </div>
                                        </section>
                                    )}
                                </div>

                                {/* Sidebar Info Column */}
                                <div className="space-y-6">
                                    <div className="bg-zinc-900/50 rounded-2xl p-6 border border-white/5 space-y-5">
                                        <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Company Details</h3>

                                        {company.website && (
                                            <a href={company.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-sm text-zinc-300 hover:text-blue-400 transition-colors group p-2 hover:bg-white/5 rounded-lg -mx-2">
                                                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center border border-white/5 group-hover:border-blue-500/30 transition-colors">
                                                    <Globe className="w-4 h-4 text-zinc-500 group-hover:text-blue-400" />
                                                </div>
                                                <span className="truncate flex-1">Website</span>
                                                <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </a>
                                        )}

                                        {company.employees && (
                                            <div className="flex items-center gap-3 text-sm text-zinc-300 p-2 -mx-2">
                                                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center border border-white/5">
                                                    <Users className="w-4 h-4 text-zinc-500" />
                                                </div>
                                                <span>{company.employees.toLocaleString()} Employees</span>
                                            </div>
                                        )}

                                        {company.revenue && (
                                            <div className="flex items-center gap-3 text-sm text-zinc-300 p-2 -mx-2">
                                                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center border border-white/5">
                                                    <DollarSign className="w-4 h-4 text-zinc-500" />
                                                </div>
                                                <span>{company.revenue} Revenue</span>
                                            </div>
                                        )}

                                        {company.phone && (
                                            <div className="flex items-center gap-3 text-sm text-zinc-300 p-2 -mx-2">
                                                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center border border-white/5">
                                                    <Phone className="w-4 h-4 text-zinc-500" />
                                                </div>
                                                <span>{company.phone}</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="bg-zinc-900/50 rounded-2xl p-6 border border-white/5">
                                        <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-4">Social Profiles</h3>
                                        <div className="flex gap-3">
                                            {company.linkedin && (
                                                <a href={company.linkedin} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-xl bg-[#0077b5]/10 border border-[#0077b5]/20 flex items-center justify-center text-[#0077b5] hover:bg-[#0077b5] hover:text-white transition-all duration-300">
                                                    <Linkedin className="w-5 h-5" />
                                                </a>
                                            )}
                                            {company.twitter && (
                                                <a href={company.twitter} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-xl bg-[#1da1f2]/10 border border-[#1da1f2]/20 flex items-center justify-center text-[#1da1f2] hover:bg-[#1da1f2] hover:text-white transition-all duration-300">
                                                    <Twitter className="w-5 h-5" />
                                                </a>
                                            )}
                                            {company.facebook && (
                                                <a href={company.facebook} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-xl bg-[#1877f2]/10 border border-[#1877f2]/20 flex items-center justify-center text-[#1877f2] hover:bg-[#1877f2] hover:text-white transition-all duration-300">
                                                    <Facebook className="w-5 h-5" />
                                                </a>
                                            )}
                                            {!company.linkedin && !company.twitter && !company.facebook && (
                                                <span className="text-zinc-500 text-sm italic">No social profiles found.</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
