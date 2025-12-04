import React from 'react';
import { Building2, MapPin, ArrowUpRight, Calendar } from 'lucide-react';
import Link from 'next/link';

interface RecentlySavedProps {
    companies: any[];
}

export const RecentlySaved: React.FC<RecentlySavedProps> = ({ companies }) => {
    return (
        <div className="bg-[#09090b] border border-white/5 p-6 rounded-[32px] h-full flex flex-col">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-white">Recently Saved</h3>
                <Link href="/database" className="text-xs font-bold bg-white/5 text-zinc-400 px-2 py-1 rounded-lg hover:bg-white/10 transition-colors">
                    View All
                </Link>
            </div>

            {companies.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center text-zinc-500 py-8">
                    <Building2 className="w-8 h-8 mb-2 opacity-50" />
                    <p className="text-sm">No companies saved yet.</p>
                </div>
            ) : (
                <div className="space-y-3 overflow-y-auto custom-scrollbar pr-2 -mr-2">
                    {companies.map((company) => (
                        <div key={company.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors group border border-transparent hover:border-white/5">
                            <div className="w-10 h-10 rounded-lg bg-zinc-900 flex items-center justify-center shrink-0 border border-white/5">
                                {company.logo ? (
                                    <img src={company.logo} alt={company.name} className="w-6 h-6 object-contain" />
                                ) : (
                                    <Building2 className="w-5 h-5 text-zinc-600" />
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-bold text-white truncate">{company.name}</h4>
                                <div className="flex items-center gap-2 text-xs text-zinc-500">
                                    {company.location && (
                                        <span className="flex items-center gap-1 truncate">
                                            <MapPin className="w-3 h-3" /> {company.location}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <a
                                href={company.website ? (company.website.startsWith('http') ? company.website : `https://${company.website}`) : '#'}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 rounded-lg hover:bg-white/10 text-zinc-500 hover:text-white transition-colors"
                            >
                                <ArrowUpRight className="w-4 h-4" />
                            </a>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
