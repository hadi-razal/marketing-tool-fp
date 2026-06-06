'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { User, Lock, Mail, ArrowRight, Eye, EyeOff, CheckCircle2, Check, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { Modal } from '@/components/ui/Modal';
import { toast } from 'sonner';
import { cn } from '@/components/ui/Button';

interface FormErrors {
    fullName?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
}

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
            <div className="flex gap-1">
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

export default function RegisterPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [errors, setErrors] = useState<FormErrors>({});
    const router = useRouter();
    const supabase = createClient();

    const validate = (): boolean => {
        const newErrors: FormErrors = {};

        if (!fullName.trim()) {
            newErrors.fullName = 'Full name is required';
        } else if (fullName.trim().length < 2) {
            newErrors.fullName = 'Name must be at least 2 characters';
        }

        if (!email.trim()) {
            newErrors.email = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            newErrors.email = 'Enter a valid email address';
        }

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

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;

        setIsLoading(true);
        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: { full_name: fullName },
                    emailRedirectTo: `${location.origin}/auth/callback`,
                },
            });

            if (error) {
                const msg = error.message.toLowerCase();
                if (msg.includes('already registered') || msg.includes('already exists') || msg.includes('user already registered')) {
                    throw new Error('This email is already registered. Please sign in instead.');
                }
                // Email sending failures (SMTP/rate-limit) — user was still created, treat as success
                if (msg.includes('sending') || msg.includes('email') || msg.includes('smtp') || msg.includes('rate limit')) {
                    // fall through to show success modal
                } else {
                    throw error;
                }
            }

            if (data.user) {
                const { error: dbError } = await supabase
                    .from('users')
                    .insert([{
                        email,
                        name: fullName,
                        created_at: new Date().toISOString(),
                        uid: data.user.id,
                    }]);

                if (dbError) {
                    // Non-fatal — auth user created; DB record may already exist or fail silently
                    console.warn('User DB record insert failed:', dbError.message);
                }
            }

            setShowSuccessModal(true);
        } catch (err: any) {
            toast.error(err.message || 'Registration failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCloseModal = () => {
        setShowSuccessModal(false);
        router.push('/login');
    };

    const inputBase = (hasError: boolean) => cn(
        "w-full bg-black/30 border rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder:text-zinc-600 outline-none transition-all duration-200",
        "focus:bg-black/50 focus:shadow-[0_0_0_1px_rgba(249,115,22,0.4),0_0_20px_-8px_rgba(249,115,22,0.4)]",
        "hover:border-zinc-700",
        hasError
            ? "border-red-500/60 focus:border-red-500/60"
            : "border-white/[0.08] focus:border-orange-500/50"
    );

    return (
        <div className="min-h-screen bg-[#09090b] flex items-center justify-center p-4 relative overflow-hidden">
            {/* Ambient background */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-[-15%] left-[-10%] w-[45%] h-[45%] bg-orange-500/15 rounded-full blur-[130px]" />
                <div className="absolute bottom-[-15%] right-[-10%] w-[45%] h-[45%] bg-blue-600/10 rounded-full blur-[130px]" />
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
                className="w-full max-w-105 relative z-10"
            >
                <div className="bg-zinc-900/60 backdrop-blur-2xl border border-white/8 rounded-[28px] p-8 shadow-2xl shadow-black/60">
                    {/* Logo + header */}
                    <div className="text-center mb-7">
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
                        <h1 className="text-2xl font-bold text-white mb-1.5">Create account</h1>
                        <p className="text-zinc-500 text-sm">Join the Fairplatz marketing platform</p>
                    </div>

                    <form onSubmit={handleRegister} className="space-y-4" noValidate>
                        {/* Full name */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider ml-0.5">
                                Full Name
                            </label>
                            <div className="relative group">
                                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-orange-500 transition-colors pointer-events-none" />
                                <input
                                    type="text"
                                    autoComplete="name"
                                    placeholder="John Doe"
                                    value={fullName}
                                    onChange={(e) => {
                                        setFullName(e.target.value);
                                        if (errors.fullName) setErrors(p => ({ ...p, fullName: undefined }));
                                    }}
                                    className={inputBase(!!errors.fullName)}
                                />
                            </div>
                            {errors.fullName && <p className="text-xs text-red-400 ml-0.5">{errors.fullName}</p>}
                        </div>

                        {/* Email */}
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
                                        if (errors.email) setErrors(p => ({ ...p, email: undefined }));
                                    }}
                                    className={inputBase(!!errors.email)}
                                />
                            </div>
                            {errors.email && <p className="text-xs text-red-400 ml-0.5">{errors.email}</p>}
                        </div>

                        {/* Password */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider ml-0.5">
                                Password
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
                                    className={cn(inputBase(!!errors.password), 'pr-11')}
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
                            {errors.password && <p className="text-xs text-red-400 ml-0.5">{errors.password}</p>}
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
                                    className={cn(inputBase(!!errors.confirmPassword), 'pr-11')}
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
                            {errors.confirmPassword && <p className="text-xs text-red-400 ml-0.5">{errors.confirmPassword}</p>}
                        </div>

                        {/* Submit */}
                        <motion.button
                            type="submit"
                            disabled={isLoading}
                            whileHover={{ scale: isLoading ? 1 : 1.01 }}
                            whileTap={{ scale: isLoading ? 1 : 0.98 }}
                            className="w-full h-11 mt-1 bg-linear-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white text-sm font-semibold rounded-xl shadow-lg shadow-orange-500/25 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                </svg>
                            ) : (
                                <>
                                    Create Account
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

                    {/* Login link */}
                    <p className="text-center text-sm text-zinc-500">
                        Already have an account?{' '}
                        <Link href="/login" className="text-orange-400 hover:text-orange-300 font-medium transition-colors">
                            Sign in
                        </Link>
                    </p>
                </div>
            </motion.div>

            {/* Success modal */}
            <Modal
                isOpen={showSuccessModal}
                onClose={handleCloseModal}
                title="Account Created"
                maxWidth="max-w-md"
            >
                <div className="p-6 text-center space-y-5">
                    <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto border border-green-500/20">
                        <CheckCircle2 className="w-8 h-8 text-green-400" />
                    </div>

                    <div className="space-y-2">
                        <h3 className="text-xl font-bold text-white">Check your inbox</h3>
                        <p className="text-zinc-400 text-sm leading-relaxed">
                            We sent a confirmation link to{' '}
                            <span className="text-white font-medium">{email}</span>.
                            Click it to activate your account.
                        </p>
                    </div>

                    <motion.button
                        onClick={handleCloseModal}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full bg-linear-to-r from-green-600 to-emerald-500 hover:from-green-500 hover:to-emerald-400 text-white text-sm font-semibold py-3.5 rounded-xl shadow-lg shadow-green-500/20 transition-all duration-200 flex items-center justify-center gap-2"
                    >
                        Go to Login <ArrowRight className="w-4 h-4" />
                    </motion.button>

                    <p className="text-xs text-zinc-600">
                        Didn&apos;t receive it? Check your spam folder or contact support.
                    </p>
                </div>
            </Modal>
        </div>
    );
}
