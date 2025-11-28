'use client';
import React, { useState } from 'react';
import { MainSidebar } from '@/components/MainSidebar';
import { Menu } from 'lucide-react';
import { SplashIntro } from '@/components/SplashIntro';

export default function MainLayout({ children }: { children: React.ReactNode }) {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [showSplash, setShowSplash] = useState(true);

    return (
        <>
            {showSplash && <SplashIntro onComplete={() => setShowSplash(false)} />}

            <div className={`h-screen bg-[#09090b] text-zinc-100 font-sans selection:bg-orange-500/30 overflow-hidden flex relative transition-opacity duration-700 ${showSplash ? 'opacity-0' : 'opacity-100'}`}>
                {/* Background Effects */}
                <div className="absolute inset-0 pointer-events-none z-0">
                    <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-orange-500/5 rounded-full blur-[120px]" />
                    <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-500/5 rounded-full blur-[120px]" />
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
                </div>

                {/* Sidebar */}
                <MainSidebar isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />

                {/* Main Content Area */}
                <main className="flex-1 h-full overflow-hidden relative flex flex-col z-10">
                    {/* Mobile Header */}
                    <div className="lg:hidden p-4 flex items-center justify-between bg-zinc-900/50 backdrop-blur-md border-b border-white/5 z-30">
                        <div className="font-bold text-lg text-white">Fairplatz</div>
                        <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 hover:bg-white/10 rounded-lg">
                            <Menu className="w-6 h-6 text-white" />
                        </button>
                    </div>

                    {/* Page Content */}
                    <div className="flex-1 overflow-hidden p-4 lg:p-6 relative">
                        {children}
                    </div>
                </main>
            </div>
        </>
    );
}
