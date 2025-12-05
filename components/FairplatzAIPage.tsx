'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Bot, Loader2, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabase';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

export const FairplatzAIPage: React.FC = () => {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            role: 'assistant',
            content: 'Hello! I\'m Fairplatz AI, your intelligent marketing assistant. How can I help you today? I can assist with lead research, marketing strategies, campaign ideas, and more.',
            timestamp: new Date(),
        }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [userName, setUserName] = useState('');
    const [userProfileUrl, setUserProfileUrl] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    // Fetch user info
    useEffect(() => {
        const fetchUser = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: userData } = await supabase
                    .from('users')
                    .select('name, profile_url')
                    .eq('uid', user.id)
                    .single();

                if (userData) {
                    setUserName(userData.name || 'User');
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
        scrollToBottom();
    }, [messages]);

    // Get initials from name
    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(n => n[0])
            .join('')
            .substring(0, 2)
            .toUpperCase() || 'U';
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
        setInput('');
        setIsLoading(true);

        // Simulate AI response (demo mode - will be replaced with Gemini API)
        setTimeout(() => {
            const aiResponses = [
                "That's a great question! Let me help you with that. Based on my analysis, I would recommend focusing on targeted outreach campaigns combined with personalized messaging.",
                "I understand what you're looking for. For lead generation, I suggest using a multi-channel approach combining LinkedIn outreach, email marketing, and content marketing.",
                "Excellent point! Here are some strategies that could work well for your marketing goals. Consider A/B testing your messaging and tracking engagement metrics closely.",
                "I can definitely help with that! For B2B marketing, relationship building is key. Focus on providing value first through educational content and thought leadership.",
                "Great idea! Let me provide some insights. Market research shows that personalization increases engagement by up to 80%. Tailor your approach to each prospect's needs.",
            ];

            const randomResponse = aiResponses[Math.floor(Math.random() * aiResponses.length)];

            const assistantMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: randomResponse,
                timestamp: new Date(),
            };

            setMessages(prev => [...prev, assistantMessage]);
            setIsLoading(false);
        }, 1500);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const clearChat = () => {
        setMessages([{
            id: '1',
            role: 'assistant',
            content: 'Hello! I\'m Fairplatz AI, your intelligent marketing assistant. How can I help you today? I can assist with lead research, marketing strategies, campaign ideas, and more.',
            timestamp: new Date(),
        }]);
    };

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="h-full flex flex-col bg-[#09090b] rounded-[32px] border border-white/5 overflow-hidden">
            {/* Header */}
            <div className="shrink-0 p-6 border-b border-white/5">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg shadow-orange-500/20">
                            <Sparkles className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-white">Fairplatz AI</h1>
                            <p className="text-sm text-zinc-400">Your intelligent marketing assistant</p>
                        </div>
                    </div>
                    <button
                        onClick={clearChat}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-zinc-400 hover:text-white transition-all"
                    >
                        <Trash2 className="w-4 h-4" />
                        <span className="text-sm font-medium">Clear Chat</span>
                    </button>
                </div>
            </div>

            {/* Chat Messages - flex-col-reverse makes messages stick to bottom */}
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar flex flex-col">
                <div className="flex-1" /> {/* Spacer to push messages down */}
                <div className="space-y-6">
                    <AnimatePresence mode="popLayout">
                        {messages.map((message) => (
                            <motion.div
                                key={message.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className={`flex gap-4 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
                            >
                                {/* Avatar */}
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 overflow-hidden ${message.role === 'assistant'
                                    ? 'bg-gradient-to-br from-orange-500 to-red-600 shadow-lg shadow-orange-500/20'
                                    : 'bg-white/10 border border-white/10'
                                    }`}>
                                    {message.role === 'assistant' ? (
                                        <Bot className="w-5 h-5 text-white" />
                                    ) : userProfileUrl ? (
                                        <img src={userProfileUrl} alt={userName} className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-sm font-bold text-white">{getInitials(userName)}</span>
                                    )}
                                </div>

                                {/* Message Content */}
                                <div className={`flex-1 max-w-[75%] ${message.role === 'user' ? 'text-right' : ''}`}>
                                    <div
                                        className={`inline-block p-4 rounded-2xl ${message.role === 'assistant'
                                            ? 'bg-zinc-900/80 border border-white/5 text-zinc-200'
                                            : 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/20'
                                            }`}
                                    >
                                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                                    </div>
                                    <p className="text-[10px] text-zinc-600 mt-2 px-1">
                                        {formatTime(message.timestamp)}
                                    </p>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {/* Loading Indicator */}
                    {isLoading && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex gap-4"
                        >
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg shadow-orange-500/20">
                                <Bot className="w-5 h-5 text-white" />
                            </div>
                            <div className="bg-zinc-900/80 border border-white/5 rounded-2xl p-4">
                                <div className="flex items-center gap-2">
                                    <Loader2 className="w-4 h-4 text-orange-400 animate-spin" />
                                    <span className="text-sm text-zinc-400">Thinking...</span>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    <div ref={messagesEndRef} />
                </div>
            </div>

            {/* Input Area */}
            <div className="shrink-0 p-6 border-t border-white/5">
                <div className="relative flex items-end gap-3 bg-zinc-900/50 border border-white/10 rounded-2xl p-3 focus-within:border-orange-500/50 focus-within:ring-1 focus-within:ring-orange-500/50 transition-all">
                    <textarea
                        ref={inputRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask Fairplatz AI anything..."
                        rows={1}
                        className="flex-1 bg-transparent text-white placeholder:text-zinc-600 resize-none focus:outline-none text-sm leading-relaxed max-h-32 min-h-[24px] py-2 px-2"
                        style={{ height: 'auto' }}
                        onInput={(e) => {
                            const target = e.target as HTMLTextAreaElement;
                            target.style.height = 'auto';
                            target.style.height = `${Math.min(target.scrollHeight, 128)}px`;
                        }}
                    />
                    <button
                        onClick={handleSend}
                        disabled={!input.trim() || isLoading}
                        className="shrink-0 w-10 h-10 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 flex items-center justify-center text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-orange-500/20"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </div>
                <p className="text-center text-[10px] text-zinc-600 mt-3">
                    Powered by Gemini AI • Demo Mode
                </p>
            </div>
        </div>
    );
};
