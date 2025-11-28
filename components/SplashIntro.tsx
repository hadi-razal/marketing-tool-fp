import React, { useState, useEffect } from 'react';

interface SplashIntroProps {
    onComplete: () => void;
}

export const SplashIntro: React.FC<SplashIntroProps> = ({ onComplete }) => {
    const [visible, setVisible] = useState(true);
    useEffect(() => {
        const timer = setTimeout(() => setVisible(false), 2500);
        const completeTimer = setTimeout(onComplete, 3000);
        return () => { clearTimeout(timer); clearTimeout(completeTimer); };
    }, []);
    return (
        <div className={`fixed inset-0 z-[100] bg-[#09090b] flex flex-col items-center justify-center transition-opacity duration-1000 ${visible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-orange-500/20 blur-[100px] rounded-full animate-pulse"></div>
            </div>
            <div className="text-center space-y-6 animate-in slide-in-from-bottom-10 duration-1000 fade-in relative z-10">
                <div className="relative inline-block">
                    <h1 className="text-5xl md:text-7xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-zinc-500 tracking-tighter">Fairplatz Design LLC</h1>
                </div>
                <p className="text-orange-500 text-sm md:text-base uppercase tracking-[0.5em] font-bold">Marketing Intelligence Tool</p>
            </div>
        </div>
    );
};
