import React from 'react';

export const CompanyCardSkeleton = () => {
    return (
        <div className="bg-zinc-900/50 border border-white/5 p-5 rounded-2xl h-full flex flex-col animate-pulse">
            {/* Header Section */}
            <div className="flex justify-between items-start mb-4">
                <div className="flex gap-4 w-full">
                    {/* Logo Skeleton */}
                    <div className="w-12 h-12 rounded-xl bg-white/5 shrink-0" />

                    {/* Name & Industry Skeleton */}
                    <div className="flex-1 space-y-2 py-1">
                        <div className="h-5 bg-white/10 rounded w-3/4" />
                        <div className="h-4 bg-white/5 rounded w-1/3" />
                    </div>
                </div>

                {/* Action Buttons Skeleton */}
                <div className="flex gap-2">
                    <div className="w-8 h-8 rounded-lg bg-white/5" />
                    <div className="w-8 h-8 rounded-lg bg-white/5" />
                </div>
            </div>

            {/* Description Skeleton */}
            <div className="space-y-2 mb-5">
                <div className="h-3 bg-white/5 rounded w-full" />
                <div className="h-3 bg-white/5 rounded w-5/6" />
            </div>

            {/* Metadata Tags Skeleton */}
            <div className="flex gap-2 mt-auto mb-5">
                <div className="h-7 w-24 bg-white/5 rounded-lg" />
                <div className="h-7 w-20 bg-white/5 rounded-lg" />
                <div className="h-7 w-20 bg-white/5 rounded-lg" />
            </div>

            {/* Footer Skeleton */}
            <div className="pt-4 border-t border-white/5 flex items-center justify-between mt-auto">
                <div className="flex gap-3">
                    <div className="h-3 w-12 bg-white/5 rounded" />
                    <div className="h-3 w-8 bg-white/5 rounded" />
                </div>
                <div className="h-3 w-20 bg-white/5 rounded" />
            </div>
        </div>
    );
};
