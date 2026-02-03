'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCreateApplication } from '@/lib/hooks/useApplications';
import { useUser } from '@/lib/hooks/useUser';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { ApplicationFormData } from '@/types/database';

const STEPS = [
    { id: 1, title: 'Basics' },
    { id: 2, title: 'Employment' },
    { id: 3, title: 'Details' },
    { id: 4, title: 'Review' }
];

export default function NewApplicationPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const propertyId = searchParams.get('propertyId');
    const { user, role } = useUser();
    const { mutate: createApplication, isPending } = useCreateApplication();

    const [currentStep, setCurrentStep] = useState(1);
    const [formData, setFormData] = useState<ApplicationFormData>({
        applicant_name: '',
        applicant_email: '',
        applicant_phone: '',
        current_address: '',
        employer: '',
        monthly_income: undefined,
        move_in_date: '',
        num_occupants: 1,
        has_pets: false,
        pet_details: '',
        additional_notes: '',
    });

    if (!propertyId) {
        return (
            <div className="text-center py-20">
                <h2 className="text-xl font-semibold mb-4">No Property Selected</h2>
                <Button onClick={() => router.push('/areas')}>Select a Property First</Button>
            </div>
        );
    }

    const handleNext = () => {
        // Basic validation based on step
        if (currentStep === 1) {
            if (!formData.applicant_name || !formData.applicant_email || !formData.applicant_phone) {
                toast.error('Please fill in all required fields');
                return;
            }
        }
        setCurrentStep((prev) => Math.min(prev + 1, 4));
    };

    const handleBack = () => {
        setCurrentStep((prev) => Math.max(prev - 1, 1));
    };

    const handleSubmit = () => {
        if (!user) return;

        createApplication(
            {
                property_id: propertyId,
                created_by: user.id,
                agent_id: user.id,
                ...formData,
            },
            {
                onSuccess: () => {
                    toast.success('Application Submitted!', {
                        description: 'The application has been successfully created.',
                    });
                    router.push(`/properties/${propertyId}`); // Or to the new application details
                },
                onError: (error) => {
                    toast.error('Submission Failed', {
                        description: error.message,
                    });
                }
            }
        );
    };

    const progress = (currentStep / STEPS.length) * 100;

    return (
        <div className="max-w-2xl mx-auto py-8 px-4">
            {/* Header */}
            <div className="mb-8">
                <Button
                    variant="ghost"
                    className="pl-0 gap-2 mb-4 text-muted-foreground"
                    onClick={() => router.back()}
                >
                    <ArrowLeft className="w-4 h-4" />
                    Cancel
                </Button>
                <h1 className="text-3xl font-bold tracking-tight mb-2">New Tenant Application</h1>
                <p className="text-muted-foreground">Complete the form below to start the screening process.</p>
            </div>

            {/* Progress & Steps */}
            <div className="mb-8">
                <Progress value={progress} className="h-2 mb-4" />
                <div className="flex justify-between px-2">
                    {STEPS.map((step) => (
                        <div
                            key={step.id}
                            className={`flex flex-col items-center gap-2 ${currentStep >= step.id ? 'text-primary' : 'text-muted-foreground'}`}
                        >
                            <div className={`
                w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium border-2 transition-colors
                ${currentStep >= step.id ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/30'}
                ${currentStep > step.id ? 'bg-green-600 border-green-600' : ''}
              `}>
                                {currentStep > step.id ? <CheckCircle2 className="w-5 h-5" /> : step.id}
                            </div>
                            <span className="text-xs font-medium uppercase tracking-wider">{step.title}</span>
                        </div>
                    ))}
                </div>
            </div>

            <Card className="border shadow-lg">
                <CardContent className="p-6 sm:p-8">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentStep}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.2 }}
                        >
                            {/* Step 1: Basics */}
                            {currentStep === 1 && (
                                <div className="space-y-4">
                                    <h3 className="text-xl font-semibold mb-4">Applicant Information</h3>
                                    <div className="space-y-2">
                                        <Label htmlFor="name">Full Name *</Label>
                                        <Input
                                            id="name"
                                            placeholder="John Doe"
                                            value={formData.applicant_name}
                                            onChange={(e) => setFormData({ ...formData, applicant_name: e.target.value })}
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="email">Email Address *</Label>
                                            <Input
                                                id="email"
                                                type="email"
                                                placeholder="john@example.com"
                                                value={formData.applicant_email}
                                                onChange={(e) => setFormData({ ...formData, applicant_email: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="phone">Phone Number *</Label>
                                            <Input
                                                id="phone"
                                                type="tel"
                                                placeholder="(555) 555-5555"
                                                value={formData.applicant_phone}
                                                onChange={(e) => setFormData({ ...formData, applicant_phone: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="currentAddress">Current Address</Label>
                                        <Input
                                            id="currentAddress"
                                            placeholder="123 Existing St, City, State"
                                            value={formData.current_address || ''}
                                            onChange={(e) => setFormData({ ...formData, current_address: e.target.value })}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Step 2: Employment */}
                            {currentStep === 2 && (
                                <div className="space-y-4">
                                    <h3 className="text-xl font-semibold mb-4">Employment & Income</h3>
                                    <div className="space-y-2">
                                        <Label htmlFor="employer">Current Employer</Label>
                                        <Input
                                            id="employer"
                                            placeholder="Company Name"
                                            value={formData.employer || ''}
                                            onChange={(e) => setFormData({ ...formData, employer: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="income">Monthly Gross Income ($)</Label>
                                        <Input
                                            id="income"
                                            type="number"
                                            placeholder="5000"
                                            value={formData.monthly_income || ''}
                                            onChange={(e) => setFormData({ ...formData, monthly_income: parseFloat(e.target.value) })}
                                        />
                                    </div>
                                    <div className="bg-muted/50 p-4 rounded-lg mt-4 text-sm text-muted-foreground">
                                        <p>Note: Income verification documents will be requested separately via email.</p>
                                    </div>
                                </div>
                            )}

                            {/* Step 3: Details */}
                            {currentStep === 3 && (
                                <div className="space-y-4">
                                    <h3 className="text-xl font-semibold mb-4">Move-in Details</h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="moveIn">Desired Move-in Date</Label>
                                            <Input
                                                id="moveIn"
                                                type="date"
                                                value={formData.move_in_date || ''}
                                                onChange={(e) => setFormData({ ...formData, move_in_date: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="occupants">Number of Occupants</Label>
                                            <Input
                                                id="occupants"
                                                type="number"
                                                min="1"
                                                value={formData.num_occupants}
                                                onChange={(e) => setFormData({ ...formData, num_occupants: parseInt(e.target.value) })}
                                            />
                                        </div>
                                    </div>

                                    <Separator className="my-4" />

                                    <div className="space-y-4">
                                        <div className="flex items-center space-x-2">
                                            <Checkbox
                                                id="pets"
                                                checked={formData.has_pets}
                                                onCheckedChange={(checked) => setFormData({ ...formData, has_pets: checked as boolean })}
                                            />
                                            <Label htmlFor="pets">Applicant has pets?</Label>
                                        </div>

                                        {formData.has_pets && (
                                            <div className="space-y-2 animate-slide-up">
                                                <Label htmlFor="petDetails">Pet Details (Type, Breed, Annual Weight)</Label>
                                                <Input
                                                    id="petDetails"
                                                    placeholder="e.g. 1 Dog, Golden Retriever, 60lbs"
                                                    value={formData.pet_details || ''}
                                                    onChange={(e) => setFormData({ ...formData, pet_details: e.target.value })}
                                                />
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-2 pt-4">
                                        <Label htmlFor="notes">Additional Notes</Label>
                                        <Textarea
                                            id="notes"
                                            placeholder="Any specific requests or context..."
                                            value={formData.additional_notes || ''}
                                            onChange={(e) => setFormData({ ...formData, additional_notes: e.target.value })}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Step 4: Review */}
                            {currentStep === 4 && (
                                <div className="space-y-6">
                                    <div className="text-center mb-6">
                                        <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <Building2 className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                                        </div>
                                        <h3 className="text-xl font-semibold">Review Application</h3>
                                        <p className="text-muted-foreground">Please confirm all details before submitting.</p>
                                    </div>

                                    <div className="bg-muted/30 rounded-lg p-4 space-y-3 text-sm">
                                        <div className="grid grid-cols-2 gap-2">
                                            <span className="text-muted-foreground">Name:</span>
                                            <span className="font-medium text-right">{formData.applicant_name}</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <span className="text-muted-foreground">Email:</span>
                                            <span className="font-medium text-right">{formData.applicant_email}</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <span className="text-muted-foreground">Income:</span>
                                            <span className="font-medium text-right">${formData.monthly_income}/mo</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <span className="text-muted-foreground">Move-in:</span>
                                            <span className="font-medium text-right">
                                                {formData.move_in_date ? new Date(formData.move_in_date).toLocaleDateString() : 'N/A'}
                                            </span>
                                        </div>
                                    </div>

                                    <Button
                                        className="w-full gradient-bg text-white btn-press h-12 text-lg"
                                        onClick={handleSubmit}
                                        disabled={isPending}
                                    >
                                        {isPending ? (
                                            <>
                                                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                                Submitting...
                                            </>
                                        ) : (
                                            'Submit Application'
                                        )}
                                    </Button>
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </CardContent>
                <CardFooter className="flex justify-between border-t p-6 bg-muted/20">
                    <Button
                        variant="ghost"
                        onClick={handleBack}
                        disabled={currentStep === 1 || isPending}
                    >
                        Back
                    </Button>

                    {currentStep < 4 && (
                        <Button onClick={handleNext}>
                            Next Step <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                    )}
                </CardFooter>
            </Card>
        </div>
    );
}
