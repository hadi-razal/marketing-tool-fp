import React, { useEffect, useState } from 'react';
import { Activity, Plus, Edit2, Trash2, CheckCircle2, ArrowRight, Eye } from 'lucide-react';
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
                // 1. Fetch Activities
                const { data: activityData, error } = await supabase
                    .from('activities')
                    .select('*')
                    .order('created_at', { ascending: false })
                    .limit(10);

                if (error) throw error;

                if (activityData) {
                    // 2. Fetch User Names
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

                    // 3. Map Data
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
        if (l.includes('completed') || l.includes('marked as completed')) return CheckCircle2;
        if (l.includes('add') || l.includes('new')) return Plus;
        if (l.includes('edit')) return Edit2;
        if (l.includes('delete')) return Trash2;
        if (l.includes('visibility')) return Eye;
        return Activity;
    };

    const getColor = (label: string) => {
        const l = label.toLowerCase();
        if (l.includes('completed')) return 'text-green-500 bg-green-500/10 border-green-500/20';
        if (l.includes('add')) return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
        if (l.includes('edit')) return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
        if (l.includes('delete')) return 'text-red-500 bg-red-500/10 border-red-500/20';
        return 'text-zinc-500 bg-zinc-500/10 border-zinc-500/20';
    };

    return (
        <div className="bg-[#09090b] border border-white/5 p-6 rounded-[32px] h-full flex flex-col">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-purple-500" />
                    <h3 className="text-lg font-bold text-white">Recent Activity</h3>
                </div>
                {/* <button className="text-xs font-bold text-zinc-500 hover:text-white transition-colors flex items-center gap-1">
                    View All <ArrowRight className="w-3 h-3" />
                </button> */}
            </div>

            <div className="relative space-y-6 before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-px before:bg-white/5">
                {loading ? (
                    <div className="text-zinc-500 text-sm pl-12">Loading activities...</div>
                ) : activities.length === 0 ? (
                    <div className="text-zinc-500 text-sm pl-12">No recent activity.</div>
                ) : (
                    activities.map((activity) => {
                        const Icon = getIcon(activity.label);
                        const colorClass = getColor(activity.label);
                        const userName = activity.user_name || 'User';
                        const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=random&color=fff`;

                        return (
                            <div key={activity.id} className="relative flex gap-4 group cursor-pointer">
                                <div className={`w-10 h-10 rounded-full border flex items-center justify-center z-10 shrink-0 transition-transform group-hover:scale-110 ${colorClass} bg-[#09090b]`}>
                                    <Icon className="w-5 h-5" />
                                </div>

                                <div className="flex-1 pt-1 bg-zinc-900/0 group-hover:bg-zinc-900/50 p-3 -ml-3 rounded-2xl transition-all border border-transparent group-hover:border-white/5">
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-2 mb-1">
                                            <img src={avatarUrl} alt={userName} className="w-5 h-5 rounded-full" />
                                            <span className="font-bold text-white text-sm">{userName}</span>
                                        </div>
                                        <span className="text-[10px] font-medium text-zinc-500">
                                            {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                                        </span>
                                    </div>

                                    <p className="text-sm text-zinc-400 leading-snug">
                                        {activity.status}
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
