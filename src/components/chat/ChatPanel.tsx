'use client';

import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Sparkles, Send, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ChatPanel() {
    const [messages, setMessages] = useState<{ role: 'user' | 'assistant', content: string }[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

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

            const data = await res.json();
            setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
        } catch (error) {
            console.error("Chat error", error);
            setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I encountered an error. Please try again." }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-50">
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
                <SheetTrigger asChild>
                    <Button size="icon" className="h-14 w-14 rounded-full shadow-lg bg-blue-600 hover:bg-blue-700 animate-in zoom-in duration-300">
                        <Sparkles className="h-6 w-6 text-white" />
                    </Button>
                </SheetTrigger>
                <SheetContent className="w-[400px] flex flex-col sm:max-w-[400px] p-0 gap-0">
                    <SheetHeader className="p-4 border-b bg-slate-50">
                        <SheetTitle className="flex items-center gap-2 text-slate-900">
                            <Sparkles className="w-5 h-5 text-blue-600" />
                            AI Assistant
                        </SheetTitle>
                    </SheetHeader>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white">
                        {messages.length === 0 && (
                            <div className="text-center text-slate-400 mt-10">
                                <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                <p>Ask me anything about your properties!</p>
                                <p className="text-xs mt-2">"What is the lockbox for 123 Main?"</p>
                            </div>
                        )}
                        {messages.map((msg, i) => (
                            <div key={i} className={cn(
                                'p-3 rounded-2xl max-w-[85%] text-sm',
                                msg.role === 'user'
                                    ? 'bg-blue-600 text-white ml-auto rounded-tr-sm'
                                    : 'bg-slate-100 text-slate-900 rounded-tl-sm'
                            )}>
                                {msg.content}
                            </div>
                        ))}
                        {loading && (
                            <div className="flex gap-1 items-center bg-slate-100 p-3 rounded-xl w-fit">
                                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" />
                                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-75" />
                                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-150" />
                            </div>
                        )}
                    </div>

                    <div className="p-4 border-t bg-slate-50">
                        <div className="flex gap-2">
                            <Input
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Ask about properties..."
                                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                                className="bg-white"
                            />
                            <Button onClick={sendMessage} size="icon" className="shrink-0 bg-blue-600">
                                <Send className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </SheetContent>
            </Sheet>
        </div>
    );
}
