'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Send, Sparkles, Loader2 } from 'lucide-react';
import { ChatMessage } from './ChatMessage';
import { useUser } from '@/lib/hooks/useUser';
import { usePathname } from 'next/navigation';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
}

export function ChatPanel() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        { id: '1', role: 'assistant', content: 'Hello! I am your AI property assistant. How can I help you today?' }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const { role } = useUser();
    const pathname = usePathname();

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isOpen]);

    const handleSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: input,
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            // Real API Call
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: userMessage.content,
                    conversationHistory: messages.map(m => ({ role: m.role, content: m.content }))
                })
            });

            if (!response.ok) {
                if (response.status === 401) throw new Error("Please log in to chat.");
                throw new Error('Chat request failed');
            }

            const data = await response.json();

            const aiMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: data.message || "I didn't get a response. Please try again."
            };
            setMessages(prev => [...prev, aiMessage]);

        } catch (error: any) {
            console.error(error);
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: error.message || "I'm having trouble connecting right now. Please try again later."
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const suggestionChips = [
        'Available units',
        'Pending applications',
        'Maintenance requests',
    ];

    // Don't show on login/signup pages
    if (pathname.includes('/login') || pathname.includes('/signup') || pathname === '/') return null;

    return (
        <>
            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Backdrop for mobile */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 sm:hidden"
                            onClick={() => setIsOpen(false)}
                        />
                        {/* Panel */}
                        <motion.div
                            initial={{ x: '100%', opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: '100%', opacity: 0 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="fixed right-0 top-0 bottom-0 w-full sm:w-[400px] z-50 bg-background border-l shadow-2xl flex flex-col"
                        >
                            {/* Header */}
                            <div className="p-4 border-b flex items-center justify-between bg-muted/30">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center">
                                        <Sparkles className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold">PropFlow AI</h3>
                                        <p className="text-xs text-muted-foreground">Assistant Online</p>
                                    </div>
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
                                    <X className="w-5 h-5" />
                                </Button>
                            </div>

                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto p-4" ref={scrollRef}>
                                {messages.map((msg) => (
                                    <ChatMessage key={msg.id} role={msg.role} content={msg.content} />
                                ))}
                                {isLoading && (
                                    <div className="flex justify-start w-full mb-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-full gradient-bg flex items-center justify-center shrink-0">
                                                <Loader2 className="w-4 h-4 text-white animate-spin" />
                                            </div>
                                            <span className="text-xs text-muted-foreground">Thinking...</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Suggestions */}
                            {messages.length < 3 && (
                                <div className="px-4 pb-2 flex gap-2 overflow-x-auto no-scrollbar">
                                    {suggestionChips.map(chip => (
                                        <button
                                            key={chip}
                                            onClick={() => { setInput(chip); handleSubmit(); }}
                                            className="text-xs border rounded-full px-3 py-1 bg-muted/50 hover:bg-muted whitespace-nowrap"
                                            type="button"
                                        >
                                            {chip}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Input */}
                            <div className="p-4 border-t bg-background">
                                <form onSubmit={handleSubmit} className="relative">
                                    <Input
                                        placeholder="Ask about properties, tenants, or workflows..."
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        className="pr-12"
                                        disabled={isLoading}
                                        autoFocus
                                    />
                                    <Button
                                        type="submit"
                                        size="icon"
                                        className="absolute right-1 top-1 h-8 w-8 gradient-bg text-white"
                                        disabled={!input.trim() || isLoading}
                                    >
                                        <Send className="w-4 h-4" />
                                    </Button>
                                </form>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Floating Toggle Button */}
            {!isOpen && (
                <motion.button
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="fixed bottom-6 right-6 sm:bottom-8 sm:right-8 z-40 w-14 h-14 rounded-full gradient-bg text-white shadow-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
                    onClick={() => setIsOpen(true)}
                >
                    <Sparkles className="w-6 h-6" />
                </motion.button>
            )}
        </>
    );
}
