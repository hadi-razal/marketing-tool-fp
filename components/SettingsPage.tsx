import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { User, Monitor, LogOut, Moon, Sun, Laptop, Mail } from 'lucide-react';
import { ProfileUpload } from './Settings/ProfileUpload';
import { cn } from './ui/Button';

export const SettingsPage = () => {
    const [theme, setTheme] = useState('dark');
    const [notifications, setNotifications] = useState(true);
    const [userName, setUserName] = useState('');
    const [userEmail, setUserEmail] = useState('');
    const [profileUrl, setProfileUrl] = useState<string | null>(null);
    const [uid, setUid] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

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
                    setProfileUrl(userData.profile_url || null);
                }
                setUid(user.id);
            }
            setLoading(false);
        };
        fetchUser();
    }, []);

    return (
        <div className="h-full max-w-3xl mx-auto pb-20 pt-8 px-6">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-white mb-1">Settings</h1>
                <p className="text-zinc-400 text-sm">Manage your profile and preferences.</p>
            </div>

            <div className="space-y-6">
                {/* Profile Section */}
                <section className="bg-zinc-900/30 border border-white/5 rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 rounded-lg bg-zinc-800/50 text-white border border-white/5">
                            <User className="w-4 h-4" />
                        </div>
                        <h2 className="text-base font-bold text-white">Profile</h2>
                    </div>

                    <div className="flex flex-col md:flex-row gap-8">
                        <div className="flex-shrink-0">
                            {uid ? (
                                <ProfileUpload
                                    currentImageUrl={profileUrl}
                                    onUpdate={setProfileUrl}
                                    uid={uid}
                                />
                            ) : (
                                <div className="h-24 w-24 bg-zinc-800/50 animate-pulse rounded-full" />
                            )}
                        </div>

                        <div className="flex-1 space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Full Name</label>
                                <input
                                    type="text"
                                    value={userName}
                                    onChange={(e) => setUserName(e.target.value)}
                                    className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-white/20 transition-colors placeholder:text-zinc-600"
                                    placeholder="Your name"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Email Address</label>
                                <div className="relative">
                                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                                    <input
                                        type="email"
                                        value={userEmail}
                                        disabled
                                        className="w-full bg-zinc-900/50 border border-white/5 rounded-lg pl-10 pr-4 py-2.5 text-zinc-500 text-sm cursor-not-allowed"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Preferences Section */}
                <section className="bg-zinc-900/30 border border-white/5 rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 rounded-lg bg-zinc-800/50 text-white border border-white/5">
                            <Monitor className="w-4 h-4" />
                        </div>
                        <h2 className="text-base font-bold text-white">Preferences</h2>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-zinc-900/30 rounded-lg border border-white/5">
                            <div>
                                <p className="text-sm font-medium text-white">Appearance</p>
                                <p className="text-xs text-zinc-500">Interface theme</p>
                            </div>
                            <div className="flex bg-black/20 p-1 rounded-lg border border-white/5">
                                {['light', 'dark', 'system'].map((t) => (
                                    <button
                                        key={t}
                                        onClick={() => setTheme(t)}
                                        className={cn(
                                            "p-1.5 rounded-md transition-all",
                                            theme === t ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300"
                                        )}
                                    >
                                        {t === 'light' && <Sun className="w-3.5 h-3.5" />}
                                        {t === 'dark' && <Moon className="w-3.5 h-3.5" />}
                                        {t === 'system' && <Laptop className="w-3.5 h-3.5" />}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-zinc-900/30 rounded-lg border border-white/5">
                            <div>
                                <p className="text-sm font-medium text-white">Notifications</p>
                                <p className="text-xs text-zinc-500">Alert preferences</p>
                            </div>
                            <button
                                onClick={() => setNotifications(!notifications)}
                                className={cn(
                                    "w-10 h-5 rounded-full transition-colors relative",
                                    notifications ? "bg-white" : "bg-zinc-800"
                                )}
                            >
                                <div className={cn(
                                    "absolute top-1 left-1 w-3 h-3 rounded-full transition-transform duration-200",
                                    notifications ? "translate-x-5 bg-black" : "translate-x-0 bg-zinc-500"
                                )} />
                            </button>
                        </div>
                    </div>
                </section>

                {/* Sign Out */}
                <div className="flex justify-start pt-4">
                    <button className="text-zinc-500 hover:text-red-400 text-sm font-medium flex items-center gap-2 transition-colors px-4 py-2 rounded-lg hover:bg-red-500/5">
                        <LogOut className="w-4 h-4" /> Sign Out
                    </button>
                </div>
            </div>
        </div>
    );
};
