import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { User, Bell, Shield, Monitor, LogOut, ChevronRight, Moon, Sun, Laptop, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';

export const SettingsPage = () => {
    const [theme, setTheme] = useState('dark');
    const [notifications, setNotifications] = useState(true);
    const [userName, setUserName] = useState('');
    const [userEmail, setUserEmail] = useState('');

    useEffect(() => {
        const fetchUser = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUserEmail(user.email || '');

                const { data: userData } = await supabase
                    .from('users')
                    .select('name')
                    .eq('uid', user.id)
                    .single();

                if (userData) {
                    setUserName(userData.name || 'User');
                }
            }
        };
        fetchUser();
    }, []);

    const sections = [
        {
            title: 'Profile',
            icon: User,
            items: [
                { label: 'Personal Information', value: userName || 'Loading...', action: null },
                { label: 'Email Address', value: userEmail || 'Loading...', action: null },
            ]
        },
        {
            title: 'Preferences',
            icon: Monitor,
            items: [
                {
                    label: 'Appearance',
                    component: (
                        <div className="flex bg-zinc-900 p-1 rounded-lg border border-white/5">
                            {['light', 'dark', 'system'].map((t) => (
                                <button
                                    key={t}
                                    onClick={() => setTheme(t)}
                                    className={`p-2 rounded-md transition-all ${theme === t ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                                >
                                    {t === 'light' && <Sun className="w-4 h-4" />}
                                    {t === 'dark' && <Moon className="w-4 h-4" />}
                                    {t === 'system' && <Laptop className="w-4 h-4" />}
                                </button>
                            ))}
                        </div>
                    )
                },
                {
                    label: 'Notifications',
                    component: (
                        <button
                            onClick={() => setNotifications(!notifications)}
                            className={`w-11 h-6 rounded-full transition-colors relative ${notifications ? 'bg-orange-500' : 'bg-zinc-700'}`}
                        >
                            <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${notifications ? 'translate-x-5' : 'translate-x-0'}`} />
                        </button>
                    )
                }
            ]
        },
        {
            title: 'System',
            icon: Shield,
            items: [
                { label: 'Version', value: 'v2.4.0 (Beta)', action: null },
                {
                    label: 'Cache',
                    component: (
                        <button className="flex items-center gap-2 text-xs font-bold text-red-400 hover:text-red-300 transition-colors px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 rounded-lg border border-red-500/20">
                            <Trash2 className="w-3.5 h-3.5" /> Clear Cache
                        </button>
                    )
                }
            ]
        }
    ];

    return (
        <div className="h-full flex flex-col max-w-4xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white tracking-tight mb-2">Settings</h1>
                <p className="text-zinc-400 text-sm">Manage your account preferences and system settings.</p>
            </div>

            <div className="space-y-6 pb-10">
                {sections.map((section, idx) => (
                    <motion.div
                        key={section.title}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="bg-[#09090b] border border-white/5 rounded-[32px] p-6 lg:p-8 overflow-hidden"
                    >
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-2xl bg-zinc-900 border border-white/5 flex items-center justify-center">
                                <section.icon className="w-5 h-5 text-orange-500" />
                            </div>
                            <h2 className="text-lg font-bold text-white">{section.title}</h2>
                        </div>

                        <div className="space-y-1">
                            {section.items.map((item: any, itemIdx) => (
                                <div
                                    key={itemIdx}
                                    className="flex items-center justify-between p-4 hover:bg-zinc-900/50 rounded-2xl transition-colors group"
                                >
                                    <span className="text-sm font-medium text-zinc-300">{item.label}</span>
                                    <div className="flex items-center gap-4">
                                        {item.value && <span className="text-sm text-zinc-500">{item.value}</span>}
                                        {item.component}
                                        {item.action && (
                                            <button className="text-xs font-bold text-orange-500 hover:text-orange-400 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                                                {item.action} <ChevronRight className="w-3 h-3" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                ))}

                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="flex justify-center pt-8"
                >
                    <button className="text-zinc-500 hover:text-red-400 text-sm font-medium flex items-center gap-2 transition-colors">
                        <LogOut className="w-4 h-4" /> Sign Out
                    </button>
                </motion.div>
            </div>
        </div>
    );
};
