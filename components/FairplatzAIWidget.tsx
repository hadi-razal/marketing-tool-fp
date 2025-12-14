'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Bot, Loader2, X, ChevronRight } from 'lucide-react';
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
            content: 'Hello! I am **Fairplatz AI**. How can I help you today?',
            timestamp: new Date(),
        }
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
        return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'U';
    };

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: input.trim(),
            timestamp: new Date(),
        };

        setMessages(prev => [...prev, userMessage]);
        const messageText = input.trim();
        setInput('');
        setIsLoading(true);

        try {
            const history = messages.slice(-10).map(msg => ({
                role: msg.role,
                content: msg.content,
            }));

            const response = await fetch('/api/gemini', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: messageText,
                    history,
                    userName,
                    userRole
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

            setMessages(prev => [...prev, assistantMessage]);
        } catch (error: any) {
            console.error('AI Error:', error);
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: `Sorry, I encountered an error. Please try again.`,
                timestamp: new Date(),
            };
            setMessages(prev => [...prev, errorMessage]);
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
            {/* Floating Trigger Widget */}
            <div className="fixed bottom-6 right-6 z-50">
                {/* Main Button */}
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setIsOpen(true)}
                    className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 shadow-2xl shadow-orange-500/30 flex items-center justify-center group overflow-hidden border border-white/10"
                >
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                    {isOpen ? (
                        <div className="w-full h-full bg-zinc-950 flex items-center justify-center">
                            <ChevronRight className="w-5 h-5 text-zinc-400" />
                        </div>

                    ) : (
                        <>
                            {/* Waving Effect */}
                            <motion.div
                                animate={{ rotate: [0, -10, 10, -10, 10, 0] }}
                                transition={{ repeat: Infinity, repeatDelay: 5, duration: 2 }}
                                className="w-full h-full flex items-center justify-center"
                            >
                                <img src="/FPICON_white.png" alt="AI" className="w-6 h-6 object-contain drop-shadow-md" />
                            </motion.div>
                            {/* Pulse Ring */}
                            <div className="absolute inset-0 rounded-xl border-2 border-white/20 animate-ping opacity-20" />
                        </>
                    )}
                </motion.button>
            </div>

            {/* Chat Side Drawer */}
            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsOpen(false)}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
                        />

                        {/* Slide-over Panel */}
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="fixed top-0 right-0 bottom-0 w-full md:w-[500px] lg:w-[600px] bg-zinc-950 shadow-2xl border-l border-white/10 z-50 flex flex-col"
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-zinc-950/50 backdrop-blur-md">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg shadow-orange-500/20">
                                        <Bot className="w-4 h-4 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="text-white font-semibold text-sm tracking-wide">Fairplatz AI</h3>
                                        <p className="text-[10px] text-zinc-500 font-medium">Marketing Assistant</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="p-1.5 rounded-lg hover:bg-white/5 text-zinc-400 hover:text-white transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scroll-smooth bg-zinc-950" id="chat-container">
                                {messages.map((message) => (
                                    <motion.div
                                        key={message.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
                                    >
                                        <div className={`w-6 h-6 flex items-center justify-center shrink-0 ${message.role === 'assistant'
                                            ? ''
                                            : 'rounded-lg bg-zinc-800 shadow-md'
                                            }`}>
                                            {message.role === 'assistant' ? (
                                                <img src="/FPICON_white.png" alt="AI" className="w-6 h-6 object-contain" />
                                            ) : userProfileUrl ? (
                                                <img src={userProfileUrl} alt={userName} className="w-full h-full rounded-lg object-cover" />
                                            ) : (
                                                <span className="text-[10px] font-bold text-white tracking-wider">{getInitials(userName)}</span>
                                            )}
                                        </div>

                                        <div className={`max-w-[85%] group`}>
                                            <div className="flex items-center gap-2 mb-1 opacity-60">
                                                <span className={`text-[9px] font-medium uppercase tracking-wider ${message.role === 'user' ? 'ml-auto' : ''}`}>
                                                    {message.role === 'assistant' ? 'Fairplatz AI' : 'You'}
                                                </span>
                                            </div>
                                            <div
                                                className={`p-3 rounded-xl text-xs leading-6 shadow-sm ${message.role === 'assistant'
                                                    ? 'bg-zinc-900 text-zinc-100 border border-white/5 rounded-tl-sm'
                                                    : 'bg-orange-600 text-white rounded-tr-sm shadow-orange-500/10'
                                                    }`}
                                            >
                                                {message.role === 'assistant' ? (
                                                    <div className="prose prose-invert prose-xs max-w-none prose-p:my-1.5 prose-headings:text-zinc-100 prose-strong:text-white prose-ul:my-1.5 prose-li:my-0.5 prose-p:font-light font-light">
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
                                        <div className="w-6 h-6 flex items-center justify-center shrink-0">
                                            <img src="/FPICON_white.png" alt="AI" className="w-6 h-6 object-contain" />
                                        </div>
                                        <div className="bg-zinc-900 border border-white/5 rounded-xl rounded-tl-sm p-3 flex items-center gap-2">
                                            <Loader2 className="w-3.5 h-3.5 text-orange-500 animate-spin" />
                                            <span className="text-[10px] text-zinc-500 font-mono animate-pulse">Processing...</span>
                                        </div>
                                    </motion.div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input Area */}
                            <div className="shrink-0 p-4 bg-zinc-950/80 backdrop-blur-md border-t border-white/5">
                                <div className="relative group">
                                    <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-500/20 to-red-600/20 rounded-lg blur opacity-0 group-focus-within:opacity-100 transition duration-500" />
                                    <div className="relative flex items-end gap-2 bg-black/40 border border-white/10 rounded-lg p-1.5 focus-within:border-orange-500/50 focus-within:bg-black/60 transition-all shadow-xl">
                                        <textarea
                                            value={input}
                                            onChange={(e) => setInput(e.target.value)}
                                            onKeyDown={handleKeyDown}
                                            placeholder="Ask anything..."
                                            rows={1}
                                            className="flex-1 bg-transparent text-white text-xs font-normal placeholder:text-zinc-600 resize-none focus:outline-none py-2 px-2.5 max-h-28 min-h-[36px]"
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
                                            className="shrink-0 w-8 h-8 rounded-lg bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 flex items-center justify-center text-white shadow-lg shadow-orange-900/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none hover:scale-105 active:scale-95"
                                        >
                                            <Send className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                                <p className="text-center text-[9px] text-zinc-700 mt-2 font-medium tracking-wide">
                                    Fairplatz AI may produce inaccurate information.
                                </p>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
};
