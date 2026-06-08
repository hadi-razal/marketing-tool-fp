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
                    .limit(20);

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
        if (l === 'import') return { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-100' };
        if (l.includes('completed')) return { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100' };
        if (l.includes('add') || l.includes('new') || l.includes('save')) return { bg: 'bg-sky-50', text: 'text-sky-600', border: 'border-sky-100' };
        if (l.includes('edit') || l.includes('update')) return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-100' };
        if (l.includes('delete')) return { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-100' };
        return { bg: 'bg-zinc-50', text: 'text-zinc-500', border: 'border-zinc-100' };
    };

    return (
        <div className="flex min-h-[420px] flex-col overflow-hidden rounded-3xl border border-zinc-200/90 bg-white shadow-sm shadow-zinc-950/5">
            <div className="shrink-0 border-b border-zinc-100 px-5 py-4 sm:px-6">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-600 ring-1 ring-orange-100">
                            <Activity className="h-4 w-4" aria-hidden />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-zinc-950">Recent activity</h2>
                            <p className="text-xs text-zinc-500">Your latest actions in Fairplatz</p>
                        </div>
                    </div>
                    {!loading && activities.length > 0 && (
                        <span className="shrink-0 rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-0.5 text-[10px] font-semibold text-zinc-600">
                            {activities.length} item{activities.length === 1 ? '' : 's'}
                        </span>
                    )}
                </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 sm:px-5 sm:py-4 custom-scrollbar">
                {loading ? (
                    <div className="space-y-3">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="flex gap-3 rounded-2xl border border-zinc-100 p-3 animate-pulse">
                                <div className="h-10 w-10 shrink-0 rounded-xl bg-zinc-100" />
                                <div className="min-w-0 flex-1 space-y-2">
                                    <div className="h-3.5 w-4/5 rounded bg-zinc-100" />
                                    <div className="h-3 w-20 rounded bg-zinc-50" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : activities.length === 0 ? (
                    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-zinc-50">
                            <Activity className="h-6 w-6 text-zinc-300" />
                        </div>
                        <p className="text-sm font-semibold text-zinc-800">No activity yet</p>
                        <p className="mt-1 max-w-xs text-xs leading-relaxed text-zinc-500">
                            Imports, saves, edits, and comments will show up here as you work in the app.
                        </p>
                    </div>
                ) : (
                    <ul className="space-y-2">
                        {activities.map((activity, index) => {
                            const Icon = getIcon(activity.label);
                            const colors = getColors(activity.label);

                            return (
                                <li key={activity.id}>
                                    <div className="group flex gap-3 rounded-2xl border border-transparent p-3 transition-colors hover:border-zinc-100 hover:bg-zinc-50/80">
                                        <div className="flex flex-col items-center">
                                            <div
                                                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${colors.bg} ${colors.border}`}
                                            >
                                                <Icon className={`h-4 w-4 ${colors.text}`} />
                                            </div>
                                            {index < activities.length - 1 && (
                                                <div className="mt-2 w-px flex-1 bg-zinc-100" aria-hidden />
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1 pb-1 pt-1">
                                            <p className="text-sm font-medium leading-snug text-zinc-800">
                                                {activity.status}
                                            </p>
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
