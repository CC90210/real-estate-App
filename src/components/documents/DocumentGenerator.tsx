'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileText, ClipboardList, FileSignature, UserCheck, Check, ChevronRight, Loader2, Printer, ArrowLeft } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface DocumentContext {
    propertyId: string;
    applicantId?: string;
    customClauses: string;
    leaseTermMonths: number;
    startDate: string;
    includeUtilities: boolean;
}

const documentTypes = [
    {
        id: 'property_summary',
        title: 'Property Summary',
        description: 'One-page overview for tenants',
        icon: FileText,
        color: 'bg-blue-100 text-blue-600'
    },
    {
        id: 'showing_sheet',
        title: 'Showing Sheet',
        description: 'Quick reference for showings',
        icon: ClipboardList,
        color: 'bg-green-100 text-green-600'
    },
    {
        id: 'lease_proposal',
        title: 'Lease Proposal',
        description: 'Professional proposal document',
        icon: FileSignature,
        color: 'bg-purple-100 text-purple-600'
    },
    {
        id: 'application_summary',
        title: 'Application Summary',
        description: 'Applicant overview for landlords',
        icon: UserCheck,
        color: 'bg-amber-100 text-amber-600'
    }
];

export function DocumentGenerator({ properties, applications }: { properties: any[], applications: any[] }) {
    const [selectedType, setSelectedType] = useState<string | null>(null);
    const [step, setStep] = useState<'select' | 'configure' | 'preview'>('select');
    const [isGenerating, setIsGenerating] = useState(false);

    // Form State
    const [context, setContext] = useState<DocumentContext>({
        propertyId: '',
        customClauses: '',
        leaseTermMonths: 12,
        startDate: new Date().toISOString().split('T')[0],
        includeUtilities: false
    });

    const [generatedClauses, setGeneratedClauses] = useState<string>('');

    const handleSelectType = (id: string) => {
        setSelectedType(id);
        setStep('configure');
    };

    const handleGenerate = async () => {
        setIsGenerating(true);
        try {
            // 1. Call AI for Clauses if custom text is present
            let legalText = '';
            if (context.customClauses) {
                const res = await fetch('/api/generate-document', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        propertyId: context.propertyId,
                        notes: context.customClauses,
                        type: selectedType
                    })
                });

                if (res.ok) {
                    const data = await res.json();
                    legalText = data.content;
                } else {
                    console.error("Failed to generate clauses");
                    toast.error("AI Clause generation failed, using raw notes.");
                    legalText = context.customClauses;
                }
            }

            setGeneratedClauses(legalText);
            setStep('preview');
        } catch (error) {
            console.error(error);
            toast.error("Generation failed");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleReset = () => {
        setStep('select');
        setSelectedType(null);
        setGeneratedClauses('');
        setContext(prev => ({ ...prev, customClauses: '' }));
    };

    const getSelectedProperty = () => properties.find(p => p.id === context.propertyId);

    const renderSelector = () => {
        if (!selectedType) return null;
        // Logic could change based on type (Application vs Property)
        return (
            <div className="space-y-4">
                <div className="space-y-2">
                    <Label>Select Property</Label>
                    <Select value={context.propertyId} onValueChange={(val) => setContext({ ...context, propertyId: val })}>
                        <SelectTrigger>
                            <SelectValue placeholder="Choose a property..." />
                        </SelectTrigger>
                        <SelectContent className="max-h-[200px]">
                            {properties.map(p => (
                                <SelectItem key={p.id} value={p.id}>
                                    {p.address}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Lease Term (Months)</Label>
                        <Input
                            type="number"
                            value={context.leaseTermMonths}
                            onChange={(e) => setContext({ ...context, leaseTermMonths: parseInt(e.target.value) })}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Start Date</Label>
                        <Input
                            type="date"
                            value={context.startDate}
                            onChange={(e) => setContext({ ...context, startDate: e.target.value })}
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label className="flex items-center justify-between">
                        <span>Special Provisions / Additional Notes</span>
                        <span className="text-xs text-blue-600 font-normal">AI Enhanced</span>
                    </Label>
                    <Textarea
                        placeholder="e.g. Tenant is responsible for lawn care. No pets allowed on second floor."
                        value={context.customClauses}
                        onChange={(e) => setContext({ ...context, customClauses: e.target.value })}
                        rows={4}
                        className="resize-none"
                    />
                    <p className="text-xs text-slate-400">
                        Our AI will translate these notes into formal legal language automatically.
                    </p>
                </div>
            </div>
        );
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-[calc(100vh-12rem)]">
            {/* Left Panel: Selection */}
            <div className="lg:col-span-1 space-y-6 overflow-y-auto pr-2">
                <div className="grid gap-4">
                    {documentTypes.map((doc) => (
                        <div
                            key={doc.id}
                            onClick={() => handleSelectType(doc.id)}
                            className={cn(
                                "group p-4 rounded-xl border cursor-pointer transition-all hover:shadow-md",
                                selectedType === doc.id
                                    ? "bg-slate-50 border-blue-500 ring-1 ring-blue-500"
                                    : "bg-white border-slate-200 hover:border-blue-300"
                            )}
                        >
                            <div className="flex items-center gap-4">
                                <div className={cn("p-3 rounded-lg", doc.color)}>
                                    <doc.icon className="w-6 h-6" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-semibold text-slate-900">{doc.title}</h3>
                                    <p className="text-xs text-slate-500">{doc.description}</p>
                                </div>
                                {selectedType === doc.id && (
                                    <Check className="w-5 h-5 text-blue-600 animate-in zoom-in" />
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Right Panel: Config & Preview */}
            <div className="lg:col-span-2 bg-slate-50 rounded-2xl border border-slate-200 p-6 flex flex-col h-full">
                {step === 'select' && (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-center">
                        <FileText className="w-16 h-16 mb-4 opacity-20" />
                        <p className="text-lg font-medium">Select a document type to begin</p>
                    </div>
                )}

                {step === 'configure' && (
                    <div className="flex-1 flex flex-col max-w-lg mx-auto w-full space-y-6 animate-in fade-in zoom-in-95">
                        <div className="text-center mb-4">
                            <h2 className="text-2xl font-bold text-slate-900">Configure Document</h2>
                            <p className="text-slate-500">Customize the output details.</p>
                        </div>

                        {renderSelector()}

                        <div className="pt-4 flex gap-3">
                            <Button variant="outline" className="flex-1" onClick={() => setStep('select')}>
                                Back
                            </Button>
                            <Button
                                size="lg"
                                className="flex-[2] bg-blue-600 hover:bg-blue-700 text-white"
                                disabled={!context.propertyId || isGenerating}
                                onClick={handleGenerate}
                            >
                                {isGenerating ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...
                                    </>
                                ) : (
                                    <>
                                        Generate Document <ChevronRight className="ml-2 h-4 w-4" />
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                )}

                {step === 'preview' && getSelectedProperty() && (
                    <div className="flex-1 flex flex-col overflow-hidden animate-in fade-in slide-in-from-right-4">
                        <div className="flex justify-between items-center mb-4 pb-4 border-b">
                            <div className="flex items-center gap-2">
                                <Button variant="ghost" size="icon" onClick={() => setStep('configure')}>
                                    <ArrowLeft className="w-4 h-4" />
                                </Button>
                                <h2 className="font-bold text-slate-900">Preview: {documentTypes.find(t => t.id === selectedType)?.title}</h2>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={() => window.print()}>
                                    <Printer className="w-4 h-4 mr-2" /> Print PDF
                                </Button>
                                <Button size="sm" onClick={handleReset} variant="ghost">New</Button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto bg-white shadow-sm border p-8 rounded-lg print:shadow-none print:border-none">
                            <DocumentPreview
                                property={getSelectedProperty()}
                                type={selectedType!}
                                context={context}
                                aiClauses={generatedClauses}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

const DocumentPreview = ({ property, type, context, aiClauses }: { property: any, type: string, context: DocumentContext, aiClauses: string }) => {
    return (
        <div className="max-w-3xl mx-auto font-serif text-slate-900">
            <div className="text-center border-b-2 border-slate-900 pb-8 mb-8">
                <h1 className="text-3xl font-bold uppercase tracking-widest">{type.replace(/_/g, ' ')}</h1>
                <p className="text-slate-500 mt-2">DRAFTED ON {new Date().toLocaleDateString()}</p>
            </div>

            <div className="mb-8">
                <h3 className="font-bold uppercase text-xs tracking-wider border-b mb-4">1. Property Details</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <span className="block text-slate-500 text-xs">Address</span>
                        <span className="font-medium">{property.address}</span>
                    </div>
                    <div>
                        <span className="block text-slate-500 text-xs">Unit</span>
                        <span className="font-medium">{property.unit_number || 'N/A'}</span>
                    </div>
                    <div>
                        <span className="block text-slate-500 text-xs">Monthly Rent</span>
                        <span className="font-medium">${property.rent.toLocaleString()}</span>
                    </div>
                    <div>
                        <span className="block text-slate-500 text-xs">Deposit</span>
                        <span className="font-medium">${property.deposit?.toLocaleString() || property.rent.toLocaleString()}</span>
                    </div>
                </div>
            </div>

            <div className="mb-8">
                <h3 className="font-bold uppercase text-xs tracking-wider border-b mb-4">2. Lease Terms</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <span className="block text-slate-500 text-xs">Start Date</span>
                        <span className="font-medium">{context.startDate}</span>
                    </div>
                    <div>
                        <span className="block text-slate-500 text-xs">Duration</span>
                        <span className="font-medium">{context.leaseTermMonths} Months</span>
                    </div>
                </div>
            </div>

            <div className="mb-8">
                <h3 className="font-bold uppercase text-xs tracking-wider border-b mb-4">3. Description</h3>
                <p className="text-sm leading-relaxed">{property.description || 'No description provided.'}</p>
            </div>

            {aiClauses && (
                <div className="mb-8 bg-slate-50 p-6 border border-slate-200 rounded-sm">
                    <h3 className="font-bold uppercase text-xs tracking-wider mb-4 text-blue-900">12. Special Provisions</h3>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap font-medium">{aiClauses}</p>
                </div>
            )}

            <div className="mt-12 pt-8 border-t-2 border-slate-900 flex justify-between">
                <div className="text-center w-64">
                    <div className="h-12 border-b border-black mb-2"></div>
                    <span className="text-xs uppercase">Landlord Signature</span>
                </div>
                <div className="text-center w-64">
                    <div className="h-12 border-b border-black mb-2"></div>
                    <span className="text-xs uppercase">Tenant Signature</span>
                </div>
            </div>

            <div className="text-center mt-12 text-xs text-slate-400">
                Generated by PropFlow Real Estate Management System
            </div>
        </div>
    );
};
