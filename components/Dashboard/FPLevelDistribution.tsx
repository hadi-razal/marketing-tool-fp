import React from 'react';

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

    const levelData = [
        { label: 'Level 1', value: levels.level1, color: 'bg-red-400' },
        { label: 'Level 2', value: levels.level2, color: 'bg-amber-400' },
        { label: 'Level 3', value: levels.level3, color: 'bg-yellow-400' },
        { label: 'Level 4', value: levels.level4, color: 'bg-emerald-400' },
    ];

    return (
        <div className="bg-zinc-900/50 rounded-2xl p-5 border border-white/[0.04]">
            <div className="flex items-center justify-between mb-5">
                <h3 className="text-sm font-medium text-white">FP Levels</h3>
                <span className="text-xs text-zinc-500">{total} total</span>
            </div>

            <div className="space-y-4">
                {levelData.map((level) => (
                    <div key={level.label} className="space-y-2">
                        <div className="flex justify-between text-xs">
                            <span className="text-zinc-400">{level.label}</span>
                            <span className="text-zinc-300 font-medium">{level.value}</span>
                        </div>
                        <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full ${level.color} transition-all duration-500`}
                                style={{ width: `${getPercentage(level.value)}%` }}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
