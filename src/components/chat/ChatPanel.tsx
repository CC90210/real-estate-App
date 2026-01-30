'use client';

import { useState, useRef, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Sparkles, Send, MessageSquare, Bot, User, Zap, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ChatPanel() {
    const [messages, setMessages] = useState<{ role: 'user' | 'assistant', content: string }[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, loading]);

    const sendMessage = async () => {
        if (!input.trim()) return;

        const userMessage = { role: 'user' as const, content: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setLoading(true);

        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: userMessage.content, history: messages })
            });

            if (!res.ok) throw new Error('Chat failed');
            const data = await res.json();
            setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
        } catch (error) {
            console.error("Chat error", error);
            setMessages(prev => [...prev, { role: 'assistant', content: "I'm having trouble connecting to my brain right now. Please try again in a moment." }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed bottom-8 right-8 z-[100]">
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
                <SheetTrigger asChild>
                    <button className="h-16 w-16 rounded-2xl shadow-[0_10px_40px_rgba(37,99,235,0.3)] bg-blue-600 hover:bg-blue-700 transition-all hover:scale-105 active:scale-95 flex items-center justify-center relative group">
                        <div className="absolute inset-0 rounded-2xl bg-blue-400/20 animate-ping group-hover:hidden" />
                        <Sparkles className="h-7 w-7 text-white fill-white transition-transform group-hover:rotate-12" />
                        {messages.length > 0 && (
                            <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold text-white">
                                {messages.length}
                            </div>
                        )}
                    </button>
                </SheetTrigger>
                <SheetContent className="w-[450px] flex flex-col sm:max-w-[450px] p-0 gap-0 border-none shadow-2xl rounded-l-[2rem] overflow-hidden">
                    <SheetHeader className="p-6 bg-slate-900 text-white relative">
                        <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-20 pointer-events-none">
                            <div className="absolute -top-20 -left-20 w-40 h-40 bg-blue-500 rounded-full blur-[80px]" />
                            <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-indigo-500 rounded-full blur-[80px]" />
                        </div>
                        <SheetTitle className="flex items-center gap-3 text-white z-10">
                            <div className="p-2 rounded-xl bg-blue-600 shadow-lg shadow-blue-500/30">
                                <Zap className="w-5 h-5 text-white fill-white" />
                            </div>
                            <div>
                                <h2 className="text-xl font-black tracking-tight">PropFlow AI</h2>
                                <p className="text-[10px] uppercase tracking-widest text-blue-400 font-black">Intelligent Assistant</p>
                            </div>
                        </SheetTitle>
                    </SheetHeader>

                    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#f8fafc]" ref={scrollRef}>
                        {messages.length === 0 && (
                            <div className="h-full flex flex-col items-center justify-center text-center space-y-4 px-8 opacity-60">
                                <div className="p-6 rounded-3xl bg-white shadow-sm border border-slate-200/60">
                                    <Bot className="w-12 h-12 text-blue-600 mx-auto mb-4" />
                                    <h3 className="text-lg font-bold text-slate-900">How can I help you today?</h3>
                                    <p className="text-sm text-slate-500">I have access to all your properties, lockbox codes, and tenant applications.</p>
                                </div>
                                <div className="grid grid-cols-1 gap-2 w-full">
                                    <button onClick={() => setInput("What's the lockbox for 100 Main St?")} className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:border-blue-300 hover:text-blue-600 transition-all">"Wait, what's the lockbox for 100 Main St?"</button>
                                    <button onClick={() => setInput("Show me available 2 bedroom units")} className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:border-blue-300 hover:text-blue-600 transition-all">"Available 2 bedroom units?"</button>
                                </div>
                            </div>
                        )}
                        {messages.map((msg, i) => (
                            <div key={i} className={cn(
                                'flex items-start gap-3 w-full animate-in fade-in slide-in-from-bottom-2 duration-300',
                                msg.role === 'user' ? 'flex-row-reverse' : ''
                            )}>
                                <div className={cn(
                                    "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm",
                                    msg.role === 'user' ? "bg-slate-900" : "bg-blue-600"
                                )}>
                                    {msg.role === 'user' ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-white" />}
                                </div>
                                <div className={cn(
                                    'p-4 rounded-2xl max-w-[80%] text-[13px] leading-relaxed shadow-sm font-medium border',
                                    msg.role === 'user'
                                        ? 'bg-slate-900 text-white border-slate-800 rounded-tr-none'
                                        : 'bg-white text-slate-900 border-slate-200 rounded-tl-none'
                                )}>
                                    {msg.content}
                                </div>
                            </div>
                        ))}
                        {loading && (
                            <div className="flex items-start gap-3">
                                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
                                    <Bot className="w-4 h-4 text-white" />
                                </div>
                                <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl rounded-tl-none shadow-sm flex gap-1">
                                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" />
                                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="p-6 border-t bg-white">
                        <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl border border-slate-200 focus-within:border-blue-400 focus-within:ring-4 focus-within:ring-blue-400/10 transition-all">
                            <Input
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Type a message..."
                                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                                className="bg-transparent border-none shadow-none focus-visible:ring-0 font-medium"
                            />
                            <Button onClick={sendMessage} size="icon" className="shrink-0 bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg shadow-blue-500/20">
                                <Send className="w-4 h-4" />
                            </Button>
                        </div>
                        <p className="text-[9px] text-center text-slate-400 mt-4 font-bold uppercase tracking-widest">Powered by Gemini 1.5 Flash</p>
                    </div>
                </SheetContent>
            </Sheet>
        </div>
    );
}
