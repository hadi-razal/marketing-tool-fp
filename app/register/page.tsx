'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { SoftInput } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Mail, Lock, ArrowRight, User } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function RegisterPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        if (password !== confirmPassword) {
            setError("Passwords don't match");
            setLoading(false);
            return;
        }

        try {
            const { error } = await supabase.auth.signUp({
                email,
                password,
            });

            if (error) throw error;

            // For now, just redirect to login or show success
            alert('Registration successful! Please sign in.');
            router.push('/login');
        } catch (err: any) {
            setError(err.message || 'Failed to register');
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-black relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay pointer-events-none"></div>
            <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-500/20 rounded-full blur-[120px] animate-pulse" />
            <div className="absolute bottom-[-20%] left-[-10%] w-[50%] h-[50%] bg-orange-500/10 rounded-full blur-[120px] animate-pulse delay-1000" />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-md p-8 relative z-10"
            >
                <div className="bg-zinc-900/40 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl shadow-black/50">
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold text-white mb-2">Create Account</h1>
                        <p className="text-zinc-400 text-sm">Join Fairplatz Marketing Tool</p>
                    </div>

                    <form onSubmit={handleRegister} className="space-y-6">
                        <div className="space-y-4">
                            <SoftInput
                                label="Email"
                                type="email"
                                placeholder="Enter your email"
                                icon={<Mail className="w-4 h-4" />}
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                            <SoftInput
                                label="Password"
                                type="password"
                                placeholder="Create a password"
                                icon={<Lock className="w-4 h-4" />}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                            <SoftInput
                                label="Confirm Password"
                                type="password"
                                placeholder="Confirm your password"
                                icon={<Lock className="w-4 h-4" />}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                            />
                        </div>

                        {error && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="bg-red-500/10 border border-red-500/20 text-red-500 text-xs p-3 rounded-xl text-center"
                            >
                                {error}
                            </motion.div>
                        )}

                        <Button
                            type="submit"
                            className="w-full h-12 text-base shadow-lg shadow-purple-500/20 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 border-purple-400/20"
                            isLoading={loading}
                            rightIcon={!loading && <ArrowRight className="w-4 h-4" />}
                        >
                            Sign Up
                        </Button>
                    </form>

                    <div className="mt-8 text-center">
                        <p className="text-zinc-500 text-sm">
                            Already have an account?{' '}
                            <Link href="/login" className="text-purple-500 hover:text-purple-400 font-medium transition-colors">
                                Sign in
                            </Link>
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
