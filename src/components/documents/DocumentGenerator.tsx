'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
    FileText,
    ClipboardList,
    FileSignature,
    UserCheck,
    Check,
    Loader2,
    ArrowLeft,
    Calendar,
    User,
    DollarSign,
    Briefcase,
    X,
    Upload,
    Building2,
    ShieldCheck,
    Sparkles,
    Download
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { downloadPDF } from '@/lib/generatePdf';
import { createClient } from '@/lib/supabase/client';
import { CURRENCIES, getCurrencySymbol } from '@/lib/currencies';

interface DocumentGeneratorProps {
    properties: any[];
    applications: any[];
}

const documentTypes = [
    {
        id: 'showing_sheet',
        title: 'Showing Sheet',
        description: 'For Agents: Branded walkthrough guide',
        icon: ClipboardList,
        color: 'bg-green-100 text-green-600'
    },
    {
        id: 'lease_proposal',
        title: 'Lease Proposal',
        description: 'For Landlords: Formal offer terms',
        icon: FileSignature,
        color: 'bg-purple-100 text-purple-600'
    },
    {
        id: 'application_summary',
        title: 'Application Summary',
        description: 'For Landlords: Screening deep-dive',
        icon: UserCheck,
        color: 'bg-amber-100 text-amber-600'
    },
    {
        id: 'property_summary',
        title: 'Property Summary',
        description: 'Marketing: Public-facing overview',
        icon: FileText,
        color: 'bg-blue-100 text-blue-600'
    }
];

export function DocumentGenerator({ properties, applications }: DocumentGeneratorProps) {
    const [selectedType, setSelectedType] = useState<string | null>(null);
    const [step, setStep] = useState<'select' | 'configure' | 'preview'>('select');
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedDocument, setGeneratedDocument] = useState<any>(null);
    const [profile, setProfile] = useState<any>(null);
    const supabase = createClient();

    useEffect(() => {
        const fetchProfile = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single();
                setProfile(data);
            }
        };
        fetchProfile();
    }, []);

    const handleSelectType = (id: string) => {
        setSelectedType(id);
        setStep('configure');
    };

    const handleGenerate = async (formData: any) => {
        setIsGenerating(true);
        try {
            const body = new FormData();
            body.append('type', selectedType!);
            body.append('propertyId', formData.propertyId);
            if (formData.applicantId) body.append('applicantId', formData.applicantId);

            const { image, ...fields } = formData;
            if (image) body.append('image', image);

            // Add currency to top level if it exists in form data
            if (formData.currency) body.append('currency', formData.currency);

            body.append('customFields', JSON.stringify(fields));

            const res = await fetch('/api/generate-document', {
                method: 'POST',
                body
            });

            if (!res.ok) throw new Error('Generation failed');

            const data = await res.json();
            setGeneratedDocument(data.document);
            setStep('preview');
            toast.success("Document generated successfully!");
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Failed to generate document. Please check your connection and try again.");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleDownload = async () => {
        if (!generatedDocument) return;
        const filename = `${selectedType}_${new Date().getTime()}`;
        try {
            toast.promise(downloadPDF('document-content', filename), {
                loading: 'Preparing PDF...',
                success: 'Downloaded successfully!',
                error: 'Failed to download PDF.'
            });
        } catch (error) {
            console.error(error);
        }
    };

    const handleReset = () => {
        setStep('select');
        setSelectedType(null);
        setGeneratedDocument(null);
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 min-h-[600px]">
            <div className="lg:col-span-1 space-y-6">
                <div className="grid gap-3">
                    {documentTypes.map((doc) => (
                        <div
                            key={doc.id}
                            onClick={() => handleSelectType(doc.id)}
                            className={cn(
                                "group p-5 rounded-2xl border-2 cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1",
                                selectedType === doc.id
                                    ? "bg-white border-blue-600 shadow-2xl ring-4 ring-blue-50"
                                    : "bg-white border-slate-100 hover:border-slate-300"
                            )}
                        >
                            <div className="flex items-center gap-5">
                                <div className={cn("p-4 rounded-2xl shrink-0 transition-all duration-300 shadow-sm",
                                    doc.color,
                                    selectedType !== doc.id && "opacity-70 grayscale-[0.3] group-hover:opacity-100 group-hover:grayscale-0"
                                )}>
                                    <doc.icon className="w-6 h-6" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className={cn("font-black text-base truncate mb-1", selectedType === doc.id ? "text-slate-900" : "text-slate-600")}>{doc.title}</h3>
                                    <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold truncate">{doc.description.split(': ')[0]}</p>
                                </div>
                                {selectedType === doc.id && (
                                    <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center animate-in zoom-in spin-in-90 duration-300">
                                        <Check className="w-3 h-3 stroke-[4]" />
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
                {step === 'select' && (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-12 text-center">
                        <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center mb-6">
                            <FileText className="w-10 h-10 opacity-20" />
                        </div>
                        <h2 className="text-xl font-bold text-slate-900 mb-2">Configure Document</h2>
                        <p className="text-sm max-w-xs">Select a template from the left to begin generating professional documents.</p>
                    </div>
                )}

                {step === 'configure' && (
                    <div className="flex-1 p-8 overflow-y-auto">
                        <div className="flex items-center gap-4 border-b pb-6 mb-8">
                            <Button variant="ghost" size="icon" onClick={() => setStep('select')}>
                                <ArrowLeft className="w-5 h-5" />
                            </Button>
                            <div>
                                <h2 className="text-2xl font-bold text-slate-900">{documentTypes.find(t => t.id === selectedType)?.title}</h2>
                                <p className="text-slate-500 text-sm">Step 2: Provide specific context for this document.</p>
                            </div>
                        </div>

                        {selectedType === 'property_summary' && (
                            <PropertySummaryForm properties={properties} onGenerate={handleGenerate} isGenerating={isGenerating} profile={profile} />
                        )}
                        {selectedType === 'lease_proposal' && (
                            <LeaseProposalForm properties={properties} onGenerate={handleGenerate} isGenerating={isGenerating} profile={profile} />
                        )}
                        {selectedType === 'showing_sheet' && (
                            <ShowingSheetForm properties={properties} onGenerate={handleGenerate} isGenerating={isGenerating} profile={profile} />
                        )}
                        {selectedType === 'application_summary' && (
                            <ApplicationSummaryForm properties={properties} applications={applications} onGenerate={handleGenerate} isGenerating={isGenerating} profile={profile} />
                        )}
                    </div>
                )}

                {step === 'preview' && generatedDocument && (
                    <div className="flex-1 flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="flex justify-between items-center p-4 border-b bg-slate-50/50">
                            <div className="flex items-center gap-2">
                                <Button variant="ghost" size="sm" onClick={() => setStep('configure')}>
                                    <ArrowLeft className="w-4 h-4 mr-2" /> Edit Info
                                </Button>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={handleDownload} className="bg-white">
                                    <Download className="w-4 h-4 mr-2" /> Download PDF
                                </Button>
                                <Button size="sm" onClick={handleReset} className="bg-slate-900 text-white">Reset</Button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-12 bg-slate-100/50">
                            <div className="bg-white shadow-2xl mx-auto rounded-sm print:shadow-none print:border-none">
                                <DocumentTemplate data={generatedDocument} />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function PropertySummaryForm({ properties, onGenerate, isGenerating, profile }: any) {
    const [formData, setFormData] = useState({
        propertyId: '',
        image: null as File | null,
        imagePreview: '',
        agentName: profile?.full_name || '',
        agentPhone: profile?.phone || '',
        agentEmail: profile?.email || '',
        companyName: 'Verified Realty',
        highlightFeatures: '',
        customTagline: '',
        showPrice: true,
        showLockbox: false,
        template: 'modern',
        currency: 'USD'
    });

    useEffect(() => {
        if (profile) {
            setFormData(prev => ({
                ...prev,
                agentName: profile.full_name || prev.agentName,
                agentPhone: profile.phone || prev.agentPhone,
                agentEmail: profile.email || prev.agentEmail,
            }));
        }
    }, [profile]);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setFormData(prev => ({
                ...prev,
                image: file,
                imagePreview: URL.createObjectURL(file)
            }));
        }
    };

    return (
        <div className="space-y-6 max-w-2xl">
            <div>
                <Label>Property *</Label>
                <Select value={formData.propertyId} onValueChange={(v) => setFormData(prev => ({ ...prev, propertyId: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select a property" /></SelectTrigger>
                    <SelectContent>
                        {properties.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.address}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Monetary Unit</Label>
                    <Select value={formData.currency} onValueChange={(v) => setFormData(prev => ({ ...prev, currency: v }))}>
                        <SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            {CURRENCIES.map(c => <SelectItem key={c.code} value={c.code}>{c.code} ({c.symbol})</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <div>
                <Label>Property Photo Override</Label>
                <div className="mt-2">
                    {formData.imagePreview ? (
                        <div className="relative w-full h-48 rounded-lg overflow-hidden">
                            <img src={formData.imagePreview} alt="Preview" className="w-full h-full object-cover" />
                            <button onClick={() => setFormData(prev => ({ ...prev, image: null, imagePreview: '' }))} className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full"><X className="w-4 h-4" /></button>
                        </div>
                    ) : (
                        <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                            <Upload className="w-8 h-8 text-slate-400" />
                            <span className="mt-2 text-sm text-slate-500 font-medium">Click to upload property photo</span>
                            <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                        </label>
                    )}
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <Input value={formData.agentName} onChange={(e) => setFormData({ ...formData, agentName: e.target.value })} placeholder="Agent Name" />
                <Input value={formData.agentPhone} onChange={(e) => setFormData({ ...formData, agentPhone: e.target.value })} placeholder="Agent Phone" />
            </div>
            <Input value={formData.agentEmail} onChange={(e) => setFormData({ ...formData, agentEmail: e.target.value })} placeholder="Agent Email" />
            <Textarea value={formData.highlightFeatures} onChange={(e) => setFormData({ ...formData, highlightFeatures: e.target.value })} placeholder="Highlight Features" rows={3} />
            <Button onClick={() => onGenerate(formData)} className="w-full bg-blue-600 text-white" disabled={isGenerating}>
                {isGenerating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                Generate Marketing Summary
            </Button>
        </div>
    );
}

function LeaseProposalForm({ properties, onGenerate, isGenerating, profile }: any) {
    const [formData, setFormData] = useState({
        propertyId: '',
        tenantName: '',
        tenantEmail: '',
        tenantPhone: '',
        offerRent: '',
        leaseTerm: '12',
        startDate: '',
        securityDeposit: '',
        conditions: '',
        includePetClause: false,
        petDeposit: '',
        includeParking: false,
        parkingFee: '',
        utilities: [] as string[],
        agentName: profile?.full_name || '',
        agentTitle: profile?.role?.toUpperCase() || 'Real Estate Agent',
        agentLicense: '',
        companyName: 'Verified Realty',
        companyAddress: '',
        validUntil: '',
        currency: 'USD'
    });

    // Sync with selected property rent
    const selectedProperty = properties.find((p: any) => p.id === formData.propertyId);

    useEffect(() => {
        if (profile) {
            setFormData(prev => ({
                ...prev,
                agentName: profile.full_name || prev.agentName,
                agentTitle: (profile.role?.charAt(0).toUpperCase() + profile.role?.slice(1)) || prev.agentTitle,
            }));
        }
    }, [profile]);

    // Auto-fill rent and deposit when property selected
    useEffect(() => {
        if (selectedProperty?.rent) {
            setFormData(prev => ({
                ...prev,
                offerRent: prev.offerRent || selectedProperty.rent.toString(),
                securityDeposit: prev.securityDeposit || selectedProperty.rent.toString(),
            }));
        }
    }, [selectedProperty]);

    return (
        <div className="space-y-6 max-w-2xl">
            {/* Property Selection */}
            <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">Property *</Label>
                <Select value={formData.propertyId} onValueChange={(v) => setFormData({ ...formData, propertyId: v })}>
                    <SelectTrigger className="h-12 rounded-xl"><SelectValue placeholder="Select Property" /></SelectTrigger>
                    <SelectContent>
                        {properties.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.address}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>

            {/* Tenant Information */}
            <div className="bg-slate-50 rounded-xl p-6 space-y-4">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                    <User className="w-4 h-4" /> Tenant Details
                </p>
                <Input
                    value={formData.tenantName}
                    onChange={(e) => setFormData({ ...formData, tenantName: e.target.value })}
                    placeholder="Full Legal Name *"
                    className="h-12 rounded-xl"
                />
                <div className="grid grid-cols-2 gap-4">
                    <Input
                        type="email"
                        value={formData.tenantEmail}
                        onChange={(e) => setFormData({ ...formData, tenantEmail: e.target.value })}
                        placeholder="Email Address"
                        className="h-12 rounded-xl"
                    />
                    <Input
                        type="tel"
                        value={formData.tenantPhone}
                        onChange={(e) => setFormData({ ...formData, tenantPhone: e.target.value })}
                        placeholder="Phone Number"
                        className="h-12 rounded-xl"
                    />
                </div>
            </div>

            {/* Financial Terms */}
            <div className="bg-blue-50 rounded-xl p-6 space-y-4">
                <p className="text-xs font-bold uppercase tracking-widest text-blue-600 flex items-center gap-2">
                    <DollarSign className="w-4 h-4" /> Financial Terms
                </p>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label className="text-xs text-slate-500">Monetary Unit</Label>
                        <Select value={formData.currency} onValueChange={(v) => setFormData({ ...formData, currency: v })}>
                            <SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {CURRENCIES.map(c => <SelectItem key={c.code} value={c.code}>{c.code} ({c.symbol})</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label className="text-xs text-slate-500">Monthly Rent *</Label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">{getCurrencySymbol(formData.currency)}</span>
                            <Input
                                type="number"
                                value={formData.offerRent}
                                onChange={(e) => setFormData({ ...formData, offerRent: e.target.value })}
                                placeholder="0.00"
                                className="h-12 rounded-xl pl-8"
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs text-slate-500">Security Deposit *</Label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">{getCurrencySymbol(formData.currency)}</span>
                            <Input
                                type="number"
                                value={formData.securityDeposit}
                                onChange={(e) => setFormData({ ...formData, securityDeposit: e.target.value })}
                                placeholder="0.00"
                                className="h-12 rounded-xl pl-8"
                            />
                        </div>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label className="text-xs text-slate-500">Lease Term</Label>
                        <Select value={formData.leaseTerm} onValueChange={(v) => setFormData({ ...formData, leaseTerm: v })}>
                            <SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="6">6 Months</SelectItem>
                                <SelectItem value="12">12 Months</SelectItem>
                                <SelectItem value="18">18 Months</SelectItem>
                                <SelectItem value="24">24 Months</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs text-slate-500">Proposed Start Date *</Label>
                        <Input
                            type="date"
                            value={formData.startDate}
                            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                            className="h-12 rounded-xl"
                        />
                    </div>
                </div>
            </div>

            {/* Special Conditions */}
            <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">Special Conditions (Optional)</Label>
                <Textarea
                    value={formData.conditions}
                    onChange={(e) => setFormData({ ...formData, conditions: e.target.value })}
                    placeholder="e.g., Pets allowed with deposit, parking included, utilities included..."
                    rows={3}
                    className="rounded-xl"
                />
            </div>

            <Button
                onClick={() => onGenerate(formData)}
                className="w-full h-14 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-black uppercase tracking-widest text-xs"
                disabled={isGenerating || !formData.propertyId || !formData.tenantName || !formData.offerRent}
            >
                {isGenerating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <FileSignature className="w-4 h-4 mr-2" />}
                Generate Lease Proposal
            </Button>
        </div>
    );
}

function ShowingSheetForm({ properties, onGenerate, isGenerating, profile }: any) {
    const [formData, setFormData] = useState({
        propertyId: '',
        showingDate: '',
        showingTime: '',
        agentName: profile?.full_name || '',
        agentPhone: profile?.phone || '',
        clientName: '',
        clientPhone: '',
        accessNotes: '',
        showLockbox: true,
        includeDirections: true,
        includeNearbyAmenities: true,
        notes: '',
        currency: 'USD'
    });

    useEffect(() => {
        if (profile) {
            setFormData(prev => ({
                ...prev,
                agentName: profile.full_name || prev.agentName,
                agentPhone: profile.phone || prev.agentPhone,
            }));
        }
    }, [profile]);

    return (
        <div className="space-y-6 max-w-2xl">
            <Select value={formData.propertyId} onValueChange={(v) => setFormData({ ...formData, propertyId: v })}>
                <SelectTrigger><SelectValue placeholder="Select Property" /></SelectTrigger>
                <SelectContent>
                    {properties.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.address}</SelectItem>)}
                </SelectContent>
            </Select>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Monetary Unit</Label>
                    <Select value={formData.currency} onValueChange={(v) => setFormData(prev => ({ ...prev, currency: v }))}>
                        <SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            {CURRENCIES.map(c => <SelectItem key={c.code} value={c.code}>{c.code} ({c.symbol})</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <Input type="date" value={formData.showingDate} onChange={(e) => setFormData({ ...formData, showingDate: e.target.value })} />
                <Input type="time" value={formData.showingTime} onChange={(e) => setFormData({ ...formData, showingTime: e.target.value })} />
            </div>
            <Input value={formData.clientName} onChange={(e) => setFormData({ ...formData, clientName: e.target.value })} placeholder="Client Name" />
            <Textarea value={formData.accessNotes} onChange={(e) => setFormData({ ...formData, accessNotes: e.target.value })} placeholder="Access Notes" rows={2} />
            <Button onClick={() => onGenerate(formData)} className="w-full bg-green-600 text-white" disabled={isGenerating}>
                {isGenerating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ClipboardList className="w-4 h-4 mr-2" />}
                Generate Showing Guide
            </Button>
        </div>
    );
}

function ApplicationSummaryForm({ properties, applications, onGenerate, isGenerating, profile }: any) {
    const [formData, setFormData] = useState({
        propertyId: '',
        applicantId: '',
        agentName: profile?.full_name || '',
        agentNote: '',
        includeCreditScore: true,
        includeIncome: true,
        includeBackground: true,
        isStrict: false,
        template: 'executive',
        currency: 'USD'
    });

    useEffect(() => {
        if (profile) {
            setFormData(prev => ({
                ...prev,
                agentName: profile.full_name || prev.agentName,
            }));
        }
    }, [profile]);

    const propertyApps = applications.filter((a: any) => {
        // Ensure accurate ID matching regardless of type (string/UUID)
        return String(a.property_id) === String(formData.propertyId);
    });

    return (
        <div className="space-y-6 max-w-2xl bg-white rounded-xl p-1">
            <div className="space-y-4">
                <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">Target Property</Label>
                    <Select value={formData.propertyId} onValueChange={(v) => setFormData({ ...formData, propertyId: v, applicantId: '' })}>
                        <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-slate-200 focus:ring-2 focus:ring-blue-100">
                            <SelectValue placeholder="Select Property to analyze..." />
                        </SelectTrigger>
                        <SelectContent>
                            {properties.map((p: any) => (
                                <SelectItem key={p.id} value={p.id} className="font-medium">
                                    {p.address}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">Financial Standard</Label>
                        <Select value={formData.currency} onValueChange={(v) => setFormData({ ...formData, currency: v })}>
                            <SelectTrigger className="h-12 rounded-xl bg-slate-50"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {CURRENCIES.map(c => <SelectItem key={c.code} value={c.code}>{c.code} ({c.symbol})</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">Applicant Selection</Label>
                    <Select
                        value={formData.applicantId}
                        onValueChange={(v) => setFormData({ ...formData, applicantId: v })}
                        disabled={!formData.propertyId}
                    >
                        <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-slate-200 focus:ring-2 focus:ring-amber-100">
                            <SelectValue placeholder={!formData.propertyId ? "First select a property above" : "Select Applicant"} />
                        </SelectTrigger>
                        <SelectContent>
                            {propertyApps.length > 0 ? (
                                propertyApps.map((a: any) => (
                                    <SelectItem key={a.id} value={a.id} className="font-medium">
                                        <div className="flex flex-col text-left">
                                            <span>{a.applicant_name}</span>
                                            <span className="text-[10px] text-slate-400 uppercase tracking-wider">{a.status}</span>
                                        </div>
                                    </SelectItem>
                                ))
                            ) : (
                                <div className="p-4 text-center text-sm text-slate-500 font-medium italic">
                                    No applicants found for this property.
                                </div>
                            )}
                        </SelectContent>
                    </Select>
                    {formData.propertyId && propertyApps.length === 0 && (
                        <p className="text-[10px] text-amber-600 font-bold bg-amber-50 px-3 py-2 rounded-lg border border-amber-100 flex items-center gap-2">
                            <span className="block w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                            No active applications found for this unit.
                        </p>
                    )}
                </div>
            </div>

            <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">Agent Context</Label>
                <Textarea
                    value={formData.agentNote}
                    onChange={(e) => setFormData({ ...formData, agentNote: e.target.value })}
                    placeholder="Add specific context for the AI (e.g., 'Verify employment stability', 'Check for pet deposit')..."
                    rows={3}
                    className="bg-slate-50 border-slate-200 focus:bg-white transition-colors resize-none rounded-xl"
                />
            </div>

            <Button
                onClick={() => onGenerate(formData)}
                className="w-full h-14 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-black uppercase tracking-widest text-xs shadow-xl shadow-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
                disabled={isGenerating || !formData.applicantId}
            >
                {isGenerating ? <Loader2 className="w-5 h-5 animate-spin mr-3" /> : <ShieldCheck className="w-5 h-5 mr-3 text-amber-500" />}
                Generate Reporting
            </Button>
        </div>
    );
}

function DocumentTemplate({ data }: { data: any }) {
    const { type, property, application, customFields, aiHighlight, aiIntro, aiTalkingPoints, aiAnalysis, currency } = data;
    const symbol = getCurrencySymbol(currency || 'USD');

    if (type === 'property_summary') {
        return (
            <div className="w-[8.5in] min-h-[11in] bg-white p-12 font-sans text-slate-900" id="document-content">
                <div className="flex justify-between items-start mb-12">
                    <div className="space-y-2">
                        <h1 className="text-5xl font-black tracking-tighter text-slate-900 leading-none">The Listing.</h1>
                        <p className="text-xs font-black uppercase tracking-[0.4em] text-blue-600">Premium Portfolio Report</p>
                    </div>
                </div>
                <div className="grid grid-cols-3 gap-8 mb-12">
                    <StatBox label="Bedrooms" value={property.bedrooms} />
                    <StatBox label="Bathrooms" value={property.bathrooms} />
                    <StatBox label="Monthly Rent" value={`${symbol}${property.rent?.toLocaleString()}`} />
                </div>
                {aiHighlight && (
                    <div className="bg-slate-900 text-white p-8 rounded-3xl mb-12 shadow-2xl">
                        <h3 className="text-xs font-black uppercase tracking-widest text-blue-400 mb-4">Professional Insight</h3>
                        <p className="text-xl font-medium leading-relaxed italic">"{aiHighlight}"</p>
                    </div>
                )}
                <div className="border-t pt-12 flex justify-between items-center">
                    <div>
                        <p className="text-lg font-black">{customFields.agentName}</p>
                        <p className="text-xs text-slate-400 uppercase font-black tracking-widest">{customFields.companyName}</p>
                    </div>
                </div>
            </div>
        );
    }

    if (type === 'showing_sheet') {
        return (
            <div className="w-[8.5in] min-h-[11in] bg-white p-12 font-sans text-slate-900" id="document-content">
                <div className="bg-green-600 p-12 rounded-[2.5rem] text-white mb-12 flex justify-between items-center shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
                    <div className="relative z-10">
                        <div className="flex items-center gap-4 mb-4">
                            <Badge className="bg-white/20 text-white font-black uppercase tracking-widest px-3 py-1 hover:bg-white/30 border-0">Official Walkthrough</Badge>
                        </div>
                        <h1 className="text-5xl font-black uppercase tracking-tighter mb-2">Agent Guide</h1>
                        <p className="font-bold opacity-80 uppercase tracking-widest text-xs flex items-center gap-2">
                            Property: <span className="underline decoration-white/30 underline-offset-4">{property.address}</span>
                        </p>
                    </div>
                    <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-md">
                        <ClipboardList className="w-12 h-12" />
                    </div>
                </div>

                <div className="p-10 bg-gradient-to-br from-green-50 to-emerald-50 rounded-[2.5rem] border border-green-100 mb-12 shadow-inner">
                    <h3 className="text-[10px] font-black uppercase text-green-700 tracking-[0.3em] mb-6 flex items-center gap-2">
                        <Sparkles className="w-4 h-4" /> AI Talking Points
                    </h3>
                    <div className="prose prose-green max-w-none">
                        <p className="font-medium text-lg text-slate-800 leading-loose whitespace-pre-line">{aiTalkingPoints}</p>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-8">
                    <KVRow label="Client" value={customFields.clientName || 'Private'} />
                    <KVRow label="Time" value={`${customFields.showingDate} @ ${customFields.showingTime}`} />
                </div>
            </div>
        );
    }

    if (type === 'lease_proposal') {
        return (
            <div className="w-[8.5in] min-h-[11in] bg-white p-16 font-serif text-slate-900" id="document-content">
                <div className="border-b-4 border-slate-900 pb-10 mb-12 flex justify-between items-end">
                    <h1 className="text-6xl font-black uppercase italic tracking-tighter">Proposal.</h1>
                    <Building2 className="w-12 h-12" />
                </div>
                <div className="mb-12">
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Presented To</p>
                    <h2 className="text-3xl font-black">{customFields.tenantName}</h2>
                </div>
                <p className="text-xl leading-relaxed italic border-l-4 border-blue-600 pl-8 mb-12 text-slate-700">"{aiIntro}"</p>
                <div className="grid grid-cols-2 gap-10 mb-12">
                    <KVRow label="Monthly Rate" value={`${symbol}${customFields.offerRent}`} />
                    <KVRow label="Move-in" value={customFields.moveInDate} />
                </div>
                <div className="mt-auto border-t pt-8">
                    <p className="text-sm font-black">{customFields.agentName}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{customFields.agentTitle}</p>
                </div>
            </div>
        );
    }

    if (type === 'application_summary') {
        return (
            <div className="w-[8.5in] min-h-[11in] bg-white p-12 font-sans text-slate-900" id="document-content">
                <div className="flex justify-between items-center mb-16">
                    <div className="flex items-center gap-6">
                        <div className="w-20 h-20 bg-amber-600 rounded-3xl flex items-center justify-center shadow-2xl">
                            <ShieldCheck className="w-12 h-12 text-white" />
                        </div>
                        <div>
                            <h1 className="text-4xl font-black tracking-tighter">Executive Screening</h1>
                            <p className="text-xs font-black uppercase tracking-widest text-amber-600">Official System Analysis</p>
                        </div>
                    </div>
                </div>
                <div className="mb-12">
                    <h2 className="text-3xl font-black">{application?.applicant_name}</h2>
                    <p className="text-slate-500 font-bold tracking-tight">Financial Profile Verified</p>
                </div>
                <div className="p-10 bg-slate-900 text-white rounded-[3rem] mb-12 shadow-2xl relative">
                    <Sparkles className="absolute top-8 right-8 w-12 h-12 opacity-20" />
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-amber-500 mb-6">Internal Risk Analysis</h3>
                    <p className="text-xl font-medium leading-relaxed italic">"{aiAnalysis}"</p>
                </div>
                <div className="grid grid-cols-2 gap-10">
                    <KVRow label="Credit Strength" value={application?.credit_score || 'N/A'} />
                    <KVRow label="Income Support" value={`${symbol}${application?.monthly_income?.toLocaleString()}/mo`} />
                </div>
                <div className="mt-auto pt-10 text-[10px] font-black uppercase text-slate-300 tracking-[0.5em] text-center">
                    Cloud Secured Intelligence Report
                </div>
            </div>
        );
    }

    return null;
}

function StatBox({ label, value }: { label: string, value: any }) {
    return (
        <div className="text-center p-8 bg-slate-50 rounded-[2rem] border border-slate-100">
            <p className="text-4xl font-black text-slate-900 tabular-nums">{value}</p>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-2">{label}</p>
        </div>
    );
}

function KVRow({ label, value }: { label: string, value: string | number }) {
    return (
        <div className="p-6 border border-slate-100 rounded-2xl bg-white shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
            <p className="text-sm font-black text-slate-900">{value}</p>
        </div>
    );
}
