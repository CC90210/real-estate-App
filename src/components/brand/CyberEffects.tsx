'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export function CyberGrid({ className }: { className?: string }) {
    return (
        <div className={cn("absolute inset-0 pointer-events-none overflow-hidden", className)}>
            <div
                className="absolute inset-0 opacity-[0.03]"
                style={{
                    backgroundImage: `
                        linear-gradient(to right, #3b82f6 1px, transparent 1px),
                        linear-gradient(to bottom, #3b82f6 1px, transparent 1px)
                    `,
                    backgroundSize: '100px 100px',
                    maskImage: 'radial-gradient(circle at center, black, transparent 80%)'
                }}
            />
            {/* Perspective Lines */}
            <svg viewBox="0 0 100 100" className="absolute bottom-0 w-full h-[40%] opacity-[0.05]" preserveAspectRatio="none">
                {[...Array(10)].map((_, i) => (
                    <line
                        key={i}
                        x1={i * 10} y1="0" x2={i * 10} y2="100"
                        stroke="#3b82f6" strokeWidth="0.1"
                    />
                ))}
                {[...Array(5)].map((_, i) => (
                    <line
                        key={`h-${i}`}
                        x1="0" y1={i * 20} x2="100" y2={i * 20}
                        stroke="#3b82f6" strokeWidth="0.1"
                    />
                ))}
            </svg>
        </div>
    );
}

export function DataStream({ className, delay = '0s', color = 'blue' }: { className?: string, delay?: string, color?: string }) {
    const streamColor = color === 'blue' ? '#3b82f6' : color === 'indigo' ? '#6366f1' : '#10b981';

    return (
        <div className={cn("absolute w-[1px] h-32 opacity-[0.15] overflow-hidden", className)}>
            <div
                className="w-full h-full animate-[stream_4s_linear_infinite]"
                style={{
                    background: `linear-gradient(to bottom, transparent, ${streamColor}, transparent)`,
                    animationDelay: delay
                }}
            />
            <style jsx>{`
                @keyframes stream {
                    0% { transform: translateY(-100%); }
                    100% { transform: translateY(100%); }
                }
            `}</style>
        </div>
    );
}
