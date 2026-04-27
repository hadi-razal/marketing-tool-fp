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
        <div className="h-full w-full max-w-4xl mx-auto pb-24 pt-10 px-6 lg:px-10">
            <div className="mb-10">
                <h1 className="text-3xl font-extrabold text-zinc-950 tracking-tight mb-2">Settings</h1>
                <p className="text-zinc-500 text-[15px]">Manage your profile and account preferences.</p>
            </div>

            <div className="space-y-6">
                {/* Profile Section */}
                <section className="bg-white/95 border border-zinc-200/80 rounded-[20px] p-8 shadow-sm">
                    <div className="flex items-center justify-between pl-2 mb-10">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center border border-zinc-200 shrink-0">
                                <User className="w-4 h-4 text-zinc-700" strokeWidth={2.5} />
                            </div>
                            <div>
                                <h2 className="text-base font-bold text-zinc-950 tracking-tight">Profile Information</h2>
                                <p className="text-[13px] text-zinc-500 mt-1">Update your personal details here.</p>
                            </div>
                        </div>
                        <button
                            onClick={handleSaveProfile}
                            disabled={isSaving || !hasChanges}
                            className={`flex items-center gap-2 px-5 py-2.5 text-[13px] font-bold rounded-xl transition-all shadow-sm ${!hasChanges
                                    ? 'bg-zinc-100 text-zinc-400 cursor-not-allowed border-none'
                                    : 'bg-zinc-900 hover:bg-black text-white hover:shadow-md active:scale-[0.98]'
                                }`}
                        >
                            {isSaving ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Save className="w-4 h-4" strokeWidth={2.5} />
                            )}
                            {isSaving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>

                    <div className="space-y-10 pl-2">
                        {/* Profile Picture Section */}
                        <div className="flex items-start gap-8 pb-8 border-b border-zinc-100">
                            <div className="flex-shrink-0 relative group">
                                {uid ? (
                                    <ProfileUpload
                                        currentImageUrl={profileUrl}
                                        onUpdate={setProfileUrl}
                                        uid={uid}
                                    />
                                ) : (
                                    <div className="h-[100px] w-[100px] bg-zinc-100 animate-pulse rounded-2xl border border-zinc-200" />
                                )}
                            </div>
                            <div className="flex-1 pt-3 max-w-md">
                                <h3 className="text-[14px] font-bold text-zinc-950 mb-2">Profile Picture</h3>
                                <p className="text-[13px] text-zinc-500 leading-relaxed">
                                    Upload a square image (JPG or PNG). Maximum file size is 2MB. Your profile picture will be visible to other team members matching your organization.
                                </p>
                            </div>
                        </div>

                        {/* Personal Information */}
                        <div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                                <div className="space-y-2">
                                    <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2 ml-1">
                                        Full Name
                                    </label>
                                    <div className="relative">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-zinc-400" strokeWidth={1.5} />
                                        <input
                                            type="text"
                                            value={userName}
                                            onChange={(e) => setUserName(e.target.value)}
                                            className="w-full bg-zinc-50 hover:bg-zinc-100/50 border border-zinc-200 focus:bg-white rounded-xl pl-11 pr-4 py-3 text-zinc-950 text-[14px] font-medium focus:outline-none focus:border-zinc-400 focus:ring-4 focus:ring-zinc-100 transition-all placeholder:text-zinc-400"
                                            placeholder="Enter your full name"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2 ml-1">
                                        Job Role
                                    </label>
                                    <div className="relative">
                                        <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-zinc-400" strokeWidth={1.5} />
                                        <input
                                            type="text"
                                            value={userRole}
                                            onChange={(e) => setUserRole(e.target.value)}
                                            className="w-full bg-zinc-50 hover:bg-zinc-100/50 border border-zinc-200 focus:bg-white rounded-xl pl-11 pr-4 py-3 text-zinc-950 text-[14px] font-medium focus:outline-none focus:border-zinc-400 focus:ring-4 focus:ring-zinc-100 transition-all placeholder:text-zinc-400"
                                            placeholder="e.g. Marketing Manager"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2 md:col-span-2 max-w-xl">
                                    <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2 ml-1">
                                        Email Address
                                    </label>
                                    <div className="relative">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-zinc-400" strokeWidth={1.5} />
                                        <input
                                            type="email"
                                            value={userEmail}
                                            disabled
                                            className="w-full bg-zinc-100/50 border border-zinc-200/60 rounded-xl pl-11 pr-4 py-3 text-zinc-500 text-[14px] cursor-not-allowed"
                                            placeholder="your.email@example.com"
                                        />
                                    </div>
                                    <p className="text-[12px] text-zinc-500 ml-1 mt-2">Email address associated with your account cannot be changed directly.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
};
