'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, ClipboardList, FileSignature, UserCheck, Check, ChevronRight, Loader2, Download, Copy, Printer } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

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
    const [selectedId, setSelectedId] = useState<string>('');
    const [step, setStep] = useState<'select' | 'configure' | 'preview'>('select');
    const [isGenerating, setIsGenerating] = useState(false);
    const [previewData, setPreviewData] = useState<any>(null);

    const handleSelectType = (id: string) => {
        setSelectedType(id);
        setStep('configure');
        setSelectedId('');
    };

    const handleGenerate = () => {
        setIsGenerating(true);
        // Simulate generation
        setTimeout(() => {
            const data = selectedType === 'application_summary'
                ? applications.find(a => a.id === selectedId)
                : properties.find(p => p.id === selectedId);

            setPreviewData(data);
            setIsGenerating(false);
            setStep('preview');
        }, 1000);
    };

    const handleReset = () => {
        setStep('select');
        setSelectedType(null);
        setPreviewData(null);
    };

    const renderSelector = () => {
        if (!selectedType) return null;
        if (selectedType === 'application_summary') {
            return (
                <div className="space-y-2">
                    <Label>Select Applicant</Label>
                    <Select value={selectedId} onValueChange={setSelectedId}>
                        <SelectTrigger>
                            <SelectValue placeholder="Choose an applicant..." />
                        </SelectTrigger>
                        <SelectContent>
                            {applications.map(a => (
                                <SelectItem key={a.id} value={a.id}>
                                    {a.applicant_name} - {a.status}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            );
        }
        return (
            <div className="space-y-2">
                <Label>Select Property</Label>
                <Select value={selectedId} onValueChange={setSelectedId}>
                    <SelectTrigger>
                        <SelectValue placeholder="Choose a property..." />
                    </SelectTrigger>
                    <SelectContent>
                        {properties.map(p => (
                            <SelectItem key={p.id} value={p.id}>
                                {p.address}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
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
                    <div className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full space-y-6 animate-in fade-in zoom-in-95">
                        <div className="text-center mb-8">
                            <h2 className="text-2xl font-bold text-slate-900">Configure Document</h2>
                            <p className="text-slate-500">Select the data source for your document.</p>
                        </div>

                        {renderSelector()}

                        <Button
                            size="lg"
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                            disabled={!selectedId || isGenerating}
                            onClick={handleGenerate}
                        >
                            {isGenerating ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...
                                </>
                            ) : (
                                <>
                                    Generate Draft <ChevronRight className="ml-2 h-4 w-4" />
                                </>
                            )}
                        </Button>
                    </div>
                )}

                {step === 'preview' && previewData && (
                    <div className="flex-1 flex flex-col overflow-hidden animate-in fade-in slide-in-from-right-4">
                        <div className="flex justify-between items-center mb-4 pb-4 border-b">
                            <h2 className="font-bold text-slate-900">Preview</h2>
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={() => window.print()}>
                                    <Printer className="w-4 h-4 mr-2" /> Print
                                </Button>
                                <Button size="sm" onClick={handleReset} variant="ghost">New</Button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto bg-white shadow-sm border p-8 rounded-lg">
                            <PropertySummaryPreview property={previewData} type={selectedType!} />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

const PropertySummaryPreview = ({ property, type }: { property: any, type: string }) => {
    if (type === 'application_summary') {
        return (
            <div className="max-w-2xl mx-auto space-y-6">
                <div className="border-b pb-4 mb-6 flex justify-between items-end">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">APPLICATION SUMMARY</h1>
                        <p className="text-slate-500">PropFlow Screening Report</p>
                    </div>
                    <div className={cn("px-3 py-1 rounded-full text-sm font-bold uppercase",
                        property.status === 'approved' ? 'bg-green-100 text-green-700' :
                            property.status === 'denied' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700')}>
                        {property.status}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-8">
                    <div>
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Applicant</h3>
                        <p className="text-xl font-bold text-slate-900">{property.applicant_name}</p>
                        <p className="text-slate-600">{property.applicant_email}</p>
                    </div>
                    <div>
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Income</h3>
                        <p className="text-xl font-bold text-green-600">${property.monthly_income?.toLocaleString()}/mo</p>
                        <p className="text-xs text-slate-400">Verified</p>
                    </div>
                </div>

                <div className="pt-6 border-t">
                    <h3 className="text-sm font-bold text-slate-900 mb-2">Notes</h3>
                    <p className="text-slate-600 italic">
                        {property.notes || "No notes added by screening officer."}
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="max-w-2xl mx-auto">
            <div className="border-b pb-4 mb-6">
                <h1 className="text-xl font-bold uppercase tracking-widest text-slate-900">{type.replace('_', ' ')}</h1>
                <p className="text-slate-500 text-sm">Generated by PropFlow</p>
            </div>

            <h2 className="text-3xl font-bold text-slate-900 mb-2">{property.address}</h2>
            <p className="text-2xl font-bold text-blue-600 mb-6">
                ${property.rent?.toLocaleString()}/month
            </p>

            <div className="flex gap-8 mb-8 text-slate-600 bg-slate-50 p-4 rounded-lg">
                <div className="flex flex-col items-center">
                    <span className="font-bold text-xl text-slate-900">{property.bedrooms}</span>
                    <span className="text-xs uppercase">Bed</span>
                </div>
                <div className="flex flex-col items-center border-l ps-8">
                    <span className="font-bold text-xl text-slate-900">{property.bathrooms}</span>
                    <span className="text-xs uppercase">Bath</span>
                </div>
                <div className="flex flex-col items-center border-l ps-8">
                    <span className="font-bold text-xl text-slate-900">{property.square_feet}</span>
                    <span className="text-xs uppercase">Sq Ft</span>
                </div>
            </div>

            <div className="mb-8">
                <h3 className="font-bold text-slate-900 mb-2 uppercase text-sm border-b pb-1 inline-block">Description</h3>
                <p className="text-slate-600 leading-relaxed mt-2">{property.description}</p>
            </div>

            <div className="mb-8">
                <h3 className="font-bold text-slate-900 mb-3 uppercase text-sm border-b pb-1 inline-block">Amenities</h3>
                <div className="flex flex-wrap gap-2 mt-2">
                    {/* Fallback amenities */}
                    {(property.buildings?.amenities || ['Pool', 'Gym', 'Concierge']).map((a: string) => (
                        <span key={a} className="px-3 py-1 bg-slate-100 rounded-full text-sm text-slate-700 font-medium">
                            ✓ {a}
                        </span>
                    ))}
                </div>
            </div>

            {type === 'showing_sheet' && (
                <div className="mb-8 bg-amber-50 p-4 border border-amber-200 rounded-lg">
                    <h3 className="font-bold text-amber-800 mb-2 uppercase text-sm">Agent Access</h3>
                    <p className="font-mono text-2xl font-bold text-slate-900">{property.lockbox_code || 'Request Code'}</p>
                </div>
            )}

            <div className="border-t mt-12 pt-4 text-xs text-slate-400 flex justify-between">
                <span>PropFlow Management System</span>
                <span>{new Date().toLocaleDateString()}</span>
            </div>
        </div>
    );
};
