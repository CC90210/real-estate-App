'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
    FileText,
    ClipboardList,
    FileSignature,
    UserCheck,
    Check,
    ChevronRight,
    Loader2,
    Printer,
    ArrowLeft,
    Calendar,
    Clock,
    User,
    DollarSign,
    Briefcase,
    X,
    Upload,
    ArrowRight,
    Home,
    Download,
    Building2,
    ShieldCheck
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

            // Extract image if exists
            const { image, ...fields } = formData;
            if (image) body.append('image', image);

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
        } catch (error) {
            console.error(error);
            toast.error("Failed to generate document.");
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
            {/* Left Panel: Selection */}
            <div className="lg:col-span-1 space-y-6">
                <div className="grid gap-3">
                    {documentTypes.map((doc) => (
                        <div
                            key={doc.id}
                            onClick={() => handleSelectType(doc.id)}
                            className={cn(
                                "group p-4 rounded-xl border-2 cursor-pointer transition-all hover:shadow-md",
                                selectedType === doc.id
                                    ? "bg-white border-blue-600 shadow-sm"
                                    : "bg-white border-slate-100 hover:border-slate-200"
                            )}
                        >
                            <div className="flex items-center gap-4">
                                <div className={cn("p-2.5 rounded-lg", doc.color)}>
                                    <doc.icon className="w-5 h-5" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-bold text-slate-900 text-sm">{doc.title}</h3>
                                    <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">{doc.description.split(': ')[0]}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Right Panel: Config & Preview */}
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
                            <PropertySummaryForm properties={properties} onGenerate={handleGenerate} isGenerating={isGenerating} />
                        )}
                        {selectedType === 'lease_proposal' && (
                            <LeaseProposalForm properties={properties} onGenerate={handleGenerate} isGenerating={isGenerating} />
                        )}
                        {selectedType === 'showing_sheet' && (
                            <ShowingSheetForm properties={properties} onGenerate={handleGenerate} isGenerating={isGenerating} />
                        )}
                        {selectedType === 'application_summary' && (
                            <ApplicationSummaryForm properties={properties} applications={applications} onGenerate={handleGenerate} isGenerating={isGenerating} />
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

// --- FORM COMPONENTS ---

function PropertySummaryForm({ properties, onGenerate, isGenerating }: any) {
    const [formData, setFormData] = useState({
        propertyId: '',
        image: null as File | null,
        imagePreview: '',
        agentName: '',
        agentPhone: '',
        agentEmail: '',
        companyName: 'PropFlow Realty',
        highlightFeatures: '',
        customTagline: '',
        showPrice: true,
        showLockbox: false,
        template: 'modern'
    });

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
                <Select
                    value={formData.propertyId}
                    onValueChange={(v) => setFormData(prev => ({ ...prev, propertyId: v }))}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Select a property" />
                    </SelectTrigger>
                    <SelectContent>
                        {properties.map((p: any) => (
                            <SelectItem key={p.id} value={p.id}>{p.address}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div>
                <Label>Property Photo Override</Label>
                <div className="mt-2">
                    {formData.imagePreview ? (
                        <div className="relative w-full h-48 rounded-lg overflow-hidden">
                            <img
                                src={formData.imagePreview}
                                alt="Preview"
                                className="w-full h-full object-cover"
                            />
                            <button
                                onClick={() => setFormData(prev => ({ ...prev, image: null, imagePreview: '' }))}
                                className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    ) : (
                        <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                            <Upload className="w-8 h-8 text-slate-400" />
                            <span className="mt-2 text-sm text-slate-500 font-medium">Click to upload property photo</span>
                            <span className="text-xs text-slate-400">PNG, JPG up to 10MB</span>
                            <input
                                type="file"
                                className="hidden"
                                accept="image/*"
                                onChange={handleImageChange}
                            />
                        </label>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Agent Name *</Label>
                    <Input
                        value={formData.agentName}
                        onChange={(e) => setFormData(prev => ({ ...prev, agentName: e.target.value }))}
                        placeholder="Sarah Mitchell"
                    />
                </div>
                <div className="space-y-2">
                    <Label>Agent Phone *</Label>
                    <Input
                        value={formData.agentPhone}
                        onChange={(e) => setFormData(prev => ({ ...prev, agentPhone: e.target.value }))}
                        placeholder="(416) 555-0100"
                    />
                </div>
            </div>

            <div className="space-y-2">
                <Label>Agent Email *</Label>
                <Input
                    type="email"
                    value={formData.agentEmail}
                    onChange={(e) => setFormData(prev => ({ ...prev, agentEmail: e.target.value }))}
                    placeholder="sarah@company.com"
                />
            </div>

            <div className="space-y-2">
                <Label>Company Name</Label>
                <Input
                    value={formData.companyName}
                    onChange={(e) => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
                />
            </div>

            <div className="space-y-2">
                <Label>Custom Tagline (optional)</Label>
                <Input
                    value={formData.customTagline}
                    onChange={(e) => setFormData(prev => ({ ...prev, customTagline: e.target.value }))}
                    placeholder="Your dream home awaits..."
                />
            </div>

            <div className="space-y-2">
                <Label>Highlight Features (optional)</Label>
                <Textarea
                    value={formData.highlightFeatures}
                    onChange={(e) => setFormData(prev => ({ ...prev, highlightFeatures: e.target.value }))}
                    placeholder="Recently renovated kitchen, stunning lake views, walking distance to transit..."
                    rows={3}
                />
            </div>

            <div className="flex items-center gap-6 py-2">
                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={formData.showPrice}
                        onChange={(e) => setFormData(prev => ({ ...prev, showPrice: e.target.checked }))}
                        className="rounded accent-blue-600"
                    />
                    <span className="text-sm font-medium">Show Price</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={formData.showLockbox}
                        onChange={(e) => setFormData(prev => ({ ...prev, showLockbox: e.target.checked }))}
                        className="rounded accent-blue-600"
                    />
                    <span className="text-sm font-medium">Include Lockbox Code</span>
                </label>
            </div>

            <Button
                onClick={() => onGenerate(formData)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                disabled={!formData.propertyId || !formData.agentName || isGenerating}
            >
                {isGenerating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ArrowRight className="w-4 h-4 mr-2" />}
                Generate Document
            </Button>
        </div>
    );
}

function LeaseProposalForm({ properties, onGenerate, isGenerating }: any) {
    const [formData, setFormData] = useState({
        propertyId: '',
        tenantName: '',
        tenantEmail: '',
        tenantPhone: '',
        offerRent: '',
        leaseTerm: '12',
        moveInDate: '',
        securityDeposit: '',
        conditions: '',
        includePetClause: false,
        petDeposit: '',
        includeParking: false,
        parkingFee: '',
        utilities: [] as string[],
        agentName: '',
        agentTitle: 'Real Estate Agent',
        agentLicense: '',
        companyName: 'PropFlow Realty',
        companyAddress: '',
        validUntil: ''
    });

    return (
        <div className="space-y-8 max-w-2xl">
            <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                <h4 className="font-bold text-blue-900">Lease Proposal</h4>
                <p className="text-sm text-blue-700 mt-1">Generate a professional lease proposal to send to prospective tenants.</p>
            </div>

            <div>
                <Label className="text-sm font-bold uppercase tracking-wider text-slate-400">Property Selection</Label>
                <div className="mt-2">
                    <Select
                        value={formData.propertyId}
                        onValueChange={(v) => setFormData(prev => ({ ...prev, propertyId: v }))}
                    >
                        <SelectTrigger className="h-11">
                            <SelectValue placeholder="Select a property" />
                        </SelectTrigger>
                        <SelectContent>
                            {properties.map((p: any) => (
                                <SelectItem key={p.id} value={p.id}>
                                    {p.address} - ${p.rent}/mo
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="space-y-4">
                <h4 className="font-bold text-slate-900 border-b pb-2 flex items-center gap-2">
                    <User className="w-4 h-4 text-blue-600" /> Tenant Information
                </h4>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Tenant Full Name *</Label>
                        <Input
                            value={formData.tenantName}
                            onChange={(e) => setFormData(prev => ({ ...prev, tenantName: e.target.value }))}
                            placeholder="John Smith"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Tenant Email</Label>
                        <Input
                            type="email"
                            value={formData.tenantEmail}
                            onChange={(e) => setFormData(prev => ({ ...prev, tenantEmail: e.target.value }))}
                            placeholder="john@email.com"
                        />
                    </div>
                </div>
                <div className="space-y-2">
                    <Label>Tenant Phone</Label>
                    <Input
                        value={formData.tenantPhone}
                        onChange={(e) => setFormData(prev => ({ ...prev, tenantPhone: e.target.value }))}
                        placeholder="(416) 555-0000"
                    />
                </div>
            </div>

            <div className="space-y-4">
                <h4 className="font-bold text-slate-900 border-b pb-2 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-blue-600" /> Lease Terms
                </h4>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Proposed Rent ($/month) *</Label>
                        <Input
                            type="number"
                            value={formData.offerRent}
                            onChange={(e) => setFormData(prev => ({ ...prev, offerRent: e.target.value }))}
                            placeholder="2500"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Lease Term (months) *</Label>
                        <Select
                            value={formData.leaseTerm}
                            onValueChange={(v) => setFormData(prev => ({ ...prev, leaseTerm: v }))}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="6">6 months</SelectItem>
                                <SelectItem value="12">12 months</SelectItem>
                                <SelectItem value="18">18 months</SelectItem>
                                <SelectItem value="24">24 months</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Move-in Date *</Label>
                        <Input
                            type="date"
                            value={formData.moveInDate}
                            onChange={(e) => setFormData(prev => ({ ...prev, moveInDate: e.target.value }))}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Security Deposit ($)</Label>
                        <Input
                            type="number"
                            value={formData.securityDeposit}
                            onChange={(e) => setFormData(prev => ({ ...prev, securityDeposit: e.target.value }))}
                            placeholder="First + Last month"
                        />
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <h4 className="font-bold text-slate-900 border-b pb-2 flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-blue-600" /> Additional Terms
                </h4>

                <div className="flex items-center justify-between p-4 border rounded-xl bg-slate-50/50">
                    <div>
                        <p className="font-bold text-sm">Pet Clause</p>
                        <p className="text-xs text-slate-500">Include pet deposit and terms</p>
                    </div>
                    <Switch
                        checked={formData.includePetClause}
                        onCheckedChange={(v) => setFormData(prev => ({ ...prev, includePetClause: v }))}
                    />
                </div>

                {formData.includePetClause && (
                    <div className="p-4 border rounded-xl animate-in slide-in-from-top-2">
                        <Label>Pet Deposit ($)</Label>
                        <Input
                            type="number"
                            className="mt-2"
                            value={formData.petDeposit}
                            onChange={(e) => setFormData(prev => ({ ...prev, petDeposit: e.target.value }))}
                            placeholder="500"
                        />
                    </div>
                )}

                <div className="flex items-center justify-between p-4 border rounded-xl bg-slate-50/50">
                    <div>
                        <p className="font-bold text-sm">Parking</p>
                        <p className="text-xs text-slate-500">Include parking space</p>
                    </div>
                    <Switch
                        checked={formData.includeParking}
                        onCheckedChange={(v) => setFormData(prev => ({ ...prev, includeParking: v }))}
                    />
                </div>

                {formData.includeParking && (
                    <div className="p-4 border rounded-xl animate-in slide-in-from-top-2">
                        <Label>Monthly Parking Fee ($)</Label>
                        <Input
                            type="number"
                            className="mt-2"
                            value={formData.parkingFee}
                            onChange={(e) => setFormData(prev => ({ ...prev, parkingFee: e.target.value }))}
                            placeholder="150"
                        />
                    </div>
                )}

                <div className="space-y-2">
                    <Label>Utilities Included</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                        {['Water', 'Heat', 'Hydro', 'Gas', 'Internet', 'Cable'].map(util => (
                            <button
                                key={util}
                                onClick={() => {
                                    setFormData(prev => ({
                                        ...prev,
                                        utilities: prev.utilities.includes(util)
                                            ? prev.utilities.filter(u => u !== util)
                                            : [...prev.utilities, util]
                                    }));
                                }}
                                className={cn(
                                    "px-3 py-1 rounded-full text-xs font-medium border transition-all",
                                    formData.utilities.includes(util)
                                        ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                                        : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                                )}
                            >
                                {util}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="space-y-2">
                    <Label>Special Conditions / Subject Clauses</Label>
                    <Textarea
                        value={formData.conditions}
                        onChange={(e) => setFormData(prev => ({ ...prev, conditions: e.target.value }))}
                        placeholder="Subject to credit check approval. Subject to employment verification."
                        rows={3}
                    />
                </div>
            </div>

            <div className="space-y-4">
                <h4 className="font-bold text-slate-900 border-b pb-2 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-blue-600" /> Agent Information
                </h4>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Agent Name *</Label>
                        <Input
                            value={formData.agentName}
                            onChange={(e) => setFormData(prev => ({ ...prev, agentName: e.target.value }))}
                            placeholder="Sarah Mitchell"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Title</Label>
                        <Input
                            value={formData.agentTitle}
                            onChange={(e) => setFormData(prev => ({ ...prev, agentTitle: e.target.value }))}
                        />
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>License Number</Label>
                        <Input
                            value={formData.agentLicense}
                            onChange={(e) => setFormData(prev => ({ ...prev, agentLicense: e.target.value }))}
                            placeholder="RECO #123456"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Proposal Valid Until</Label>
                        <Input
                            type="date"
                            value={formData.validUntil}
                            onChange={(e) => setFormData(prev => ({ ...prev, validUntil: e.target.value }))}
                        />
                    </div>
                </div>
            </div>

            <Button
                onClick={() => onGenerate(formData)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-12"
                disabled={!formData.propertyId || !formData.tenantName || !formData.offerRent || isGenerating}
            >
                {isGenerating ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <ArrowRight className="w-5 h-5 mr-2" />}
                Generate Lease Proposal
            </Button>
        </div>
    );
}

function ShowingSheetForm({ properties, onGenerate, isGenerating }: any) {
    const [formData, setFormData] = useState({
        propertyId: '',
        showingDate: '',
        showingTime: '',
        agentName: '',
        agentPhone: '',
        clientName: '',
        clientPhone: '',
        accessNotes: '',
        showLockbox: true,
        includeDirections: true,
        includeNearbyAmenities: true,
        notes: ''
    });

    return (
        <div className="space-y-6 max-w-2xl">
            <div className="p-4 bg-green-50 rounded-xl border border-green-100">
                <h4 className="font-bold text-green-900">Showing Sheet</h4>
                <p className="text-sm text-green-700 mt-1">Quick reference card for property showings with all essential info.</p>
            </div>

            <div>
                <Label>Property *</Label>
                <Select
                    value={formData.propertyId}
                    onValueChange={(v) => setFormData(prev => ({ ...prev, propertyId: v }))}
                >
                    <SelectTrigger className="h-11">
                        <SelectValue placeholder="Select a property" />
                    </SelectTrigger>
                    <SelectContent>
                        {properties.map((p: any) => (
                            <SelectItem key={p.id} value={p.id}>{p.address}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Showing Date</Label>
                    <Input
                        type="date"
                        value={formData.showingDate}
                        onChange={(e) => setFormData(prev => ({ ...prev, showingDate: e.target.value }))}
                    />
                </div>
                <div className="space-y-2">
                    <Label>Showing Time</Label>
                    <Input
                        type="time"
                        value={formData.showingTime}
                        onChange={(e) => setFormData(prev => ({ ...prev, showingTime: e.target.value }))}
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Agent Name *</Label>
                    <Input
                        value={formData.agentName}
                        onChange={(e) => setFormData(prev => ({ ...prev, agentName: e.target.value }))}
                    />
                </div>
                <div className="space-y-2">
                    <Label>Agent Phone *</Label>
                    <Input
                        value={formData.agentPhone}
                        onChange={(e) => setFormData(prev => ({ ...prev, agentPhone: e.target.value }))}
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Client Name</Label>
                    <Input
                        value={formData.clientName}
                        onChange={(e) => setFormData(prev => ({ ...prev, clientName: e.target.value }))}
                    />
                </div>
                <div className="space-y-2">
                    <Label>Client Phone</Label>
                    <Input
                        value={formData.clientPhone}
                        onChange={(e) => setFormData(prev => ({ ...prev, clientPhone: e.target.value }))}
                    />
                </div>
            </div>

            <div className="space-y-2">
                <Label>Access Notes</Label>
                <Textarea
                    value={formData.accessNotes}
                    onChange={(e) => setFormData(prev => ({ ...prev, accessNotes: e.target.value }))}
                    placeholder="Enter through lobby, take elevator to 28th floor, turn right..."
                    rows={2}
                />
            </div>

            <div className="space-y-4 py-2">
                <label className="flex items-center gap-3 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={formData.showLockbox}
                        onChange={(e) => setFormData(prev => ({ ...prev, showLockbox: e.target.checked }))}
                        className="rounded accent-green-600"
                    />
                    <span className="text-sm font-medium">Include Lockbox Code</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={formData.includeDirections}
                        onChange={(e) => setFormData(prev => ({ ...prev, includeDirections: e.target.checked }))}
                        className="rounded accent-green-600"
                    />
                    <span className="text-sm font-medium">Include Directions / Parking Info</span>
                </label>
            </div>

            <div className="space-y-2">
                <Label>Additional Notes</Label>
                <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Any special instructions or talking points..."
                    rows={2}
                />
            </div>

            <Button
                onClick={() => onGenerate(formData)}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold h-12"
                disabled={!formData.propertyId || !formData.agentName || isGenerating}
            >
                {isGenerating ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <ArrowRight className="w-5 h-5 mr-2" />}
                Generate Showing Sheet
            </Button>
        </div>
    );
}

function ApplicationSummaryForm({ properties, applications, onGenerate, isGenerating }: any) {
    const [formData, setFormData] = useState({
        propertyId: '',
        applicantId: '',
        agentName: '',
        agentNote: ''
    });

    const propertyApps = applications.filter((a: any) => a.property_id === formData.propertyId);

    return (
        <div className="space-y-6 max-w-2xl">
            <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                <h4 className="font-bold text-amber-900">Application Summary</h4>
                <p className="text-sm text-amber-700 mt-1">Formal screening report with financial breakdowns and verification status.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Property *</Label>
                    <Select
                        value={formData.propertyId}
                        onValueChange={(v) => setFormData(prev => ({ ...prev, propertyId: v, applicantId: '' }))}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Select property" />
                        </SelectTrigger>
                        <SelectContent>
                            {properties.map((p: any) => (
                                <SelectItem key={p.id} value={p.id}>{p.address}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label>Applicant *</Label>
                    <Select
                        value={formData.applicantId}
                        onValueChange={(v) => setFormData(prev => ({ ...prev, applicantId: v }))}
                        disabled={!formData.propertyId}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Select applicant" />
                        </SelectTrigger>
                        <SelectContent>
                            {propertyApps.map((a: any) => (
                                <SelectItem key={a.id} value={a.id}>{a.applicant_name}</SelectItem>
                            ))}
                            {propertyApps.length === 0 && <SelectItem value="none" disabled>No applicants found</SelectItem>}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="space-y-2">
                <Label>Screening Agent Name</Label>
                <Input
                    value={formData.agentName}
                    onChange={(e) => setFormData(prev => ({ ...prev, agentName: e.target.value }))}
                />
            </div>

            <div className="space-y-2">
                <Label>Confidential Agent Notes</Label>
                <Textarea
                    value={formData.agentNote}
                    onChange={(e) => setFormData(prev => ({ ...prev, agentNote: e.target.value }))}
                    rows={4}
                    placeholder="e.g. Strong employment history, excellent references provided..."
                />
            </div>

            <Button
                onClick={() => onGenerate(formData)}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold h-12"
                disabled={!formData.applicantId || isGenerating}
            >
                {isGenerating ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <ArrowRight className="w-5 h-5 mr-2" />}
                Generate Summary
            </Button>
        </div>
    );
}


// --- TEMPLATE COMPONENT ---

function DocumentTemplate({ data }: { data: any }) {
    const { property, customFields, imageUrl, aiHighlight, aiIntro, application, type } = data;

    if (type === 'property_summary') {
        return (
            <div className="w-[8.5in] min-h-[11in] bg-white p-12 font-sans text-slate-900" id="document-content">
                <div className="flex justify-between items-start border-b-2 border-blue-600 pb-6 mb-8">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
                            <Building2 className="w-7 h-7 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black tracking-tight text-slate-900">{customFields.companyName}</h1>
                            <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Property Portfolio Summary</p>
                        </div>
                    </div>
                    <div className="text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                        <p>REF: {property.id.slice(0, 8).toUpperCase()}</p>
                        <p>Date: {new Date().toLocaleDateString()}</p>
                    </div>
                </div>

                {imageUrl || property.photos?.[0] ? (
                    <div className="w-full h-80 rounded-2xl overflow-hidden mb-8 shadow-xl">
                        <img src={imageUrl || property.photos?.[0]} alt={property.address} className="w-full h-full object-cover" />
                    </div>
                ) : (
                    <div className="w-full h-80 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex flex-col items-center justify-center mb-8 gap-4">
                        <Home className="w-16 h-16 text-slate-300" />
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Image Unavailable</p>
                    </div>
                )}

                {customFields.customTagline && (
                    <h2 className="text-2xl font-black text-blue-600 text-center mb-8 px-10 italic">
                        "{customFields.customTagline}"
                    </h2>
                )}

                <div className="flex justify-between items-end mb-10">
                    <div>
                        <h2 className="text-4xl font-black text-slate-900 tracking-tight">{property.address}</h2>
                        <div className="flex items-center gap-2 mt-2 text-slate-500 font-medium">
                            <span className="px-2 py-0.5 bg-slate-100 rounded text-xs">{property.buildings?.name || 'Exclusive Listing'}</span>
                            <span>•</span>
                            <span className="text-xs">{property.buildings?.area?.name || 'Central District'}</span>
                        </div>
                    </div>
                    <div className="text-right">
                        {customFields.showPrice !== false && (
                            <>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Monthly Rent</p>
                                <p className="text-5xl font-black text-blue-600 tabular-nums">${property.rent.toLocaleString()}</p>
                            </>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-4 gap-6 mb-10">
                    <StatBox label="Bedrooms" value={property.bedrooms} />
                    <StatBox label="Bathrooms" value={property.bathrooms} />
                    <StatBox label="Sq Ft" value={property.square_feet?.toLocaleString() || 'N/A'} />
                    <StatBox label="Available" value={property.available_date ? new Date(property.available_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Now'} />
                </div>

                {aiHighlight && (
                    <div className="bg-slate-900 text-white p-6 rounded-2xl mb-10 shadow-lg relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <FileText className="w-20 h-20" />
                        </div>
                        <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-blue-400 mb-2">Platform Analysis</h3>
                        <p className="text-lg font-medium leading-relaxed italic">"{aiHighlight}"</p>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-10">
                    <div>
                        <h3 className="text-sm font-bold uppercase tracking-widest text-slate-900 mb-4 border-b pb-2">Listing Description</h3>
                        <p className="text-slate-600 text-sm leading-relaxed">{property.description}</p>
                    </div>
                    <div className="space-y-6">
                        {customFields.highlightFeatures && (
                            <div>
                                <h3 className="text-sm font-bold uppercase tracking-widest text-slate-900 mb-4 border-b pb-2">Key Features</h3>
                                <p className="text-slate-600 text-sm italic">{customFields.highlightFeatures}</p>
                            </div>
                        )}
                        {property.buildings?.amenities && (
                            <div>
                                <h3 className="text-sm font-bold uppercase tracking-widest text-slate-900 mb-4 border-b pb-2">Building Amenities</h3>
                                <div className="flex flex-wrap gap-2">
                                    {property.buildings.amenities.map((amenity: any, i: number) => (
                                        <span key={i} className="px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-[10px] font-bold flex items-center gap-1">
                                            <Check className="w-3 h-3" />
                                            {amenity}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-6 mb-12">
                    <KVRow label="Pet Policy" value={property.pet_policy || 'Subject to Approval'} />
                    <KVRow label="Parking" value={property.parking_included ? 'One Underground Space' : 'Inquire for Availability'} />
                    <KVRow label="Utilities" value={property.utilities_included?.join(', ') || 'Tenant Pays Additional'} />
                    {customFields.showLockbox && property.lockbox_code && (
                        <div className="p-4 bg-amber-50 border-2 border-dashed border-amber-200 rounded-xl">
                            <p className="text-[10px] font-black uppercase text-amber-700 tracking-widest leading-none mb-1">Encrypted Lockbox Code</p>
                            <p className="text-2xl font-black text-amber-900 tabular-nums tracking-[0.2em]">{property.lockbox_code}</p>
                        </div>
                    )}
                </div>

                <div className="border-t-2 border-slate-900 pt-8 mt-auto">
                    <div className="flex justify-between items-center">
                        <div className="space-y-1">
                            <p className="text-lg font-black text-slate-900">{customFields.agentName}</p>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{customFields.companyName}</p>
                        </div>
                        <div className="text-right space-y-1">
                            <p className="text-sm font-bold text-slate-900">{customFields.agentPhone}</p>
                            <p className="text-sm font-bold text-blue-600">{customFields.agentEmail}</p>
                        </div>
                    </div>
                    <div className="mt-8 pt-4 border-t border-slate-100 flex justify-between items-center text-[8px] font-bold text-slate-300 uppercase tracking-[0.3em]">
                        <p>Verified Property Asset Report</p>
                        <p>© 2026 PropFlow Intelligence Platform</p>
                    </div>
                </div>
            </div>
        );
    }

    // Fallback for other types or implement them similarly
    return (
        <div className="w-[8.5in] min-h-[11in] bg-white p-12 font-serif text-slate-900" id="document-content">
            <div className="text-center mb-12 border-b-2 border-slate-900 pb-8">
                <h1 className="text-4xl font-black uppercase tracking-[0.2em] mb-4">{type.replace(/_/g, ' ')}</h1>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Confidential Real Estate Document</p>
            </div>

            {aiIntro && <p className="text-lg mb-8 leading-relaxed font-medium italic">"{aiIntro}"</p>}

            <div className="space-y-8">
                <div className="grid grid-cols-2 gap-10">
                    <KVSection title="Property Details" rows={[
                        { label: 'Address', value: property.address },
                        { label: 'Unit', value: property.unit_number },
                        { label: 'Reference ID', value: property.id.slice(0, 10).toUpperCase() }
                    ]} />
                    {type === 'lease_proposal' && (
                        <KVSection title="Proposed Terms" rows={[
                            { label: 'Monthly Rent', value: `$${customFields.offerRent}` },
                            { label: 'Lease Term', value: `${customFields.leaseTerm} Months` },
                            { label: 'Move-in Date', value: customFields.moveInDate || 'TBD' }
                        ]} />
                    )}
                    {type === 'application_summary' && application && (
                        <KVSection title="Applicant Data" rows={[
                            { label: 'Name', value: application.applicant_name },
                            { label: 'Credit Score', value: application.credit_score || 'Calculating...' },
                            { label: 'Status', value: application.status?.toUpperCase() || 'PENDING' }
                        ]} />
                    )}
                </div>

                {customFields.conditions && (
                    <div className="p-6 bg-slate-50 border rounded-xl">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Specified Conditions</h3>
                        <p className="text-sm font-medium leading-relaxed">"{customFields.conditions}"</p>
                    </div>
                )}

                <div className="pt-24 grid grid-cols-2 gap-20">
                    <div className="border-t border-slate-900 pt-3">
                        <p className="text-[10px] font-bold text-slate-400 uppercase text-center tracking-widest">Authorized Signatory</p>
                        <p className="text-sm font-bold text-center mt-2">{customFields.agentName}</p>
                    </div>
                    <div className="border-t border-slate-900 pt-3">
                        <p className="text-[10px] font-bold text-slate-400 uppercase text-center tracking-widest">Acknowledged By</p>
                    </div>
                </div>
            </div>

            <div className="mt-auto pt-10 border-t border-slate-100 flex justify-center opacity-30 grayscale">
                <Building2 className="w-8 h-8" />
            </div>
        </div>
    );
}

function StatBox({ label, value }: { label: string, value: any }) {
    return (
        <div className="text-center p-4 bg-slate-50 rounded-2xl border border-slate-100 ring-1 ring-inset ring-black/5">
            <p className="text-3xl font-black text-slate-900 tabular-nums">{value}</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{label}</p>
        </div>
    );
}

function KVRow({ label, value }: { label: string, value: string }) {
    return (
        <div className="p-4 border rounded-xl bg-white shadow-sm ring-1 ring-inset ring-black/5">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{label}</p>
            <p className="text-sm font-bold text-slate-900">{value}</p>
        </div>
    );
}

function KVSection({ title, rows }: { title: string, rows: { label: string, value: string }[] }) {
    return (
        <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-blue-600 border-b pb-2">{title}</h3>
            <div className="space-y-3">
                {rows.map((row, i) => (
                    <div key={i} className="flex justify-between items-center text-sm">
                        <span className="font-bold text-slate-400">{row.label}</span>
                        <span className="font-bold text-slate-900">{row.value}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
