'use client';
import React from 'react';
import { TasksTable } from '@/components/Zoho/TasksTable';
import { motion } from 'framer-motion';

export default function TasksPage() {
    return (
        <div className="h-full flex flex-col p-6 lg:p-8 gap-6 overflow-hidden">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold text-white tracking-tight">Tasks</h1>
                <p className="text-zinc-400">Manage your daily tasks and to-dos.</p>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="flex-1 overflow-hidden relative rounded-2xl border border-white/5 bg-zinc-950/30 shadow-xl"
            >
                <TasksTable />
            </motion.div>
        </div>
    );
}
