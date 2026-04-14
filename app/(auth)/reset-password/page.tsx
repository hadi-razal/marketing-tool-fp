'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { Lock, ArrowRight, Eye, EyeOff, Check, X } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { toast } from 'sonner';
import { cn } from '@/components/ui/Button';

const passwordRules = [
    { label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
    { label: 'One uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
    { label: 'One number', test: (p: string) => /\d/.test(p) },
];

function PasswordStrengthBar({ password }: { password: string }) {
    const score = useMemo(() => passwordRules.filter(r => r.test(password)).length, [password]);
    const colors = ['bg-red-500', 'bg-yellow-500', 'bg-green-500'];
    const labels = ['Weak', 'Fair', 'Strong'];

    if (!password) return null;

    return (
        <div className="mt-2 space-y-2">
            <div className="flex gap-1 items-center">
                {[0, 1, 2].map(i => (
                    <div
                        key={i}
                        className={cn(
                            'h-1 flex-1 rounded-full transition-all duration-300',
                            i < score ? colors[score - 1] : 'bg-white/10'
                        )}
                    />
                ))}
                <span className={cn('text-xs font-medium ml-1', score === 3 ? 'text-green-400' : score === 2 ? 'text-yellow-400' : 'text-red-400')}>
                    {labels[score - 1] ?? ''}
                </span>
            </div>
            <div className="space-y-1">
                {passwordRules.map(rule => (
                    <div key={rule.label} className="flex items-center gap-1.5">
                        {rule.test(password) ? (
                            <Check className="w-3 h-3 text-green-400 shrink-0" />
                        ) : (
                            <X className="w-3 h-3 text-zinc-600 shrink-0" />
                        )}
                        <span className={cn('text-xs', rule.test(password) ? 'text-zinc-400' : 'text-zinc-600')}>
                            {rule.label}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function ResetPasswordPage() {
    const router = useRouter();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<{ password?: string; confirmPassword?: string }>({});
    const supabase = createClient();

    const validate = () => {
        const newErrors: { password?: string; confirmPassword?: string } = {};

        if (!password) {
            newErrors.password = 'Password is required';
        } else if (password.length < 8) {
            newErrors.password = 'Password must be at least 8 characters';
        } else if (!/[A-Z]/.test(password)) {
            newErrors.password = 'Password must contain an uppercase letter';
        } else if (!/\d/.test(password)) {
            newErrors.password = 'Password must contain a number';
        }

        if (!confirmPassword) {
            newErrors.confirmPassword = 'Please confirm your password';
        } else if (password !== confirmPassword) {
            newErrors.confirmPassword = 'Passwords do not match';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;

        setLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({ password });
            if (error) throw error;
            toast.success('Password updated successfully!');
            router.push('/login');
        } catch (err: any) {
            const msg = err.message || 'Failed to update password';
            if (msg.toLowerCase().includes('session') || msg.toLowerCase().includes('not authenticated')) {
                toast.error('Reset link has expired. Please request a new one.');
                router.push('/forgot-password');
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
                        <h1 className="text-2xl font-bold text-white mb-1.5">Set new password</h1>
                        <p className="text-zinc-500 text-sm">Choose a strong password for your account</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                        {/* New password */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider ml-0.5">
                                New Password
                            </label>
                            <div className="relative group">
                                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-orange-500 transition-colors pointer-events-none" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    autoComplete="new-password"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => {
                                        setPassword(e.target.value);
                                        if (errors.password) setErrors(p => ({ ...p, password: undefined }));
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
                            <AnimatePresence>
                                {password && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        <PasswordStrengthBar password={password} />
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Confirm password */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider ml-0.5">
                                Confirm Password
                            </label>
                            <div className="relative group">
                                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-orange-500 transition-colors pointer-events-none" />
                                <input
                                    type={showConfirm ? 'text' : 'password'}
                                    autoComplete="new-password"
                                    placeholder="••••••••"
                                    value={confirmPassword}
                                    onChange={(e) => {
                                        setConfirmPassword(e.target.value);
                                        if (errors.confirmPassword) setErrors(p => ({ ...p, confirmPassword: undefined }));
                                    }}
                                    className={cn(
                                        "w-full bg-black/30 border rounded-xl pl-10 pr-11 py-3 text-sm text-white placeholder:text-zinc-600 outline-none transition-all duration-200",
                                        "focus:bg-black/50 focus:shadow-[0_0_0_1px_rgba(249,115,22,0.4),0_0_20px_-8px_rgba(249,115,22,0.4)]",
                                        "hover:border-zinc-700",
                                        errors.confirmPassword
                                            ? "border-red-500/60 focus:border-red-500/60"
                                            : "border-white/8 focus:border-orange-500/50"
                                    )}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirm(v => !v)}
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors p-0.5"
                                    tabIndex={-1}
                                >
                                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                            {errors.confirmPassword && (
                                <p className="text-xs text-red-400 ml-0.5 mt-1">{errors.confirmPassword}</p>
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
                                    Update password
                                    <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </motion.button>
                    </form>
                </div>
            </motion.div>
        </div>
    );
}
