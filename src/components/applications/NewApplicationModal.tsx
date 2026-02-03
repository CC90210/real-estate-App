'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { FilePlus, Loader2, AlertTriangle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { useAccentColor } from '@/lib/hooks/useAccentColor';
import { useCompanyId } from '@/lib/hooks/useCompanyId';
import { cn } from '@/lib/utils';
import { ClipboardList } from 'lucide-react';

export function NewApplicationModal({ propertyId }: { propertyId: string }) {
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [property, setProperty] = useState<any>(null);
    const supabase = createClient();
    const { colors } = useAccentColor();
    const { companyId } = useCompanyId();

    // Form State
    const [formData, setFormData] = useState({
        applicant_name: '',
        applicant_email: '',
        monthly_income: '',
        credit_score: '',
        notes: ''
    });

    useEffect(() => {
        if (open && propertyId) {
            fetchProperty();
        }
    }, [open, propertyId]);

    const fetchProperty = async () => {
        const { data, error } = await supabase
            .from('properties')
            .select('*')
            .eq('id', propertyId)
            .single();

        if (data) {
            setProperty(data);
        }
    };

    const handleSubmit = async () => {
        setIsLoading(true);
        try {
            const { error } = await supabase
                .from('applications')
                .insert({
                    property_id: propertyId,
                    company_id: companyId,
                    applicant_name: formData.applicant_name,
                    applicant_email: formData.applicant_email,
                    monthly_income: parseFloat(formData.monthly_income),
                    credit_score: parseInt(formData.credit_score),
                    notes: formData.notes,
                    status: 'pending'
                });

            if (error) throw error;

            toast.success("Application created successfully!");
            setOpen(false);
            setFormData({ applicant_name: '', applicant_email: '', monthly_income: '', credit_score: '', notes: '' });
        } catch (error: any) {
            toast.error("Failed to create application: " + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const isOccupied = property?.status === 'rented' || property?.status === 'maintenance';

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    variant="outline"
                    className={cn("rounded-full bg-white transition-all", `hover:${colors.bgLight}`, colors.border)}
                >
                    <FilePlus className={cn("w-4 h-4 mr-2", colors.text)} />
                    New Application
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <div className={cn("flex items-center gap-2 font-black text-[10px] uppercase tracking-[0.2em] mb-1", colors.text)}>
                        <ClipboardList className="h-3 w-3" />
                        <span>Vetting Process</span>
                    </div>
                    <DialogTitle className="text-2xl font-black text-slate-900 tracking-tight">New Tenant Application</DialogTitle>
                    <DialogDescription className="font-medium text-slate-500">
                        Manually enter applicant details for screening.
                    </DialogDescription>
                </DialogHeader>

                {property && (
                    <div className="bg-slate-50 p-3 rounded-md text-sm border mb-2">
                        <p className="font-semibold text-slate-900">{property.address}</p>
                        <div className="flex gap-4 text-slate-500 mt-1">
                            <span>Rent: ${property.rent}/mo</span>
                            <span>Deposit: ${property.deposit || property.rent}</span>
                        </div>
                    </div>
                )}

                {isOccupied && (
                    <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Warning: Property Occupied</AlertTitle>
                        <AlertDescription>
                            This unit is currently marked as <strong>{property.status}</strong>. Proceeding may create conflicts.
                        </AlertDescription>
                    </Alert>
                )}

                <div className="space-y-4 py-2">
                    <div className="space-y-2">
                        <Label>Applicant Name</Label>
                        <Input
                            value={formData.applicant_name}
                            onChange={(e) => setFormData({ ...formData, applicant_name: e.target.value })}
                            placeholder="John Doe"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Email Address</Label>
                        <Input
                            type="email"
                            value={formData.applicant_email}
                            onChange={(e) => setFormData({ ...formData, applicant_email: e.target.value })}
                            placeholder="john@example.com"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Monthly Income</Label>
                            <Input
                                type="number"
                                value={formData.monthly_income}
                                onChange={(e) => setFormData({ ...formData, monthly_income: e.target.value })}
                                placeholder="5000"
                            />
                            {property && formData.monthly_income && !isNaN(parseFloat(formData.monthly_income)) && (
                                (() => {
                                    const income = parseFloat(formData.monthly_income);
                                    const rent = property.rent;
                                    const ratio = (rent / income) * 100;
                                    const isHighRisk = ratio > 35;

                                    if (isHighRisk) {
                                        return (
                                            <div className="text-xs text-red-600 font-medium flex items-center gap-1 mt-1 animate-in fade-in">
                                                <AlertTriangle className="w-3 h-3" />
                                                High Risk: {ratio.toFixed(1)}% Rent/Income
                                            </div>
                                        )
                                    }
                                    return (
                                        <div className="text-xs text-green-600 font-medium flex items-center gap-1 mt-1 animate-in fade-in">
                                            Safe Ratio: {ratio.toFixed(1)}%
                                        </div>
                                    )
                                })()
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label>Credit Score</Label>
                            <Input
                                type="number"
                                value={formData.credit_score}
                                onChange={(e) => setFormData({ ...formData, credit_score: e.target.value })}
                                placeholder="720"
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>Notes</Label>
                        <Textarea
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            placeholder="Referral details, move-in preferences..."
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={isLoading}
                        className={cn("text-white", colors.bg, `hover:${colors.bgHover}`)}
                    >
                        {isLoading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                        Create Application
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
