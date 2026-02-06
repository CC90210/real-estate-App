'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Edit, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { useAccentColor } from '@/lib/hooks/useAccentColor';
import { useUpdateApplication } from '@/lib/hooks/useApplications';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface EditApplicationModalProps {
    application: any | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function EditApplicationModal({ application, open, onOpenChange }: EditApplicationModalProps) {
    const [isLoading, setIsLoading] = useState(false);
    const { colors } = useAccentColor();
    const updateMutation = useUpdateApplication();

    // Form State
    const [formData, setFormData] = useState({
        applicant_name: '',
        applicant_email: '',
        applicant_phone: '',
        monthly_income: '',
        credit_score: '',
        notes: '',
        move_in_date: ''
    });

    useEffect(() => {
        if (application) {
            setFormData({
                applicant_name: application.applicant_name || '',
                applicant_email: application.applicant_email || '',
                applicant_phone: application.applicant_phone || '',
                monthly_income: application.monthly_income ? application.monthly_income.toString() : '',
                credit_score: application.credit_score ? application.credit_score.toString() : '',
                notes: application.notes || '',
                move_in_date: application.move_in_date || ''
            });
        }
    }, [application, open]);

    const handleSubmit = async () => {
        if (!application) return;

        if (!formData.applicant_phone) {
            toast.error("Phone number is required");
            return;
        }

        setIsLoading(true);
        try {
            await updateMutation.mutateAsync({
                id: application.id,
                data: {
                    applicant_name: formData.applicant_name,
                    applicant_email: formData.applicant_email,
                    applicant_phone: formData.applicant_phone,
                    monthly_income: parseFloat(formData.monthly_income) || undefined,
                    credit_score: parseInt(formData.credit_score) || undefined,
                    notes: formData.notes,
                    move_in_date: formData.move_in_date || undefined
                }
            });
            onOpenChange(false);
            setIsLoading(false);
        } catch (error: any) {
            // Error handling is done in usage of mutation if needed, but hook handles toast
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <div className={cn("flex items-center gap-2 font-black text-[10px] uppercase tracking-[0.2em] mb-1", colors.text)}>
                        <Edit className="h-3 w-3" />
                        <span>Management</span>
                    </div>
                    <DialogTitle className="text-2xl font-black text-slate-900 tracking-tight">Edit Application</DialogTitle>
                    <DialogDescription className="font-medium text-slate-500">
                        Update applicant details and target dates.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    <div className="space-y-2">
                        <Label>Applicant Name</Label>
                        <Input
                            value={formData.applicant_name}
                            onChange={(e) => setFormData({ ...formData, applicant_name: e.target.value })}
                            placeholder="John Doe"
                        />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Email Address</Label>
                            <Input
                                type="email"
                                value={formData.applicant_email}
                                onChange={(e) => setFormData({ ...formData, applicant_email: e.target.value })}
                                placeholder="john@example.com"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Phone Number</Label>
                            <Input
                                type="tel"
                                value={formData.applicant_phone}
                                onChange={(e) => setFormData({ ...formData, applicant_phone: e.target.value })}
                                placeholder="(555) 555-5555"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Move-In Target</Label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                <Input
                                    type="date"
                                    className="pl-9"
                                    value={formData.move_in_date}
                                    onChange={(e) => setFormData({ ...formData, move_in_date: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Monthly Income</Label>
                            <Input
                                type="number"
                                value={formData.monthly_income}
                                onChange={(e) => setFormData({ ...formData, monthly_income: e.target.value })}
                                placeholder="5000"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
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

                <DialogFooter className="gap-2">
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
