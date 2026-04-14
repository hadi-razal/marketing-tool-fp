'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { Mail, Lock, ArrowRight, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import { toast } from 'sonner';
import { cn } from '@/components/ui/Button';

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
    const supabase = createClient();

    const validate = () => {
        const newErrors: { email?: string; password?: string } = {};
        if (!email.trim()) newErrors.email = 'Email is required';
        if (!password) newErrors.password = 'Password is required';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;

        setLoading(true);
        try {
            const { error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) throw error;
            router.push('/dashboard');
            router.refresh();
        } catch (err: any) {
            const msg = err.message || 'Failed to login';
            if (msg.toLowerCase().includes('invalid login')) {
                toast.error('Invalid email or password. Please try again.');
            } else if (msg.toLowerCase().includes('email not confirmed')) {
                toast.error('Please verify your email before logging in.');
            } else {
                toast.error(msg);
            }
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
                        <h1 className="text-2xl font-bold text-white mb-1.5">Welcome back</h1>
                        <p className="text-zinc-500 text-sm">Sign in to your account to continue</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-5" noValidate>
                        {/* Email */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider ml-0.5">
                                Email
                            </label>
                            <div className="relative group">
                                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-orange-500 transition-colors pointer-events-none" />
                                <input
                                    type="text"
                                    autoComplete="email"
                                    placeholder="you@example.com"
                                    value={email}
                                    onChange={(e) => {
                                        setEmail(e.target.value);
                                        if (errors.email) setErrors(prev => ({ ...prev, email: undefined }));
                                    }}
                                    className={cn(
                                        "w-full bg-black/30 border rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder:text-zinc-600 outline-none transition-all duration-200",
                                        "focus:bg-black/50 focus:shadow-[0_0_0_1px_rgba(249,115,22,0.4),0_0_20px_-8px_rgba(249,115,22,0.4)]",
                                        "hover:border-zinc-700",
                                        errors.email
                                            ? "border-red-500/60 focus:border-red-500/60"
                                            : "border-white/8 focus:border-orange-500/50"
                                    )}
                                />
                            </div>
                            {errors.email && (
                                <p className="text-xs text-red-400 ml-0.5 mt-1">{errors.email}</p>
                            )}
                        </div>

                        {/* Password */}
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between ml-0.5">
                                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                                    Password
                                </label>
                                <Link
                                    href="/forgot-password"
                                    className="text-xs text-zinc-500 hover:text-orange-400 transition-colors"
                                >
                                    Forgot password?
                                </Link>
                            </div>
                            <div className="relative group">
                                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-orange-500 transition-colors pointer-events-none" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    autoComplete="current-password"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => {
                                        setPassword(e.target.value);
                                        if (errors.password) setErrors(prev => ({ ...prev, password: undefined }));
                                    }}
                                    className={cn(
                                        "w-full bg-black/30 border rounded-xl pl-10 pr-11 py-3 text-sm text-white placeholder:text-zinc-600 outline-none transition-all duration-200",
                                        "focus:bg-black/50 focus:shadow-[0_0_0_1px_rgba(249,115,22,0.4),0_0_20px_-8px_rgba(249,115,22,0.4)]",
                                        "hover:border-zinc-700",
                                        errors.password
                                            ? "border-red-500/60 focus:border-red-500/60"
                                            : "border-white/8 focus:border-orange-500/50"
                                    )}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(v => !v)}
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors p-0.5"
                                    tabIndex={-1}
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                            {errors.password && (
                                <p className="text-xs text-red-400 ml-0.5 mt-1">{errors.password}</p>
                            )}
                        </div>

                        {/* Submit */}
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
                                    Sign In
                                    <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </motion.button>
                    </form>

                    {/* Divider */}
                    <div className="my-6 flex items-center gap-3">
                        <div className="flex-1 h-px bg-white/6" />
                        <span className="text-xs text-zinc-600">or</span>
                        <div className="flex-1 h-px bg-white/6" />
                    </div>

                    {/* Register link */}
                    <p className="text-center text-sm text-zinc-500">
                        Don&apos;t have an account?{' '}
                        <Link href="/register" className="text-orange-400 hover:text-orange-300 font-medium transition-colors">
                            Create account
                        </Link>
                    </p>
                </div>
            </motion.div>
        </div>
    );
}
