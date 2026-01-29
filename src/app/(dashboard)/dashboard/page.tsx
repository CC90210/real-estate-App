'use client';

import { motion } from 'framer-motion';
import { useUser } from '@/lib/hooks/useUser';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Building2,
    FileText,
    Users,
    Clock,
    CheckCircle2,
    XCircle,
    ArrowRight,
    Sparkles
} from 'lucide-react';
import Link from 'next/link';
import { useApplicationStats } from '@/lib/hooks/useApplications';
import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardPage() {
    const { profile, role } = useUser();
    const { data: stats, isLoading } = useApplicationStats();

    // Welcome Message based on time
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

    if (!profile) return null;

    return (
        <div className="space-y-8">
            {/* Welcome Section */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
            >
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">
                        {greeting}, <span className="gradient-text">{profile.full_name.split(' ')[0]}</span>
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Here's what's happening with your properties today.
                    </p>
                </div>
                <div className="flex gap-3">
                    {role === 'agent' && (
                        <Link href="/areas">
                            <Button className="gradient-bg text-white shadow-lg shadow-primary/20">
                                <Building2 className="w-4 h-4 mr-2" />
                                Browse Properties
                            </Button>
                        </Link>
                    )}
                    {['landlord', 'admin'].includes(role) && (
                        <Link href="/applications">
                            <Button className="gradient-bg text-white shadow-lg shadow-primary/20">
                                <FileText className="w-4 h-4 mr-2" />
                                Review Applications
                            </Button>
                        </Link>
                    )}
                </div>
            </motion.div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {isLoading ? (
                    [1, 2, 3, 4].map((i) => (
                        <Skeleton key={i} className="h-32 rounded-xl" />
                    ))
                ) : (
                    <>
                        <StatsCard
                            title="Total Applications"
                            value={stats?.total || 0}
                            icon={FileText}
                            color="text-blue-500"
                            bg="bg-blue-500/10"
                            index={0}
                        />
                        <StatsCard
                            title="Pending Review"
                            value={stats?.pending || 0}
                            icon={Clock}
                            color="text-amber-500"
                            bg="bg-amber-500/10"
                            index={1}
                        />
                        <StatsCard
                            title="Approved"
                            value={stats?.approved || 0}
                            icon={CheckCircle2}
                            color="text-green-500"
                            bg="bg-green-500/10"
                            index={2}
                        />
                        {role !== 'agent' && (
                            <StatsCard
                                title="Screening Complete"
                                value={stats?.screeningComplete || 0}
                                icon={Users}
                                color="text-purple-500"
                                bg="bg-purple-500/10"
                                index={3}
                            />
                        )}
                        {role === 'agent' && (
                            <StatsCard
                                title="Rejected"
                                value={stats?.denied || 0}
                                icon={XCircle}
                                color="text-red-500"
                                bg="bg-red-500/10"
                                index={3}
                            />
                        )}
                    </>
                )}
            </div>

            {/* Role Specific Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Main Content Area (2 cols) */}
                <div className="lg:col-span-2 space-y-6">
                    <SectionHeader title="Recent Activity" link="/activity" />

                    <Card className="glass border-0 shadow-sm">
                        <CardContent className="p-0">
                            <div className="p-6 text-center text-muted-foreground py-12">
                                <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
                                    <Clock className="w-6 h-6 text-muted-foreground" />
                                </div>
                                <p>No recent activity to show.</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Sidebar Area (1 col) */}
                <div className="space-y-6">
                    {role === 'agent' && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.4 }}
                        >
                            <Card className="bg-gradient-to-br from-primary to-primary-light text-white border-0 overflow-hidden relative">
                                <div className="absolute top-0 right-0 p-4 opacity-10">
                                    <Sparkles className="w-32 h-32" />
                                </div>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Sparkles className="w-5 h-5 text-accent" />
                                        AI Assistant
                                    </CardTitle>
                                    <CardDescription className="text-primary-foreground/80">
                                        Need help writing a listing description?
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Button variant="secondary" className="w-full text-primary font-medium">
                                        Open Chat
                                    </Button>
                                </CardContent>
                            </Card>
                        </motion.div>
                    )}

                    <SectionHeader title="Quick Actions" />
                    <div className="grid grid-cols-1 gap-3">
                        <Button variant="outline" className="justify-start h-auto py-4 px-4 bg-card hover:bg-muted/50">
                            <div className="mr-4 w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div className="text-left">
                                <div className="font-semibold">View Properties</div>
                                <div className="text-xs text-muted-foreground">Check availability & details</div>
                            </div>
                            <ArrowRight className="ml-auto w-4 h-4 text-muted-foreground" />
                        </Button>

                        <Button variant="outline" className="justify-start h-auto py-4 px-4 bg-card hover:bg-muted/50">
                            <div className="mr-4 w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                                <FileText className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                            </div>
                            <div className="text-left">
                                <div className="font-semibold">New Application</div>
                                <div className="text-xs text-muted-foreground">Start a tenant application</div>
                            </div>
                            <ArrowRight className="ml-auto w-4 h-4 text-muted-foreground" />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatsCard({
    title,
    value,
    icon: Icon,
    color,
    bg,
    index
}: {
    title: string,
    value: number | string,
    icon: any,
    color: string,
    bg: string,
    index: number
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
        >
            <Card className="card-hover border-none shadow-sm">
                <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">{title}</p>
                            <h3 className="text-2xl font-bold mt-2">{value}</h3>
                        </div>
                        <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", bg)}>
                            <Icon className={cn("w-6 h-6", color)} />
                        </div>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
}

function SectionHeader({ title, link }: { title: string, link?: string }) {
    return (
        <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
            {link && (
                <Link href={link} className="text-sm text-primary hover:underline">
                    View All
                </Link>
            )}
        </div>
    );
}
