'use client';

import { useAuth } from '@/lib/hooks/useAuth';
import { resolveCompanyPlan } from '@/lib/plans/resolve';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { ShieldAlert, Zap, Lock } from 'lucide-react';
import Link from 'next/link';

interface TierGuardProps {
    children: React.ReactNode;
    feature: string;
    fallback?: React.ReactNode;
}

export function TierGuard({ children, feature, fallback }: TierGuardProps) {
    const { company, isLoading, hasFullAccess } = useAuth();
    const router = useRouter();

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-20 animate-pulse">
                <div className="flex flex-col items-center gap-4">
                    <ShieldAlert className="w-12 h-12 text-slate-200" />
                    <p className="text-sm font-bold uppercase tracking-widest text-slate-300"> verifying permissions... </p>
                </div>
            </div>
        );
    }

    // Resolve effective plan
    const { effectivePlan } = resolveCompanyPlan(company || {});

    // Check Access logic from Mission TASK 2
    const limits = (effectivePlan.limits as unknown) as Record<string, number | boolean | undefined>;
    const features = (effectivePlan.features as unknown) as Record<string, boolean | string[] | undefined>;
    const featureLimitValue = limits[feature] ?? features[feature];
    const allowed = hasFullAccess ||
        featureLimitValue === true ||
        featureLimitValue === -1 ||
        (typeof featureLimitValue === 'number' && featureLimitValue > 0);

    if (allowed) {
        return <>{children}</>;
    }

    // Render Upgrade Block
    if (fallback) return <>{fallback}</>;

    return (
        <div className="h-[80vh] flex items-center justify-center px-4 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <Card className="max-w-md w-full border-none shadow-2xl bg-white relative overflow-hidden">
                {/* Background Decor */}
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-amber-400 via-orange-500 to-amber-600" />
                <div className="absolute -right-20 -top-20 w-64 h-64 bg-amber-50 rounded-full blur-3xl opacity-50" />

                <CardHeader className="text-center pb-2 pt-10 relative z-10">
                    <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-6 text-amber-600 shadow-xl shadow-amber-100/50">
                        <Lock className="w-8 h-8" />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-600 mb-2">Feature Locked</p>
                    <CardTitle className="text-3xl font-black text-slate-900 tracking-tight">Upgrade Required</CardTitle>
                </CardHeader>

                <CardContent className="text-center space-y-8 pb-10 px-8 relative z-10">
                    <p className="text-slate-500 font-medium leading-relaxed">
                        Access to <span className="font-bold text-slate-900 capitalize">{feature.replace(/_/g, ' ')}</span> is restricted on the {effectivePlan.name} plan.
                        Unlock this powerful tool by upgrading to a higher tier.
                    </p>

                    <div className="space-y-3">
                        <Button asChild className="w-full h-14 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-black uppercase tracking-widest shadow-xl group">
                            <Link href="/settings/billing">
                                <Zap className="w-4 h-4 mr-2 text-yellow-400 fill-yellow-400 group-hover:animate-pulse" />
                                Unlock Feature Now
                            </Link>
                        </Button>
                        <Button variant="ghost" onClick={() => router.back()} className="w-full text-xs font-bold text-slate-400 uppercase tracking-wider hover:text-slate-600">
                            Return to Dashboard
                        </Button>
                    </div>

                    <div className="pt-6 border-t border-slate-100">
                        <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">
                            PropFlow Application Services
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
