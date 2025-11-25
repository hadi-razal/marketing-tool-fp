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
        <div className={`fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center transition-opacity duration-1000 ${visible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            <div className="text-center space-y-4 animate-in slide-in-from-bottom-10 duration-1000 fade-in">
                <div className="relative inline-block">
                    <div className="absolute inset-0 bg-orange-500 blur-3xl opacity-20 animate-pulse"></div>
                    <h1 className="text-5xl md:text-7xl font-bold text-white tracking-tighter relative z-10">Fairplatz Design LLC</h1>
                </div>
                <p className="text-zinc-500 text-sm md:text-base uppercase tracking-[0.3em] font-medium">Marketing Intelligence Tool</p>
            </div>
        </div>
    );
};
