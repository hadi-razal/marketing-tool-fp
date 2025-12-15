import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { User, Mail, Briefcase, Loader2, Save } from 'lucide-react';
import { ProfileUpload } from './Settings/ProfileUpload';
import { toast } from 'sonner';

export const SettingsPage = () => {
    const [userName, setUserName] = useState('');
    const [userRole, setUserRole] = useState('');
    const [userEmail, setUserEmail] = useState('');
    const [profileUrl, setProfileUrl] = useState<string | null>(null);
    const [uid, setUid] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Track original values to detect changes
    const [originalName, setOriginalName] = useState('');
    const [originalRole, setOriginalRole] = useState('');

    // Check if there are unsaved changes
    const hasChanges = userName !== originalName || userRole !== originalRole;

    useEffect(() => {
        const fetchUser = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUserEmail(user.email || '');

                const { data: userData } = await supabase
                    .from('users')
                    .select('name, profile_url, role')
                    .eq('uid', user.id)
                    .single();

                if (userData) {
                    const name = userData.name || 'User';
                    const role = userData.role || '';
                    setUserName(name);
                    setOriginalName(name);
                    setProfileUrl(userData.profile_url || null);
                    setUserRole(role);
                    setOriginalRole(role);
                }
                setUid(user.id);
            }
            setLoading(false);
        };
        fetchUser();
    }, []);

    const handleSaveProfile = async () => {
        if (!uid) return;

        setIsSaving(true);
        try {
            const supabase = createClient();
            const { error } = await supabase
                .from('users')
                .update({ name: userName, role: userRole })
                .eq('uid', uid);

            if (error) throw error;

            // Update original values after successful save
            setOriginalName(userName);
            setOriginalRole(userRole);

            toast.success('Profile updated successfully');
        } catch (error) {
            console.error('Failed to save profile:', error);
            toast.error('Failed to save profile. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="h-full max-w-3xl mx-auto pb-20 pt-8 px-6">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-white mb-1">Settings</h1>
                <p className="text-zinc-400 text-sm">Manage your profile and preferences.</p>
            </div>

            <div className="space-y-6">
                {/* Profile Section */}
                <section className="bg-zinc-900/30 border border-white/5 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-zinc-800/50 text-white border border-white/5">
                                <User className="w-4 h-4" />
                            </div>
                            <div>
                                <h2 className="text-base font-bold text-white">Profile</h2>
                                <p className="text-xs text-zinc-500 mt-0.5">Update your personal information</p>
                            </div>
                        </div>
                        <button
                            onClick={handleSaveProfile}
                            disabled={isSaving || !hasChanges}
                            className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-zinc-200 text-black text-sm font-bold rounded-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-white/5"
                        >
                            {isSaving ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Save className="w-4 h-4" />
                            )}
                            {isSaving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>

                    <div className="space-y-8">
                        {/* Profile Picture Section */}
                        <div className="flex items-start gap-6 pb-6 border-b border-white/5">
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
                            <div className="flex-1 pt-2">
                                <h3 className="text-sm font-semibold text-white mb-1">Profile Picture</h3>
                                <p className="text-xs text-zinc-500 leading-relaxed">
                                    Upload a square image (JPG or PNG). Maximum file size is 2MB. Your profile picture will be visible to other team members.
                                </p>
                            </div>
                        </div>

                        {/* Personal Information */}
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-sm font-semibold text-white mb-4">Personal Information</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                                            <User className="w-3.5 h-3.5" />
                                            Full Name
                                        </label>
                                        <input
                                            type="text"
                                            value={userName}
                                            onChange={(e) => setUserName(e.target.value)}
                                            className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20 transition-all placeholder:text-zinc-600"
                                            placeholder="Enter your full name"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                                            <Briefcase className="w-3.5 h-3.5" />
                                            Role
                                        </label>
                                        <div className="relative">
                                            <Briefcase className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                                            <input
                                                type="text"
                                                value={userRole}
                                                onChange={(e) => setUserRole(e.target.value)}
                                                className="w-full bg-zinc-900 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20 transition-all placeholder:text-zinc-600"
                                                placeholder="e.g. Marketing Manager"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2 md:col-span-2">
                                        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                                            <Mail className="w-3.5 h-3.5" />
                                            Email Address
                                        </label>
                                        <div className="relative">
                                            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                                            <input
                                                type="email"
                                                value={userEmail}
                                                disabled
                                                className="w-full bg-zinc-900/50 border border-white/5 rounded-lg pl-10 pr-4 py-2.5 text-zinc-500 text-sm cursor-not-allowed"
                                                placeholder="your.email@example.com"
                                            />
                                        </div>
                                        <p className="text-xs text-zinc-600 mt-1">Email address cannot be changed</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
};
