'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Upload, Loader2, Save } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { useLandlords, useUpdateProperty } from '@/lib/hooks/useProperties'; // using update prop as a mock for create
import { motion } from 'framer-motion';

export default function NewPropertyPage() {
    const router = useRouter();
    const { data: landlords } = useLandlords();
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        // Mock API call
        setTimeout(() => {
            setIsLoading(false);
            toast.success("Property created successfully!");
            router.push('/dashboard');
        }, 1500);
    };

    return (
        <div className="space-y-8 animate-fade-in max-w-4xl mx-auto">
            <div className="flex items-center gap-4">
                <Link href="/dashboard">
                    <Button variant="ghost" size="icon" className="rounded-full">
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Add New Property</h1>
                    <p className="text-muted-foreground">
                        List a new property in your portfolio.
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit}>
                <Card className="border-none shadow-md">
                    <CardHeader>
                        <CardTitle>Property Details</CardTitle>
                        <CardDescription>Enter the basic information about the property.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="address">Address</Label>
                                <Input id="address" placeholder="123 Main St" required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="unit">Unit Number</Label>
                                <Input id="unit" placeholder="Apt 4B" />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="city">City</Label>
                                <Input id="city" placeholder="Toronto" defaultValue="Toronto" required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="neighborhood">Neighborhood</Label>
                                <Input id="neighborhood" placeholder="Downtown" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="zip">Postal Code</Label>
                                <Input id="zip" placeholder="M5V 2T6" />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="landlord">Landlord</Label>
                                <Select required>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select landlord" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {landlords?.map(l => (
                                            <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="rent">Monthly Rent ($)</Label>
                                <Input id="rent" type="number" placeholder="2500" required />
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="beds">Bedrooms</Label>
                                <Select defaultValue="1">
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="0">Studio</SelectItem>
                                        <SelectItem value="1">1</SelectItem>
                                        <SelectItem value="2">2</SelectItem>
                                        <SelectItem value="3">3</SelectItem>
                                        <SelectItem value="4+">4+</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="baths">Bathrooms</Label>
                                <Select defaultValue="1">
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="1">1</SelectItem>
                                        <SelectItem value="1.5">1.5</SelectItem>
                                        <SelectItem value="2">2</SelectItem>
                                        <SelectItem value="2.5">2.5</SelectItem>
                                        <SelectItem value="3+">3+</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="sqft">Square Feet</Label>
                                <Input id="sqft" type="number" placeholder="800" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                placeholder="Describe the property features, highlights, and amenities..."
                                className="min-h-[120px]"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Photos</Label>
                            <div className="border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-muted/50 transition-colors">
                                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                                    <Upload className="w-6 h-6 text-primary" />
                                </div>
                                <p className="font-medium text-sm">Click to upload photos</p>
                                <p className="text-xs text-muted-foreground mt-1">SVG, PNG, JPG or GIF (max. 800x400px)</p>
                            </div>
                        </div>

                        <div className="flex justify-end pt-4">
                            <Button type="submit" size="lg" className="gradient-bg text-white" disabled={isLoading}>
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Creating...
                                    </>
                                ) : (
                                    <>
                                        <Save className="mr-2 h-4 w-4" />
                                        Create Property
                                    </>
                                )}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </form>
        </div>
    );
}
