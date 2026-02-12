'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Users, Building, Home, Activity, ShieldCheck, Zap, Globe, Cpu } from 'lucide-react';

interface SolutionsVisualProps {
    type: 'leasing' | 'management' | 'investment';
    className?: string;
}

export function SolutionsVisual({ type, className }: SolutionsVisualProps) {
    if (type === 'leasing') {
        return (
            <div className={cn("relative w-full h-full flex items-center justify-center p-8 overflow-hidden", className)}>
                {/* Background Grid */}
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#3b82f6 1px, transparent 1px)', backgroundSize: '20px 20px' }} />

                {/* Visual Composition */}
                <div className="relative z-10 w-full max-w-sm aspect-square bg-white/5 backdrop-blur-xl rounded-[2.5rem] border border-white/20 shadow-2xl flex flex-col p-8 group">
                    <div className="flex justify-between items-center mb-8">
                        <div className="h-12 w-12 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/50">
                            <Users className="text-white h-6 w-6" />
                        </div>
                        <div className="flex gap-2">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="h-2 w-8 rounded-full bg-blue-100 animate-pulse" style={{ animationDelay: `${i * 0.2}s` }} />
                            ))}
                        </div>
                    </div>

                    <div className="space-y-4 flex-1">
                        {[
                            { label: 'Lead Scoring', val: 88, color: 'bg-blue-500' },
                            { label: 'Showings Hook', val: 94, color: 'bg-indigo-500' },
                            { label: 'Drafting Efficiency', val: 76, color: 'bg-violet-500' }
                        ].map((item, i) => (
                            <div key={i} className="space-y-2">
                                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-white/60">
                                    <span>{item.label}</span>
                                    <span>{item.val}%</span>
                                </div>
                                <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                                    <div
                                        className={cn("h-full rounded-full transition-all duration-1000", item.color)}
                                        style={{ width: `${item.val}%`, transitionDelay: `${i * 0.1}s` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-8 flex justify-center">
                        <div className="px-4 py-2 rounded-full bg-white/10 border border-white/20 text-[10px] font-black text-white uppercase tracking-widest">
                            Autonomous Fulfillment Active
                        </div>
                    </div>
                </div>

                {/* Floating Elements */}
                <div className="absolute top-1/4 right-10 w-24 h-24 bg-blue-400/20 rounded-full blur-2xl animate-float" />
                <div className="absolute bottom-1/4 left-10 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '-2s' }} />
            </div>
        );
    }

    if (type === 'management') {
        return (
            <div className={cn("relative w-full h-full flex items-center justify-center p-8 overflow-hidden", className)}>
                {/* Background Grid */}
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'linear-gradient(#6366f1 1px, transparent 1px), linear-gradient(90deg, #6366f1 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

                <div className="relative z-10 w-full max-w-sm aspect-square bg-slate-900/40 backdrop-blur-2xl rounded-[3rem] border border-white/10 shadow-3xl p-8 flex flex-col items-center justify-center group">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent opacity-50 rounded-[3rem]" />

                    <div className="relative w-48 h-48 mb-8">
                        {/* Central Hub Icon */}
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="h-24 w-24 rounded-full bg-indigo-600 flex items-center justify-center shadow-[0_0_50px_rgba(99,102,241,0.5)] z-20">
                                <Building className="text-white h-10 w-10" />
                            </div>
                        </div>

                        {/* Orbital Icons */}
                        {[
                            { Icon: Activity, angle: 0 },
                            { Icon: Cpu, angle: 120 },
                            { Icon: Globe, angle: 240 }
                        ].map((item, i) => (
                            <div
                                key={i}
                                className="absolute w-12 h-12 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-xl animate-float"
                                style={{
                                    top: `${50 + 40 * Math.sin(item.angle * Math.PI / 180)}%`,
                                    left: `${50 + 40 * Math.cos(item.angle * Math.PI / 180)}%`,
                                    transform: 'translate(-50%, -50%)',
                                    animationDelay: `${i * -1.5}s`
                                }}
                            >
                                <item.Icon className="h-5 w-5" />
                            </div>
                        ))}

                        {/* Orbital Rings */}
                        <div className="absolute inset-0 border border-white/10 rounded-full animate-[spin_10s_linear_infinite]" />
                        <div className="absolute inset-4 border border-white/5 rounded-full animate-[spin_15s_linear_infinite_reverse]" />
                    </div>

                    <div className="text-center">
                        <h4 className="text-white font-black uppercase tracking-widest text-xs mb-2">Central Node Status</h4>
                        <div className="flex items-center gap-2 justify-center">
                            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                            <span className="text-emerald-400 font-bold text-[10px] uppercase">Synced with 4 Enterprise Clusters</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (type === 'investment') {
        return (
            <div className={cn("relative w-full h-full flex items-center justify-center p-8 overflow-hidden", className)}>
                {/* Background Glow */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent opacity-20" />

                <div className="relative z-10 w-full max-w-sm aspect-square bg-white/5 backdrop-blur-xl rounded-[2.5rem] border border-white/10 shadow-2xl p-8 flex flex-col justify-between group overflow-hidden">
                    <div className="absolute top-0 right-0 p-6">
                        <Zap className="h-8 w-8 text-yellow-500/40 fill-yellow-500/20" />
                    </div>

                    <div>
                        <div className="h-14 w-14 rounded-2xl bg-slate-900 border border-white/10 flex items-center justify-center shadow-2xl mb-6">
                            <Home className="text-white h-7 w-7" />
                        </div>
                        <h4 className="text-white font-black text-xl tracking-tight mb-2">Portfolio Yield</h4>
                        <div className="flex items-baseline gap-2">
                            <span className="text-4xl font-black text-white">12.4%</span>
                            <span className="text-emerald-400 font-black text-xs uppercase tracking-widest">+2.1% YOY</span>
                        </div>
                    </div>

                    {/* SVG Chart Visualization */}
                    <div className="h-32 w-full mt-4 bg-white/5 rounded-2xl border border-white/5 overflow-hidden flex items-end">
                        <svg viewBox="0 0 400 100" className="w-full h-full">
                            <defs>
                                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.5" />
                                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                                </linearGradient>
                            </defs>
                            <path
                                d="M0 80 Q 50 70, 100 85 T 200 60 T 300 40 T 400 20 L 400 100 L 0 100 Z"
                                fill="url(#chartGradient)"
                            />
                            <path
                                d="M0 80 Q 50 70, 100 85 T 200 60 T 300 40 T 400 20"
                                fill="none"
                                stroke="#3b82f6"
                                strokeWidth="3"
                                strokeLinecap="round"
                                className="animate-draw"
                            />
                            {/* Animated Pulse Point */}
                            <circle cx="400" cy="20" r="4" fill="#3b82f6" className="animate-ping" />
                        </svg>
                    </div>

                    <div className="mt-6 flex justify-between items-center text-[9px] font-black text-white/40 uppercase tracking-widest">
                        <span>LTV: 68%</span>
                        <span>IRR: 18.2%</span>
                        <span>Occupancy: 99.1%</span>
                    </div>
                </div>

                {/* Floating Bokeh */}
                <div className="absolute top-10 left-10 w-4 h-4 rounded-full bg-blue-500/40 blur-sm" />
                <div className="absolute bottom-20 right-20 w-8 h-8 rounded-full bg-indigo-500/20 blur-md" />
            </div>
        );
    }

    return null;
}
