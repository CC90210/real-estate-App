'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface FuturisticBuildingProps {
    className?: string;
    delay?: string;
    color?: 'blue' | 'indigo' | 'emerald' | 'amber';
    height?: number;
    opacity?: number;
}

export function FuturisticBuilding({
    className,
    delay = '0s',
    color = 'blue',
    height = 600,
    opacity = 0.1
}: FuturisticBuildingProps) {
    const colorMap = {
        blue: {
            primary: '#3b82f6',
            secondary: '#60a5fa',
            accent: '#93c5fd'
        },
        indigo: {
            primary: '#6366f1',
            secondary: '#818cf8',
            accent: '#c7d2fe'
        },
        emerald: {
            primary: '#10b981',
            secondary: '#34d399',
            accent: '#a7f3d0'
        },
        amber: {
            primary: '#f59e0b',
            secondary: '#fbbf24',
            accent: '#fde68a'
        }
    };

    const selectedColor = colorMap[color];

    return (
        <div
            className={cn("relative group transition-all duration-1000 select-none pointer-events-none", className)}
            style={{ animationDelay: delay, height: `${height}px` }}
        >
            <svg
                viewBox={`0 0 200 ${height}`}
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-full h-full drop-shadow-[0_0_15px_rgba(0,0,0,0.1)]"
                preserveAspectRatio="none"
            >
                {/* Building Shadow Overlay (Inner) */}
                <path
                    d={`M40 ${height - 40}L40 120L100 40L160 120L160 ${height - 40}H40Z`}
                    fill="url(#buildingInternalGradient)"
                    fillOpacity={opacity}
                />

                {/* Main Outline */}
                <path
                    d={`M40 ${height - 40}L40 120L100 40L160 120L160 ${height - 40}H40Z`}
                    stroke={selectedColor.primary}
                    strokeWidth="1.5"
                    strokeOpacity={opacity * 2}
                />

                {/* Structural Ribs */}
                {[...Array(15)].map((_, i) => {
                    const y = 140 + (i * ((height - 200) / 15));
                    return (
                        <line
                            key={`rib-${i}`}
                            x1="40" y1={y}
                            x2="160" y2={y}
                            stroke={selectedColor.primary}
                            strokeWidth="0.5"
                            strokeOpacity={opacity}
                        />
                    );
                })}

                {/* Vertical Support columns */}
                <line x1="70" y1="80" x2="70" y2={height - 40} stroke={selectedColor.primary} strokeWidth="0.5" strokeOpacity={opacity} />
                <line x1="100" y1="40" x2="100" y2={height - 40} stroke={selectedColor.primary} strokeWidth="1" strokeOpacity={opacity * 1.5} />
                <line x1="130" y1="80" x2="130" y2={height - 40} stroke={selectedColor.primary} strokeWidth="0.5" strokeOpacity={opacity} />

                {/* Animated Light "Elevators" */}
                <rect
                    x="99" y={height - 40} width="2" height="40"
                    fill={selectedColor.accent}
                    className="filter blur-[1px]"
                >
                    <animate
                        attributeName="y"
                        values={`${height - 40};60;${height - 40}`}
                        dur="6s"
                        repeatCount="indefinite"
                        begin={delay}
                    />
                    <animate
                        attributeName="opacity"
                        values="0;1;0"
                        dur="6s"
                        repeatCount="indefinite"
                        begin={delay}
                    />
                </rect>

                {/* Data Nodes (Windows) */}
                {[...Array(30)].map((_, i) => {
                    const r = Math.floor(i / 3);
                    const c = i % 3;
                    const x = 75 + c * 25;
                    const y = 160 + r * 35;
                    if (y > height - 80) return null;

                    return (
                        <rect
                            key={`window-${i}`}
                            x={x} y={y} width="10" height="4"
                            rx="1"
                            fill={selectedColor.primary}
                            fillOpacity={opacity * 3}
                        >
                            <animate
                                attributeName="fill-opacity"
                                values={`${opacity};${opacity * 8};${opacity}`}
                                dur={`${2 + Math.random() * 2}s`}
                                repeatCount="indefinite"
                                begin={`${Math.random() * 5}s`}
                            />
                        </rect>
                    );
                })}

                {/* Rooftop Tech */}
                <rect x="90" y="30" width="20" height="10" stroke={selectedColor.primary} strokeWidth="1" strokeOpacity={opacity * 2} />
                <line x1="100" y1="30" x2="100" y2="0" stroke={selectedColor.primary} strokeWidth="1.5" strokeOpacity={opacity * 3} />
                <circle cx="100" cy="0" r="3" fill={selectedColor.primary} fillOpacity={opacity * 4}>
                    <animate attributeName="r" values="2;5;2" dur="2s" repeatCount="indefinite" />
                    <animate attributeName="fill-opacity" values="0.2;0.8;0.2" dur="2s" repeatCount="indefinite" />
                </circle>

                <defs>
                    <linearGradient id="buildingInternalGradient" x1="100" y1="40" x2="100" y2={height - 40} gradientUnits="userSpaceOnUse">
                        <stop stopColor={selectedColor.primary} stopOpacity="0.2" />
                        <stop offset="1" stopColor={selectedColor.primary} stopOpacity="0" />
                    </linearGradient>
                </defs>
            </svg>
        </div>
    );
}
