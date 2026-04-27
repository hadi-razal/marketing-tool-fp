import React, { useState, useEffect } from 'react';
import { Search, Database, LayoutDashboard, CloudLightning, LogOut, Settings, X, Menu, CheckSquare, BarChart2, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from './ui/Button';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';

interface SidebarProps {
    isOpen?: boolean;
    onClose?: () => void;
}

export const MainSidebar: React.FC<SidebarProps> = ({ isOpen = false, onClose = () => { } }) => {
    const pathname = usePathname();
    const router = useRouter();
    const [isHovered, setIsHovered] = useState(false);
    const [userName, setUserName] = useState('');
    const [userEmail, setUserEmail] = useState('');
    const [userProfileUrl, setUserProfileUrl] = useState<string | null>(null);

    useEffect(() => {
        const fetchUser = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUserEmail(user.email || '');

                const { data: userData } = await supabase
                    .from('users')
                    .select('name, profile_url')
                    .eq('uid', user.id)
                    .single();

                if (userData) {
                    setUserName(userData.name || 'User');
                    setUserProfileUrl(userData.profile_url || null);
                }
            }
        };
        fetchUser();
    }, []);

    const navItems = [
        { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
        { id: 'search', icon: Search, label: 'Search', href: '/search' },
        { id: 'database', icon: Database, label: 'Database', href: '/database' },
        { id: 'tasks', icon: CheckSquare, label: 'Tasks', href: '/tasks' },
        // { id: 'ai', icon: Sparkles, label: 'Fairplatz AI', href: '/ai' }, // Removed
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
                        "h-full flex flex-col bg-white/95 backdrop-blur-2xl border-r border-zinc-200 shadow-2xl shadow-zinc-950/10 transition-all duration-300 ease-in-out overflow-hidden",
                        "w-full"
                    )}
                >
                    {/* Header */}
                    <div className={cn("p-6 flex items-center gap-3 transition-all duration-300", isHovered ? "justify-start" : "justify-center px-2")}>
                        <div className={cn("w-10 h-10 flex items-center justify-center shrink-0 transition-opacity duration-300", isHovered ? "opacity-0 w-0 overflow-hidden hidden" : "opacity-100")}>
                            <img src="/FPICON_black.png" alt="Fairplatz" className="w-8 h-8 object-contain" />
                        </div>
                        <div className={cn("transition-opacity duration-300 overflow-hidden whitespace-nowrap", isHovered ? "opacity-100 w-auto" : "opacity-0 w-0 hidden")}>
                            <img src="/FP_black.png" alt="Fairplatz" className="h-10 object-contain" />
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
                                        "relative w-full flex items-center gap-3 p-3 rounded-md transition-all duration-300 group/item",
                                        isActive
                                            ? "bg-linear-to-r from-orange-600 to-orange-500 text-white shadow-lg shadow-orange-500/20"
                                            : "text-zinc-600 hover:bg-orange-50 hover:text-zinc-950",
                                        isHovered ? "justify-start px-4" : "justify-center"
                                    )}
                                >
                                    <item.icon className={cn("w-5 h-5 shrink-0", isActive ? "text-white" : "text-zinc-500 group-hover/item:text-orange-500")} />
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
                    <div className="mt-auto p-4 border-t border-zinc-200">
                        <div className={cn(
                            "flex items-center gap-3 p-3 rounded-md bg-zinc-50 border border-zinc-200 transition-all duration-300 group/profile cursor-pointer hover:bg-orange-50",
                            isHovered ? "justify-start px-3" : "justify-center px-0 w-10 h-10 mx-auto"
                        )}>
                            <div className="w-8 h-8 rounded-lg bg-linear-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/20 text-white font-bold text-xs overflow-hidden">
                                {userProfileUrl ? (
                                    <img src={userProfileUrl} alt={userName} className="w-full h-full object-cover" />
                                ) : (
                                    userName.substring(0, 2).toUpperCase() || 'US'
                                )}
                            </div>
                            <div className={cn("overflow-hidden transition-all duration-300", isHovered ? "opacity-100 w-auto" : "opacity-0 w-0 hidden")}>
                                <p className="text-sm font-semibold text-zinc-950 truncate">{userName || 'Loading...'}</p>
                                <p className="text-xs text-zinc-500 truncate">{userEmail || 'Loading...'}</p>
                            </div>
                        </div>
                    </div>

                    {/* Bottom Actions */}
                    <div className="p-4 pt-2 flex flex-col gap-2">
                        <p className={cn("text-xs font-semibold text-zinc-500 mb-2 uppercase tracking-wider transition-all duration-300", isHovered ? "px-4 opacity-100" : "px-0 text-center opacity-0 hidden")}>General</p>
                        {bottomItems.map((item) => {
                            if (item.id === 'logout') {
                                return (
                                    <button
                                        key={item.id}
                                        onClick={async () => {
                                            const supabase = createClient();
                                            await supabase.auth.signOut();
                                            router.push('/login');
                                            router.refresh();
                                        }}
                                        className={cn(
                                            "w-full flex items-center gap-3 p-3 rounded-md text-zinc-600 hover:bg-orange-50 hover:text-zinc-950 transition-all duration-300",
                                            isHovered ? "justify-start px-4" : "justify-center"
                                        )}
                                    >
                                        <item.icon className="w-5 h-5 shrink-0 text-zinc-500 group-hover:text-orange-500" />
                                        <span className={cn("font-medium text-sm whitespace-nowrap transition-all duration-300", isHovered ? "opacity-100 w-auto" : "opacity-0 w-0 hidden")}>{item.label}</span>
                                    </button>
                                );
                            }
                            return (
                                <Link
                                    key={item.id}
                                    href={item.href}
                                    className={cn(
                                        "w-full flex items-center gap-3 p-3 rounded-md text-zinc-600 hover:bg-orange-50 hover:text-zinc-950 transition-all duration-300",
                                        isHovered ? "justify-start px-4" : "justify-center"
                                    )}
                                >
                                    <item.icon className="w-5 h-5 shrink-0 text-zinc-500 group-hover:text-orange-500" />
                                    <span className={cn("font-medium text-sm whitespace-nowrap transition-all duration-300", isHovered ? "opacity-100 w-auto" : "opacity-0 w-0 hidden")}>{item.label}</span>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Mobile Sidebar (Drawer) */}
            <div
                className={cn(
                    "fixed inset-y-0 left-0 z-50 w-72 h-full flex flex-col bg-white/95 backdrop-blur-2xl border-r border-zinc-200 shadow-2xl transition-transform duration-300 ease-in-out lg:hidden",
                    isOpen ? "translate-x-0" : "-translate-x-full"
                )}
            >
                {/* Header */}
                <div className="p-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 flex items-center justify-center">
                            <img src="/FPICON_black.png" alt="Fairplatz" className="w-8 h-8 object-contain" />
                        </div>
                        <img src="/FP_black.png" alt="Fairplatz" className="h-9 w-auto object-contain" />
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-orange-50 rounded-lg text-zinc-500">
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
                                    "relative w-full flex items-center gap-3 px-4 py-3.5 rounded-md transition-all duration-300 group text-left",
                                    isActive
                                        ? "bg-linear-to-r from-orange-600 to-orange-500 text-white shadow-lg shadow-orange-500/20"
                                        : "text-zinc-600 hover:bg-orange-50 hover:text-zinc-950"
                                )}
                            >
                                <item.icon className={cn("w-5 h-5", isActive ? "text-white" : "text-zinc-500 group-hover:text-orange-500")} />
                                <span className="font-medium text-sm">{item.label}</span>
                            </Link>
                        );
                    })}
                </div>

                {/* User Profile */}
                <div className="mt-auto p-4 border-t border-zinc-200">
                    <div className="flex items-center gap-3 p-3 rounded-md bg-zinc-50 border border-zinc-200">
                        <div className="w-10 h-10 rounded-lg bg-linear-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/20 text-white font-bold text-sm">
                            HR
                        </div>
                        <div className="overflow-hidden">
                            <p className="text-sm font-semibold text-zinc-950 truncate">Hadi Rasal</p>
                            <p className="text-xs text-zinc-500 truncate">hadi@fairplatz.com</p>
                        </div>
                    </div>
                </div>

                {/* Bottom Actions */}
                <div className="p-4 pt-2 flex flex-col gap-2">
                    <p className="text-xs font-semibold text-zinc-500 px-4 mb-2 uppercase tracking-wider">General</p>
                    {bottomItems.map((item) => (
                        <button key={item.id} className="w-full flex items-center gap-3 px-4 py-3.5 rounded-md text-zinc-600 hover:bg-orange-50 hover:text-zinc-950 transition-colors text-left">
                            <item.icon className="w-5 h-5" />
                            <span className="font-medium text-sm">{item.label}</span>
                        </button>
                    ))}
                </div>
            </div>
        </>
    );
};
