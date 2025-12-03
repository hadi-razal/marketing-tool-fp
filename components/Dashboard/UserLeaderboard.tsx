import React from 'react';
import { Trophy, Phone, FileText } from 'lucide-react';

const users = [
    { id: 1, name: 'Sarah Wilson', calls: 45, details: 120, score: 98 },
    { id: 2, name: 'Mike Johnson', calls: 38, details: 95, score: 85 },
    { id: 3, name: 'Emma Davis', calls: 32, details: 110, score: 82 },
];

export const UserLeaderboard = () => {
    return (
        <div className="bg-zinc-900/50 backdrop-blur-xl border border-white/5 p-6 rounded-2xl">
            <div className="flex items-center gap-2 mb-6">
                <Trophy className="w-5 h-5 text-yellow-500" />
                <h3 className="text-lg font-bold text-white">Top Performers</h3>
            </div>
            <div className="space-y-4">
                {users.map((user, index) => (
                    <div key={user.id} className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/5">
                        <div className="w-8 h-8 flex items-center justify-center font-bold text-zinc-500 bg-black/20 rounded-lg">
                            #{index + 1}
                        </div>
                        <div className="flex-1">
                            <h4 className="font-bold text-white">{user.name}</h4>
                            <div className="flex items-center gap-4 mt-1 text-xs text-zinc-400">
                                <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {user.calls} calls</span>
                                <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> {user.details} details</span>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-xl font-bold text-white">{user.score}</div>
                            <div className="text-[10px] uppercase font-bold text-zinc-500">Score</div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
