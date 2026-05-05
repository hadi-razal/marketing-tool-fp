import React, { useState, useEffect } from 'react';

interface SplashIntroProps {
    onComplete: () => void;
}

export const SplashIntro: React.FC<SplashIntroProps> = ({ onComplete }) => {
    const [visible, setVisible] = useState(true);
    useEffect(() => {
        const timer = setTimeout(() => setVisible(false), 2500);
        const completeTimer = setTimeout(onComplete, 3000);
        return () => {
            clearTimeout(timer);
            clearTimeout(completeTimer);
        };
    }, []);

    return (
        <div
            className={`fixed inset-0 z-100 flex flex-col items-center justify-center bg-[#f7f5f2] text-zinc-950 transition-opacity duration-1000 selection:bg-orange-500/20 ${visible ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
        >
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="absolute top-[-18%] left-[-10%] h-[48%] w-[48%] rounded-full bg-orange-400/18 blur-[130px]" />
                <div className="absolute bottom-[-20%] right-[-12%] h-[46%] w-[46%] rounded-full bg-zinc-900/8 blur-[120px]" />
                <div className="absolute inset-0 bg-[linear-gradient(rgba(17,17,17,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(17,17,17,0.035)_1px,transparent_1px)] bg-size-[44px_44px]" />
                <div className="absolute left-1/2 top-1/2 h-[min(90vw,420px)] w-[min(90vw,420px)] -translate-x-1/2 -translate-y-1/2 animate-pulse rounded-full bg-orange-500/10 blur-[88px]" />
            </div>

            <div className="fade-in relative z-10 space-y-5 px-6 text-center duration-1000 animate-in slide-in-from-bottom-8">
                <div className="relative inline-block">
                    <h1 className="text-balance bg-linear-to-br from-zinc-950 via-zinc-800 to-zinc-600 bg-clip-text text-4xl font-bold tracking-tight text-transparent md:text-6xl">
                        Fairplatz Design LLC
                    </h1>
                </div>
                <p className="text-xs font-bold uppercase tracking-[0.28em] text-orange-600 md:text-sm md:tracking-[0.38em]">
                    Marketing Intelligence Tool
                </p>
            </div>
        </div>
    );
};
