import React from 'react';
import { Building2, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';

interface RecentlySavedProps {
    companies: any[];
}

export const RecentlySaved: React.FC<RecentlySavedProps> = ({ companies }) => {
    return (
        <div className="bg-zinc-900/50 rounded-2xl p-5 border border-white/[0.04]">
            <div className="flex items-center justify-between mb-5">
                <h3 className="text-sm font-medium text-white">Recently Saved</h3>
                <Link
                    href="/database"
                    className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                    View all
                </Link>
            </div>

            {companies.length === 0 ? (
                <div className="py-8 text-center">
                    <Building2 className="w-6 h-6 text-zinc-700 mx-auto mb-2" />
                    <p className="text-xs text-zinc-500">No companies saved yet</p>
                </div>
            ) : (
                <div className="space-y-1">
                    {companies.map((company) => (
                        <div
                            key={company.id}
                            className="flex items-center gap-3 py-2.5 group"
                        >
                            <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">
                                {company.logo ? (
                                    <img src={company.logo} alt={company.name} className="w-5 h-5 object-contain" />
                                ) : (
                                    <Building2 className="w-4 h-4 text-zinc-600" />
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="text-sm text-zinc-300 truncate group-hover:text-white transition-colors">
                                    {company.name}
                                </h4>
                                {company.location && (
                                    <p className="text-xs text-zinc-600 truncate">{company.location}</p>
                                )}
                            </div>
                            {company.website && (
                                <a
                                    href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-1.5 text-zinc-600 hover:text-zinc-300 transition-colors opacity-0 group-hover:opacity-100"
                                >
                                    <ArrowUpRight className="w-3.5 h-3.5" />
                                </a>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
