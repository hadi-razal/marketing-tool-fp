'use client';
import React from 'react';
import { TasksTable } from '@/components/Zoho/TasksTable';

export default function TasksPage() {
    return (
        <div className="h-full flex flex-col">
            <div className="max-w-4xl mx-auto w-full flex flex-col h-full px-6 lg:px-10 pt-6 lg:pt-10">
                <TasksTable />
            </div>
        </div>
    );
}
