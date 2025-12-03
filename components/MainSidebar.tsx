import React, { useState } from 'react';
import { Search, Database, LayoutDashboard, CloudLightning, LogOut, Settings, X, Menu, CheckSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from './ui/Button';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface SidebarProps {
    isOpen?: boolean;
    onClose?: () => void;
}

export const MainSidebar: React.FC<SidebarProps> = ({ isOpen = false, onClose = () => { } }) => {
    const pathname = usePathname();
    const [isHovered, setIsHovered] = useState(false);

    const navItems = [
        { id: 'search', icon: Search, label: 'Search', href: '/search' },
        { id: 'database', icon: Database, label: 'Database', href: '/database' },
        { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
        { id: 'tasks', icon: CheckSquare, label: 'Tasks', href: '/tasks' },
        { id: 'zoho', icon: CloudLightning, label: 'Zoho (Legacy)', href: '/zoho' },
    ];

    const bottomItems = [
        { id: 'settings', icon: Settings, label: 'Settings', href: '/settings' },
        { id: 'logout', icon: LogOut, label: 'Logout', href: '/login' },
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

            {/* Desktop Sidebar (Mini -> Expanded) */}
            <div
                className="hidden lg:block fixed inset-y-0 left-0 z-50 h-full transition-all duration-300 ease-in-out group"
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                style={{ width: isHovered ? '18rem' : '5rem' }} // w-72 vs w-20
            >
                {/* Sidebar Container */}
                <div
                    className={cn(
                        "h-full flex flex-col bg-zinc-900/90 backdrop-blur-2xl border-r border-white/10 shadow-2xl transition-all duration-300 ease-in-out overflow-hidden",
                        "w-full"
                    )}
                >
                    {/* Header */}
                    <div className={cn("p-6 flex items-center gap-3 transition-all duration-300", isHovered ? "justify-start" : "justify-center px-2")}>
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg shadow-orange-500/20 shrink-0">
                            <CloudLightning className="w-6 h-6 text-white" />
                        </div>
                        <div className={cn("transition-opacity duration-300 overflow-hidden whitespace-nowrap", isHovered ? "opacity-100 w-auto" : "opacity-0 w-0 hidden")}>
                            <h1 className="font-bold text-lg text-white leading-tight">Fairplatz</h1>
                            <p className="text-xs text-zinc-400">Marketing Tool</p>
                        </div>
                    </div>

                    {/* Navigation */}
                    <div className="flex-1 flex flex-col gap-2 overflow-y-auto custom-scrollbar px-4 py-2">
                        <p className={cn("text-xs font-semibold text-zinc-500 mb-2 uppercase tracking-wider transition-all duration-300", isHovered ? "px-4 opacity-100" : "px-0 text-center opacity-0 hidden")}>Menu</p>
                        {navItems.map((item) => {
                            const isActive = pathname.startsWith(item.href);
                            return (
                                <Link
                                    key={item.id}
                                    href={item.href}
                                    className={cn(
                                        "relative w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-300 group/item",
                                        isActive
                                            ? "bg-gradient-to-r from-orange-600 to-orange-500 text-white shadow-lg shadow-orange-500/20"
                                            : "text-zinc-400 hover:bg-white/5 hover:text-zinc-100",
                                        isHovered ? "justify-start px-4" : "justify-center"
                                    )}
                                >
                                    <item.icon className={cn("w-5 h-5 shrink-0", isActive ? "text-white" : "text-zinc-500 group-hover/item:text-zinc-300")} />
                                    <span className={cn("font-medium text-sm whitespace-nowrap transition-all duration-300", isHovered ? "opacity-100 w-auto" : "opacity-0 w-0 hidden")}>{item.label}</span>
                                    {isActive && isHovered && (
                                        <motion.div
                                            layoutId="activeSidebarIndicator"
                                            className="absolute right-3 w-1.5 h-1.5 rounded-full bg-white"
                                        />
                                    )}
                                </Link>
                            );
                        })}
                    </div>

                    {/* User Profile */}
                    <div className="mt-auto p-4 border-t border-white/5">
                        <div className={cn(
                            "flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5 transition-all duration-300 group/profile cursor-pointer hover:bg-white/10",
                            isHovered ? "justify-start px-3" : "justify-center px-0 w-10 h-10 mx-auto"
                        )}>
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/20 text-white font-bold text-xs">
                                HR
                            </div>
                            <div className={cn("overflow-hidden transition-all duration-300", isHovered ? "opacity-100 w-auto" : "opacity-0 w-0 hidden")}>
                                <p className="text-sm font-semibold text-white truncate">Hadi Rasal</p>
                                <p className="text-xs text-zinc-400 truncate">hadi@fairplatz.com</p>
                            </div>
                        </div>
                    </div>

                    {/* Bottom Actions */}
                    <div className="p-4 pt-2 flex flex-col gap-2">
                        <p className={cn("text-xs font-semibold text-zinc-500 mb-2 uppercase tracking-wider transition-all duration-300", isHovered ? "px-4 opacity-100" : "px-0 text-center opacity-0 hidden")}>General</p>
                        {bottomItems.map((item) => (
                            <Link
                                key={item.id}
                                href={item.href}
                                className={cn(
                                    "w-full flex items-center gap-3 p-3 rounded-xl text-zinc-400 hover:bg-white/5 hover:text-zinc-100 transition-all duration-300",
                                    isHovered ? "justify-start px-4" : "justify-center"
                                )}
                            >
                                <item.icon className="w-5 h-5 shrink-0 text-zinc-500 group-hover:text-zinc-300" />
                                <span className={cn("font-medium text-sm whitespace-nowrap transition-all duration-300", isHovered ? "opacity-100 w-auto" : "opacity-0 w-0 hidden")}>{item.label}</span>
                            </Link>
                        ))}
                    </div>
                </div>
            </div>

            {/* Mobile Sidebar (Drawer) */}
            <div
                className={cn(
                    "fixed inset-y-0 left-0 z-50 w-72 h-full flex flex-col bg-zinc-900/95 backdrop-blur-2xl border-r border-white/10 shadow-2xl transition-transform duration-300 ease-in-out lg:hidden",
                    isOpen ? "translate-x-0" : "-translate-x-full"
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
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg text-zinc-400">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Navigation */}
                <div className="flex-1 flex flex-col gap-2 overflow-y-auto custom-scrollbar px-4 py-2">
                    <p className="text-xs font-semibold text-zinc-500 px-4 mb-2 uppercase tracking-wider">Menu</p>
                    {navItems.map((item) => {
                        const isActive = pathname.startsWith(item.href);
                        return (
                            <Link
                                key={item.id}
                                href={item.href}
                                onClick={onClose}
                                className={cn(
                                    "relative w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-300 group text-left",
                                    isActive
                                        ? "bg-gradient-to-r from-orange-600 to-orange-500 text-white shadow-lg shadow-orange-500/20"
                                        : "text-zinc-400 hover:bg-white/5 hover:text-zinc-100"
                                )}
                            >
                                <item.icon className={cn("w-5 h-5", isActive ? "text-white" : "text-zinc-500 group-hover:text-zinc-300")} />
                                <span className="font-medium text-sm">{item.label}</span>
                            </Link>
                        );
                    })}
                </div>

                {/* User Profile */}
                <div className="mt-auto p-4 border-t border-white/5">
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/20 text-white font-bold text-sm">
                            HR
                        </div>
                        <div className="overflow-hidden">
                            <p className="text-sm font-semibold text-white truncate">Hadi Rasal</p>
                            <p className="text-xs text-zinc-400 truncate">hadi@fairplatz.com</p>
                        </div>
                    </div>
                </div>

                {/* Bottom Actions */}
                <div className="p-4 pt-2 flex flex-col gap-2">
                    <p className="text-xs font-semibold text-zinc-500 px-4 mb-2 uppercase tracking-wider">General</p>
                    {bottomItems.map((item) => (
                        <Link
                            key={item.id}
                            href={item.href}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-zinc-400 hover:bg-white/5 hover:text-zinc-100 transition-all duration-300 text-left"
                        >
                            <item.icon className="w-5 h-5 text-zinc-500 group-hover:text-zinc-300" />
                            <span className="font-medium text-sm">{item.label}</span>
                        </Link>
                    ))}
                </div>
            </div>
        </>
    );
};
