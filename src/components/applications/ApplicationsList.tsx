'use client';

import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Filter, MoreHorizontal, Trash2, Eye, FileCheck, XCircle } from 'lucide-react';
import { StatusBadge } from '@/components/common/StatusBadge';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { useApplications, useDeleteApplication, useUpdateApplicationStatus } from '@/lib/hooks/useApplications';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

export function ApplicationList({ applications: initialApplications }: { applications: any[] }) {
    const [filter, setFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);
    const [appToDelete, setAppToDelete] = useState<any>(null);
    const router = useRouter();
    const supabase = createClient();

    const { data: applicationsData, isLoading } = useApplications();
    const deleteMutation = useDeleteApplication();
    const updateStatusMutation = useUpdateApplicationStatus();

    // User server data on first load, then sync with React Query
    // We prefer the cached data if available to reflect real-time updates from other places
    const applications = applicationsData || initialApplications || [];

    const handleConfirmDelete = async () => {
        if (!appToDelete) return;
        setIsDeleting(true);
        try {
            await deleteMutation.mutateAsync(appToDelete.id);
            setAppToDelete(null);
        } catch (error) {
            // Error managed by hook toast
        } finally {
            setIsDeleting(false);
        }
    };

    const handleUpdateStatus = (id: string, status: string) => {
        updateStatusMutation.mutate({ id, status });
    };

    const filtered = applications.filter((app: any) => {
        const matchesStatus = filter === 'all' || app.status === filter;
        const matchesSearch =
            app.applicant_name?.toLowerCase().includes(search.toLowerCase()) ||
            app.applicant_email?.toLowerCase().includes(search.toLowerCase());
        return matchesStatus && matchesSearch;
    });

    const tabs = ['all', 'new', 'screening', 'approved', 'denied'];

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
                    <input
                        placeholder="Search applicants..."
                        className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in-50">
                <Table>
                    <TableHeader className="bg-slate-50">
                        <TableRow className="hover:bg-transparent border-b border-slate-100">
                            <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 py-4">Applicant</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 py-4">Property</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 py-4">Status</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 py-4">Credit</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 py-4">Income</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 py-4">Submitted</TableHead>
                            <TableHead className="text-right py-4"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filtered.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-48 text-center">
                                    <div className="flex flex-col items-center gap-2 opacity-40">
                                        <Search className="w-8 h-8" />
                                        <p className="font-bold text-sm">No digital applications found</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            filtered.map((app) => (
                                <TableRow
                                    key={app.id}
                                    className="hover:bg-slate-50/80 transition-colors cursor-pointer group border-b border-slate-100"
                                    onClick={() => router.push(`/applications/${app.id}`)}
                                >
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-xs shadow-sm shadow-slate-200">
                                                {app.applicant_name?.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-black text-slate-900 leading-none mb-1 group-hover:text-blue-600 transition-colors">{app.applicant_name}</p>
                                                <p className="text-[10px] text-slate-400 font-bold tracking-tight">{app.applicant_email}</p>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="text-sm font-bold text-slate-600 truncate max-w-[150px]">
                                            {app.property?.address || 'N/A'}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <StatusBadge status={app.status} />
                                    </TableCell>
                                    <TableCell>
                                        <span className={cn(
                                            "font-black text-sm",
                                            app.credit_score >= 700 ? "text-emerald-600" :
                                                app.credit_score >= 650 ? "text-amber-600" : "text-red-600"
                                        )}>
                                            {app.credit_score || "N/A"}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col leading-tight">
                                            <span className="text-sm font-black text-slate-700">${app.monthly_income?.toLocaleString()}</span>
                                            {app.property?.rent && app.monthly_income && (
                                                <span className={cn(
                                                    "text-[9px] font-black uppercase tracking-tighter opacity-80",
                                                    (app.property.rent / app.monthly_income) > 0.35 ? "text-red-500" : "text-emerald-600"
                                                )}>
                                                    {Math.round((app.property.rent / app.monthly_income) * 100)}% DTI
                                                </span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-slate-400 text-[10px] font-black uppercase tracking-widest">
                                        {formatDistanceToNow(new Date(app.created_at), { addSuffix: true })}
                                    </TableCell>
                                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-200">
                                                    <MoreHorizontal className="w-4 h-4 text-slate-400" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-56 p-1.5 rounded-2xl shadow-2xl border-slate-200/60 bg-white/95 backdrop-blur-xl">
                                                <DropdownMenuItem onClick={() => router.push(`/applications/${app.id}`)} className="rounded-xl gap-3 text-xs font-black py-3 px-4 focus:bg-blue-50 focus:text-blue-600">
                                                    <Eye className="w-4 h-4" /> LIVE VIEW DETAILS
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator className="bg-slate-100 my-1" />
                                                <DropdownMenuItem onClick={() => handleUpdateStatus(app.id, 'approved')} className="rounded-xl gap-3 text-xs font-black py-3 px-4 text-emerald-600 focus:bg-emerald-50 focus:text-emerald-600">
                                                    <FileCheck className="w-4 h-4" /> AUTHORIZE APPROVAL
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleUpdateStatus(app.id, 'denied')} className="rounded-xl gap-3 text-xs font-black py-3 px-4 text-amber-600 focus:bg-amber-50 focus:text-amber-600">
                                                    <XCircle className="w-4 h-4" /> REJECT APPLICATION
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator className="bg-slate-100 my-1" />
                                                <DropdownMenuItem
                                                    onClick={() => setAppToDelete(app)}
                                                    className="rounded-xl gap-3 text-xs font-black py-3 px-4 text-red-600 focus:bg-red-50 focus:text-red-600"
                                                >
                                                    <Trash2 className="w-4 h-4" /> DELETE PERMANENTLY
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={!!appToDelete} onOpenChange={(o) => { if (!o) setAppToDelete(null); }}>
                <DialogContent className="max-w-md rounded-3xl border-none shadow-2xl p-0 overflow-hidden bg-white">
                    <div className="p-8 pb-4">
                        <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mb-6 border border-red-100">
                            <Trash2 className="w-6 h-6" />
                        </div>
                        <DialogTitle className="text-2xl font-black text-slate-900 tracking-tight">System Deletion</DialogTitle>
                        <DialogDescription className="text-base text-slate-500 font-medium mt-2">
                            You are about to permanently remove <span className="text-slate-900 font-black">{appToDelete?.applicant_name}</span>'s record from the cloud.
                        </DialogDescription>
                    </div>
                    <DialogFooter className="p-8 pt-4 bg-slate-50 flex sm:justify-end gap-3">
                        <Button variant="ghost" onClick={() => setAppToDelete(null)} className="rounded-2xl font-black text-xs uppercase tracking-widest text-slate-500">
                            Abort
                        </Button>
                        <Button
                            onClick={handleConfirmDelete}
                            disabled={isDeleting}
                            className="bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest px-8 shadow-xl shadow-red-100"
                        >
                            {isDeleting ? "Processing..." : "Confirm Delete"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
