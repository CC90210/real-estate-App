'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface FuturisticBuildingProps {
    className?: string;
    delay?: string;
    color?: 'blue' | 'indigo' | 'emerald';
}

export function FuturisticBuilding({ className, delay = '0s', color = 'blue' }: FuturisticBuildingProps) {
    const colorMap = {
        blue: {
            primary: '#3b82f6',
            secondary: '#60a5fa',
            glow: 'rgba(59, 130, 246, 0.2)'
        },
        indigo: {
            primary: '#6366f1',
            secondary: '#818cf8',
            glow: 'rgba(99, 102, 241, 0.2)'
        },
        emerald: {
            primary: '#10b981',
            secondary: '#34d399',
            glow: 'rgba(16, 185, 129, 0.2)'
        }
    };

    const selectedColor = colorMap[color];

    return (
        <div
            className={cn("relative group transition-all duration-700 select-none pointer-events-none", className)}
            style={{ animationDelay: delay }}
        >
            <svg
                viewBox="0 0 200 600"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-full h-full drop-shadow-2xl"
            >
                {/* Building Core */}
                <path
                    d="M40 560L40 100L80 40L120 40L160 100L160 560H40Z"
                    fill="white"
                    fillOpacity="0.05"
                    stroke={selectedColor.primary}
                    strokeWidth="1"
                    strokeOpacity="0.1"
                />

                {/* Internal Structural Grid */}
                {[...Array(20)].map((_, i) => (
                    <line
                        key={`h-${i}`}
                        x1="45" y1={120 + i * 22}
                        x2="155" y2={120 + i * 22}
                        stroke={selectedColor.primary}
                        strokeWidth="0.5"
                        strokeOpacity="0.05"
                    />
                ))}

                <line x1="100" y1="40" x2="100" y2="560" stroke={selectedColor.primary} strokeWidth="0.5" strokeOpacity="0.05" />

                {/* Animated Light Trails */}
                <rect
                    x="100" y="560" width="1" height="0"
                    fill={selectedColor.secondary}
                    className="animate-pulse"
                >
                    <animate
                        attributeName="height"
                        values="0;400;0"
                        dur="4s"
                        repeatCount="indefinite"
                        begin={delay}
                    />
                    <animate
                        attributeName="y"
                        values="560;160;560"
                        dur="4s"
                        repeatCount="indefinite"
                        begin={delay}
                    />
                </rect>

                {/* Windows/Nodal Points */}
                {[...Array(40)].map((_, i) => {
                    const row = Math.floor(i / 4);
                    const col = i % 4;
                    const x = 60 + col * 25;
                    const y = 140 + row * 40;
                    const delayVal = (i * 0.1).toFixed(1);

                    return (
                        <circle
                            key={`node-${i}`}
                            cx={x} cy={y} r="1.5"
                            fill={selectedColor.primary}
                            fillOpacity="0.2"
                        >
                            <animate
                                attributeName="fill-opacity"
                                values="0.1;0.8;0.1"
                                dur="3s"
                                repeatCount="indefinite"
                                begin={`${delayVal}s`}
                            />
                        </circle>
                    );
                })}

                {/* Antennae */}
                <line x1="100" y1="40" x2="100" y2="10" stroke={selectedColor.primary} strokeWidth="1" strokeOpacity="0.3" />
                <circle cx="100" cy="10" r="2" fill={selectedColor.primary} className="animate-ping" />

                {/* Gradient Glow */}
                <defs>
                    <linearGradient id="buildingGradient" x1="100" y1="0" x2="100" y2="600" gradientUnits="userSpaceOnUse">
                        <stop stopColor={selectedColor.primary} stopOpacity="0.1" />
                        <stop offset="1" stopColor={selectedColor.primary} stopOpacity="0" />
                    </linearGradient>
                    <filter id="glow">
                        <feGaussianBlur stdDeviation="5" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                </defs>
            </svg>

            {/* Ambient Aura */}
            <div
                className="absolute inset-x-0 bottom-0 h-[80%] -z-10 blur-[100px] rounded-full opacity-20 group-hover:opacity-30 transition-opacity duration-1000"
                style={{ backgroundColor: selectedColor.primary }}
            />
        </div>
    );
}
