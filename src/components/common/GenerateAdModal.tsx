'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2, Copy, Check, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

export function GenerateAdModal({
    open,
    onOpenChange,
    propertyId
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    propertyId: string;
}) {
    const [format, setFormat] = useState('social');
    const [content, setContent] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [copied, setCopied] = useState(false);

    const handleGenerate = async () => {
        setIsLoading(true);
        setContent(''); // Clear previous
        try {
            const res = await fetch('/api/generate-ad', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ propertyId, format })
            });

            if (!res.ok) throw new Error('Generation failed');

            const data = await res.json();
            setContent(data.content);
        } catch (error) {
            toast.error("Failed to generate ad. Please try again.");
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(content);
        setCopied(true);
        toast.success("Ad content copied to clipboard!");
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md bg-white">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-blue-600" />
                        Generate Property Ad
                    </DialogTitle>
                    <DialogDescription>
                        Use AI to create engaging marketing content for this property.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    <div className="space-y-3">
                        <Label>Select Format</Label>
                        <RadioGroup value={format} onValueChange={setFormat} className="grid grid-cols-3 gap-4">
                            <div>
                                <RadioGroupItem value="social" id="social" className="peer sr-only" />
                                <Label
                                    htmlFor="social"
                                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-blue-600 [&:has([data-state=checked])]:border-blue-600 cursor-pointer text-center h-full"
                                >
                                    Social Post
                                </Label>
                            </div>
                            <div>
                                <RadioGroupItem value="listing" id="listing" className="peer sr-only" />
                                <Label
                                    htmlFor="listing"
                                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-blue-600 [&:has([data-state=checked])]:border-blue-600 cursor-pointer text-center h-full"
                                >
                                    Full Listing
                                </Label>
                            </div>
                            <div>
                                <RadioGroupItem value="email" id="email" className="peer sr-only" />
                                <Label
                                    htmlFor="email"
                                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-blue-600 [&:has([data-state=checked])]:border-blue-600 cursor-pointer text-center h-full"
                                >
                                    Email Blast
                                </Label>
                            </div>
                        </RadioGroup>
                    </div>

                    {content && (
                        <div className="rounded-md bg-slate-50 p-4 border relative group">
                            <Button
                                size="sm"
                                variant="ghost"
                                className="absolute top-2 right-2 h-8 w-8 p-0"
                                onClick={handleCopy}
                            >
                                {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4 text-slate-500" />}
                            </Button>
                            <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{content}</p>
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleGenerate} disabled={isLoading} className="bg-blue-600 hover:bg-blue-700 text-white min-w-[120px]">
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                        {content ? 'Regenerate' : 'Generate'}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
