'use client';
//@ts-nocheck
import React, { useState } from 'react';
import { Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { SearchPage } from '@/components/SearchPage';
import { DatabasePage } from '@/components/DatabasePage';
import { DashboardPage } from '@/components/DashboardPage';
import { ZohoPage } from '@/components/ZohoPage';
import { Navigation } from '@/components/Navigation';
import { Onboarding, HelpButton } from '@/components/Onboarding';
import { SplashIntro } from '@/components/SplashIntro';

export default function App() {
  const [activeTab, setActiveTab] = useState('search');
  const [showSplash, setShowSplash] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [notification, setNotification] = useState<any>(null);

  const notify = (message: string, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleSave = async (leads: any) => {
    const { error }: any = await supabase.from('leads').insert(leads);
    if (!error) notify(`${leads.length} contacts saved`, 'success');
  };

  return (
    <>
      {showSplash && <SplashIntro onComplete={() => { setShowSplash(false); setShowOnboarding(true); }} />}
      {showOnboarding && <Onboarding onClose={() => setShowOnboarding(false)} />}

      <div className={`h-screen bg-[#09090b] text-zinc-100 font-sans selection:bg-orange-500/30 overflow-hidden relative p-4 lg:p-6 transition-opacity duration-700 ${showSplash ? 'opacity-0' : 'opacity-100'}`}>
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>

        <HelpButton onClick={() => setShowOnboarding(true)} />

        <main className="relative z-10 h-full max-w-[1800px] mx-auto">
          {activeTab === 'search' && <SearchPage onSave={handleSave} notify={notify} />}
          {activeTab === 'database' && <DatabasePage notify={notify} />}
          {activeTab === 'dashboard' && <DashboardPage />}
          {activeTab === 'zoho' && <ZohoPage />}
        </main>

        <Navigation active={activeTab} setActive={setActiveTab} />

        {notification && (
          <div className="fixed top-6 right-6 z-[100] animate-in slide-in-from-top-4 fade-in">
            <div className="bg-zinc-900/90 backdrop-blur border border-zinc-800 pl-4 pr-6 py-3 rounded-2xl flex items-center gap-3 shadow-xl">
              <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center"><Check className="w-4 h-4 text-green-500" /></div>
              <span className="font-medium text-sm">{notification.message}</span>
            </div>
          </div>
        )}
        <style jsx global>{`
          .custom-scrollbar::-webkit-scrollbar { width: 5px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: #27272a; border-radius: 10px; }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #3f3f46; }
        `}</style>
      </div>
    </>
  );
}