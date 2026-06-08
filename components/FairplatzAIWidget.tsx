'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Loader2, X, ChevronRight, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabase';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

export const FairplatzAIWidget: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            role: 'assistant',
            content: 'Hello! I am **Fairplatz AI**. Ask me about shows, companies, leads, or tasks — I search your Supabase data to answer.',
            timestamp: new Date(),
        },
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [userName, setUserName] = useState('');
    const [userRole, setUserRole] = useState('');
    const [userProfileUrl, setUserProfileUrl] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchUser = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: userData } = await supabase
                    .from('users')
                    .select('name, profile_url, role')
                    .eq('uid', user.id)
                    .single();

                if (userData) {
                    setUserName(userData.name || 'User');
                    setUserRole(userData.role || '');
                    setUserProfileUrl(userData.profile_url || null);
                }
            }
        };
        fetchUser();
    }, []);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (isOpen) {
            scrollToBottom();
        }
    }, [messages, isOpen]);

    const getInitials = (name: string) => {
        return name.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase() || 'U';
    };

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: input.trim(),
            timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMessage]);
        const messageText = input.trim();
        setInput('');
        setIsLoading(true);

        try {
            const history = messages.slice(-10).map((msg) => ({
                role: msg.role,
                content: msg.content,
            }));

            const response = await fetch('/api/gemini', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: messageText,
                    history,
                    userName,
                    userRole,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to get response');
            }

            const assistantMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: data.response,
                timestamp: new Date(),
            };

            setMessages((prev) => [...prev, assistantMessage]);
        } catch (error: unknown) {
            console.error('AI Error:', error);
            const errMsg = error instanceof Error ? error.message : 'Unknown error';
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: errMsg
                    ? `Sorry, I couldn't complete that request.\n\n**${errMsg}**`
                    : 'Sorry, I encountered an error. Please try again.',
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <>
            {/* Floating Trigger */}
            <div className="fixed bottom-6 right-6 z-50">
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setIsOpen(true)}
                    className="relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl border border-violet-400/30 bg-linear-to-br from-violet-600 via-orange-500 to-fuchsia-600 shadow-2xl shadow-violet-500/30"
                >
                    <div className="absolute inset-0 bg-linear-to-t from-black/30 to-transparent" />
                    {isOpen ? (
                        <ChevronRight className="relative h-5 w-5 text-white/80" />
                    ) : (
                        <>
                            <motion.div
                                animate={{ rotate: [0, -8, 8, -8, 8, 0] }}
                                transition={{ repeat: Infinity, repeatDelay: 5, duration: 2 }}
                                className="relative flex h-full w-full items-center justify-center"
                            >
                                <Sparkles className="h-5 w-5 text-white drop-shadow-md" />
                            </motion.div>
                            <div className="absolute inset-0 animate-ping rounded-xl border-2 border-violet-300/30 opacity-20" />
                        </>
                    )}
                </motion.button>
            </div>

            <AnimatePresence>
                {isOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsOpen(false)}
                            className="fixed inset-0 z-40 bg-black/70 backdrop-blur-md"
                        />

                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="fixed top-0 right-0 bottom-0 z-50 flex w-full flex-col border-l border-violet-500/20 bg-[#07060f] shadow-2xl shadow-violet-950/40 md:w-[500px] lg:w-[600px]"
                        >
                            {/* Ambient AI background */}
                            <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
                                <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-violet-600/20 blur-[100px]" />
                                <div className="absolute top-1/3 -left-20 h-64 w-64 rounded-full bg-orange-500/15 blur-[90px]" />
                                <div className="absolute bottom-20 right-10 h-48 w-48 rounded-full bg-fuchsia-600/10 blur-[80px]" />
                                <div
                                    className="absolute inset-0 opacity-[0.35]"
                                    style={{
                                        backgroundImage:
                                            'radial-gradient(circle at 1px 1px, rgba(139,92,246,0.15) 1px, transparent 0)',
                                        backgroundSize: '28px 28px',
                                    }}
                                />
                            </div>

                            {/* Header */}
                            <div className="relative flex items-center justify-between border-b border-violet-500/20 bg-[#0c0a18]/80 px-4 py-3.5 backdrop-blur-xl">
                                <div className="flex items-center gap-3">
                                    <div className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-violet-400/30 bg-linear-to-br from-violet-600 via-orange-500 to-fuchsia-600 shadow-lg shadow-violet-500/25">
                                        <Sparkles className="h-4 w-4 text-white" />
                                        <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                                    </div>
                                    <div>
                                        <h3 className="bg-linear-to-r from-violet-200 via-white to-orange-200 bg-clip-text text-sm font-bold tracking-wide text-transparent">
                                            Fairplatz AI
                                        </h3>
                                        <div className="flex items-center gap-1.5">
                                            <Zap className="h-2.5 w-2.5 text-orange-400" />
                                            <p className="text-[10px] font-medium text-violet-300/80">
                                                Supabase-powered assistant
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="rounded-lg border border-white/5 p-1.5 text-violet-300/70 transition-colors hover:border-violet-400/30 hover:bg-violet-500/10 hover:text-white"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>

                            {/* Messages */}
                            <div
                                className="relative flex-1 space-y-4 overflow-y-auto scroll-smooth px-4 py-4 custom-scrollbar"
                                id="chat-container"
                            >
                                {messages.map((message) => (
                                    <motion.div
                                        key={message.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
                                    >
                                        <div
                                            className={`flex h-7 w-7 shrink-0 items-center justify-center ${
                                                message.role === 'assistant'
                                                    ? 'rounded-xl border border-violet-400/30 bg-linear-to-br from-violet-600/80 to-orange-500/80 p-1'
                                                    : 'overflow-hidden rounded-xl border border-white/10 bg-zinc-800'
                                            }`}
                                        >
                                            {message.role === 'assistant' ? (
                                                <Sparkles className="h-3.5 w-3.5 text-white" />
                                            ) : userProfileUrl ? (
                                                <img src={userProfileUrl} alt={userName} className="h-full w-full object-cover" />
                                            ) : (
                                                <span className="text-[9px] font-bold tracking-wider text-white">
                                                    {getInitials(userName)}
                                                </span>
                                            )}
                                        </div>

                                        <div className="max-w-[85%]">
                                            <div className={`mb-1 flex items-center gap-2 ${message.role === 'user' ? 'justify-end' : ''}`}>
                                                <span
                                                    className={`text-[9px] font-semibold uppercase tracking-[0.14em] ${
                                                        message.role === 'assistant'
                                                            ? 'text-violet-300/70'
                                                            : 'text-orange-300/70'
                                                    }`}
                                                >
                                                    {message.role === 'assistant' ? 'Fairplatz AI' : 'You'}
                                                </span>
                                            </div>
                                            <div
                                                className={`rounded-2xl p-3.5 text-xs leading-6 shadow-lg ${
                                                    message.role === 'assistant'
                                                        ? 'rounded-tl-sm border border-violet-500/20 bg-[#12101f]/90 text-violet-50 shadow-violet-950/30 backdrop-blur-sm'
                                                        : 'rounded-tr-sm border border-orange-400/20 bg-linear-to-br from-orange-600 to-orange-500 text-white shadow-orange-900/20'
                                                }`}
                                            >
                                                {message.role === 'assistant' ? (
                                                    <div className="prose prose-invert prose-xs max-w-none font-light prose-headings:text-violet-100 prose-strong:text-white prose-p:my-1.5 prose-li:my-0.5 prose-ul:my-1.5">
                                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                            {message.content}
                                                        </ReactMarkdown>
                                                    </div>
                                                ) : (
                                                    <p className="whitespace-pre-wrap font-normal">{message.content}</p>
                                                )}
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}

                                {isLoading && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="flex gap-3"
                                    >
                                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border border-violet-400/30 bg-linear-to-br from-violet-600/80 to-orange-500/80">
                                            <Sparkles className="h-3.5 w-3.5 text-white" />
                                        </div>
                                        <div className="flex items-center gap-2.5 rounded-2xl rounded-tl-sm border border-violet-500/20 bg-[#12101f]/90 px-3.5 py-3 backdrop-blur-sm">
                                            <Loader2 className="h-3.5 w-3.5 animate-spin text-violet-400" />
                                            <span className="animate-pulse font-mono text-[10px] text-violet-300/80">
                                                Searching Supabase...
                                            </span>
                                        </div>
                                    </motion.div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input */}
                            <div className="relative shrink-0 border-t border-violet-500/20 bg-[#0c0a18]/90 p-4 backdrop-blur-xl">
                                <div className="group relative">
                                    <div className="absolute -inset-0.5 rounded-xl bg-linear-to-r from-violet-500/30 via-orange-500/20 to-fuchsia-500/30 opacity-0 blur-sm transition duration-500 group-focus-within:opacity-100" />
                                    <div className="relative flex items-end gap-2 rounded-xl border border-violet-500/25 bg-[#0a0814]/90 p-1.5 shadow-xl shadow-violet-950/20 transition-all focus-within:border-violet-400/50 focus-within:bg-[#0d0b18]">
                                        <Sparkles className="mb-2 ml-1.5 h-3.5 w-3.5 shrink-0 text-violet-400/60" />
                                        <textarea
                                            value={input}
                                            onChange={(e) => setInput(e.target.value)}
                                            onKeyDown={handleKeyDown}
                                            placeholder="Ask about shows, leads, companies..."
                                            rows={1}
                                            className="max-h-28 min-h-[36px] flex-1 resize-none bg-transparent py-2 pr-1 text-xs font-normal text-violet-50 placeholder:text-violet-400/40 focus:outline-none"
                                            style={{ height: 'auto' }}
                                            onInput={(e) => {
                                                const target = e.target as HTMLTextAreaElement;
                                                target.style.height = 'auto';
                                                target.style.height = `${Math.min(target.scrollHeight, 112)}px`;
                                            }}
                                        />
                                        <button
                                            onClick={handleSend}
                                            disabled={!input.trim() || isLoading}
                                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-linear-to-r from-violet-600 via-orange-500 to-fuchsia-600 text-white shadow-lg shadow-violet-900/30 transition-all hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
                                        >
                                            <Send className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                </div>
                                <p className="mt-2.5 text-center text-[9px] font-medium tracking-wide text-violet-400/40">
                                    AI answers from your Supabase data · verify important details
                                </p>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
};
