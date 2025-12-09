import React, { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, CheckCircle2, Eye, Circle } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { formatDistanceToNow } from 'date-fns';

interface ActivityItem {
    id: number;
    label: string;
    status: string;
    created_at: string;
    uid: string;
    user_name?: string;
}

export const RecentActivity = () => {
    const [activities, setActivities] = useState<ActivityItem[]>([]);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    useEffect(() => {
        const fetchActivities = async () => {
            try {
                const { data: activityData, error } = await supabase
                    .from('activities')
                    .select('*')
                    .order('created_at', { ascending: false })
                    .limit(10);

                if (error) throw error;

                if (activityData) {
                    const userIds = [...new Set(activityData.map((a: any) => a.uid).filter(Boolean))];
                    let userMap: Record<string, string> = {};

                    if (userIds.length > 0) {
                        const { data: users } = await supabase
                            .from('users')
                            .select('uid, name')
                            .in('uid', userIds);

                        if (users) {
                            userMap = users.reduce((acc: any, user: any) => {
                                acc[user.uid] = user.name;
                                return acc;
                            }, {});
                        }
                    }

                    const mappedActivities = activityData.map((a: any) => ({
                        ...a,
                        user_name: userMap[a.uid] || 'Unknown User'
                    }));

                    setActivities(mappedActivities);
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
        if (l.includes('completed')) return CheckCircle2;
        if (l.includes('add') || l.includes('new') || l.includes('save')) return Plus;
        if (l.includes('edit') || l.includes('update')) return Edit2;
        if (l.includes('delete')) return Trash2;
        if (l.includes('visibility')) return Eye;
        return Circle;
    };

    const getColors = (label: string) => {
        const l = label.toLowerCase();
        if (l.includes('completed')) return { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' };
        if (l.includes('add') || l.includes('new') || l.includes('save')) return { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' };
        if (l.includes('edit') || l.includes('update')) return { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' };
        if (l.includes('delete')) return { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20' };
        return { bg: 'bg-zinc-500/10', text: 'text-zinc-400', border: 'border-zinc-500/20' };
    };

    return (
        <div className="bg-zinc-900/40 backdrop-blur-sm rounded-2xl p-6 border border-white/5 shadow-lg relative overflow-hidden h-full">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

            <h3 className="text-base font-bold text-white mb-6 flex items-center gap-2">
                <div className="w-1 h-4 bg-indigo-500 rounded-full" />
                Recent Activity
            </h3>

            <div className="space-y-4 relative">
                {/* Vertical Line */}
                <div className="absolute left-[19px] top-2 bottom-4 w-[1px] bg-zinc-800/50 -z-10" />

                {loading ? (
                    <div className="flex flex-col gap-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="flex gap-4 animate-pulse">
                                <div className="w-10 h-10 rounded-full bg-zinc-800" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 w-3/4 bg-zinc-800 rounded" />
                                    <div className="h-3 w-1/4 bg-zinc-800 rounded" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : activities.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-3 border border-white/5">
                            <Circle className="w-6 h-6 text-zinc-600" />
                        </div>
                        <p className="text-zinc-500 text-sm">No recent activity found</p>
                    </div>
                ) : (
                    activities.map((activity, index) => {
                        const Icon = getIcon(activity.label);
                        const colors = getColors(activity.label);

                        return (
                            <div key={activity.id} className="group flex items-start gap-4">
                                <div className={`relative z-10 w-10 h-10 rounded-xl ${colors.bg} ${colors.border} border flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 duration-200`}>
                                    <Icon className={`w-5 h-5 ${colors.text}`} />
                                </div>
                                <div className="flex-1 py-1 min-w-0">
                                    <p className="text-sm text-zinc-300 leading-relaxed font-medium">
                                        <span className="text-white font-bold">{activity.user_name}</span>
                                        <span className="mx-1.5 text-zinc-500">•</span>
                                        {activity.status}
                                    </p>
                                    <p className="text-xs text-zinc-500 mt-1 font-medium">
                                        {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                                    </p>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};
