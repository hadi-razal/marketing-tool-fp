'use client';
import React from 'react';
import { TasksTable } from '@/components/Zoho/TasksTable';

export default function TasksPage() {
    return (
        <div className="relative flex h-full flex-col overflow-hidden">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(251,146,60,0.12),transparent)]" aria-hidden />
            <div className="relative mx-auto flex h-full w-full max-w-5xl flex-col px-4 pb-4 pt-5 sm:px-6 sm:pb-6 sm:pt-6 lg:max-w-6xl lg:px-10 lg:pt-8">
                <TasksTable />
            </div>
        </div>
    );
}
