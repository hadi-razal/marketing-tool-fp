import React, { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, CheckCircle2, Eye, Circle, Activity, UploadCloud } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { formatDistanceToNow } from 'date-fns';

interface ActivityItem {
    id: number;
    label: string;
    status: string;
    created_at: string;
    uid: string;
}

function stripActorPrefix(status: string, name: string | null | undefined, email: string | null | undefined): string {
    let s = status;
    const candidates = [name?.trim(), email?.trim()].filter(Boolean) as string[];
    for (const prefix of candidates) {
        if (!prefix) continue;
        const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        s = s.replace(new RegExp(`^${escaped}\\s+`, 'i'), '');
    }
    return s;
}

export const RecentActivity = () => {
    const [activities, setActivities] = useState<ActivityItem[]>([]);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    useEffect(() => {
        const fetchActivities = async () => {
            try {
                const {
                    data: { user },
                } = await supabase.auth.getUser();
                if (!user?.id) {
                    setActivities([]);
                    return;
                }

                const { data: profile } = await supabase.from('users').select('name').eq('uid', user.id).maybeSingle();

                const { data: activityData, error } = await supabase
                    .from('activities')
                    .select('*')
                    .eq('uid', user.id)
                    .order('created_at', { ascending: false })
                    .limit(10);

                if (error) throw error;

                if (activityData?.length) {
                    const displayName = profile?.name?.trim() || null;
                    const email = user.email || null;

                    const mappedActivities = (activityData as ActivityItem[]).map((a) => ({
                        ...a,
                        status: stripActorPrefix(a.status, displayName, email),
                    }));

                    setActivities(mappedActivities);
                } else {
                    setActivities([]);
                }
            } catch (error) {
                console.error('Error fetching activities:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchActivities();
    }, []);

    const getIcon = (label: string) => {
        const l = label.toLowerCase();
        if (l === 'import') return UploadCloud;
        if (l.includes('completed')) return CheckCircle2;
        if (l.includes('add') || l.includes('new') || l.includes('save')) return Plus;
        if (l.includes('edit') || l.includes('update')) return Edit2;
        if (l.includes('delete')) return Trash2;
        if (l.includes('visibility')) return Eye;
        return Circle;
    };

    const getColors = (label: string) => {
        const l = label.toLowerCase();
        if (l === 'import') return { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200' };
        if (l.includes('completed')) return { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200' };
        if (l.includes('add') || l.includes('new') || l.includes('save')) return { bg: 'bg-sky-50', text: 'text-sky-600', border: 'border-sky-200' };
        if (l.includes('edit') || l.includes('update')) return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' };
        if (l.includes('delete')) return { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200' };
        return { bg: 'bg-zinc-100', text: 'text-zinc-600', border: 'border-zinc-200' };
    };

    return (
        <div className="relative flex max-h-[min(560px,calc(100vh-10rem))] min-h-[280px] flex-col overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm shadow-zinc-950/5">
            <div className="pointer-events-none absolute right-0 top-0 h-48 w-48 translate-x-1/4 -translate-y-1/4 rounded-full bg-orange-500/10 blur-3xl" />

            <div className="relative shrink-0 border-b border-zinc-100 px-5 pb-4 pt-5 sm:px-6">
                <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-50 text-orange-600 ring-1 ring-orange-100">
                        <Activity className="h-4 w-4" aria-hidden />
                    </div>
                    <div>
                        <h3 className="text-base font-bold text-zinc-950">Your recent activity</h3>
                        <p className="text-xs text-zinc-500">Last 10 actions on your account</p>
                    </div>
                </div>
            </div>

            <div className="relative min-h-0 flex-1 overflow-y-auto px-3 py-3 sm:px-5 sm:py-4 custom-scrollbar">
                <div className="pointer-events-none absolute bottom-6 left-[27px] top-3 w-px bg-zinc-100 sm:left-[31px]" aria-hidden />

                {loading ? (
                    <div className="flex flex-col gap-3">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="flex gap-3 rounded-xl p-2 animate-pulse sm:gap-4">
                                <div className="relative z-10 h-10 w-10 shrink-0 rounded-xl bg-zinc-200" />
                                <div className="min-w-0 flex-1 space-y-2 py-0.5">
                                    <div className="h-3.5 w-full max-w-[90%] rounded bg-zinc-200" />
                                    <div className="h-3 w-24 rounded bg-zinc-100" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : activities.length === 0 ? (
                    <div className="flex flex-col items-center justify-center px-4 py-14 text-center">
                        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-50">
                            <Circle className="h-6 w-6 text-zinc-400" />
                        </div>
                        <p className="text-sm font-medium text-zinc-700">Nothing yet</p>
                        <p className="mt-1 max-w-[240px] text-xs leading-relaxed text-zinc-500">
                            Comments, saves, and tasks will appear here as you use the app.
                        </p>
                    </div>
                ) : (
                    <ul className="relative space-y-1">
                        {activities.map((activity) => {
                            const Icon = getIcon(activity.label);
                            const colors = getColors(activity.label);

                            return (
                                <li key={activity.id}>
                                    <div className="group flex gap-3 rounded-xl p-2 transition-colors hover:bg-zinc-50 sm:gap-3.5 sm:p-2.5">
                                        <div
                                            className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${colors.bg} ${colors.border} transition-transform duration-200 group-hover:scale-[1.02]`}
                                        >
                                            <Icon className={`h-5 w-5 ${colors.text}`} />
                                        </div>
                                        <div className="min-w-0 flex-1 py-0.5">
                                            <p className="text-sm font-medium leading-snug text-zinc-800">{activity.status}</p>
                                            <p className="mt-1 text-[11px] font-medium tabular-nums text-zinc-400">
                                                {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                                            </p>
                                        </div>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
        </div>
    );
};
