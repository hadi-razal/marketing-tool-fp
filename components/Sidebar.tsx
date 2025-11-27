import React from 'react';
import { X } from 'lucide-react';
import { cn } from './ui/Button';
import { motion, AnimatePresence } from 'framer-motion';

interface SidebarProps {
    title: string;
    isOpen?: boolean;
    onClose?: () => void;
    children: React.ReactNode;
}

export const Sidebar: React.FC<SidebarProps> = ({ title, isOpen = false, onClose = () => { }, children }) => {
    return (
        <>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
                    />
                )}
            </AnimatePresence>

            <motion.div
                className={cn(
                    "fixed lg:static inset-y-0 left-0 w-[280px] bg-zinc-900/90 backdrop-blur-xl lg:bg-transparent border-r border-white/5 lg:border-none z-50 transform transition-transform duration-300 ease-in-out flex flex-col",
                    isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
                )}
            >
                <div className="p-4 lg:p-0 lg:mb-6 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-white lg:hidden">{title}</h2>
                    <button onClick={onClose} className="lg:hidden p-2 hover:bg-white/10 rounded-lg">
                        <X className="w-5 h-5 text-zinc-400" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar px-4 lg:px-0">
                    {children}
                </div>
            </motion.div>
        </>
    );
};

interface SidebarItemProps {
    active?: boolean;
    onClick: () => void;
    children: React.ReactNode;
}

export const SidebarItem: React.FC<SidebarItemProps> = ({ active, onClick, children }) => {
    return (
        <button
            onClick={onClick}
            className={cn(
                "w-full p-3 rounded-xl transition-all duration-200 text-left border border-transparent",
                active
                    ? "bg-white/5 border-white/10 shadow-lg"
                    : "hover:bg-white/5 hover:border-white/5"
            )}
        >
            {children}
        </button>
    );
};

export const SidebarContainer: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="w-80 flex-shrink-0 flex flex-col h-full overflow-hidden">
        {children}
    </div>
);
