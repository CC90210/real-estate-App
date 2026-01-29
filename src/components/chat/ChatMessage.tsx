'use client';

import { cn } from '@/lib/utils';
import { User, Sparkles } from 'lucide-react';

interface ChatMessageProps {
    role: 'user' | 'assistant';
    content: string;
}

export function ChatMessage({ role, content }: ChatMessageProps) {
    return (
        <div
            className={cn(
                "flex w-full mb-4",
                role === 'user' ? "justify-end" : "justify-start"
            )}
        >
            <div className={cn(
                "flex max-w-[80%] items-start gap-2",
                role === 'user' ? "flex-row-reverse" : "flex-row"
            )}>
                <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                    role === 'user' ? "bg-primary text-white" : "gradient-bg text-white"
                )}>
                    {role === 'user' ? <User className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                </div>

                <div className={cn(
                    "p-3 rounded-2xl text-sm leading-relaxed shadow-sm",
                    role === 'user'
                        ? "bg-primary text-primary-foreground rounded-tr-none"
                        : "bg-muted rounded-tl-none"
                )}>
                    {content}
                </div>
            </div>
        </div>
    );
}
