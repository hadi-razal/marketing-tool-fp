import React from 'react';
import { Skeleton } from './Skeleton';

interface TableSkeletonProps {
    columns?: number;
    rows?: number;
}

export const TableSkeleton = ({ columns = 5, rows = 5 }: TableSkeletonProps) => {
    return (
        <div className="w-full space-y-4">
            {/* Header Skeleton */}
            <div className="flex items-center gap-4 px-4 py-3 border-b border-white/5 bg-white/5 rounded-t-xl">
                {Array.from({ length: columns }).map((_, i) => (
                    <Skeleton key={`header-${i}`} className="h-4 w-24 bg-white/10" />
                ))}
            </div>

            {/* Rows Skeleton */}
            <div className="space-y-2">
                {Array.from({ length: rows }).map((_, rowIndex) => (
                    <div key={`row-${rowIndex}`} className="flex items-center gap-4 px-4 py-3 border-b border-white/5 last:border-0">
                        {Array.from({ length: columns }).map((_, colIndex) => (
                            <Skeleton key={`cell-${rowIndex}-${colIndex}`} className="h-4 w-full bg-white/5" />
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
};
