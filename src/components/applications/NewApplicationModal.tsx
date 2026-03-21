'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
    FilePlus,
    Loader2,
    AlertTriangle,
    ClipboardList,
    User,
    Briefcase,
    Home,
    CreditCard,
    Heart,
    StickyNote,
    CheckCircle2,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { useAccentColor } from '@/lib/hooks/useAccentColor';
import { useCompanyId } from '@/lib/hooks/useCompanyId';
import { useCreateApplication } from '@/lib/hooks/useApplications';
import { cn } from '@/lib/utils';

const EMPLOYMENT_STATUS_OPTIONS = [
    { value: 'full_time', label: 'Full-time' },
    { value: 'part_time', label: 'Part-time' },
    { value: 'self_employed', label: 'Self-employed' },
    { value: 'retired', label: 'Retired' },
    { value: 'student', label: 'Student' },
    { value: 'unemployed', label: 'Unemployed' },
];

const EMPTY_FORM = {
    // Section 1 – Basic Info
    applicant_name: '',
    applicant_email: '',
    applicant_phone: '',
    move_in_date: '',

    // Section 2 – Employment & Income
    employment_status: '',
    employer_name: '',
    employment_duration: '',
    monthly_income: '',
    combined_household_income: '',

    // Section 3 – Current Living Situation
    current_address: '',
    current_rent: '',
    current_landlord_name: '',
    current_landlord_phone: '',

    // Section 4 – Financial
    credit_score: '',
    total_debt: '',

    // Section 5 – Lifestyle
    num_occupants: '1',
    has_pets: false,
    pet_details: '',
    num_vehicles: '',
    is_smoker: false,

    // Section 6 – Notes
    notes: '',
};

type FormData = typeof EMPTY_FORM;

interface SectionHeaderProps {
    icon: React.ReactNode;
    title: string;
}

function SectionHeader({ icon, title }: SectionHeaderProps) {
    return (
        <div className="flex items-center gap-2 pt-2">
            <div className="flex items-center gap-2 text-slate-500">
                <span className="w-4 h-4 flex-shrink-0">{icon}</span>
                <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400">{title}</span>
            </div>
            <div className="flex-1 h-px bg-slate-100" />
        </div>
    );
}

export function NewApplicationModal({ propertyId }: { propertyId: string }) {
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [property, setProperty] = useState<{ id: string; address: string; rent: number; deposit: number | null; status: string } | null>(null);
    const supabase = createClient();
    const { colors } = useAccentColor();
    const { companyId } = useCompanyId();
    const { mutate: createApplication } = useCreateApplication();

    const [formData, setFormData] = useState<FormData>(EMPTY_FORM);

    useEffect(() => {
        if (open && propertyId) {
            fetchProperty();
        }
    }, [open, propertyId]);

    const fetchProperty = async () => {
        const { data } = await supabase
            .from('properties')
            .select('id, address, rent, deposit, status')
            .eq('id', propertyId)
            .single();

        if (data) {
            setProperty(data);
        }
    };

    const set = (field: keyof FormData) => (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => setFormData((prev) => ({ ...prev, [field]: e.target.value }));

    const setSelect = (field: keyof FormData) => (value: string) =>
        setFormData((prev) => ({ ...prev, [field]: value }));

    const setCheck = (field: keyof FormData) => (checked: boolean | 'indeterminate') =>
        setFormData((prev) => ({ ...prev, [field]: checked === true }));

    // Rent-to-income ratio uses combined income when available, falls back to individual
    const effectiveIncome =
        parseFloat(formData.combined_household_income) ||
        parseFloat(formData.monthly_income) ||
        0;

    const rentToIncomeRatio =
        property && effectiveIncome > 0
            ? (property.rent / effectiveIncome) * 100
            : null;

    // DTI: monthly debt payments as a percentage of gross monthly income
    const totalDebtNum = parseFloat(formData.total_debt) || 0;
    const dtiRatio =
        effectiveIncome > 0 && totalDebtNum > 0
            ? (totalDebtNum / effectiveIncome) * 100
            : null;

    const handleSubmit = async () => {
        if (!formData.applicant_phone) {
            toast.error('Phone number is required');
            return;
        }

        setIsLoading(true);
        try {
            createApplication(
                {
                    property_id: propertyId,

                    // Basic
                    applicant_name: formData.applicant_name,
                    applicant_email: formData.applicant_email,
                    applicant_phone: formData.applicant_phone,
                    move_in_date: formData.move_in_date || undefined,

                    // Employment & Income
                    employment_status: formData.employment_status || undefined,
                    employer_name: formData.employer_name || undefined,
                    employment_duration: formData.employment_duration || undefined,
                    monthly_income: parseFloat(formData.monthly_income) || undefined,
                    combined_household_income: parseFloat(formData.combined_household_income) || undefined,

                    // Living Situation
                    current_address: formData.current_address || undefined,
                    current_rent: parseFloat(formData.current_rent) || undefined,
                    current_landlord_name: formData.current_landlord_name || undefined,
                    current_landlord_phone: formData.current_landlord_phone || undefined,

                    // Financial
                    credit_score: parseInt(formData.credit_score) || undefined,
                    total_debt: parseFloat(formData.total_debt) || undefined,

                    // Lifestyle
                    num_occupants: parseInt(formData.num_occupants) || 1,
                    has_pets: formData.has_pets,
                    pet_details: formData.has_pets ? (formData.pet_details || undefined) : undefined,
                    num_vehicles: parseInt(formData.num_vehicles) || undefined,
                    is_smoker: formData.is_smoker,

                    // Notes
                    notes: formData.notes || undefined,
                },
                {
                    onSuccess: () => {
                        toast.success('Application created successfully!');
                        setOpen(false);
                        setFormData(EMPTY_FORM);
                        setIsLoading(false);
                    },
                    onError: (error) => {
                        toast.error('Failed to create application: ' + error.message);
                        setIsLoading(false);
                    },
                }
            );
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            toast.error('Failed to create application: ' + message);
            setIsLoading(false);
        }
    };

    const isOccupied = property?.status === 'rented' || property?.status === 'maintenance';

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    variant="outline"
                    className={cn('rounded-full bg-white transition-all', `hover:${colors.bgLight}`, colors.border)}
                >
                    <FilePlus className={cn('w-4 h-4 mr-2', colors.text)} />
                    New Application
                </Button>
            </DialogTrigger>

            <DialogContent className="max-w-lg max-h-[90dvh] flex flex-col p-0 gap-0">
                {/* Header */}
                <DialogHeader className="px-6 pt-6 pb-4 flex-shrink-0">
                    <div className={cn('flex items-center gap-2 font-black text-[10px] uppercase tracking-[0.2em] mb-1', colors.text)}>
                        <ClipboardList className="h-3 w-3" />
                        <span>Vetting Process</span>
                    </div>
                    <DialogTitle className="text-2xl font-black text-slate-900 tracking-tight">New Tenant Application</DialogTitle>
                    <DialogDescription className="font-medium text-slate-500">
                        Manually enter applicant details for screening.
                    </DialogDescription>
                </DialogHeader>

                {/* Scrollable body */}
                <div className="flex-1 overflow-y-auto px-6 pb-4 overscroll-contain">

                    {/* Property Summary */}
                    {property && (
                        <div className="bg-slate-50 p-3 rounded-md text-sm border mb-3">
                            <p className="font-semibold text-slate-900">{property.address}</p>
                            <div className="flex gap-4 text-slate-500 mt-1">
                                <span>Rent: ${property.rent}/mo</span>
                                <span>Deposit: ${property.deposit ?? property.rent}</span>
                            </div>
                        </div>
                    )}

                    {isOccupied && (
                        <Alert variant="destructive" className="mb-3">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>Warning: Property Occupied</AlertTitle>
                            <AlertDescription>
                                This unit is currently marked as <strong>{property?.status}</strong>. Proceeding may create conflicts.
                            </AlertDescription>
                        </Alert>
                    )}

                    <div className="space-y-4 py-1">

                        {/* ── Section 1: Basic Info ── */}
                        <SectionHeader icon={<User className="w-4 h-4" />} title="Basic Info" />

                        <div className="space-y-2">
                            <Label>Applicant Name</Label>
                            <Input
                                value={formData.applicant_name}
                                onChange={set('applicant_name')}
                                placeholder="John Doe"
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Email Address</Label>
                                <Input
                                    type="email"
                                    value={formData.applicant_email}
                                    onChange={set('applicant_email')}
                                    placeholder="john@example.com"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>
                                    Phone Number <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    type="tel"
                                    value={formData.applicant_phone}
                                    onChange={set('applicant_phone')}
                                    placeholder="(555) 555-5555"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Move-In Target</Label>
                            <Input
                                type="date"
                                value={formData.move_in_date}
                                onChange={set('move_in_date')}
                            />
                        </div>

                        {/* ── Section 2: Employment & Income ── */}
                        <SectionHeader icon={<Briefcase className="w-4 h-4" />} title="Employment & Income" />

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Employment Status</Label>
                                <Select value={formData.employment_status} onValueChange={setSelect('employment_status')}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {EMPLOYMENT_STATUS_OPTIONS.map((opt) => (
                                            <SelectItem key={opt.value} value={opt.value}>
                                                {opt.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Employer Name</Label>
                                <Input
                                    value={formData.employer_name}
                                    onChange={set('employer_name')}
                                    placeholder="Acme Corp"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Employment Duration</Label>
                            <Input
                                value={formData.employment_duration}
                                onChange={set('employment_duration')}
                                placeholder='e.g. "2 years", "6 months"'
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Monthly Income</Label>
                                <Input
                                    type="number"
                                    min="0"
                                    value={formData.monthly_income}
                                    onChange={set('monthly_income')}
                                    placeholder="5000"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Combined Household Income</Label>
                                <Input
                                    type="number"
                                    min="0"
                                    value={formData.combined_household_income}
                                    onChange={set('combined_household_income')}
                                    placeholder="8000"
                                />
                            </div>
                        </div>

                        {/* Rent-to-Income ratio */}
                        {rentToIncomeRatio !== null && (
                            <div className={cn(
                                'flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-md animate-in fade-in',
                                rentToIncomeRatio > 35
                                    ? 'bg-red-50 text-red-600 border border-red-200'
                                    : 'bg-green-50 text-green-700 border border-green-200'
                            )}>
                                {rentToIncomeRatio > 35
                                    ? <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                                    : <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                                }
                                <span>
                                    {rentToIncomeRatio > 35 ? 'High Risk' : 'Safe'} Rent-to-Income Ratio:{' '}
                                    <strong>{rentToIncomeRatio.toFixed(1)}%</strong>
                                    {formData.combined_household_income && ' (household)'}
                                </span>
                            </div>
                        )}

                        {/* ── Section 3: Current Living Situation ── */}
                        <SectionHeader icon={<Home className="w-4 h-4" />} title="Current Living Situation" />

                        <div className="space-y-2">
                            <Label>Current Address</Label>
                            <Input
                                value={formData.current_address}
                                onChange={set('current_address')}
                                placeholder="123 Main St, City, State"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Current Monthly Rent</Label>
                            <Input
                                type="number"
                                min="0"
                                value={formData.current_rent}
                                onChange={set('current_rent')}
                                placeholder="1500"
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Current Landlord Name</Label>
                                <Input
                                    value={formData.current_landlord_name}
                                    onChange={set('current_landlord_name')}
                                    placeholder="Jane Smith"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Current Landlord Phone</Label>
                                <Input
                                    type="tel"
                                    value={formData.current_landlord_phone}
                                    onChange={set('current_landlord_phone')}
                                    placeholder="(555) 555-5555"
                                />
                            </div>
                        </div>

                        {/* ── Section 4: Financial ── */}
                        <SectionHeader icon={<CreditCard className="w-4 h-4" />} title="Financial" />

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Credit Score (300–900)</Label>
                                <Input
                                    type="number"
                                    min="300"
                                    max="900"
                                    value={formData.credit_score}
                                    onChange={set('credit_score')}
                                    placeholder="720"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Total Outstanding Debt</Label>
                                <Input
                                    type="number"
                                    min="0"
                                    value={formData.total_debt}
                                    onChange={set('total_debt')}
                                    placeholder="12000"
                                />
                            </div>
                        </div>

                        {/* DTI display */}
                        {dtiRatio !== null && (
                            <div className={cn(
                                'flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-md animate-in fade-in',
                                dtiRatio > 43
                                    ? 'bg-red-50 text-red-600 border border-red-200'
                                    : dtiRatio > 36
                                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                        : 'bg-green-50 text-green-700 border border-green-200'
                            )}>
                                {dtiRatio > 43
                                    ? <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                                    : <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                                }
                                <span>
                                    Debt-to-Income (DTI): <strong>{dtiRatio.toFixed(1)}%</strong>
                                    {dtiRatio > 43
                                        ? ' — exceeds standard 43% threshold'
                                        : dtiRatio > 36
                                            ? ' — moderate risk'
                                            : ' — within healthy range'}
                                </span>
                            </div>
                        )}

                        {/* ── Section 5: Lifestyle ── */}
                        <SectionHeader icon={<Heart className="w-4 h-4" />} title="Lifestyle" />

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Number of Occupants</Label>
                                <Input
                                    type="number"
                                    min="1"
                                    value={formData.num_occupants}
                                    onChange={set('num_occupants')}
                                    placeholder="1"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Number of Vehicles</Label>
                                <Input
                                    type="number"
                                    min="0"
                                    value={formData.num_vehicles}
                                    onChange={set('num_vehicles')}
                                    placeholder="1"
                                />
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center gap-3 py-1">
                                <Checkbox
                                    id="has_pets"
                                    checked={formData.has_pets}
                                    onCheckedChange={setCheck('has_pets')}
                                />
                                <Label htmlFor="has_pets" className="cursor-pointer font-medium">
                                    Has Pets
                                </Label>
                            </div>

                            {formData.has_pets && (
                                <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
                                    <Label>Pet Details</Label>
                                    <Input
                                        value={formData.pet_details}
                                        onChange={set('pet_details')}
                                        placeholder='e.g. "1 dog, 25 lbs, golden retriever"'
                                    />
                                </div>
                            )}

                            <div className="flex items-center gap-3 py-1">
                                <Checkbox
                                    id="is_smoker"
                                    checked={formData.is_smoker}
                                    onCheckedChange={setCheck('is_smoker')}
                                />
                                <Label htmlFor="is_smoker" className="cursor-pointer font-medium">
                                    Smoker
                                </Label>
                            </div>
                        </div>

                        {/* ── Section 6: Notes ── */}
                        <SectionHeader icon={<StickyNote className="w-4 h-4" />} title="Notes" />

                        <div className="space-y-2">
                            <Label>Additional Notes</Label>
                            <Textarea
                                value={formData.notes}
                                onChange={set('notes')}
                                placeholder="Referral details, move-in preferences, special circumstances..."
                                rows={3}
                            />
                        </div>

                    </div>
                </div>

                {/* Sticky footer */}
                <div className="flex justify-end gap-2 px-6 py-4 border-t bg-white flex-shrink-0">
                    <Button variant="outline" onClick={() => setOpen(false)}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={isLoading}
                        className={cn('text-white', colors.bg, `hover:${colors.bgHover}`)}
                    >
                        {isLoading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                        Create Application
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
