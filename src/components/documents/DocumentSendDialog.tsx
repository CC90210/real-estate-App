'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
    Send,
    FileText,
    Lock,
    Unlock,
    PenTool,
    CreditCard,
    CheckCircle,
    Mail,
    User,
    Loader2,
} from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

interface DocumentItem {
    id: string;
    label: string;
    description: string;
    requiresPayment: boolean;
    optional: boolean;
}

interface DocumentSendDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    applicationId?: string;
    propertyId?: string;
    recipientEmail?: string;
    recipientName?: string;
    paymentReceived?: boolean;
}

const DOCUMENT_ITEMS: DocumentItem[] = [
    {
        id: 'lease_agreement',
        label: 'Lease Agreement',
        description: 'Full legally-binding rental lease',
        requiresPayment: true,
        optional: false,
    },
    {
        id: 'property_rules',
        label: 'Property Rules & Regulations',
        description: 'Building and unit rules for tenants',
        requiresPayment: false,
        optional: false,
    },
    {
        id: 'move_in_checklist',
        label: 'Move-in Checklist',
        description: 'Condition report completed at move-in',
        requiresPayment: false,
        optional: false,
    },
    {
        id: 'key_receipt',
        label: 'Key Receipt Form',
        description: 'Acknowledgement of keys received',
        requiresPayment: false,
        optional: false,
    },
    {
        id: 'parking_agreement',
        label: 'Parking Agreement',
        description: 'Assigned parking terms and conditions',
        requiresPayment: false,
        optional: true,
    },
    {
        id: 'pet_addendum',
        label: 'Pet Addendum',
        description: 'Pet policy, deposit, and conditions',
        requiresPayment: false,
        optional: true,
    },
];

export function DocumentSendDialog({
    open,
    onOpenChange,
    applicationId,
    propertyId,
    recipientEmail = '',
    recipientName = '',
    paymentReceived = false,
}: DocumentSendDialogProps) {
    const [selectedDocs, setSelectedDocs] = useState<Set<string>>(
        new Set(['lease_agreement', 'property_rules', 'move_in_checklist', 'key_receipt'])
    );
    const [recipientEmailInput, setRecipientEmailInput] = useState(recipientEmail);
    const [recipientNameInput, setRecipientNameInput] = useState(recipientName);
    const [eSignEnabled, setESignEnabled] = useState(false);
    const [requireCounterSign, setRequireCounterSign] = useState(true);
    const [isSending, setIsSending] = useState(false);

    useEffect(() => {
        if (open) {
            setRecipientEmailInput(recipientEmail);
            setRecipientNameInput(recipientName);
        }
    }, [open, recipientEmail, recipientName]);

    const leaseSelected = selectedDocs.has('lease_agreement');
    const paymentGateBlocking = leaseSelected && !paymentReceived;

    function toggleDocument(docId: string) {
        setSelectedDocs((prev) => {
            const next = new Set(prev);
            if (next.has(docId)) {
                next.delete(docId);
            } else {
                next.add(docId);
            }
            return next;
        });
    }

    async function handleSend() {
        if (!recipientEmailInput.trim()) {
            toast.error('Recipient email is required');
            return;
        }
        if (selectedDocs.size === 0) {
            toast.error('Select at least one document to send');
            return;
        }
        if (paymentGateBlocking) {
            toast.error('Payment must be received before the lease can be released');
            return;
        }

        setIsSending(true);
        try {
            const response = await fetch('/api/documents/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    applicationId,
                    propertyId,
                    recipientEmail: recipientEmailInput.trim(),
                    recipientName: recipientNameInput.trim() || null,
                    selectedDocuments: Array.from(selectedDocs),
                    eSignEnabled,
                    eSignProvider: eSignEnabled ? 'propflow' : null,
                    requireCounterSign,
                }),
            });

            const result = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(result?.details?.[0]?.message || result?.error || 'Failed to send package');
            }

            toast.success(result?.message || `Document package sent to ${recipientEmailInput}`);
            onOpenChange(false);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to send package';
            toast.error(message);
        } finally {
            setIsSending(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-xl rounded-2xl gap-0 overflow-hidden border-slate-100/50 bg-white p-0 shadow-2xl shadow-slate-300/30">
                <DialogHeader className="border-b border-slate-100 px-6 pb-4 pt-6">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-200">
                            <Send className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <DialogTitle className="text-lg font-black text-slate-900">
                                Send Document Package
                            </DialogTitle>
                            <DialogDescription className="sr-only">
                                Select documents to include, configure the signature request, and send the package.
                            </DialogDescription>
                            <p className="mt-0.5 text-sm font-medium text-slate-500">
                                PropFlow sends and brands this package for your company
                            </p>
                        </div>
                    </div>
                </DialogHeader>

                <div className="max-h-[calc(90vh-12rem)] space-y-6 overflow-y-auto px-6 py-5">
                    {paymentGateBlocking && (
                        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                            <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-amber-100">
                                <CreditCard className="h-4 w-4 text-amber-600" />
                            </div>
                            <div>
                                <p className="text-sm font-black text-amber-800">Payment Gate Active</p>
                                <p className="mt-0.5 text-xs leading-relaxed text-amber-700">
                                    Payment must be received before the lease can be released. Mark payment as received to unlock the lease document.
                                </p>
                            </div>
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                            <FileText className="h-3 w-3" />
                            Documents to Include
                        </label>
                        <div className="space-y-2">
                            {DOCUMENT_ITEMS.map((doc) => {
                                const isSelected = selectedDocs.has(doc.id);
                                const isLocked = doc.requiresPayment && !paymentReceived;

                                return (
                                    <button
                                        key={doc.id}
                                        type="button"
                                        disabled={isLocked}
                                        onClick={() => !isLocked && toggleDocument(doc.id)}
                                        className={cn(
                                            'w-full rounded-xl border-2 p-3.5 text-left transition-all duration-200',
                                            'flex items-center gap-3',
                                            isLocked
                                                ? 'cursor-not-allowed border-slate-100 bg-slate-50 opacity-60'
                                                : isSelected
                                                    ? 'border-indigo-300 bg-indigo-50 shadow-sm shadow-indigo-100'
                                                    : 'border-transparent bg-slate-50 hover:border-slate-200 hover:bg-white'
                                        )}
                                    >
                                        <div
                                            className={cn(
                                                'flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md transition-all duration-200',
                                                isLocked
                                                    ? 'bg-amber-100'
                                                    : isSelected
                                                        ? 'bg-indigo-500'
                                                        : 'border-2 border-slate-200 bg-white'
                                            )}
                                        >
                                            {isLocked
                                                ? <Lock className="h-3 w-3 text-amber-600" />
                                                : isSelected
                                                    ? <CheckCircle className="h-3.5 w-3.5 text-white" />
                                                    : null}
                                        </div>

                                        <div className="min-w-0 flex-1">
                                            <p className={cn('truncate text-sm font-bold', isSelected && !isLocked ? 'text-indigo-700' : 'text-slate-800')}>
                                                {doc.label}
                                                {doc.optional && (
                                                    <span className="ml-2 text-[10px] font-black uppercase tracking-wider text-slate-400">
                                                        Optional
                                                    </span>
                                                )}
                                            </p>
                                            <p className="mt-0.5 text-xs font-medium text-slate-500">{doc.description}</p>
                                        </div>

                                        {doc.requiresPayment && (
                                            <div
                                                className={cn(
                                                    'flex flex-shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-black uppercase tracking-wider',
                                                    paymentReceived
                                                        ? 'bg-emerald-100 text-emerald-700'
                                                        : 'bg-amber-100 text-amber-700'
                                                )}
                                            >
                                                {paymentReceived ? <Unlock className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                                                {paymentReceived ? 'Unlocked' : 'Payment Required'}
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="space-y-3">
                        <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                            <Mail className="h-3 w-3" />
                            Recipient
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="relative">
                                <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Full name"
                                    value={recipientNameInput}
                                    onChange={(e) => setRecipientNameInput(e.target.value)}
                                    className="flex h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm font-medium placeholder:text-slate-400 transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                            <div className="relative">
                                <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="email"
                                    placeholder="Email address *"
                                    value={recipientEmailInput}
                                    onChange={(e) => setRecipientEmailInput(e.target.value)}
                                    className="flex h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm font-medium placeholder:text-slate-400 transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100">
                                    <PenTool className="h-4 w-4 text-indigo-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-black text-indigo-900">PropFlow Signature Request</p>
                                    <p className="text-[11px] font-medium text-indigo-600">
                                        Send through PropFlow without external signature vendors
                                    </p>
                                </div>
                            </div>
                            <Switch checked={eSignEnabled} onCheckedChange={setESignEnabled} />
                        </div>

                        {eSignEnabled && (
                            <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                                <div className="flex items-center justify-between rounded-xl border border-indigo-100 bg-white p-3">
                                    <div>
                                        <p className="text-sm font-bold text-slate-800">
                                            Require landlord counter-signature
                                        </p>
                                        <p className="mt-0.5 text-xs text-slate-500">
                                            Both parties must sign before the lease is considered complete
                                        </p>
                                    </div>
                                    <Switch
                                        checked={requireCounterSign}
                                        onCheckedChange={setRequireCounterSign}
                                    />
                                </div>

                                <div className="rounded-xl border border-indigo-100 bg-white px-3 py-2">
                                    <p className="text-xs font-medium text-indigo-700">
                                        PropFlow will deliver this package from the platform email configuration and record it as an internal signature request for the recipient.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    <div
                        className={cn(
                            'flex items-center gap-3 rounded-xl border px-4 py-3',
                            paymentReceived
                                ? 'border-emerald-200 bg-emerald-50'
                                : 'border-slate-200 bg-slate-50'
                        )}
                    >
                        <div
                            className={cn(
                                'flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg',
                                paymentReceived ? 'bg-emerald-100' : 'bg-slate-100'
                            )}
                        >
                            <CreditCard
                                className={cn(
                                    'h-3.5 w-3.5',
                                    paymentReceived ? 'text-emerald-600' : 'text-slate-400'
                                )}
                            />
                        </div>
                        <div className="flex-1">
                            <p
                                className={cn(
                                    'text-xs font-black uppercase tracking-wider',
                                    paymentReceived ? 'text-emerald-700' : 'text-slate-500'
                                )}
                            >
                                Payment Gate
                            </p>
                            <p
                                className={cn(
                                    'text-[11px] font-medium',
                                    paymentReceived ? 'text-emerald-600' : 'text-slate-400'
                                )}
                            >
                                {paymentReceived
                                    ? 'Payment confirmed - all documents unlocked'
                                    : 'No payment on record - lease document locked'}
                            </p>
                        </div>
                        {paymentReceived
                            ? <Unlock className="h-4 w-4 flex-shrink-0 text-emerald-500" />
                            : <Lock className="h-4 w-4 flex-shrink-0 text-slate-400" />}
                    </div>
                </div>

                <DialogFooter className="border-t border-slate-100 bg-slate-50/50 px-6 py-4">
                    <div className="flex w-full items-center justify-between gap-3">
                        <p className="text-xs font-medium text-slate-400">
                            {selectedDocs.size} document{selectedDocs.size !== 1 ? 's' : ''} selected
                        </p>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                                className="h-10 rounded-xl font-bold"
                                disabled={isSending}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleSend}
                                disabled={
                                    isSending ||
                                    selectedDocs.size === 0 ||
                                    !recipientEmailInput.trim() ||
                                    paymentGateBlocking
                                }
                                className="h-10 rounded-xl border-0 bg-gradient-to-r from-indigo-600 to-violet-600 font-black text-white shadow-lg shadow-indigo-200 transition-all hover:-translate-y-0.5 hover:from-indigo-700 hover:to-violet-700 hover:shadow-xl"
                            >
                                {isSending
                                    ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...</>
                                    : <><Send className="mr-2 h-4 w-4" /> Send Package</>}
                            </Button>
                        </div>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
