'use client';

import { useAutomationLogs, useAutomationSubscription } from '@/lib/hooks/useAutomations';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Clock, Workflow } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function AutomationsPage() {
    const { data: logs, isLoading } = useAutomationLogs();
    const { data: subscription } = useAutomationSubscription();

    if (!subscription?.is_active) {
        return (
            <div className="p-8 max-w-4xl mx-auto text-center space-y-6 animate-in fade-in slide-in-from-bottom-5">
                <div className="bg-gradient-to-br from-purple-100 to-indigo-50 p-12 rounded-3xl border border-indigo-100 shadow-sm">
                    <div className="w-16 h-16 bg-white rounded-2xl shadow-md flex items-center justify-center mx-auto mb-6">
                        <Workflow className="w-8 h-8 text-indigo-600" />
                    </div>
                    <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-indigo-600 mb-4">
                        Unlock Powerful Automations
                    </h2>
                    <p className="text-lg text-slate-600 max-w-lg mx-auto mb-8 leading-relaxed">
                        Upgrade to <strong>Automation Pro</strong> to put your property management on autopilot.
                        Automatically send listing blasts, post to social media, and generate ad creatives.
                    </p>
                    {/* Placeholder for upgrade button or contact sales */}
                    <button disabled className="px-8 py-3 bg-slate-900 text-white rounded-full font-semibold opacity-50 cursor-not-allowed">
                        Upgrade Plan
                    </button>
                    <p className="text-sm text-slate-400 mt-4">Contact your administrator to enable this feature.</p>
                </div>
            </div>
        );
    }

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
            processing: "bg-blue-100 text-blue-700 border-blue-200"
        };
        return (
            <Badge variant="outline" className={`${styles[status] || styles.pending} capitalize rounded-full px-3`}>
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
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Automation History</h1>
                    <p className="text-slate-500">Track all your AI-driven tasks and workflows.</p>
                </div>
            </div>

            <div className="grid gap-4">
                {isLoading ? (
                    <div>Loading logs...</div>
                ) : logs && logs.length > 0 ? (
                    logs.map((log) => (
                        <Card key={log.id} className="overflow-hidden hover:shadow-md transition-shadow">
                            <CardContent className="p-0">
                                <div className="flex items-center gap-4 p-4">
                                    <div className="flex-shrink-0">
                                        <div className="p-3 bg-slate-50 rounded-xl">
                                            {getStatusIcon(log.status)}
                                        </div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1">
                                            <h3 className="text-base font-semibold text-slate-900 capitalize truncate">
                                                {formatAction(log.action_type)}
                                            </h3>
                                            <span className="text-xs text-slate-400 font-medium">
                                                {formatDistanceToNow(new Date(log.triggered_at), { addSuffix: true })}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-2 text-sm text-slate-500">
                                            <Badge variant="secondary" className="font-normal text-xs uppercase tracking-wider bg-slate-100 text-slate-500 border-none">
                                                {log.entity_type}
                                            </Badge>
                                            {log.completed_at && (
                                                <span className="text-xs">
                                                    Duration: {Math.round((new Date(log.completed_at).getTime() - new Date(log.triggered_at).getTime()) / 1000)}s
                                                </span>
                                            )}
                                        </div>
                                        {log.error_message && (
                                            <p className="text-sm text-red-600 mt-2 bg-red-50 p-2 rounded-md border border-red-100">
                                                Error: {log.error_message}
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
                    <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                        <Workflow className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                        <h3 className="text-slate-900 font-medium">No automations run yet</h3>
                        <p className="text-slate-500 text-sm max-w-xs mx-auto mt-1">
                            Trigger your first automation from any property detail page.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
