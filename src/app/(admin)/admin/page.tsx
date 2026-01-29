'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Users,
    Building2,
    Settings,
    ShieldAlert,
    Activity,
    Database
} from 'lucide-react';
import Link from 'next/link';
import { useUser } from '@/lib/hooks/useUser';

export default function AdminPage() {
    const { role } = useUser();

    if (role !== 'admin') {
        return (
            <div className="flex flex-col items-center justify-center h-[50vh] space-y-4">
                <ShieldAlert className="w-16 h-16 text-destructive" />
                <h1 className="text-2xl font-bold">Access Denied</h1>
                <p className="text-muted-foreground">You do not have permission to view this page.</p>
                <Link href="/dashboard">
                    <Button>Return to Dashboard</Button>
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">System Administration</h1>
                <p className="text-muted-foreground mt-1">
                    Manage system-wide settings, users, and configurations.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Link href="/admin/users">
                    <Card className="card-hover cursor-pointer h-full">
                        <CardHeader>
                            <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-4 text-blue-600 dark:text-blue-400">
                                <Users className="w-6 h-6" />
                            </div>
                            <CardTitle>User Management</CardTitle>
                            <CardDescription>
                                Manage user roles, access permissions, and profiles.
                            </CardDescription>
                        </CardHeader>
                    </Card>
                </Link>

                <Link href="/admin/properties">
                    <Card className="card-hover cursor-pointer h-full">
                        <CardHeader>
                            <div className="w-12 h-12 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-4 text-amber-600 dark:text-amber-400">
                                <Building2 className="w-6 h-6" />
                            </div>
                            <CardTitle>Property Database</CardTitle>
                            <CardDescription>
                                Advanced property CRUD operations and bulk updates.
                            </CardDescription>
                        </CardHeader>
                    </Card>
                </Link>

                <Link href="/settings">
                    <Card className="card-hover cursor-pointer h-full">
                        <CardHeader>
                            <div className="w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4 text-slate-600 dark:text-slate-400">
                                <Settings className="w-6 h-6" />
                            </div>
                            <CardTitle>System Settings</CardTitle>
                            <CardDescription>
                                Configure global variables and integrations.
                            </CardDescription>
                        </CardHeader>
                    </Card>
                </Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Activity className="w-5 h-5" /> System Health
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                            <span className="text-sm font-medium">Database Connection</span>
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full flex items-center gap-1">
                                <div className="w-2 h-2 rounded-full bg-green-500" /> Operational
                            </span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                            <span className="text-sm font-medium">OpenAI API</span>
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full flex items-center gap-1">
                                <div className="w-2 h-2 rounded-full bg-green-500" /> Operational
                            </span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                            <span className="text-sm font-medium">Webhook Service (n8n)</span>
                            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full flex items-center gap-1">
                                <div className="w-2 h-2 rounded-full bg-amber-500" /> Degraded
                            </span>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Database className="w-5 h-5" /> Data Overview
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-muted/20 rounded-lg text-center">
                                <div className="text-2xl font-bold">12</div>
                                <div className="text-xs text-muted-foreground">Companies</div>
                            </div>
                            <div className="p-4 bg-muted/20 rounded-lg text-center">
                                <div className="text-2xl font-bold">143</div>
                                <div className="text-xs text-muted-foreground">Total Users</div>
                            </div>
                            <div className="p-4 bg-muted/20 rounded-lg text-center">
                                <div className="text-2xl font-bold">89</div>
                                <div className="text-xs text-muted-foreground">Active Listings</div>
                            </div>
                            <div className="p-4 bg-muted/20 rounded-lg text-center">
                                <div className="text-2xl font-bold">342</div>
                                <div className="text-xs text-muted-foreground">Total Applications</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
