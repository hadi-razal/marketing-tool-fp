import React from 'react';

export const CompanyCardSkeleton = () => {
    return (
        <div className="bg-white border border-zinc-200 p-5 rounded-2xl h-full flex flex-col animate-pulse shadow-sm">
            <div className="flex justify-between items-start mb-4">
                <div className="flex gap-4 w-full">
                    <div className="w-12 h-12 rounded-xl bg-zinc-100 shrink-0" />
                    <div className="flex-1 space-y-2 py-1">
                        <div className="h-5 bg-zinc-200 rounded-lg w-3/4" />
                        <div className="h-4 bg-zinc-100 rounded-lg w-1/3" />
                    </div>
                </div>
                <div className="flex gap-2">
                    <div className="w-8 h-8 rounded-lg bg-zinc-100" />
                </div>
            </div>

            <div className="space-y-2 mb-5">
                <div className="h-3 bg-zinc-100 rounded-lg w-full" />
                <div className="h-3 bg-zinc-100 rounded-lg w-5/6" />
            </div>

            <div className="flex gap-2 mt-auto mb-5">
                <div className="h-7 w-24 bg-zinc-100 rounded-lg" />
                <div className="h-7 w-20 bg-zinc-100 rounded-lg" />
                <div className="h-7 w-20 bg-zinc-100 rounded-lg" />
            </div>

            <div className="pt-4 border-t border-zinc-200 flex items-center justify-between mt-auto">
                <div className="flex gap-3">
                    <div className="h-3 w-12 bg-zinc-100 rounded" />
                    <div className="h-3 w-8 bg-zinc-100 rounded" />
                </div>
                <div className="h-3 w-20 bg-zinc-100 rounded" />
            </div>
        </div>
    );
};
