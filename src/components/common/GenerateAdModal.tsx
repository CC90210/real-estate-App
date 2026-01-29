'use client';

import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Property } from '@/types/database';
import { Loader2, Copy, Check, RefreshCw, Wand2 } from 'lucide-react';
import { copyToClipboard } from '@/lib/utils';
import { toast } from 'sonner';

interface GenerateAdModalProps {
    property: Property;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function GenerateAdModal({ property, open, onOpenChange }: GenerateAdModalProps) {
    const [loading, setLoading] = useState(false);
    const [generatedAd, setGeneratedAd] = useState<Record<string, string>>({});
    const [copied, setCopied] = useState(false);
    const [activeTab, setActiveTab] = useState('social');

    const generateAd = async () => {
        setLoading(true);
        try {
            // Real API Call
            const response = await fetch('/api/generate-ad', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    propertyId: property.id,
                    format: activeTab
                })
            });

            if (!response.ok) throw new Error('Generation failed');

            const data = await response.json();

            setGeneratedAd(prev => ({
                ...prev,
                [activeTab]: data.content
            }));
        } catch (error) {
            console.error(error);
            toast.error('Failed to generate ad. Please check your API key.');
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = async () => {
        const text = generatedAd[activeTab];
        if (!text) return;

        const success = await copyToClipboard(text);
        if (success) {
            setCopied(true);
            toast.success('Ad copy copied to clipboard');
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const hasContent = !!generatedAd[activeTab];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center">
                            <Wand2 className="w-4 h-4 text-white" />
                        </div>
                        <DialogTitle>AI Ad Generator</DialogTitle>
                    </div>
                    <DialogDescription>
                        Generate professional marketing copy for this property in seconds.
                    </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="social" value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-3 mb-4">
                        <TabsTrigger value="social">Social Media</TabsTrigger>
                        <TabsTrigger value="listing">Listing Site</TabsTrigger>
                        <TabsTrigger value="email">Email Blast</TabsTrigger>
                    </TabsList>

                    <div className="min-h-[200px] relative">
                        {loading ? (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted/20 rounded-lg">
                                <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
                                <p className="text-sm text-muted-foreground animate-pulse">
                                    Crafting the perfect ad...
                                </p>
                            </div>
                        ) : !hasContent ? (
                            <div className="flex flex-col items-center justify-center h-[200px] text-center p-4 border-2 border-dashed rounded-lg">
                                <Wand2 className="w-10 h-10 text-muted-foreground mb-3" />
                                <p className="text-muted-foreground mb-4">
                                    Click generate to create marketing copy for
                                    <span className="font-semibold block text-foreground mt-1">
                                        {activeTab === 'social' ? 'Social Media' : activeTab === 'listing' ? 'Listing Sites' : 'Email Campaigns'}
                                    </span>
                                </p>
                                <Button onClick={generateAd} className="gradient-bg text-white">
                                    Generate Copy
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <Textarea
                                    value={generatedAd[activeTab]}
                                    readOnly
                                    className="min-h-[200px] resize-none font-mono text-sm bg-muted/30"
                                />
                                <div className="flex gap-2 justify-end">
                                    <Button variant="outline" onClick={generateAd} size="sm">
                                        <RefreshCw className="w-4 h-4 mr-2" />
                                        Regenerate
                                    </Button>
                                    <Button onClick={handleCopy} size="sm" className="min-w-[100px]">
                                        {copied ? (
                                            <>
                                                <Check className="w-4 h-4 mr-2" /> Copied
                                            </>
                                        ) : (
                                            <>
                                                <Copy className="w-4 h-4 mr-2" /> Copy
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
