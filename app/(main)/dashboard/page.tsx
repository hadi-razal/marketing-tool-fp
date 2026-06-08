'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { RecentActivity } from '@/components/Dashboard/RecentActivity';
import { createClient } from '@/lib/supabase';
import { Calendar, ArrowRight, Sparkles } from 'lucide-react';
import { format } from 'date-fns';

export default function DashboardPage() {
    const [userName, setUserName] = useState('');
    const [userProfileUrl, setUserProfileUrl] = useState<string | null>(null);
    const [loadingUser, setLoadingUser] = useState(true);

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good morning';
        if (hour < 18) return 'Good afternoon';
        return 'Good evening';
    };

    const firstName = userName.trim().split(/\s+/)[0] || 'there';
    const todayLabel = format(new Date(), 'EEEE, MMMM d, yyyy');
    const initials = userName
        .trim()
        .split(/\s+/)
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase() || 'FP';

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const supabase = createClient();
                const {
                    data: { user },
                } = await supabase.auth.getUser();

                if (user) {
                    const { data: userData } = await supabase
                        .from('users')
                        .select('name, profile_url')
                        .eq('uid', user.id)
                        .single();

                    if (userData?.name) setUserName(userData.name);
                    if (userData?.profile_url) setUserProfileUrl(userData.profile_url);
                }
            } catch (err) {
                console.error('Failed to fetch user', err);
            } finally {
                setLoadingUser(false);
            }
        };

        fetchUser();
    }, []);

    return (
        <div className="relative h-full overflow-y-auto custom-scrollbar">
            <div
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_45%_at_50%_-10%,rgba(251,146,60,0.12),transparent)]"
                aria-hidden
            />

            <div className="relative mx-auto flex min-h-full max-w-3xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-10 lg:py-12">
                {/* Welcome */}
                <header className="text-center sm:text-left">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-600/80">
                        {todayLabel}
                    </p>

                    <div className="mt-5 flex flex-col items-center gap-5 sm:flex-row sm:items-start">
                        <div className="relative shrink-0">
                            <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border-2 border-white bg-linear-to-br from-orange-500 to-amber-500 text-lg font-bold text-white shadow-lg shadow-orange-500/25 sm:h-18 sm:w-18">
                                {loadingUser ? (
                                    <div className="h-full w-full animate-pulse bg-white/20" />
                                ) : userProfileUrl ? (
                                    <img src={userProfileUrl} alt={userName} className="h-full w-full object-cover" />
                                ) : (
                                    initials
                                )}
                            </div>
                            <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-lg border border-white bg-white text-orange-500 shadow-sm">
                                <Sparkles className="h-3.5 w-3.5" />
                            </span>
                        </div>

                        <div className="min-w-0 space-y-2 text-center sm:text-left">
                            <p className="text-sm text-zinc-500">
                                {getGreeting()},{' '}
                                <span className="font-semibold text-zinc-800">
                                    {loadingUser ? '…' : firstName}
                                </span>
                            </p>
                            <h1 className="text-balance text-3xl font-bold tracking-tight text-zinc-950 sm:text-4xl">
                                Welcome back
                            </h1>
                            <p className="mx-auto max-w-md text-pretty text-sm leading-relaxed text-zinc-500 sm:mx-0">
                                Here&apos;s what you&apos;ve been up to lately. Jump into shows when you&apos;re ready to plan your next move.
                            </p>

                            <Link
                                href="/shows"
                                className="mt-1 inline-flex items-center gap-2 rounded-xl bg-linear-to-r from-orange-600 to-orange-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-500/25 transition hover:from-orange-500 hover:to-orange-400"
                            >
                                <Calendar className="h-4 w-4" />
                                Browse shows
                                <ArrowRight className="h-4 w-4 opacity-80" />
                            </Link>
                        </div>
                    </div>
                </header>

                {/* Recent activity — main focus */}
                <section aria-label="Recent activity" className="flex min-h-0 flex-1 flex-col">
                    <RecentActivity />
                </section>
            </div>
        </div>
    );
}
