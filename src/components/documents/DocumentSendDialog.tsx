'use client';

import { useState } from 'react';
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
    ChevronDown,
    AlertTriangle,
    User,
    Loader2,
} from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/hooks/useAuth';

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Document checklist definition ────────────────────────────────────────────

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

const ESIGN_PROVIDERS = [
    { id: 'docusign', label: 'DocuSign' },
    { id: 'hellosign', label: 'HelloSign' },
    { id: 'pandadoc', label: 'PandaDoc' },
] as const;

// ─── Component ────────────────────────────────────────────────────────────────

export function DocumentSendDialog({
    open,
    onOpenChange,
    applicationId,
    propertyId,
    recipientEmail = '',
    recipientName = '',
    paymentReceived = false,
}: DocumentSendDialogProps) {
    const supabase = createClient();
    const { company } = useAuth();

    const [selectedDocs, setSelectedDocs] = useState<Set<string>>(
        new Set(['lease_agreement', 'property_rules', 'move_in_checklist', 'key_receipt'])
    );
    const [recipientEmailInput, setRecipientEmailInput] = useState(recipientEmail);
    const [recipientNameInput, setRecipientNameInput] = useState(recipientName);
    const [eSignEnabled, setESignEnabled] = useState(false);
    const [eSignProvider, setESignProvider] = useState<string>('docusign');
    const [requireCounterSign, setRequireCounterSign] = useState(true);
    const [isSending, setIsSending] = useState(false);

    const leaseSelected = selectedDocs.has('lease_agreement');
    const paymentGateBlocking = leaseSelected && !paymentReceived;

    function toggleDocument(docId: string) {
        setSelectedDocs(prev => {
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
            const packageMeta = {
                documents: Array.from(selectedDocs),
                recipient_name: recipientNameInput.trim() || null,
                recipient_email: recipientEmailInput.trim(),
                esign_enabled: eSignEnabled,
                esign_provider: eSignEnabled ? eSignProvider : null,
                require_counter_sign: requireCounterSign,
                payment_cleared: paymentReceived,
                application_id: applicationId ?? null,
                property_id: propertyId ?? null,
                sent_at: new Date().toISOString(),
            };

            const { error } = await supabase.from('documents').insert({
                type: 'lease_proposal',
                company_id: company?.id ?? null,
                related_property_id: propertyId ?? null,
                title: `Document Package — ${recipientNameInput || recipientEmailInput}`,
                content: packageMeta,
                created_by: (await supabase.auth.getUser()).data.user?.id ?? null,
            });

            if (error) throw error;

            toast.success(`Document package sent to ${recipientEmailInput}`);
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
            <DialogContent className="max-w-xl rounded-2xl p-0 overflow-hidden border-slate-100/50 bg-white shadow-2xl shadow-slate-300/30 gap-0">
                {/* ── Header ── */}
                <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-200">
                            <Send className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <DialogTitle className="text-lg font-black text-slate-900">
                                Send Document Package
                            </DialogTitle>
                            <DialogDescription className="sr-only">
                                Select documents to include, configure e-sign options, and send the package to the recipient.
                            </DialogDescription>
                            <p className="text-sm text-slate-500 font-medium mt-0.5">
                                Select documents, configure e-sign, and send
                            </p>
                        </div>
                    </div>
                </DialogHeader>

                <div className="overflow-y-auto max-h-[calc(90vh-12rem)] px-6 py-5 space-y-6">

                    {/* ── Payment gate warning ── */}
                    {paymentGateBlocking && (
                        <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-50 border border-amber-200">
                            <div className="h-8 w-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <CreditCard className="h-4 w-4 text-amber-600" />
                            </div>
                            <div>
                                <p className="text-sm font-black text-amber-800">Payment Gate Active</p>
                                <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
                                    Payment must be received before the lease can be released. This is a hard gate. Mark payment as received to unlock the lease document.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* ── Document checklist ── */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <FileText className="h-3 w-3" />
                            Documents to Include
                        </label>
                        <div className="space-y-2">
                            {DOCUMENT_ITEMS.map(doc => {
                                const isSelected = selectedDocs.has(doc.id);
                                const isLocked = doc.requiresPayment && !paymentReceived;

                                return (
                                    <button
                                        key={doc.id}
                                        type="button"
                                        disabled={isLocked}
                                        onClick={() => !isLocked && toggleDocument(doc.id)}
                                        className={cn(
                                            'w-full flex items-center gap-3 p-3.5 rounded-xl text-left transition-all duration-200 border-2',
                                            isLocked
                                                ? 'opacity-60 cursor-not-allowed bg-slate-50 border-slate-100'
                                                : isSelected
                                                    ? 'bg-indigo-50 border-indigo-300 shadow-sm shadow-indigo-100'
                                                    : 'bg-slate-50 border-transparent hover:border-slate-200 hover:bg-white'
                                        )}
                                    >
                                        {/* Selection indicator / lock */}
                                        <div className={cn(
                                            'h-6 w-6 rounded-md flex items-center justify-center flex-shrink-0 transition-all duration-200',
                                            isLocked
                                                ? 'bg-amber-100'
                                                : isSelected
                                                    ? 'bg-indigo-500'
                                                    : 'bg-white border-2 border-slate-200'
                                        )}>
                                            {isLocked
                                                ? <Lock className="h-3 w-3 text-amber-600" />
                                                : isSelected
                                                    ? <CheckCircle className="h-3.5 w-3.5 text-white" />
                                                    : null
                                            }
                                        </div>

                                        {/* Labels */}
                                        <div className="flex-1 min-w-0">
                                            <p className={cn(
                                                'text-sm font-bold truncate',
                                                isSelected && !isLocked ? 'text-indigo-700' : 'text-slate-800'
                                            )}>
                                                {doc.label}
                                                {doc.optional && (
                                                    <span className="ml-2 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                                                        Optional
                                                    </span>
                                                )}
                                            </p>
                                            <p className="text-xs text-slate-500 font-medium mt-0.5">{doc.description}</p>
                                        </div>

                                        {/* Lock/unlock status badge */}
                                        {doc.requiresPayment && (
                                            <div className={cn(
                                                'flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider flex-shrink-0',
                                                paymentReceived
                                                    ? 'bg-emerald-100 text-emerald-700'
                                                    : 'bg-amber-100 text-amber-700'
                                            )}>
                                                {paymentReceived
                                                    ? <Unlock className="h-3 w-3" />
                                                    : <Lock className="h-3 w-3" />
                                                }
                                                {paymentReceived ? 'Unlocked' : 'Payment Required'}
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* ── Recipient section ── */}
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <Mail className="h-3 w-3" />
                            Recipient
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="relative">
                                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Full name"
                                    value={recipientNameInput}
                                    onChange={e => setRecipientNameInput(e.target.value)}
                                    className="flex h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                                />
                            </div>
                            <div className="relative">
                                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <input
                                    type="email"
                                    placeholder="Email address *"
                                    value={recipientEmailInput}
                                    onChange={e => setRecipientEmailInput(e.target.value)}
                                    className="flex h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                                />
                            </div>
                        </div>
                    </div>

                    {/* ── E-sign section ── */}
                    <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4 space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <div className="h-8 w-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                                    <PenTool className="h-4 w-4 text-indigo-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-black text-indigo-900">E-Sign Preparation</p>
                                    <p className="text-[11px] text-indigo-600 font-medium">
                                        Route for electronic signature
                                    </p>
                                </div>
                            </div>
                            <Switch
                                checked={eSignEnabled}
                                onCheckedChange={setESignEnabled}
                            />
                        </div>

                        {eSignEnabled && (
                            <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                                {/* Provider selector */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-1.5">
                                        <ChevronDown className="h-3 w-3" />
                                        Signature Provider
                                    </label>
                                    <Select value={eSignProvider} onValueChange={setESignProvider}>
                                        <SelectTrigger className="h-11 rounded-xl border-indigo-200 bg-white font-medium text-sm focus:ring-indigo-500">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl">
                                            {ESIGN_PROVIDERS.map(p => (
                                                <SelectItem key={p.id} value={p.id} className="rounded-lg">
                                                    <div className="flex items-center gap-2">
                                                        {p.label}
                                                        <span className="text-[10px] font-black text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-md uppercase tracking-wider">
                                                            Coming Soon
                                                        </span>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Counter-sign toggle */}
                                <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-indigo-100">
                                    <div>
                                        <p className="text-sm font-bold text-slate-800">
                                            Require landlord counter-signature
                                        </p>
                                        <p className="text-xs text-slate-500 mt-0.5">
                                            Both parties must sign before lease is active
                                        </p>
                                    </div>
                                    <Switch
                                        checked={requireCounterSign}
                                        onCheckedChange={setRequireCounterSign}
                                    />
                                </div>

                                {/* Coming soon notice */}
                                <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl">
                                    <AlertTriangle className="h-3.5 w-3.5 text-amber-600 flex-shrink-0" />
                                    <p className="text-xs text-amber-700 font-medium">
                                        E-sign integrations are in development. The package will be recorded and prepared for signing when your provider is connected.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ── Payment gate status strip ── */}
                    <div className={cn(
                        'flex items-center gap-3 px-4 py-3 rounded-xl border',
                        paymentReceived
                            ? 'bg-emerald-50 border-emerald-200'
                            : 'bg-slate-50 border-slate-200'
                    )}>
                        <div className={cn(
                            'h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0',
                            paymentReceived ? 'bg-emerald-100' : 'bg-slate-100'
                        )}>
                            <CreditCard className={cn(
                                'h-3.5 w-3.5',
                                paymentReceived ? 'text-emerald-600' : 'text-slate-400'
                            )} />
                        </div>
                        <div className="flex-1">
                            <p className={cn(
                                'text-xs font-black uppercase tracking-wider',
                                paymentReceived ? 'text-emerald-700' : 'text-slate-500'
                            )}>
                                Payment Gate
                            </p>
                            <p className={cn(
                                'text-[11px] font-medium',
                                paymentReceived ? 'text-emerald-600' : 'text-slate-400'
                            )}>
                                {paymentReceived
                                    ? 'Payment confirmed — all documents unlocked'
                                    : 'No payment on record — lease document locked'
                                }
                            </p>
                        </div>
                        {paymentReceived
                            ? <Unlock className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                            : <Lock className="h-4 w-4 text-slate-400 flex-shrink-0" />
                        }
                    </div>
                </div>

                {/* ── Footer ── */}
                <DialogFooter className="px-6 py-4 border-t border-slate-100 bg-slate-50/50">
                    <div className="flex items-center justify-between w-full gap-3">
                        <p className="text-xs text-slate-400 font-medium">
                            {selectedDocs.size} document{selectedDocs.size !== 1 ? 's' : ''} selected
                        </p>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                                className="rounded-xl h-10 font-bold"
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
                                className="rounded-xl h-10 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-black hover:from-indigo-700 hover:to-violet-700 shadow-lg shadow-indigo-200 border-0 transition-all hover:-translate-y-0.5 hover:shadow-xl"
                            >
                                {isSending
                                    ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending...</>
                                    : <><Send className="h-4 w-4 mr-2" /> Send Package</>
                                }
                            </Button>
                        </div>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
