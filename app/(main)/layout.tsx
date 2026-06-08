'use client';
import React, { useState } from 'react';
import { MainSidebar } from '@/components/MainSidebar';
import { Menu } from 'lucide-react';
import { SplashIntro } from '@/components/SplashIntro';
import { PageTransition } from '@/components/ui/PageTransition';
import { FairplatzAIWidget } from '@/components/FairplatzAIWidget';

export default function MainLayout({ children }: { children: React.ReactNode }) {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [showSplash, setShowSplash] = useState(true);

    return (
        <>
            {showSplash && <SplashIntro onComplete={() => setShowSplash(false)} />}

            <div className={`h-screen bg-[#f7f5f2] text-zinc-950 font-sans selection:bg-orange-500/20 overflow-hidden flex relative transition-opacity duration-700 ${showSplash ? 'opacity-0' : 'opacity-100'}`}>
                {/* Background Effects */}
                <div className="absolute inset-0 pointer-events-none z-0">
                    <div className="absolute top-[-18%] left-[-10%] w-[48%] h-[48%] bg-orange-400/18 rounded-full blur-[130px]" />
                    <div className="absolute bottom-[-20%] right-[-12%] w-[46%] h-[46%] bg-zinc-900/8 rounded-full blur-[120px]" />
                </div>

                {/* Sidebar */}
                <MainSidebar isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />

                {/* Main Content Area */}
                <main className="relative z-10 flex h-full flex-1 flex-col overflow-hidden transition-all duration-300">
                    {/* Mobile Header */}
                    <div className="lg:hidden p-4 flex items-center justify-between bg-white/90 backdrop-blur-md border-b border-zinc-200 z-30">
                        <img src="/FP_black.png" alt="Fairplatz" className="h-8 w-auto object-contain" />
                        <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 hover:bg-orange-50 rounded-lg">
                            <Menu className="w-6 h-6 text-zinc-950" />
                        </button>
                    </div>

                    {/* Page Content */}
                    <div className="flex-1 overflow-hidden p-4 lg:p-6 relative">
                        <PageTransition className="h-full">
                            {children}
                        </PageTransition>
                    </div>

                    {/* Global AI Widget */}
                    <FairplatzAIWidget />
                </main>
            </div>
        </>
    );
}
