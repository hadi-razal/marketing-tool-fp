import React, { useState, useEffect, useCallback } from 'react';
import { LayoutDashboard, LogOut, Settings, X, Calendar, ChevronRight, ChevronLeft } from 'lucide-react';
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
    const [isDesktopOpen, setIsDesktopOpen] = useState(false);
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

    const openDesktop = useCallback(() => setIsDesktopOpen(true), []);
    const closeDesktop = useCallback(() => setIsDesktopOpen(false), []);

    const navItems = [
        { id: 'shows', icon: Calendar, label: 'Shows', href: '/shows' },
        { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
    ];

    const bottomItems = [
        { id: 'settings', icon: Settings, label: 'Settings', href: '/settings' },
        { id: 'logout', icon: LogOut, label: 'Logout', href: '/login' },
    ];

    const desktopSidebarContent = (
        <>
            <div className="flex items-center justify-between p-5">
                <img src="/FP_black.png" alt="Fairplatz" className="h-9 object-contain" />
                <button
                    type="button"
                    onClick={closeDesktop}
                    className="rounded-lg p-2 text-zinc-500 transition-colors hover:bg-orange-50 hover:text-zinc-950"
                    aria-label="Close sidebar"
                >
                    <ChevronLeft className="h-5 w-5" />
                </button>
            </div>

            <div className="flex flex-1 flex-col gap-2 overflow-y-auto custom-scrollbar px-4 py-2">
                <p className="mb-2 px-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">Menu</p>
                {navItems.map((item) => {
                    const isActive = pathname.startsWith(item.href);
                    return (
                        <Link
                            key={item.id}
                            href={item.href}
                            onClick={closeDesktop}
                            className={cn(
                                'relative flex w-full items-center gap-3 rounded-md p-3 transition-all duration-300 group/item',
                                isActive
                                    ? 'bg-linear-to-r from-orange-600 to-orange-500 text-white shadow-lg shadow-orange-500/20'
                                    : 'text-zinc-600 hover:bg-orange-50 hover:text-zinc-950',
                            )}
                        >
                            <item.icon className={cn('h-5 w-5 shrink-0', isActive ? 'text-white' : 'text-zinc-500 group-hover/item:text-orange-500')} />
                            <span className="text-sm font-medium">{item.label}</span>
                            {isActive && (
                                <motion.div layoutId="activeSidebarIndicator" className="absolute right-3 h-1.5 w-1.5 rounded-full bg-white" />
                            )}
                        </Link>
                    );
                })}
            </div>

            <div className="mt-auto border-t border-zinc-200 p-4">
                <div className="flex cursor-pointer items-center gap-3 rounded-md border border-zinc-200 bg-zinc-50 p-3 transition-all hover:bg-orange-50">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-linear-to-br from-indigo-500 to-purple-600 text-xs font-bold text-white shadow-lg shadow-indigo-500/20">
                        {userProfileUrl ? (
                            <img src={userProfileUrl} alt={userName} className="h-full w-full object-cover" />
                        ) : (
                            userName.substring(0, 2).toUpperCase() || 'US'
                        )}
                    </div>
                    <div className="min-w-0 overflow-hidden">
                        <p className="truncate text-sm font-semibold text-zinc-950">{userName || 'Loading...'}</p>
                        <p className="truncate text-xs text-zinc-500">{userEmail || 'Loading...'}</p>
                    </div>
                </div>
            </div>

            <div className="flex flex-col gap-2 p-4 pt-2">
                <p className="mb-2 px-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">General</p>
                {bottomItems.map((item) => {
                    if (item.id === 'logout') {
                        return (
                            <button
                                key={item.id}
                                type="button"
                                onClick={async () => {
                                    const supabase = createClient();
                                    await supabase.auth.signOut();
                                    router.push('/login');
                                    router.refresh();
                                }}
                                className="flex w-full items-center gap-3 rounded-md p-3 text-zinc-600 transition-all hover:bg-orange-50 hover:text-zinc-950"
                            >
                                <item.icon className="h-5 w-5 shrink-0 text-zinc-500" />
                                <span className="text-sm font-medium">{item.label}</span>
                            </button>
                        );
                    }
                    return (
                        <Link
                            key={item.id}
                            href={item.href}
                            onClick={closeDesktop}
                            className="flex w-full items-center gap-3 rounded-md p-3 text-zinc-600 transition-all hover:bg-orange-50 hover:text-zinc-950"
                        >
                            <item.icon className="h-5 w-5 shrink-0 text-zinc-500" />
                            <span className="text-sm font-medium">{item.label}</span>
                        </Link>
                    );
                })}
            </div>
        </>
    );

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
                        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
                    />
                )}
            </AnimatePresence>

            {/* Desktop — collapsed: click to open */}
            <div className="hidden lg:block">
                <AnimatePresence>
                    {!isDesktopOpen && (
                        <motion.button
                            type="button"
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -8 }}
                            onClick={openDesktop}
                            className="fixed left-0 top-1/2 z-50 flex h-11 w-7 -translate-y-1/2 items-center justify-center rounded-r-xl border border-l-0 border-zinc-200/90 bg-white/95 shadow-lg shadow-zinc-950/10 backdrop-blur-md transition-colors hover:border-orange-200 hover:bg-orange-50/80"
                            aria-label="Open menu"
                        >
                            <ChevronRight className="h-4 w-4 text-orange-600" />
                        </motion.button>
                    )}
                </AnimatePresence>

                <AnimatePresence>
                    {isDesktopOpen && (
                        <>
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={closeDesktop}
                                className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px]"
                            />
                            <motion.aside
                                initial={{ x: '-100%' }}
                                animate={{ x: 0 }}
                                exit={{ x: '-100%' }}
                                transition={{ type: 'spring', damping: 28, stiffness: 260 }}
                                className="fixed inset-y-0 left-0 z-50 flex h-full w-72 flex-col overflow-hidden border-r border-zinc-200 bg-white/95 shadow-2xl shadow-zinc-950/10 backdrop-blur-2xl"
                            >
                                {desktopSidebarContent}
                            </motion.aside>
                        </>
                    )}
                </AnimatePresence>
            </div>

            {/* Mobile Sidebar (Drawer) */}
            <div
                className={cn(
                    'fixed inset-y-0 left-0 z-50 flex h-full w-72 flex-col border-r border-zinc-200 bg-white/95 shadow-2xl backdrop-blur-2xl transition-transform duration-300 ease-in-out lg:hidden',
                    isOpen ? 'translate-x-0' : '-translate-x-full',
                )}
            >
                <div className="flex items-center justify-between p-6">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center">
                            <img src="/FPICON_black.png" alt="Fairplatz" className="h-8 w-8 object-contain" />
                        </div>
                        <img src="/FP_black.png" alt="Fairplatz" className="h-9 w-auto object-contain" />
                    </div>
                    <button type="button" onClick={onClose} className="rounded-lg p-2 text-zinc-500 hover:bg-orange-50">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <div className="flex flex-1 flex-col gap-2 overflow-y-auto custom-scrollbar px-4 py-2">
                    <p className="mb-2 px-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">Menu</p>
                    {navItems.map((item) => {
                        const isActive = pathname.startsWith(item.href);
                        return (
                            <Link
                                key={item.id}
                                href={item.href}
                                onClick={onClose}
                                className={cn(
                                    'relative flex w-full items-center gap-3 rounded-md px-4 py-3.5 text-left transition-all duration-300 group',
                                    isActive
                                        ? 'bg-linear-to-r from-orange-600 to-orange-500 text-white shadow-lg shadow-orange-500/20'
                                        : 'text-zinc-600 hover:bg-orange-50 hover:text-zinc-950',
                                )}
                            >
                                <item.icon className={cn('h-5 w-5', isActive ? 'text-white' : 'text-zinc-500 group-hover:text-orange-500')} />
                                <span className="text-sm font-medium">{item.label}</span>
                            </Link>
                        );
                    })}
                </div>

                <div className="mt-auto border-t border-zinc-200 p-4">
                    <div className="flex items-center gap-3 rounded-md border border-zinc-200 bg-zinc-50 p-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-linear-to-br from-indigo-500 to-purple-600 text-sm font-bold text-white shadow-lg shadow-indigo-500/20">
                            {userProfileUrl ? (
                                <img src={userProfileUrl} alt={userName} className="h-full w-full rounded-lg object-cover" />
                            ) : (
                                userName.substring(0, 2).toUpperCase() || 'US'
                            )}
                        </div>
                        <div className="overflow-hidden">
                            <p className="truncate text-sm font-semibold text-zinc-950">{userName || 'Loading...'}</p>
                            <p className="truncate text-xs text-zinc-500">{userEmail || 'Loading...'}</p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-2 p-4 pt-2">
                    <p className="mb-2 px-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">General</p>
                    {bottomItems.map((item) => {
                        if (item.id === 'logout') {
                            return (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={async () => {
                                        const supabase = createClient();
                                        await supabase.auth.signOut();
                                        router.push('/login');
                                        router.refresh();
                                    }}
                                    className="flex w-full items-center gap-3 rounded-md px-4 py-3.5 text-left text-zinc-600 transition-colors hover:bg-orange-50 hover:text-zinc-950"
                                >
                                    <item.icon className="h-5 w-5" />
                                    <span className="text-sm font-medium">{item.label}</span>
                                </button>
                            );
                        }
                        return (
                            <Link
                                key={item.id}
                                href={item.href}
                                onClick={onClose}
                                className="flex w-full items-center gap-3 rounded-md px-4 py-3.5 text-left text-zinc-600 transition-colors hover:bg-orange-50 hover:text-zinc-950"
                            >
                                <item.icon className="h-5 w-5" />
                                <span className="text-sm font-medium">{item.label}</span>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </>
    );
};
