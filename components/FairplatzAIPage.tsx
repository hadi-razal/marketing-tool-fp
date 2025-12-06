'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Bot, Loader2, Trash2, User } from 'lucide-react';
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

export const FairplatzAIPage: React.FC = () => {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            role: 'assistant',
            content: 'Hello! I am **Fairplatz AI**, your intelligent marketing assistant. How can I help you today?',
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
        const messageText = input.trim();
        setInput('');
        setIsLoading(true);

        try {
            // Get chat history for context (last 10 messages)
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
                content: `Sorry, I encountered an error: ${error.message}.`,
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

    const clearChat = () => {
        setMessages([{
            id: '1',
            role: 'assistant',
            content: 'Hello! I am **Fairplatz AI**, your intelligent marketing assistant. How can I help you today?',
            timestamp: new Date(),
        }]);
    };

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="h-full flex flex-col bg-[#09090b] rounded-[32px] border border-white/5 overflow-hidden relative">
            {/* Ambient Background Glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[300px] bg-orange-500/5 blur-[100px] pointer-events-none" />

            {/* Header */}
            <div className="shrink-0 p-6 border-b border-white/5 bg-[#09090b]/50 backdrop-blur-xl z-10">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg shadow-orange-500/20">
                            <Bot className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-white tracking-tight">Fairplatz AI</h1>
                            <p className="text-xs text-zinc-400 font-medium tracking-wide uppercase">Marketing Assistant</p>
                        </div>
                    </div>
                    <button
                        onClick={clearChat}
                        className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all"
                        title="Clear Chat"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col scroll-smooth">
                <div className="flex-1 min-h-[20px]" /> {/* Top Spacer */}

                <div className="p-6 space-y-8">
                    <AnimatePresence mode="popLayout" initial={false}>
                        {messages.map((message) => (
                            <motion.div
                                key={message.id}
                                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                className={`flex gap-4 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
                            >
                                {/* Avatar */}
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 overflow-hidden ${message.role === 'assistant'
                                        ? 'bg-gradient-to-br from-orange-500 to-red-600 shadow-lg shadow-orange-500/20'
                                        : 'bg-zinc-800 border border-white/10'
                                    }`}>
                                    {message.role === 'assistant' ? (
                                        <Sparkles className="w-4 h-4 text-white" />
                                    ) : userProfileUrl ? (
                                        <img src={userProfileUrl} alt={userName} className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-xs font-bold text-white">{getInitials(userName)}</span>
                                    )}
                                </div>

                                {/* Message Content */}
                                <div className={`flex flex-col ${message.role === 'user' ? 'items-end' : 'items-start'} max-w-[85%] lg:max-w-[75%]`}>
                                    <div
                                        className={`relative px-5 py-3.5 rounded-2xl text-sm leading-relaxed shadow-sm ${message.role === 'assistant'
                                                ? 'bg-zinc-900 border border-white/5 text-zinc-200 rounded-tl-none'
                                                : 'bg-orange-600 text-white rounded-tr-none shadow-orange-900/20'
                                            }`}
                                    >
                                        {message.role === 'assistant' ? (
                                            <div className="prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-pre:bg-zinc-950 prose-pre:border prose-pre:border-white/10">
                                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                    {message.content}
                                                </ReactMarkdown>
                                            </div>
                                        ) : (
                                            <p className="whitespace-pre-wrap">{message.content}</p>
                                        )}
                                    </div>
                                    <span className="text-[10px] text-zinc-600 mt-1.5 px-1 font-medium">
                                        {formatTime(message.timestamp)}
                                    </span>
                                </div>
                            </motion.div>
                        ))}

                        {/* Loading Indicator */}
                        {isLoading && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex gap-4"
                            >
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg shadow-orange-500/20">
                                    <Sparkles className="w-4 h-4 text-white animate-pulse" />
                                </div>
                                <div className="bg-zinc-900 border border-white/5 rounded-2xl rounded-tl-none px-5 py-3.5">
                                    <div className="flex items-center gap-2">
                                        <Loader2 className="w-3.5 h-3.5 text-orange-500 animate-spin" />
                                        <span className="text-xs font-medium text-zinc-400">Thinking...</span>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                    <div ref={messagesEndRef} className="h-1" />
                </div>
            </div>

            {/* Input Area */}
            <div className="shrink-0 p-6 bg-[#09090b]/50 backdrop-blur-xl border-t border-white/5 z-10">
                <div className="max-w-4xl mx-auto relative flex items-end gap-3 bg-zinc-900/50 border border-white/10 rounded-2xl p-2 pl-4 focus-within:border-orange-500/50 focus-within:ring-1 focus-within:ring-orange-500/50 transition-all shadow-lg hover:border-white/20">
                    <textarea
                        ref={inputRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask Fairplatz AI anything..."
                        rows={1}
                        className="flex-1 bg-transparent text-white placeholder:text-zinc-600 resize-none focus:outline-none text-sm leading-relaxed max-h-32 min-h-[24px] py-3 custom-scrollbar"
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
                        className="shrink-0 w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 flex items-center justify-center text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-orange-500/20 active:scale-95 m-1"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </div>
                <div className="mt-3 text-center">
                    <p className="text-[10px] text-zinc-600 font-medium">Powered by Google Gemini 2.5 Flash</p>
                </div>
            </div>
        </div>
    );
};
