import React from 'react';
import { BarChart3 } from 'lucide-react';

interface FPLevelDistributionProps {
    levels: {
        level1: number;
        level2: number;
        level3: number;
        level4: number;
    };
}

export const FPLevelDistribution: React.FC<FPLevelDistributionProps> = ({ levels }) => {
    const total = levels.level1 + levels.level2 + levels.level3 + levels.level4;

    const getPercentage = (value: number) => {
        if (total === 0) return 0;
        return (value / total) * 100;
    };

    return (
        <div className="bg-[#09090b] border border-white/5 p-6 rounded-[32px] h-full">
            <div className="flex items-center gap-2 mb-6">
                <BarChart3 className="w-5 h-5 text-orange-500" />
                <h3 className="text-lg font-bold text-white">FP Level Distribution</h3>
            </div>

            <div className="space-y-5">
                {[
                    { label: 'Level 1', value: levels.level1, color: 'bg-red-500' },
                    { label: 'Level 2', value: levels.level2, color: 'bg-orange-500' },
                    { label: 'Level 3', value: levels.level3, color: 'bg-yellow-500' },
                    { label: 'Level 4', value: levels.level4, color: 'bg-green-500' },
                ].map((level) => (
                    <div key={level.label}>
                        <div className="flex justify-between text-sm mb-2">
                            <span className="text-zinc-400 font-medium">{level.label}</span>
                            <span className="text-white font-bold">{level.value} Companies</span>
                        </div>
                        <div className="w-full h-2 bg-zinc-900 rounded-full overflow-hidden border border-white/5">
                            <div
                                className={`h-full rounded-full ${level.color}`}
                                style={{ width: `${getPercentage(level.value)}%` }}
                            />
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-6 pt-6 border-t border-white/5 flex justify-between items-center">
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Total Classified</span>
                <span className="text-xl font-bold text-white">{total}</span>
            </div>
        </div>
    );
};
