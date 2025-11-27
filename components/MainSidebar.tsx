import React from 'react';
import { Search, Database, LayoutDashboard, CloudLightning, LogOut, Settings, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from './ui/Button';

interface SidebarProps {
    active: string;
    setActive: (page: string) => void;
    isOpen?: boolean;
    onClose?: () => void;
}

export const MainSidebar: React.FC<SidebarProps> = ({ active, setActive, isOpen = false, onClose = () => { } }) => {
    const navItems = [
        { id: 'search', icon: Search, label: 'Search' },
        { id: 'database', icon: Database, label: 'Database' },
        { id: 'dashboard', icon: LayoutDashboard, label: 'Analytics' },
        { id: 'zoho', icon: CloudLightning, label: 'Zoho' },
    ];

    const bottomItems = [
        { id: 'settings', icon: Settings, label: 'Settings' },
        { id: 'logout', icon: LogOut, label: 'Logout' },
    ];

    return (
        <>
            {/* Mobile Backdrop */}
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

            {/* Sidebar Container */}
            <motion.div
                className={cn(
                    "fixed lg:static inset-y-0 left-0 z-50 w-72 h-full flex flex-col bg-zinc-900/80 backdrop-blur-2xl lg:bg-zinc-900/50 lg:backdrop-blur-xl border-r lg:border border-white/10 lg:rounded-3xl shadow-2xl transition-transform duration-300 ease-in-out",
                    isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
                )}
            >
                {/* Header */}
                <div className="p-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg shadow-orange-500/20">
                            <CloudLightning className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="font-bold text-lg text-white leading-tight">Fairplatz</h1>
                            <p className="text-xs text-zinc-400">Marketing Tool</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="lg:hidden p-2 hover:bg-white/10 rounded-lg text-zinc-400">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Navigation */}
                <div className="flex-1 flex flex-col gap-2 overflow-y-auto custom-scrollbar px-4 py-2">
                    <p className="text-xs font-semibold text-zinc-500 px-4 mb-2 uppercase tracking-wider">Menu</p>
                    {navItems.map((item) => {
                        const isActive = active === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => { setActive(item.id); onClose(); }}
                                className={cn(
                                    "relative w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-300 group text-left",
                                    isActive
                                        ? "bg-gradient-to-r from-orange-600 to-orange-500 text-white shadow-lg shadow-orange-500/20"
                                        : "text-zinc-400 hover:bg-white/5 hover:text-zinc-100"
                                )}
                            >
                                <item.icon className={cn("w-5 h-5", isActive ? "text-white" : "text-zinc-500 group-hover:text-zinc-300")} />
                                <span className="font-medium text-sm">{item.label}</span>
                                {isActive && (
                                    <motion.div
                                        layoutId="activeSidebarIndicator"
                                        className="absolute right-3 w-1.5 h-1.5 rounded-full bg-white"
                                    />
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Bottom Actions */}
                <div className="mt-auto p-4 border-t border-white/5 flex flex-col gap-2">
                    <p className="text-xs font-semibold text-zinc-500 px-4 mb-2 uppercase tracking-wider">General</p>
                    {bottomItems.map((item) => (
                        <button
                            key={item.id}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-zinc-400 hover:bg-white/5 hover:text-zinc-100 transition-all duration-300 text-left"
                        >
                            <item.icon className="w-5 h-5 text-zinc-500 group-hover:text-zinc-300" />
                            <span className="font-medium text-sm">{item.label}</span>
                        </button>
                    ))}
                </div>
            </motion.div>
        </>
    );
};
