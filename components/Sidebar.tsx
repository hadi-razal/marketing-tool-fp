import React from 'react';
import { motion } from 'framer-motion';
import { cn } from './ui/Button';

interface SidebarProps {
    children: React.ReactNode;
    className?: string;
    title?: string;
}

export const SidebarContainer: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => {
    return (
        <motion.div
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className={cn(
                "w-80 h-full glass-panel border-r border-white/5 flex flex-col shrink-0",
                className
            )}
        >
            {children}
        </motion.div>
    );
};

export const Sidebar: React.FC<SidebarProps> = ({ children, className, title }) => {
    return (
        <SidebarContainer className={className}>
            {title && (
                <div className="p-6 border-b border-white/5">
                    <h2 className="text-xl font-bold text-white tracking-tight">{title}</h2>
                </div>
            )}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
                {children}
            </div>
        </SidebarContainer>
    );
};

export const SidebarItem: React.FC<{ children: React.ReactNode; active?: boolean; onClick?: () => void }> = ({ children, active, onClick }) => (
    <div
        onClick={onClick}
        className={cn(
            "p-4 rounded-2xl border transition-all cursor-pointer group",
            active
                ? "bg-orange-500/10 border-orange-500/20 shadow-[0_0_20px_-10px_rgba(249,115,22,0.3)]"
                : "bg-zinc-900/40 border-white/5 hover:bg-zinc-800/60 hover:border-white/10"
        )}
    >
        {children}
    </div>
);
