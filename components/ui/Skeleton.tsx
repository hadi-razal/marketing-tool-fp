import React from 'react';
import { cn } from '@/lib/utils';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
    className?: string;
}

export const Skeleton = ({ className, ...props }: SkeletonProps) => {
    return (
        <div
            className={cn("animate-pulse rounded-md bg-zinc-200", className)}
            {...props}
        />
    );
};
