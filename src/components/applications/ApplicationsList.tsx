'use client';

import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Filter, MoreHorizontal } from 'lucide-react';
import { StatusBadge } from '@/components/common/StatusBadge';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

export function ApplicationList({ applications }: { applications: any[] }) {
    const [filter, setFilter] = useState('all');
    const [search, setSearch] = useState('');

    const filtered = applications.filter(app => {
        const matchesStatus = filter === 'all' || app.status === filter;
        const matchesSearch =
            app.applicant_name?.toLowerCase().includes(search.toLowerCase()) ||
            app.applicant_email?.toLowerCase().includes(search.toLowerCase());
        return matchesStatus && matchesSearch;
    });

    const tabs = ['all', 'pending', 'approved', 'denied'];

    return (
        <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex bg-slate-100 p-1 rounded-lg">
                    {tabs.map(tab => (
                        <button
                            key={tab}
                            onClick={() => setFilter(tab)}
                            className={cn(
                                "px-4 py-1.5 rounded-md text-sm font-medium transition-all capitalize",
                                filter === tab
                                    ? "bg-white text-blue-600 shadow-sm"
                                    : "text-slate-500 hover:text-slate-900"
                            )}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                        placeholder="Search applicants..."
                        className="pl-9 bg-white border-slate-200"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in-50">
                <Table>
                    <TableHeader className="bg-slate-50">
                        <TableRow>
                            <TableHead>Applicant</TableHead>
                            <TableHead>Property</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Credit Score</TableHead>
                            <TableHead>Income</TableHead>
                            <TableHead className="text-right">Submitted</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filtered.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-32 text-center text-slate-500">
                                    No applications found matching your criteria.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filtered.map((app) => (
                                <TableRow key={app.id} className="hover:bg-slate-50 transition-colors cursor-pointer group">
                                    <TableCell>
                                        <div>
                                            <p className="font-semibold text-slate-900">{app.applicant_name}</p>
                                            <p className="text-xs text-slate-500">{app.applicant_email}</p>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2 text-slate-600">
                                            {/* We rely on joined data being passed correctly */}
                                            {app.property?.address || 'Property ID: ' + app.property_id}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <StatusBadge status={app.status} />
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <span className={cn(
                                                "font-bold",
                                                app.credit_score >= 700 ? "text-green-600" :
                                                    app.credit_score >= 650 ? "text-amber-600" : "text-red-600"
                                            )}>
                                                {app.credit_score || "N/A"}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span>${app.monthly_income?.toLocaleString()}/mo</span>
                                            {app.property?.rent && app.monthly_income && (
                                                <span className={cn(
                                                    "text-[10px] font-bold uppercase",
                                                    (app.property.rent / app.monthly_income) > 0.35
                                                        ? "text-red-500"
                                                        : "text-green-600"
                                                )}>
                                                    Ratio: {Math.round((app.property.rent / app.monthly_income) * 100)}%
                                                </span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right text-slate-500">
                                        {formatDistanceToNow(new Date(app.created_at), { addSuffix: true })}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
