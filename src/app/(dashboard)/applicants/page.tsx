'use client';

import { useApplications } from '@/lib/hooks/useApplications';
import { useProperties } from '@/lib/hooks/useProperties';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Filter, MoreHorizontal, User, Calendar, Home } from 'lucide-react';
import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

export default function ApplicantsPage() {
    const { data: applications, isLoading } = useApplications();
    const { data: properties } = useProperties();
    const [statusFilter, setStatusFilter] = useState('all');
    const [search, setSearch] = useState('');

    const filteredApplications = applications?.filter(app => {
        const matchesSearch = app.applicant_name.toLowerCase().includes(search.toLowerCase()) ||
            app.applicant_email.toLowerCase().includes(search.toLowerCase());
        const matchesStatus = statusFilter === 'all' || app.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const getPropertyAddress = (id: string) => {
        return properties?.find(p => p.id === id)?.address || 'Unknown Property';
    };

    const StatusBadge = ({ status }: { status: string }) => {
        const styles = {
            new: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
            screening: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
            approved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200',
            denied: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
            withdrawn: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
        };
        // @ts-ignore
        const style = styles[status] || styles.withdrawn;
        return (
            <Badge variant="outline" className={`${style} capitalize font-medium rounded-full px-2.5 py-0.5 border-none shadow-none`}>
                {status}
            </Badge>
        );
    };

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Applicants</h1>
                <p className="text-muted-foreground mt-1">
                    Manage tenant applications and screening ({filteredApplications?.length || 0})
                </p>
            </div>

            {/* Filters */}
            <Card className="border-none shadow-sm p-4 bg-muted/40">
                <div className="flex flex-col sm:flex-row gap-4 justify-between">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Search applicants..."
                            className="pl-9 bg-background border-none shadow-sm"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-2 bg-background p-1 rounded-lg border shadow-sm">
                        {['all', 'new', 'screening', 'approved', 'denied'].map((status) => (
                            <Button
                                key={status}
                                variant={statusFilter === status ? 'default' : 'ghost'}
                                size="sm"
                                onClick={() => setStatusFilter(status)}
                                className={statusFilter === status ? 'gradient-bg text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'}
                            >
                                {status.charAt(0).toUpperCase() + status.slice(1)}
                            </Button>
                        ))}
                    </div>
                </div>
            </Card>

            {/* Table */}
            <Card className="border-none shadow-sm overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="hover:bg-muted/50">
                            <TableHead>Applicant</TableHead>
                            <TableHead>Property</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Income</TableHead>
                            <TableHead>Date Added</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            [1, 2, 3, 4, 5].map((i) => (
                                <TableRow key={i}>
                                    <TableCell><Skeleton className="h-10 w-32 rounded-lg" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                                    <TableCell><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                    <TableCell><Skeleton className="h-8 w-8 rounded-full ml-auto" /></TableCell>
                                </TableRow>
                            ))
                        ) : filteredApplications?.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                    No applicants found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredApplications?.map((app) => (
                                <TableRow key={app.id} className="hover:bg-muted/30 cursor-pointer group">
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                                {app.applicant_name.charAt(0)}
                                            </div>
                                            <div>
                                                <div className="font-semibold">{app.applicant_name}</div>
                                                <div className="text-xs text-muted-foreground">{app.applicant_email}</div>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Home className="w-4 h-4 text-muted-foreground" />
                                            <span>{getPropertyAddress(app.property_id)}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <StatusBadge status={app.status} />
                                    </TableCell>
                                    <TableCell className="font-medium">
                                        ${app.monthly_income?.toLocaleString()}/mo
                                    </TableCell>
                                    <TableCell className="text-muted-foreground text-sm">
                                        {formatDistanceToNow(new Date(app.created_at), { addSuffix: true })}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted">
                                                    <MoreHorizontal className="w-4 h-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => toast("View Details functionality mocked")}>View Details</DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => toast.success("Application Approved!")}>Approve</DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => toast.error("Application Denied")}>Deny</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </Card>
        </div>
    );
}
