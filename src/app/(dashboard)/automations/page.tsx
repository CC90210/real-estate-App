'use client';

import { useAutomationLogs } from '@/lib/hooks/useAutomations';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Clock, Workflow } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useAccentColor } from '@/lib/hooks/useAccentColor';
import { cn } from '@/lib/utils';
import { TierGuard } from '@/components/auth/TierGuard';
import { Button } from '@/components/ui/button';

export default function AutomationsPage() {
    const { data: logs, isLoading } = useAutomationLogs();
    const { colors } = useAccentColor();

    const UpsellView = (
        <div className="p-8 max-w-4xl mx-auto text-center space-y-6 animate-in fade-in slide-in-from-bottom-5">
            <div className={cn("p-12 rounded-[2.5rem] border shadow-sm relative overflow-hidden", colors.bgLight, colors.border)}>
                {/* Background Decor */}
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-600" />
                <div className="absolute -right-20 -top-20 w-64 h-64 bg-indigo-100 rounded-full blur-3xl opacity-50" />

                <div className="w-20 h-20 bg-white rounded-2xl shadow-xl flex items-center justify-center mx-auto mb-8 relative z-10">
                    <Workflow className={cn("w-10 h-10", colors.text)} />
                </div>

                <h2 className={cn("text-4xl font-black mb-4 tracking-tight relative z-10 text-slate-900")}>
                    Operational Autopilot
                </h2>
                <p className="text-xl text-slate-600 max-w-xl mx-auto mb-10 leading-relaxed font-medium relative z-10">
                    Eliminate repetitive tasks. Automatically dispatch invoices, generate lease documents, and run targeted marketing campaigns.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto mb-10 relative z-10">
                    {['Instant Invoicing', 'Auto-Lease Gen', 'Ad Campaigns'].map((feature) => (
                        <div key={feature} className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-white shadow-sm flex items-center justify-center gap-2 font-bold text-slate-700">
                            <CheckCircle className="w-4 h-4 text-emerald-500" />
                            {feature}
                        </div>
                    ))}
                </div>

                <div className="relative z-10 space-y-4">
                    <Button disabled className="h-14 px-10 bg-slate-900 text-white rounded-xl font-black uppercase tracking-widest shadow-xl opacity-50 cursor-not-allowed">
                        Enterprise Only
                    </Button>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Contact Sales to Enable</p>
                </div>
            </div>
        </div>
    );

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'completed': return <CheckCircle className="w-5 h-5 text-green-500" />;
            case 'failed': return <XCircle className="w-5 h-5 text-red-500" />;
            case 'pending':
            case 'processing': return <Clock className="w-5 h-5 text-amber-500 animate-pulse" />;
            default: return <Clock className="w-5 h-5 text-slate-400" />;
        }
    };

    const getStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            completed: "bg-green-100 text-green-700 border-green-200",
            failed: "bg-red-100 text-red-700 border-red-200",
            pending: "bg-amber-100 text-amber-700 border-amber-200",
            processing: cn(colors.bgLight, colors.text, colors.border)
        };
        return (
            <Badge variant="outline" className={cn(styles[status] || styles.pending, "capitalize rounded-full px-3")}>
                {status}
            </Badge>
        );
    };

    const formatAction = (action: string) => {
        const map: Record<string, string> = {
            'send_listing_email': 'Listing Email Campaign',
            'post_social': 'Social Media Post',
            'generate_ad': 'Ad Creative Generation'
        };
        return map[action] || action.replace(/_/g, ' ');
    };

    return (
        <TierGuard feature="automations" fallback={UpsellView}>
            <div className="space-y-8 animate-in fade-in duration-500 p-6 lg:p-10">
                <div className="flex justify-between items-center">
                    <div>
                        <div className={cn("flex items-center gap-2 font-black text-[10px] uppercase tracking-[0.2em] mb-1", colors.text)}>
                            <Workflow className="h-3 w-3" />
                            <span>System Logs</span>
                        </div>
                        <h1 className="text-4xl font-black tracking-tight text-slate-900">Automation History</h1>
                        <p className="text-slate-500 font-medium mt-2">Track all your AI-driven tasks and workflows.</p>
                    </div>
                </div>

                <div className="grid gap-4">
                    {isLoading ? (
                        <div className="space-y-4">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="h-24 bg-slate-50 rounded-2xl animate-pulse" />
                            ))}
                        </div>
                    ) : logs && logs.length > 0 ? (
                        logs.map((log: any) => (
                            <Card key={log.id} className="overflow-hidden hover:shadow-md transition-shadow border-none shadow-sm bg-white rounded-2xl">
                                <CardContent className="p-0">
                                    <div className="flex items-center gap-4 p-6">
                                        <div className="flex-shrink-0">
                                            <div className="p-3 bg-slate-50 rounded-xl">
                                                {getStatusIcon(log.status)}
                                            </div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-1">
                                                <h3 className="text-base font-bold text-slate-900 capitalize truncate">
                                                    {formatAction(log.action_type)}
                                                </h3>
                                                <span className="text-xs text-slate-400 font-bold uppercase tracking-wide">
                                                    {formatDistanceToNow(new Date(log.triggered_at), { addSuffix: true })}
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-2 text-sm text-slate-500">
                                                <Badge variant="secondary" className="font-bold text-[10px] uppercase tracking-wider bg-slate-100 text-slate-500 border-none rounded-lg px-2">
                                                    {log.entity_type}
                                                </Badge>
                                                {log.completed_at && (
                                                    <span className="text-xs font-medium text-slate-400">
                                                        • {Math.round((new Date(log.completed_at).getTime() - new Date(log.triggered_at).getTime()) / 1000)}s execution
                                                    </span>
                                                )}
                                            </div>
                                            {log.error_message && (
                                                <p className="text-sm text-red-600 mt-2 bg-red-50 p-2 rounded-lg border border-red-100 font-mono">
                                                    {log.error_message}
                                                </p>
                                            )}
                                        </div>
                                        <div>
                                            {getStatusBadge(log.status)}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    ) : (
                        <div className="text-center py-20 bg-white rounded-[2.5rem] border-4 border-dashed border-slate-100">
                            <Workflow className="w-16 h-16 text-slate-200 mx-auto mb-6" />
                            <h3 className="text-2xl font-black text-slate-900 tracking-tight">System Idle</h3>
                            <p className="text-slate-400 font-bold mt-2 max-w-sm mx-auto">
                                No automation logs found. Trigger your first workflow to see activity here.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </TierGuard>
    );
}
