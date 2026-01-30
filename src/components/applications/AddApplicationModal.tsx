'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

export function AddApplicationModal() {
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [properties, setProperties] = useState<any[]>([]);
    const supabase = createClient();
    const router = useRouter();

    const [formData, setFormData] = useState({
        property_id: '',
        applicant_name: '',
        applicant_email: '',
        monthly_income: '',
        credit_score: '',
        notes: ''
    });

    useEffect(() => {
        if (open) {
            fetchProperties();
        }
    }, [open]);

    const fetchProperties = async () => {
        const { data } = await supabase
            .from('properties')
            .select('id, address, unit_number, rent')
            .eq('status', 'available')
            .order('address');

        if (data) setProperties(data);
    };

    const handleSubmit = async () => {
        if (!formData.property_id) {
            toast.error("Please select a property");
            return;
        }

        setIsLoading(true);
        try {
            const { error } = await supabase
                .from('applications')
                .insert({
                    property_id: formData.property_id,
                    applicant_name: formData.applicant_name,
                    applicant_email: formData.applicant_email,
                    monthly_income: parseFloat(formData.monthly_income),
                    credit_score: parseInt(formData.credit_score),
                    notes: formData.notes,
                    status: 'pending'
                });

            if (error) throw error;

            toast.success("Application added successfully!");
            setOpen(false);
            setFormData({
                property_id: '',
                applicant_name: '',
                applicant_email: '',
                monthly_income: '',
                credit_score: '',
                notes: ''
            });
            router.refresh();
        } catch (error: any) {
            toast.error("Failed to add application: " + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Application
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Add New Application</DialogTitle>
                    <DialogDescription>
                        Directly enter a new tenant application into the system.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Select Property *</Label>
                        <Select
                            value={formData.property_id}
                            onValueChange={(v) => setFormData({ ...formData, property_id: v })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select an available unit" />
                            </SelectTrigger>
                            <SelectContent>
                                {properties.map((p) => (
                                    <SelectItem key={p.id} value={p.id}>
                                        {p.address} (Unit {p.unit_number}) - ${p.rent}/mo
                                    </SelectItem>
                                ))}
                                {properties.length === 0 && (
                                    <div className="p-2 text-xs text-slate-500 text-center italic">No available units found</div>
                                )}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Applicant Name *</Label>
                        <Input
                            value={formData.applicant_name}
                            onChange={(e) => setFormData({ ...formData, applicant_name: e.target.value })}
                            placeholder="Full name"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Email Address *</Label>
                        <Input
                            type="email"
                            value={formData.applicant_email}
                            onChange={(e) => setFormData({ ...formData, applicant_email: e.target.value })}
                            placeholder="email@example.com"
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
                        </div>
                        <div className="space-y-2">
                            <Label>Credit Score</Label>
                            <Input
                                type="number"
                                value={formData.credit_score}
                                onChange={(e) => setFormData({ ...formData, credit_score: e.target.value })}
                                placeholder="700"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Internal Notes</Label>
                        <Textarea
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            placeholder="Initial thoughts, referral info..."
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={isLoading || !formData.property_id || !formData.applicant_name}
                        className="bg-blue-600 hover:bg-blue-700"
                    >
                        {isLoading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                        Submit Application
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
