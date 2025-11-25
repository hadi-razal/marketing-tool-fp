import React, { useState } from 'react';
import { X, HelpCircle, ChevronRight, Check } from 'lucide-react';

interface OnboardingProps {
    onClose: () => void;
}

export const Onboarding: React.FC<OnboardingProps> = ({ onClose }) => {
    const [step, setStep] = useState(0);

    const steps = [
        {
            title: "Welcome to Fairplatz",
            description: "Your advanced marketing intelligence tool. Let's get you started with a quick tour.",
            icon: "👋"
        },
        {
            title: "Find Prospects",
            description: "Use the 'Search' tab to find leads manually or upload a CSV for bulk enrichment.",
            icon: "🔍"
        },
        {
            title: "Manage Data",
            description: "Save your findings to the 'Database'. You can organize, rename, and export your lists.",
            icon: "💾"
        },
        {
            title: "Export & Grow",
            description: "Export your curated lists to CSV and supercharge your marketing campaigns.",
            icon: "🚀"
        }
    ];

    const handleNext = () => {
        if (step < steps.length - 1) {
            setStep(step + 1);
        } else {
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-300">
            <div className="bg-zinc-900 border border-zinc-800 w-full max-w-md rounded-3xl p-8 shadow-2xl relative animate-in zoom-in-95 duration-300">
                <button onClick={onClose} className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors">
                    <X className="w-5 h-5" />
                </button>

                <div className="flex flex-col items-center text-center space-y-6">
                    <div className="text-6xl animate-bounce-subtle">{steps[step].icon}</div>

                    <div className="space-y-2">
                        <h2 className="text-2xl font-bold text-white">{steps[step].title}</h2>
                        <p className="text-zinc-400 text-sm leading-relaxed">{steps[step].description}</p>
                    </div>

                    <div className="flex gap-2 mt-4">
                        {steps.map((_, i) => (
                            <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === step ? 'w-8 bg-orange-500' : 'w-2 bg-zinc-800'}`} />
                        ))}
                    </div>

                    <button
                        onClick={handleNext}
                        className="w-full py-3.5 rounded-xl bg-white text-black font-bold text-sm hover:bg-zinc-200 transition-all flex items-center justify-center gap-2 mt-4"
                    >
                        {step === steps.length - 1 ? 'Get Started' : 'Next'}
                        {step === steps.length - 1 ? <Check className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                </div>
            </div>
        </div>
    );
};

export const HelpButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
    <button
        onClick={onClick}
        className="fixed top-6 right-6 z-50 w-10 h-10 rounded-full bg-zinc-900/50 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all backdrop-blur-md"
        title="Help & Instructions"
    >
        <HelpCircle className="w-5 h-5" />
    </button>
);
