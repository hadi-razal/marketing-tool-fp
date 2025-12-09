'use client';
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Lock, Mail, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { Modal } from '@/components/ui/Modal';
import { toast } from 'sonner';

export default function RegisterPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const router = useRouter();
    const supabase = createClient();

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            // Check if user already exists in public table
            const { data: existingUser } = await supabase
                .from('users')
                .select('email')
                .eq('email', email)
                .single();

            if (existingUser) {
                throw new Error('This email is already registered. Please log in.');
            }

            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: fullName,
                    },
                    emailRedirectTo: `${location.origin}/auth/confirmed`,
                },
            });

            console.log('SignUp Response:', { data, error });

            if (error) throw error;

            if (data.user) {
                const { error: dbError } = await supabase
                    .from('users')
                    .insert([
                        {
                            email: email,
                            name: fullName,
                            created_at: new Date(),
                            uid: data.user.id,
                        }
                    ]);

                console.log('DB Insert Response:', { dbError });

                if (dbError) {
                    console.error("Error creating user record:", dbError);
                    throw new Error(`Database Error: ${dbError.message}. Please check if 'user_id' column type matches (UUID vs int8).`);
                }
            }

            // Successful registration
            setShowSuccessModal(true);
        } catch (err: any) {
            toast.error(err.message || 'Registration failed');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCloseModal = () => {
        setShowSuccessModal(false);
        router.push('/login');
    };

    return (
        <div className="min-h-screen bg-[#09090b] flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-500/10 rounded-full blur-[100px] animate-pulse"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[100px] animate-pulse delay-1000"></div>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-md p-8 relative z-10"
            >
                <div className="bg-zinc-900/50 backdrop-blur-2xl border border-white/10 rounded-[32px] p-8 shadow-2xl shadow-black/50">
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold text-white mb-2">Create Account</h1>
                        <p className="text-zinc-400 text-sm">Join Fairplatz Marketing Tool</p>
                    </div>

                    <form onSubmit={handleRegister} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1">Full Name</label>
                            <div className="relative group">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 group-focus-within:text-orange-500 transition-colors" />
                                <input
                                    type="text"
                                    className="w-full bg-black/40 border border-white/10 rounded-xl py-3.5 pl-12 pr-4 text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500/50 focus:bg-black/60 transition-all"
                                    placeholder="John Doe"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1">Email</label>
                            <div className="relative group">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 group-focus-within:text-orange-500 transition-colors" />
                                <input
                                    type="email"
                                    className="w-full bg-black/40 border border-white/10 rounded-xl py-3.5 pl-12 pr-4 text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500/50 focus:bg-black/60 transition-all"
                                    placeholder="name@company.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1">Password</label>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 group-focus-within:text-orange-500 transition-colors" />
                                <input
                                    type="password"
                                    className="w-full bg-black/40 border border-white/10 rounded-xl py-3.5 pl-12 pr-4 text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500/50 focus:bg-black/60 transition-all"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-orange-500/20 hover:shadow-orange-500/40 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-6"
                        >
                            {isLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    Create Account <ArrowRight className="w-5 h-5" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 text-center">
                        <p className="text-zinc-500 text-sm">
                            Already have an account?{' '}
                            <Link href="/login" className="text-white font-bold hover:text-orange-500 transition-colors">
                                Sign In
                            </Link>
                        </p>
                    </div>
                </div>
            </motion.div>

            <Modal
                isOpen={showSuccessModal}
                onClose={handleCloseModal}
                title="Registration Successful"
                maxWidth="max-w-md"
            >
                <div className="p-6 text-center space-y-6">
                    <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto border border-green-500/20">
                        <CheckCircle2 className="w-8 h-8 text-green-500" />
                    </div>

                    <div className="space-y-2">
                        <h3 className="text-xl font-bold text-white">Check Your Email</h3>
                        <p className="text-zinc-400 text-sm leading-relaxed">
                            We've sent a confirmation link to <span className="text-white font-medium">{email}</span>.
                            Please check your inbox and verify your email to log in.
                        </p>
                    </div>

                    <button
                        onClick={handleCloseModal}
                        className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-green-500/20 hover:shadow-green-500/40 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                    >
                        Go to Login <ArrowRight className="w-4 h-4" />
                    </button>

                    <p className="text-xs text-zinc-500">
                        Didn't receive the email? Check your spam folder or try again.
                    </p>
                </div>
            </Modal>
        </div>
    );
}
