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
                    .limit(8);

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
        if (l.includes('add') || l.includes('new')) return Plus;
        if (l.includes('edit')) return Edit2;
        if (l.includes('delete')) return Trash2;
        if (l.includes('visibility')) return Eye;
        return Circle;
    };

    const getColor = (label: string) => {
        const l = label.toLowerCase();
        if (l.includes('completed')) return 'text-emerald-400';
        if (l.includes('add')) return 'text-blue-400';
        if (l.includes('edit')) return 'text-amber-400';
        if (l.includes('delete')) return 'text-red-400';
        return 'text-zinc-500';
    };

    return (
        <div className="bg-zinc-900/50 rounded-2xl p-5 border border-white/[0.04]">
            <h3 className="text-sm font-medium text-white mb-5">Recent Activity</h3>

            <div className="space-y-1">
                {loading ? (
                    <p className="text-zinc-500 text-sm py-4">Loading...</p>
                ) : activities.length === 0 ? (
                    <p className="text-zinc-500 text-sm py-4">No recent activity</p>
                ) : (
                    activities.map((activity) => {
                        const Icon = getIcon(activity.label);
                        const colorClass = getColor(activity.label);

                        return (
                            <div
                                key={activity.id}
                                className="flex items-start gap-3 py-3 border-b border-white/[0.03] last:border-0"
                            >
                                <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${colorClass}`} />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-zinc-300 leading-snug">
                                        <span className="font-medium text-white">{activity.user_name}</span>
                                        {' '}{activity.status}
                                    </p>
                                    <p className="text-xs text-zinc-600 mt-1">
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
