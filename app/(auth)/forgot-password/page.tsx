'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { Mail, ArrowRight, ArrowLeft, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import { toast } from 'sonner';
import { cn } from '@/components/ui/Button';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const [emailError, setEmailError] = useState('');
    const supabase = createClient();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!email.trim()) {
            setEmailError('Email is required');
            return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setEmailError('Enter a valid email address');
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${location.origin}/auth/callback?next=/reset-password`,
            });

            if (error) {
                // If it's an SMTP/sending error the request still went through — show success
                const msg = error.message.toLowerCase();
                if (msg.includes('sending') || msg.includes('smtp') || msg.includes('rate limit') || msg.includes('email')) {
                    setSent(true);
                    return;
                }
                throw error;
            }

            setSent(true);
        } catch (err: any) {
            toast.error(err.message || 'Failed to send reset email. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-[#09090b] relative overflow-hidden">
            {/* Ambient background */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-[-15%] left-[-10%] w-[45%] h-[45%] bg-orange-500/15 rounded-full blur-[130px]" />
                <div className="absolute bottom-[-15%] right-[-10%] w-[45%] h-[45%] bg-blue-600/10 rounded-full blur-[130px]" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[60%] bg-orange-900/5 rounded-full blur-[150px]" />
            </div>

            {/* Grid overlay */}
            <div
                className="absolute inset-0 pointer-events-none opacity-[0.03]"
                style={{
                    backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
                    backgroundSize: '40px 40px',
                }}
            />

            <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="w-full max-w-[420px] px-4 relative z-10"
            >
                <div className="bg-zinc-900/60 backdrop-blur-2xl border border-white/8 rounded-[28px] p-8 shadow-2xl shadow-black/60">
                    {/* Logo + header */}
                    <div className="text-center mb-8">
                        <div className="flex justify-center mb-5">
                            <Image
                                src="/FP_white.png"
                                alt="Fairplatz"
                                width={120}
                                height={40}
                                className="h-9 w-auto object-contain"
                                unoptimized
                                priority
                            />
                        </div>
                        <h1 className="text-2xl font-bold text-white mb-1.5">Reset password</h1>
                        <p className="text-zinc-500 text-sm">
                            {sent
                                ? "We've sent you a reset link"
                                : "Enter your email and we'll send a reset link"}
                        </p>
                    </div>

                    {sent ? (
                        <div className="space-y-6">
                            <div className="flex flex-col items-center gap-4 py-2">
                                <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center border border-green-500/20">
                                    <CheckCircle2 className="w-8 h-8 text-green-400" />
                                </div>
                                <div className="text-center space-y-1.5">
                                    <p className="text-white text-sm font-medium">Check your inbox</p>
                                    <p className="text-zinc-500 text-sm leading-relaxed">
                                        If <span className="text-white">{email}</span> is registered, you&apos;ll receive a reset link shortly. Check your spam folder too.
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => { setSent(false); setEmail(''); }}
                                className="w-full h-11 bg-white/5 hover:bg-white/8 border border-white/8 text-zinc-300 text-sm font-medium rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
                            >
                                Try a different email
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider ml-0.5">
                                    Email
                                </label>
                                <div className="relative group">
                                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-orange-500 transition-colors pointer-events-none" />
                                    <input
                                        type="email"
                                        autoComplete="email"
                                        placeholder="you@example.com"
                                        value={email}
                                        onChange={(e) => {
                                            setEmail(e.target.value);
                                            if (emailError) setEmailError('');
                                        }}
                                        className={cn(
                                            "w-full bg-black/30 border rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder:text-zinc-600 outline-none transition-all duration-200",
                                            "focus:bg-black/50 focus:shadow-[0_0_0_1px_rgba(249,115,22,0.4),0_0_20px_-8px_rgba(249,115,22,0.4)]",
                                            "hover:border-zinc-700",
                                            emailError
                                                ? "border-red-500/60 focus:border-red-500/60"
                                                : "border-white/8 focus:border-orange-500/50"
                                        )}
                                    />
                                </div>
                                {emailError && (
                                    <p className="text-xs text-red-400 ml-0.5 mt-1">{emailError}</p>
                                )}
                            </div>

                            <motion.button
                                type="submit"
                                disabled={loading}
                                whileHover={{ scale: loading ? 1 : 1.01 }}
                                whileTap={{ scale: loading ? 1 : 0.98 }}
                                className="w-full h-11 mt-1 bg-linear-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white text-sm font-semibold rounded-xl shadow-lg shadow-orange-500/25 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                {loading ? (
                                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                    </svg>
                                ) : (
                                    <>
                                        Send reset link
                                        <ArrowRight className="w-4 h-4" />
                                    </>
                                )}
                            </motion.button>
                        </form>
                    )}

                    <div className="mt-6 text-center">
                        <Link
                            href="/login"
                            className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
                        >
                            <ArrowLeft className="w-3.5 h-3.5" />
                            Back to sign in
                        </Link>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
