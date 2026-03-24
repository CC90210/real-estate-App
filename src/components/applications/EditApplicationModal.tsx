'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import {
    Loader2, Edit, Calendar, User, Briefcase, DollarSign, Home,
    Shield, Car, PawPrint, Phone, Mail, MapPin, FileText,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAccentColor } from '@/lib/hooks/useAccentColor';
import { useUpdateApplication } from '@/lib/hooks/useApplications';
import { cn } from '@/lib/utils';

interface EditApplicationModalProps {
    application: any | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function EditApplicationModal({ application, open, onOpenChange }: EditApplicationModalProps) {
    const [isLoading, setIsLoading] = useState(false);
    const { colors } = useAccentColor();
    const updateMutation = useUpdateApplication();

    // Comprehensive form state matching all Application fields
    const [formData, setFormData] = useState({
        // Personal info
        applicant_name: '',
        applicant_email: '',
        applicant_phone: '',
        current_address: '',
        move_in_date: '',
        num_occupants: '1',

        // Employment & income
        employer: '',
        employment_status: '',
        employment_duration: '',
        monthly_income: '',
        combined_household_income: '',
        income_verified: false,

        // Financial
        credit_score: '',
        total_debt: '',
        dti_ratio: '',
        current_rent: '',

        // References
        current_landlord_name: '',
        current_landlord_phone: '',
        previous_addresses: '',

        // Lifestyle
        has_pets: false,
        pet_details: '',
        is_smoker: false,
        num_vehicles: '0',

        // Screening results
        criminal_check_passed: '',
        public_records_clear: '',
        background_check_passed: '',
        government_id_verified: false,

        // Notes & status
        additional_notes: '',
        status: '',
        denial_reason: '',
    });

    useEffect(() => {
        if (application && open) {
            setFormData({
                applicant_name: application.applicant_name || '',
                applicant_email: application.applicant_email || '',
                applicant_phone: application.applicant_phone || '',
                current_address: application.current_address || '',
                move_in_date: application.move_in_date || '',
                num_occupants: application.num_occupants?.toString() || '1',

                employer: application.employer || '',
                employment_status: application.employment_status || '',
                employment_duration: application.employment_duration || '',
                monthly_income: application.monthly_income?.toString() || '',
                combined_household_income: application.combined_household_income?.toString() || '',
                income_verified: application.income_verified || false,

                credit_score: application.credit_score?.toString() || '',
                total_debt: application.total_debt?.toString() || '',
                dti_ratio: application.dti_ratio?.toString() || '',
                current_rent: application.current_rent?.toString() || '',

                current_landlord_name: application.current_landlord_name || '',
                current_landlord_phone: application.current_landlord_phone || '',
                previous_addresses: application.previous_addresses || '',

                has_pets: application.has_pets || false,
                pet_details: application.pet_details || '',
                is_smoker: application.is_smoker || false,
                num_vehicles: application.num_vehicles?.toString() || '0',

                criminal_check_passed: application.criminal_check_passed === true ? 'true' : application.criminal_check_passed === false ? 'false' : '',
                public_records_clear: application.public_records_clear === true ? 'true' : application.public_records_clear === false ? 'false' : '',
                background_check_passed: application.background_check_passed === true ? 'true' : application.background_check_passed === false ? 'false' : '',
                government_id_verified: application.government_id_verified || false,

                additional_notes: application.additional_notes || application.notes || '',
                status: application.status || 'new',
                denial_reason: application.denial_reason || '',
            });
        }
    }, [application, open]);

    const handleSubmit = async () => {
        if (!application) return;

        if (!formData.applicant_name.trim()) {
            toast.error("Applicant name is required");
            return;
        }

        setIsLoading(true);
        try {
            const updateData: Record<string, unknown> = {
                applicant_name: formData.applicant_name,
                applicant_email: formData.applicant_email,
                applicant_phone: formData.applicant_phone,
                current_address: formData.current_address || null,
                move_in_date: formData.move_in_date || null,
                num_occupants: parseInt(formData.num_occupants) || 1,

                employer: formData.employer || null,
                employment_status: formData.employment_status || null,
                employment_duration: formData.employment_duration || null,
                monthly_income: parseFloat(formData.monthly_income) || null,
                combined_household_income: parseFloat(formData.combined_household_income) || null,
                income_verified: formData.income_verified,

                credit_score: parseInt(formData.credit_score) || null,
                total_debt: parseFloat(formData.total_debt) || null,
                current_rent: parseFloat(formData.current_rent) || null,

                current_landlord_name: formData.current_landlord_name || null,
                current_landlord_phone: formData.current_landlord_phone || null,
                previous_addresses: formData.previous_addresses || null,

                has_pets: formData.has_pets,
                pet_details: formData.pet_details || null,
                is_smoker: formData.is_smoker,
                num_vehicles: parseInt(formData.num_vehicles) || 0,

                government_id_verified: formData.government_id_verified,

                additional_notes: formData.additional_notes || null,
            };

            // Only set screening booleans if explicitly set
            if (formData.criminal_check_passed !== '') {
                updateData.criminal_check_passed = formData.criminal_check_passed === 'true';
            }
            if (formData.public_records_clear !== '') {
                updateData.public_records_clear = formData.public_records_clear === 'true';
            }
            if (formData.background_check_passed !== '') {
                updateData.background_check_passed = formData.background_check_passed === 'true';
            }

            // Compute DTI ratio if we have debt and income
            const monthlyInc = parseFloat(formData.monthly_income);
            const totalDebt = parseFloat(formData.total_debt);
            if (monthlyInc > 0 && totalDebt > 0) {
                updateData.dti_ratio = parseFloat(((totalDebt / (monthlyInc * 12)) * 100).toFixed(1));
            }

            // Handle status changes
            if (formData.status && formData.status !== application.status) {
                updateData.status = formData.status;
                if (formData.status === 'denied' && formData.denial_reason) {
                    updateData.denial_reason = formData.denial_reason;
                }
                if (formData.status === 'approved' || formData.status === 'denied') {
                    updateData.reviewed_at = new Date().toISOString();
                }
            }

            await updateMutation.mutateAsync({
                id: application.id,
                data: updateData,
            });
            onOpenChange(false);
        } catch {
            // Hook handles toast
        } finally {
            setIsLoading(false);
        }
    };

    const field = (key: string, value: string) => setFormData(prev => ({ ...prev, [key]: value }));
    const toggle = (key: string) => setFormData(prev => ({ ...prev, [key]: !(prev as any)[key] }));

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <div className={cn("flex items-center gap-2 font-black text-[10px] uppercase tracking-[0.2em] mb-1", colors.text)}>
                        <Edit className="h-3 w-3" />
                        <span>Application Management</span>
                    </div>
                    <DialogTitle className="text-2xl font-black text-slate-900 tracking-tight">
                        Edit Application
                    </DialogTitle>
                    <DialogDescription className="font-medium text-slate-500">
                        Update all applicant details, financial info, screening results, and notes.
                    </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="personal" className="mt-2">
                    <TabsList className="grid grid-cols-5 w-full">
                        <TabsTrigger value="personal" className="text-xs"><User className="h-3 w-3 mr-1" />Personal</TabsTrigger>
                        <TabsTrigger value="employment" className="text-xs"><Briefcase className="h-3 w-3 mr-1" />Employment</TabsTrigger>
                        <TabsTrigger value="financial" className="text-xs"><DollarSign className="h-3 w-3 mr-1" />Financial</TabsTrigger>
                        <TabsTrigger value="screening" className="text-xs"><Shield className="h-3 w-3 mr-1" />Screening</TabsTrigger>
                        <TabsTrigger value="lifestyle" className="text-xs"><Home className="h-3 w-3 mr-1" />Lifestyle</TabsTrigger>
                    </TabsList>

                    {/* ─── PERSONAL TAB ─── */}
                    <TabsContent value="personal" className="space-y-4 mt-4">
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-slate-500">Full Name</Label>
                            <Input
                                value={formData.applicant_name}
                                onChange={(e) => field('applicant_name', e.target.value)}
                                placeholder="John Doe"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-slate-500">Email</Label>
                                <Input
                                    type="email"
                                    value={formData.applicant_email}
                                    onChange={(e) => field('applicant_email', e.target.value)}
                                    placeholder="john@example.com"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-slate-500">Phone</Label>
                                <Input
                                    type="tel"
                                    value={formData.applicant_phone}
                                    onChange={(e) => field('applicant_phone', e.target.value)}
                                    placeholder="(555) 555-5555"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-slate-500">Current Address</Label>
                            <Input
                                value={formData.current_address}
                                onChange={(e) => field('current_address', e.target.value)}
                                placeholder="123 Main St, Toronto, ON"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-slate-500">Move-In Date</Label>
                                <Input
                                    type="date"
                                    value={formData.move_in_date}
                                    onChange={(e) => field('move_in_date', e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-slate-500">Number of Occupants</Label>
                                <Input
                                    type="number"
                                    min="1"
                                    value={formData.num_occupants}
                                    onChange={(e) => field('num_occupants', e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-slate-500">Previous Addresses (last 3)</Label>
                            <Textarea
                                value={formData.previous_addresses}
                                onChange={(e) => field('previous_addresses', e.target.value)}
                                placeholder="456 Oak Ave, Montreal, QC (2022-2024)&#10;789 Pine St, Ottawa, ON (2020-2022)"
                                rows={3}
                            />
                        </div>
                    </TabsContent>

                    {/* ─── EMPLOYMENT TAB ─── */}
                    <TabsContent value="employment" className="space-y-4 mt-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-slate-500">Employer</Label>
                                <Input
                                    value={formData.employer}
                                    onChange={(e) => field('employer', e.target.value)}
                                    placeholder="TD Bank Financial Group"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-slate-500">Employment Status</Label>
                                <Select value={formData.employment_status} onValueChange={(v) => field('employment_status', v)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="full-time">Full-time</SelectItem>
                                        <SelectItem value="part-time">Part-time</SelectItem>
                                        <SelectItem value="self-employed">Self-employed</SelectItem>
                                        <SelectItem value="contract">Contract</SelectItem>
                                        <SelectItem value="retired">Retired</SelectItem>
                                        <SelectItem value="student">Student</SelectItem>
                                        <SelectItem value="unemployed">Unemployed</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-slate-500">Employment Duration</Label>
                                <Input
                                    value={formData.employment_duration}
                                    onChange={(e) => field('employment_duration', e.target.value)}
                                    placeholder="3 years"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-slate-500">Monthly Income ($)</Label>
                                <Input
                                    type="number"
                                    value={formData.monthly_income}
                                    onChange={(e) => field('monthly_income', e.target.value)}
                                    placeholder="6500"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-slate-500">Combined Household Income ($/mo)</Label>
                                <Input
                                    type="number"
                                    value={formData.combined_household_income}
                                    onChange={(e) => field('combined_household_income', e.target.value)}
                                    placeholder="9000"
                                />
                            </div>
                            <div className="flex items-center gap-3 pt-6">
                                <Switch
                                    checked={formData.income_verified}
                                    onCheckedChange={() => toggle('income_verified')}
                                />
                                <Label className="text-xs font-bold text-slate-500">Income Verified</Label>
                            </div>
                        </div>

                        {/* Rental references */}
                        <div className="border-t pt-4 mt-4">
                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Rental Reference</p>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-slate-500">Current Landlord Name</Label>
                                    <Input
                                        value={formData.current_landlord_name}
                                        onChange={(e) => field('current_landlord_name', e.target.value)}
                                        placeholder="Jane Smith"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-slate-500">Current Landlord Phone</Label>
                                    <Input
                                        type="tel"
                                        value={formData.current_landlord_phone}
                                        onChange={(e) => field('current_landlord_phone', e.target.value)}
                                        placeholder="(555) 555-1234"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2 mt-4">
                                <Label className="text-xs font-bold text-slate-500">Current Rent ($/mo)</Label>
                                <Input
                                    type="number"
                                    value={formData.current_rent}
                                    onChange={(e) => field('current_rent', e.target.value)}
                                    placeholder="1800"
                                />
                            </div>
                        </div>
                    </TabsContent>

                    {/* ─── FINANCIAL TAB ─── */}
                    <TabsContent value="financial" className="space-y-4 mt-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-slate-500">Credit Score</Label>
                                <Input
                                    type="number"
                                    min="300"
                                    max="900"
                                    value={formData.credit_score}
                                    onChange={(e) => field('credit_score', e.target.value)}
                                    placeholder="720"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-slate-500">Total Outstanding Debt ($)</Label>
                                <Input
                                    type="number"
                                    value={formData.total_debt}
                                    onChange={(e) => field('total_debt', e.target.value)}
                                    placeholder="15000"
                                />
                            </div>
                        </div>

                        {/* Auto-computed DTI display */}
                        {formData.monthly_income && formData.total_debt && (
                            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Computed Ratios</p>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-xs text-slate-500 font-medium">DTI Ratio</p>
                                        <p className="text-lg font-black text-slate-900">
                                            {((parseFloat(formData.total_debt) / (parseFloat(formData.monthly_income) * 12)) * 100).toFixed(1)}%
                                        </p>
                                        <p className="text-[10px] text-slate-400">Debt / Annual Income</p>
                                    </div>
                                    {application?.property?.rent && (
                                        <div>
                                            <p className="text-xs text-slate-500 font-medium">Income-to-Rent</p>
                                            <p className="text-lg font-black text-slate-900">
                                                {(parseFloat(formData.monthly_income) / application.property.rent).toFixed(1)}x
                                            </p>
                                            <p className="text-[10px] text-slate-400">Monthly Income / Rent</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Application status */}
                        <div className="border-t pt-4 mt-4">
                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Application Status</p>
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-slate-500">Status</Label>
                                <Select value={formData.status} onValueChange={(v) => field('status', v)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="new">New</SelectItem>
                                        <SelectItem value="screening">Under Screening</SelectItem>
                                        <SelectItem value="approved">Approved</SelectItem>
                                        <SelectItem value="denied">Denied</SelectItem>
                                        <SelectItem value="withdrawn">Withdrawn</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            {formData.status === 'denied' && (
                                <div className="space-y-2 mt-3">
                                    <Label className="text-xs font-bold text-slate-500">Denial Reason</Label>
                                    <Textarea
                                        value={formData.denial_reason}
                                        onChange={(e) => field('denial_reason', e.target.value)}
                                        placeholder="Reason for denial..."
                                        rows={2}
                                    />
                                </div>
                            )}
                        </div>
                    </TabsContent>

                    {/* ─── SCREENING TAB ─── */}
                    <TabsContent value="screening" className="space-y-4 mt-4">
                        <p className="text-xs text-slate-500 font-medium">
                            These fields are typically populated automatically from screening report uploads,
                            but can be manually adjusted.
                        </p>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-slate-500">Criminal Check</Label>
                                <Select value={formData.criminal_check_passed} onValueChange={(v) => field('criminal_check_passed', v)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Not checked" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="true">Passed (Clear)</SelectItem>
                                        <SelectItem value="false">Failed (Records Found)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-slate-500">Public Records</Label>
                                <Select value={formData.public_records_clear} onValueChange={(v) => field('public_records_clear', v)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Not checked" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="true">Clear</SelectItem>
                                        <SelectItem value="false">Records Found</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-slate-500">Background Check</Label>
                                <Select value={formData.background_check_passed} onValueChange={(v) => field('background_check_passed', v)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Not checked" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="true">Passed</SelectItem>
                                        <SelectItem value="false">Failed</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex items-center gap-3 pt-6">
                                <Switch
                                    checked={formData.government_id_verified}
                                    onCheckedChange={() => toggle('government_id_verified')}
                                />
                                <Label className="text-xs font-bold text-slate-500">Government ID Verified</Label>
                            </div>
                        </div>
                    </TabsContent>

                    {/* ─── LIFESTYLE TAB ─── */}
                    <TabsContent value="lifestyle" className="space-y-4 mt-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex items-center gap-3">
                                <Switch
                                    checked={formData.has_pets}
                                    onCheckedChange={() => toggle('has_pets')}
                                />
                                <Label className="text-xs font-bold text-slate-500">Has Pets</Label>
                            </div>
                            <div className="flex items-center gap-3">
                                <Switch
                                    checked={formData.is_smoker}
                                    onCheckedChange={() => toggle('is_smoker')}
                                />
                                <Label className="text-xs font-bold text-slate-500">Smoker</Label>
                            </div>
                        </div>
                        {formData.has_pets && (
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-slate-500">Pet Details</Label>
                                <Input
                                    value={formData.pet_details}
                                    onChange={(e) => field('pet_details', e.target.value)}
                                    placeholder="1 small dog (Poodle, 15 lbs)"
                                />
                            </div>
                        )}
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-slate-500">Number of Vehicles</Label>
                            <Input
                                type="number"
                                min="0"
                                value={formData.num_vehicles}
                                onChange={(e) => field('num_vehicles', e.target.value)}
                            />
                        </div>

                        <div className="border-t pt-4 mt-4">
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-slate-500">Additional Notes</Label>
                                <Textarea
                                    value={formData.additional_notes}
                                    onChange={(e) => field('additional_notes', e.target.value)}
                                    placeholder="Referral details, move-in preferences, special requirements..."
                                    rows={4}
                                />
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>

                <DialogFooter className="gap-2 mt-4">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={isLoading}
                        className={cn("text-white", colors.bg, `hover:${colors.bgHover}`)}
                    >
                        {isLoading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                        Save Changes
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
