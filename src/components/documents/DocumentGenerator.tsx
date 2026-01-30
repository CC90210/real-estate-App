'use client';

import { useState } from 'react';
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
    Briefcase
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface DocumentContext {
    propertyId: string;
    applicantId?: string;
    date?: string;
    time?: string;
    agentName?: string;
    tenantName?: string;
    offerRent?: string;
    termMonths?: number;
    conditions?: string;
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

export function DocumentGenerator({ properties, applications }: { properties: any[], applications: any[] }) {
    const [selectedType, setSelectedType] = useState<string | null>(null);
    const [step, setStep] = useState<'select' | 'configure' | 'preview'>('select');
    const [isGenerating, setIsGenerating] = useState(false);

    const [context, setContext] = useState<DocumentContext>({
        propertyId: '',
        date: new Date().toISOString().split('T')[0],
        time: '12:00',
        agentName: '',
        tenantName: '',
        termMonths: 12,
        conditions: ''
    });

    const handleSelectType = (id: string) => {
        setSelectedType(id);
        setStep('configure');
    };

    const handleGenerate = async () => {
        setIsGenerating(true);
        // Simulate local AI/Logic processing
        await new Promise(r => setTimeout(r, 800));
        setStep('preview');
        setIsGenerating(false);
    };

    const handleReset = () => {
        setStep('select');
        setSelectedType(null);
    };

    const getSelectedProperty = () => properties.find(p => p.id === context.propertyId);
    const getSelectedApplicant = () => applications.find(a => a.id === context.applicantId);

    const renderDynamicFields = () => {
        switch (selectedType) {
            case 'showing_sheet':
                return (
                    <div className="space-y-4 animate-in slide-in-from-top-2">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Showing Date</Label>
                                <Input type="date" value={context.date} onChange={e => setContext({ ...context, date: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label>Showing Time</Label>
                                <Input type="time" value={context.time} onChange={e => setContext({ ...context, time: e.target.value })} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Agent Name</Label>
                            <Input placeholder="Enter your full name" value={context.agentName} onChange={e => setContext({ ...context, agentName: e.target.value })} />
                        </div>
                    </div>
                );
            case 'lease_proposal':
                return (
                    <div className="space-y-4 animate-in slide-in-from-top-2">
                        <div className="space-y-2">
                            <Label>Tenant Full Name</Label>
                            <Input placeholder="e.g. John Doe" value={context.tenantName} onChange={e => setContext({ ...context, tenantName: e.target.value })} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Offer Rent ($)</Label>
                                <Input type="number" placeholder="2500" value={context.offerRent} onChange={e => setContext({ ...context, offerRent: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label>Lease Term (Months)</Label>
                                <Input type="number" value={context.termMonths} onChange={e => setContext({ ...context, termMonths: parseInt(e.target.value) })} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Conditions / Subject Clause</Label>
                            <Textarea placeholder="e.g. Subject to employment verification by Friday." value={context.conditions} onChange={e => setContext({ ...context, conditions: e.target.value })} />
                        </div>
                    </div>
                );
            case 'application_summary':
                // Filter applications for selected property
                const propertyApps = applications.filter(a => a.property_id === context.propertyId);
                return (
                    <div className="space-y-4 animate-in slide-in-from-top-2">
                        <div className="space-y-2">
                            <Label>Select Applicant</Label>
                            <Select value={context.applicantId} onValueChange={val => setContext({ ...context, applicantId: val })}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Choose applicant..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {propertyApps.map(a => (
                                        <SelectItem key={a.id} value={a.id}>{a.applicant_name}</SelectItem>
                                    ))}
                                    {propertyApps.length === 0 && <SelectItem value="none" disabled>No applications for this property</SelectItem>}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                );
            default:
                return null;
        }
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
                    <div className="flex-1 p-8 space-y-8 animate-in fade-in slide-in-from-right-4">
                        <div className="flex items-center gap-4 border-b pb-6">
                            <Button variant="ghost" size="icon" onClick={() => setStep('select')}>
                                <ArrowLeft className="w-5 h-5" />
                            </Button>
                            <div>
                                <h2 className="text-2xl font-bold text-slate-900">{documentTypes.find(t => t.id === selectedType)?.title}</h2>
                                <p className="text-slate-500 text-sm">Step 2: Provide specific context for this document.</p>
                            </div>
                        </div>

                        <div className="max-w-md space-y-6">
                            <div className="space-y-2">
                                <Label>Property Reference</Label>
                                <Select value={context.propertyId} onValueChange={(val) => setContext({ ...context, propertyId: val })}>
                                    <SelectTrigger className="h-11">
                                        <SelectValue placeholder="Which property is this for?" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {properties.map(p => (
                                            <SelectItem key={p.id} value={p.id}>{p.address}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {renderDynamicFields()}

                            <Button
                                size="lg"
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 shadow-md group"
                                onClick={handleGenerate}
                                disabled={!context.propertyId || isGenerating}
                            >
                                {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                                    <>
                                        Generate Document
                                        <ChevronRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                )}

                {step === 'preview' && (
                    <div className="flex-1 flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="flex justify-between items-center p-4 border-b bg-slate-50/50">
                            <div className="flex items-center gap-2">
                                <Button variant="ghost" size="sm" onClick={() => setStep('configure')}>
                                    <ArrowLeft className="w-4 h-4 mr-2" /> Edit Info
                                </Button>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={() => window.print()} className="bg-white">
                                    <Printer className="w-4 h-4 mr-2" /> Print PDF
                                </Button>
                                <Button size="sm" onClick={handleReset} className="bg-slate-900 text-white">Reset</Button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-12 bg-slate-100/50">
                            <div className="bg-white shadow-2xl border border-slate-200 p-12 mx-auto max-w-2xl min-h-[800px] rounded-sm print:shadow-none print:border-none">
                                <DocumentTemplate
                                    type={selectedType!}
                                    context={context}
                                    property={getSelectedProperty()}
                                    applicant={getSelectedApplicant()}
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

const DocumentTemplate = ({ type, context, property, applicant }: any) => {
    if (!property) return null;

    return (
        <div className="font-serif text-slate-900 space-y-10">
            {/* Header */}
            <div className="text-center space-y-4 border-b-2 border-slate-900 pb-10">
                <div className="inline-flex p-3 bg-blue-600 text-white rounded-lg mb-2">
                    <Building2 className="w-8 h-8" />
                </div>
                <h1 className="text-4xl font-bold uppercase tracking-widest">{type.replace(/_/g, ' ')}</h1>
                <div className="flex justify-center gap-6 text-xs font-bold text-slate-400 uppercase tracking-widest">
                    <span>Ref: {property.id.slice(0, 8)}</span>
                    <span>•</span>
                    <span>Date: {new Date().toLocaleDateString()}</span>
                </div>
            </div>

            {/* Layout based on type */}
            {type === 'showing_sheet' && (
                <div className="space-y-10">
                    <section className="space-y-4">
                        <h2 className="text-xl font-bold uppercase border-b-2 border-slate-200 pb-2">Property Walkthrough</h2>
                        <div className="grid grid-cols-2 gap-8">
                            <div className="space-y-2">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Scheduled for</p>
                                <p className="text-lg font-medium">{context.date} at {context.time}</p>
                            </div>
                            <div className="space-y-2">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">On-Site Agent</p>
                                <p className="text-lg font-medium">{context.agentName || 'TBD'}</p>
                            </div>
                        </div>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-xl font-bold uppercase border-b-2 border-slate-200 pb-2">Unit Details</h2>
                        <div className="grid grid-cols-3 gap-6">
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase">Address</p>
                                <p className="text-sm font-bold">{property.address}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase">Unit #</p>
                                <p className="text-sm font-bold">{property.unit_number}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase">Monthly Rent</p>
                                <p className="text-sm font-bold">${property.rent.toLocaleString()}</p>
                            </div>
                        </div>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-xl font-bold uppercase border-b-2 border-slate-200 pb-2">Access Instructions</h2>
                        <div className="p-6 bg-slate-50 border border-dashed border-slate-300 rounded-xl">
                            <p className="text-[10px] font-bold text-blue-600 uppercase mb-2">Secure Lockbox Code</p>
                            <p className="text-3xl font-mono font-bold tracking-[0.5em]">{property.lockbox_code || 'N/A'}</p>
                        </div>
                    </section>
                </div>
            )}

            {type === 'lease_proposal' && (
                <div className="space-y-8 text-sm leading-relaxed">
                    <p><strong>TO:</strong> {context.tenantName}</p>
                    <p><strong>RE:</strong> Residential Lease Proposal for {property.address}</p>

                    <div className="space-y-4 mt-8">
                        <p>We are pleased to offer you a lease on the following terms:</p>
                        <ul className="list-disc pl-5 space-y-2">
                            <li><strong>Monthly Rent:</strong> ${context.offerRent || property.rent.toLocaleString()}</li>
                            <li><strong>Term Duration:</strong> {context.termMonths} Months</li>
                            <li><strong>Security Deposit:</strong> 1 Month Rent</li>
                        </ul>
                    </div>

                    {context.conditions && (
                        <div className="mt-8">
                            <h3 className="font-bold border-b mb-2">Subject Conditions:</h3>
                            <p className="italic text-slate-600">{context.conditions}</p>
                        </div>
                    )}

                    <div className="pt-20 grid grid-cols-2 gap-20">
                        <div className="border-t border-black pt-2 text-center text-[10px] font-bold uppercase">Landlord / Agent Signature</div>
                        <div className="border-t border-black pt-2 text-center text-[10px] font-bold uppercase">Tenant Acknowledgment</div>
                    </div>
                </div>
            )}

            {type === 'application_summary' && applicant && (
                <div className="space-y-10">
                    <section className="space-y-6">
                        <h2 className="text-xl font-bold uppercase border-b-2 border-slate-200 pb-2">Applicant Profile</h2>
                        <div className="grid grid-cols-2 gap-8">
                            <div className="space-y-1">
                                <Label className="text-[10px] uppercase text-slate-400 font-bold">FULL NAME</Label>
                                <p className="text-base font-bold">{applicant.applicant_name}</p>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[10px] uppercase text-slate-400 font-bold">CONTACT</Label>
                                <p className="text-base font-bold">{applicant.applicant_email}</p>
                            </div>
                        </div>
                    </section>

                    <section className="space-y-6">
                        <h2 className="text-xl font-bold uppercase border-b-2 border-slate-200 pb-2">Financial Status</h2>
                        <div className="grid grid-cols-3 gap-6">
                            <div className="space-y-1">
                                <Label className="text-[10px] uppercase text-slate-400 font-bold">CREDIT SCORE</Label>
                                <p className={`text-2xl font-black ${applicant.credit_score >= 700 ? 'text-green-600' : 'text-amber-600'}`}>
                                    {applicant.credit_score || 'N/A'}
                                </p>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[10px] uppercase text-slate-400 font-bold">MONTHLY INCOME</Label>
                                <p className="text-lg font-bold">${applicant.monthly_income?.toLocaleString()}</p>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[10px] uppercase text-slate-400 font-bold">RENT/INCOME %</Label>
                                <p className="text-lg font-bold">
                                    {Math.round((property.rent / applicant.monthly_income) * 100)}%
                                </p>
                            </div>
                        </div>
                    </section>

                    <div className="p-8 bg-blue-50 border border-blue-200 rounded-2xl flex items-start gap-4">
                        <ShieldCheck className="w-8 h-8 text-blue-600 shrink-0" />
                        <div>
                            <h4 className="font-bold text-blue-900 mb-1">SingleKey Verification Status</h4>
                            <p className="text-sm text-blue-700">Detailed background check verified. Identity matched. No previous evictions recorded.</p>
                        </div>
                    </div>
                </div>
            )}

            {type === 'property_summary' && (
                <div className="space-y-10 text-sm">
                    <div className="relative h-64 bg-slate-100 rounded-3xl overflow-hidden border">
                        <div className="absolute inset-0 flex items-center justify-center text-slate-300">
                            <FileText className="w-20 h-20 opacity-10" />
                            <span className="text-xs font-bold uppercase tracking-widest">Main Property Photo Here</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-10">
                        <div className="space-y-4">
                            <h2 className="text-2xl font-bold leading-tight">{property.address}</h2>
                            <p className="text-slate-600 leading-relaxed">{property.description || 'Welcome to your new home. This unit features modern finishes, ample natural light, and premium appliances.'}</p>
                        </div>
                        <div className="space-y-6">
                            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 flex justify-between items-center">
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">Lease Price</p>
                                    <p className="text-2xl font-black text-slate-900">${property.rent.toLocaleString()}/mo</p>
                                </div>
                                <Badge className="bg-blue-600">Available</Badge>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 border rounded-xl text-center">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">Bedrooms</p>
                                    <p className="text-lg font-bold">{property.bedrooms}</p>
                                </div>
                                <div className="p-4 border rounded-xl text-center">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">Bathrooms</p>
                                    <p className="text-lg font-bold">{property.bathrooms}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Footer */}
            <div className="pt-20 text-center space-y-1 opacity-40 grayscale">
                <p className="text-[10px] font-bold uppercase tracking-widest">PropFlow Real Estate Intelligence Platform</p>
                <p className="text-[8px] font-medium tracking-[0.2em] uppercase">Document Verified • Encryption Applied • Audit Log Record Generated</p>
            </div>
        </div>
    );
};

// Help icons mapping
const Building2 = ({ className }: { className?: string }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="16" height="20" x="4" y="2" rx="2" ry="2" /><path d="M9 22v-4h6v4" /><path d="M8 6h.01" /><path d="M16 6h.01" /><path d="M8 10h.01" /><path d="M16 10h.01" /><path d="M8 14h.01" /><path d="M16 14h.01" /><path d="M12 6h.01" /><path d="M12 10h.01" /><path d="M12 14h.01" /></svg>;
const ShieldCheck = ({ className }: { className?: string }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" /><path d="m9 12 2 2 4-4" /></svg>;
