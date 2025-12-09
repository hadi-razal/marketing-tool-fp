'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { CheckCircle2, Loader2, ArrowRight } from 'lucide-react';

export default function EmailConfirmedPage() {
    const router = useRouter();
    const [timeLeft, setTimeLeft] = useState(4);

    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    router.push('/login');
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [router]);

    return (
        <div className="min-h-screen bg-[#09090b] flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-green-500/10 rounded-full blur-[100px] animate-pulse"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/10 rounded-full blur-[100px] animate-pulse delay-1000"></div>
            </div>

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-md relative z-10"
            >
                <div className="bg-zinc-900/50 backdrop-blur-2xl border border-white/10 rounded-[32px] p-8 shadow-2xl text-center">
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", duration: 0.6, delay: 0.2 }}
                        className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-green-500/20"
                    >
                        <CheckCircle2 className="w-10 h-10 text-green-500" />
                    </motion.div>

                    <h1 className="text-2xl font-bold text-white mb-2">Email Verified</h1>
                    <p className="text-zinc-400 mb-8">
                        Your email has been successfully verified. You will be redirected to the login page shortly.
                    </p>

                    <div className="flex flex-col items-center justify-center gap-4">
                        <div className="flex items-center gap-3 text-sm font-medium text-zinc-300 bg-black/20 px-4 py-2 rounded-full border border-white/5">
                            <Loader2 className="w-4 h-4 animate-spin text-green-500" />
                            <span>Redirecting in {timeLeft}s...</span>
                        </div>

                        <button
                            onClick={() => router.push('/login')}
                            className="bg-white/5 hover:bg-white/10 text-white text-sm font-medium py-2 px-6 rounded-xl transition-all flex items-center gap-2 group"
                        >
                            Go to Login Now <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
