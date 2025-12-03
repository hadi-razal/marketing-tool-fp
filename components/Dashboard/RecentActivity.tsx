import React from 'react';
import { Activity, Plus, Edit2, Trash2 } from 'lucide-react';

const activities = [
    { id: 1, user: 'Hadhi', action: 'added', target: 'Wagner Group GmbH', time: '2 mins ago', icon: Plus, color: 'text-green-500' },
    { id: 2, user: 'Sarah', action: 'edited', target: 'TechCorp Systems', time: '15 mins ago', icon: Edit2, color: 'text-blue-500' },
    { id: 3, user: 'Mike', action: 'deleted', target: 'Old Record #123', time: '1 hour ago', icon: Trash2, color: 'text-red-500' },
    { id: 4, user: 'Hadhi', action: 'added', target: 'New Lead Ltd', time: '2 hours ago', icon: Plus, color: 'text-green-500' },
];

export const RecentActivity = () => {
    return (
        <div className="bg-zinc-900/50 backdrop-blur-xl border border-white/5 p-6 rounded-2xl">
            <div className="flex items-center gap-2 mb-6">
                <Activity className="w-5 h-5 text-purple-500" />
                <h3 className="text-lg font-bold text-white">Recent Activity</h3>
            </div>
            <div className="relative space-y-6 before:absolute before:left-4 before:top-2 before:bottom-2 before:w-px before:bg-white/10">
                {activities.map((activity) => (
                    <div key={activity.id} className="relative flex gap-4 pl-2">
                        <div className={`w-8 h-8 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center z-10 ${activity.color}`}>
                            <activity.icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 pt-1">
                            <p className="text-sm text-zinc-300">
                                <span className="font-bold text-white">{activity.user}</span> {activity.action} <span className="text-white font-medium">{activity.target}</span>
                            </p>
                            <p className="text-xs text-zinc-500 mt-1">{activity.time}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
