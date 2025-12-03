import React from 'react';
import { CheckCircle2, Circle, Clock } from 'lucide-react';

const todos = [
    { id: 1, task: 'Review new exhibitor leads', priority: 'high', time: '2h' },
    { id: 2, task: 'Update campaign assets', priority: 'medium', time: '4h' },
    { id: 3, task: 'Sync Zoho CRM contacts', priority: 'low', time: '1d' },
    { id: 4, task: 'Prepare weekly report', priority: 'high', time: '2d' },
];

export const PendingTodos = () => {
    return (
        <div className="bg-zinc-900/50 backdrop-blur-xl border border-white/5 p-6 rounded-2xl h-full">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-white">Pending Tasks</h3>
                <span className="text-xs font-bold bg-white/5 text-zinc-400 px-2 py-1 rounded-lg">4 Pending</span>
            </div>
            <div className="space-y-3">
                {todos.map((todo) => (
                    <div key={todo.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors group cursor-pointer border border-transparent hover:border-white/5">
                        <Circle className="w-5 h-5 text-zinc-600 group-hover:text-orange-500 transition-colors" />
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-zinc-200 truncate group-hover:text-white transition-colors">{todo.task}</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${todo.priority === 'high' ? 'bg-red-500' :
                                    todo.priority === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'
                                }`} />
                            <span className="text-xs text-zinc-500 font-medium">{todo.time}</span>
                        </div>
                    </div>
                ))}
            </div>
            <button className="w-full mt-4 py-2 text-xs font-bold text-zinc-500 hover:text-white uppercase tracking-wider transition-colors">
                View All Tasks
            </button>
        </div>
    );
};
