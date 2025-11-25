import React from 'react';
import { Search, Database, LayoutDashboard, CloudLightning, User } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from './ui/Button';
import Link from 'next/link';

interface NavigationProps {
    active: string;
    setActive: (page: string) => void;
}

export const Navigation: React.FC<NavigationProps> = ({ active, setActive }) => {
    const navItems = [
        { id: 'search', icon: Search, label: 'Search' },
        { id: 'database', icon: Database, label: 'Database' },
        { id: 'dashboard', icon: LayoutDashboard, label: 'Analytics' },
        { id: 'zoho', icon: CloudLightning, label: 'Zoho' },
        { id: 'login', icon: User, label: 'Login', isLink: true, href: '/login' },
    ];

    return (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
            <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 20 }}
                className="glass-panel p-2 rounded-full flex gap-2 shadow-2xl shadow-black/50"
            >
                {navItems.map((item) => {
                    const isActive = active === item.id;

                    if (item.isLink) {
                        return (
                            <Link
                                key={item.id}
                                href={item.href!}
                                className={cn(
                                    "relative px-6 py-3 rounded-full flex items-center gap-2 transition-all duration-300 overflow-hidden group text-zinc-400 hover:text-white"
                                )}
                            >
                                <span className="relative z-10 flex items-center gap-2">
                                    <item.icon className="w-4 h-4" />
                                    <span className="text-sm font-bold">{item.label}</span>
                                </span>
                            </Link>
                        );
                    }

                    return (
                        <button
                            key={item.id}
                            onClick={() => setActive(item.id)}
                            className={cn(
                                "relative px-6 py-3 rounded-full flex items-center gap-2 transition-all duration-300 overflow-hidden group",
                                isActive ? "text-white" : "text-zinc-400 hover:text-white"
                            )}
                        >
                            {isActive && (
                                <motion.div
                                    layoutId="activeTab"
                                    className="absolute inset-0 bg-gradient-to-r from-orange-600 to-orange-500 rounded-full"
                                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                />
                            )}
                            <span className="relative z-10 flex items-center gap-2">
                                <item.icon className={cn("w-4 h-4", isActive && "animate-pulse")} />
                                <span className="text-sm font-bold">{item.label}</span>
                            </span>
                        </button>
                    );
                })}
            </motion.div>
        </div>
    );
};
