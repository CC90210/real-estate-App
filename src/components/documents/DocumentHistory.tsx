'use client';

import { useDocuments, useDeleteDocument, Document } from '@/lib/hooks/useDocuments';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    FileText,
    ClipboardList,
    FileSignature,
    UserCheck,
    Trash2,
    Clock,
    Building2,
    User,
    Loader2,
    AlertCircle
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const documentTypeConfig: Record<string, { icon: any; color: string; label: string }> = {
    'property_summary': {
        icon: FileText,
        color: 'bg-blue-100 text-blue-600',
        label: 'Property Summary'
    },
    'lease_proposal': {
        icon: FileSignature,
        color: 'bg-purple-100 text-purple-600',
        label: 'Lease Proposal'
    },
    'showing_sheet': {
        icon: ClipboardList,
        color: 'bg-green-100 text-green-600',
        label: 'Showing Sheet'
    },
    'application_summary': {
        icon: UserCheck,
        color: 'bg-amber-100 text-amber-600',
        label: 'Application Summary'
    },
};

interface DocumentHistoryProps {
    limit?: number;
    type?: string;
    onViewDocument?: (doc: Document) => void;
}

export function DocumentHistory({ limit, type, onViewDocument }: DocumentHistoryProps) {
    const { data: documents, isLoading, error } = useDocuments({ type, limit });
    const deleteDocument = useDeleteDocument();

    if (isLoading) {
        return (
            <Card className="border-none shadow-sm">
                <CardContent className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                </CardContent>
            </Card>
        );
    }

    if (error) {
        return (
            <Card className="border-none shadow-sm">
                <CardContent className="flex items-center justify-center py-12 text-red-500">
                    <AlertCircle className="w-5 h-5 mr-2" />
                    Failed to load documents
                </CardContent>
            </Card>
        );
    }

    if (!documents || documents.length === 0) {
        return (
            <Card className="border-none shadow-sm">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Clock className="w-5 h-5 text-slate-400" />
                        Document History
                    </CardTitle>
                    <CardDescription>Your previously generated documents</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-12 text-slate-400">
                        <FileText className="w-12 h-12 mx-auto mb-4 opacity-30" />
                        <p className="font-medium">No documents yet</p>
                        <p className="text-sm mt-1">Generate your first document using the templates above</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-none shadow-sm">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-slate-400" />
                    Document History
                </CardTitle>
                <CardDescription>
                    {documents.length} document{documents.length !== 1 ? 's' : ''} generated
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    {documents.map((doc) => {
                        const config = documentTypeConfig[doc.type] || {
                            icon: FileText,
                            color: 'bg-slate-100 text-slate-600',
                            label: doc.type
                        };
                        const Icon = config.icon;

                        return (
                            <div
                                key={doc.id}
                                className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors group"
                            >
                                <div className={`p-3 rounded-xl ${config.color}`}>
                                    <Icon className="w-5 h-5" />
                                </div>

                                <div className="flex-1 min-w-0">
                                    <h4 className="font-bold text-slate-900 truncate">
                                        {doc.title}
                                    </h4>
                                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                                        {doc.properties && (
                                            <span className="flex items-center gap-1">
                                                <Building2 className="w-3 h-3" />
                                                {doc.properties.address}
                                            </span>
                                        )}
                                        {doc.applications && (
                                            <span className="flex items-center gap-1">
                                                <User className="w-3 h-3" />
                                                {doc.applications.applicant_name}
                                            </span>
                                        )}
                                        <span className="flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {formatDistanceToNow(new Date(doc.created_at), { addSuffix: true })}
                                        </span>
                                    </div>
                                </div>

                                <Badge variant="outline" className="shrink-0">
                                    {config.label}
                                </Badge>

                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {onViewDocument && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => onViewDocument(doc)}
                                        >
                                            View
                                        </Button>
                                    )}
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                        onClick={() => deleteDocument.mutate(doc.id)}
                                        disabled={deleteDocument.isPending}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}
