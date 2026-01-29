'use client';

import { motion } from 'framer-motion';
import { useApplications } from '@/lib/hooks/useApplications';
import { useUser } from '@/lib/hooks/useUser';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
    FileText,
    Search,
    Filter,
    Clock,
    CheckCircle2,
    XCircle,
    AlertCircle,
    MoreHorizontal
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { getStatusVariant, formatDate, formatCurrency, getInitials } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export default function ApplicationsPage() {
    const { role } = useUser();
    const [activeTab, setActiveTab] = useState('all');
    const { data: applications, isLoading } = useApplications(activeTab === 'all' ? undefined : activeTab);
    const [search, setSearch] = useState('');

    // Filter based on search (Applications hook handles status tab filtering somewhat, but we can refine client side if needed)
    const filteredApplications = applications?.filter((app) =>
        app.applicant_name.toLowerCase().includes(search.toLowerCase()) ||
        app.property?.address?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Applications</h1>
                    <p className="text-muted-foreground mt-1">
                        {role === 'agent'
                            ? 'Track applications you have submitted.'
                            : 'Review and manage tenant applications.'}
                    </p>
                </div>
                {role === 'agent' && (
                    <Button className="gradient-bg text-white">
                        <FileText className="w-4 h-4 mr-2" />
                        New Application
                    </Button>
                )}
            </div>

            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
                    <TabsList>
                        <TabsTrigger value="all">All</TabsTrigger>
                        <TabsTrigger value="new">Pending</TabsTrigger>
                        <TabsTrigger value="approved">Approved</TabsTrigger>
                        <TabsTrigger value="denied">Denied</TabsTrigger>
                    </TabsList>
                </Tabs>

                <div className="relative w-full sm:w-[300px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Search applicants or properties..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10"
                    />
                </div>
            </div>

            {isLoading ? (
                <div className="space-y-4">
                    {[1, 2, 3, 4].map((i) => (
                        <Skeleton key={i} className="h-24 w-full rounded-xl" />
                    ))}
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredApplications?.map((app, index) => (
                        <motion.div
                            key={app.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                        >
                            <Link href={`/applications/${app.id}`}>
                                <Card className="card-hover border-0 shadow-sm transition-all hover:bg-muted/10 cursor-pointer">
                                    <CardContent className="p-6">
                                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
                                            {/* Applicant Info */}
                                            <div className="flex items-center gap-4 min-w-[200px]">
                                                <Avatar className="h-10 w-10">
                                                    <AvatarFallback className="bg-primary/10 text-primary">
                                                        {getInitials(app.applicant_name)}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <div className="font-semibold">{app.applicant_name}</div>
                                                    <div className="text-sm text-muted-foreground">{app.applicant_email}</div>
                                                </div>
                                            </div>

                                            {/* Property Info */}
                                            <div className="flex-1 min-w-[200px]">
                                                <div className="text-sm font-medium">
                                                    {app.property?.address} <span className="text-muted-foreground">#{app.property?.unit_number}</span>
                                                </div>
                                                <div className="text-sm text-muted-foreground flex items-center gap-2">
                                                    <span>{formatCurrency(app.property?.rent || 0)}/mo</span>
                                                    <span>•</span>
                                                    <span>Submitted {formatDate(app.created_at)}</span>
                                                </div>
                                            </div>

                                            {/* Status & Indicators */}
                                            <div className="flex flex-col sm:flex-row items-end sm:items-center gap-4">
                                                {/* Screening Status Indicator for Landlords/Admins */}
                                                {['landlord', 'admin'].includes(role || '') && (
                                                    <div className="flex flex-col items-end mr-2">
                                                        {app.screening_status === 'completed' ? (
                                                            <div className="flex items-center gap-1 text-green-600 text-xs font-medium">
                                                                <CheckCircle2 className="w-3 h-3" />
                                                                Screening Ready
                                                            </div>
                                                        ) : app.screening_status === 'pending' ? (
                                                            <div className="flex items-center gap-1 text-amber-600 text-xs font-medium">
                                                                <Clock className="w-3 h-3" />
                                                                Screening Pending
                                                            </div>
                                                        ) : null}
                                                        {/* Credit Score Peek (if available) */}
                                                        {app.credit_score && (
                                                            <div className={`text-xs font-bold ${app.credit_score >= 700 ? 'text-green-600' : app.credit_score >= 600 ? 'text-amber-600' : 'text-red-600'}`}>
                                                                Score: {app.credit_score}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                <Badge variant={getStatusVariant(app.status)} className="uppercase tracking-wider">
                                                    {app.status}
                                                </Badge>

                                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                                    <MoreHorizontal className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        </motion.div>
                    ))}

                    {filteredApplications?.length === 0 && (
                        <div className="text-center py-12">
                            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                                <FileText className="w-8 h-8 text-muted-foreground" />
                            </div>
                            <h3 className="text-lg font-semibold">No applications found</h3>
                            <p className="text-muted-foreground">
                                Try adjusting your filters or search terms.
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
