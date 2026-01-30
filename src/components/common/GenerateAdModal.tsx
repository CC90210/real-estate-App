'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Copy, Check, Sparkles, Send, Globe } from 'lucide-react';
import { toast } from 'sonner';

interface AdPayload {
    socialMedia: string;
    listingDescription: string;
    emailBlast: string;
}

export function GenerateAdModal({
    open,
    onOpenChange,
    propertyId
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    propertyId: string;
}) {
    const [notes, setNotes] = useState('');
    const [payload, setPayload] = useState<AdPayload | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isAutomating, setIsAutomating] = useState(false);
    const [copied, setCopied] = useState<string | null>(null);

    const handleGenerate = async () => {
        setIsLoading(true);
        setPayload(null);
        try {
            const res = await fetch('/api/generate-ad', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ propertyId, notes })
            });

            if (!res.ok) throw new Error('Generation failed');

            const data = await res.json();
            setPayload(data.payload);
            toast.success("Marketing payload generated!");
        } catch (error) {
            toast.error("Generation failed. Check server logs.");
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAutomate = async () => {
        if (!payload) return;
        setIsAutomating(true);
        try {
            // Mock n8n Webhook Call
            // const n8nUrl = "https://n8n.your-domain.com/webhook/propflow-automation";
            // await fetch(n8nUrl, { method: 'POST', body: JSON.stringify(payload) });

            await new Promise(r => setTimeout(r, 1500));
            toast.success("Payload sent to Automation Hub (n8n Ready)");
        } catch (error) {
            toast.error("Automation failed.");
        } finally {
            setIsAutomating(false);
        }
    };

    const handleCopy = (text: string, type: string) => {
        navigator.clipboard.writeText(text);
        setCopied(type);
        toast.success(`${type} copied to clipboard!`);
        setTimeout(() => setCopied(null), 2000);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl bg-white max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader className="shrink-0">
                    <DialogTitle className="flex items-center gap-2 text-2xl">
                        <Sparkles className="w-6 h-6 text-blue-600" />
                        AI Marketing Assistant
                    </DialogTitle>
                    <DialogDescription>
                        Generate high-conversion ads and send them to your automation workflows.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto py-4 space-y-6">
                    <div className="space-y-2">
                        <Label>Campaign Context / Agent Notes</Label>
                        <Textarea
                            placeholder="e.g. Highlight the private balcony and pet-friendly policy. Target young professionals."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={3}
                            className="bg-slate-50 border-slate-200 resize-none"
                        />
                    </div>

                    {!payload && !isLoading && (
                        <div className="flex flex-col items-center justify-center py-10 text-slate-400 border-2 border-dashed rounded-xl border-slate-100 bg-slate-50/50">
                            <Globe className="w-12 h-12 mb-3 opacity-20" />
                            <p className="text-sm font-medium">Click Generate to create marketing assets</p>
                        </div>
                    )}

                    {isLoading && (
                        <div className="flex flex-col items-center justify-center py-20">
                            <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-4" />
                            <p className="text-sm font-medium animate-pulse">Consulting Gemini Pro...</p>
                        </div>
                    )}

                    {payload && !isLoading && (
                        <Tabs defaultValue="social" className="w-full animate-in fade-in slide-in-from-bottom-2">
                            <TabsList className="grid w-full grid-cols-3">
                                <TabsTrigger value="social">Social Media</TabsTrigger>
                                <TabsTrigger value="listing">Listing</TabsTrigger>
                                <TabsTrigger value="email">Email</TabsTrigger>
                            </TabsList>
                            <div className="mt-4 p-4 border rounded-xl bg-slate-50 relative group">
                                <TabsContent value="social">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="text-[10px] uppercase font-bold text-slate-400">Instagram / Facebook Post</span>
                                        <Button variant="ghost" size="sm" onClick={() => handleCopy(payload.socialMedia, 'Social')} className="h-8 px-2">
                                            {copied === 'Social' ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                                        </Button>
                                    </div>
                                    <p className="text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">{payload.socialMedia}</p>
                                </TabsContent>
                                <TabsContent value="listing">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="text-[10px] uppercase font-bold text-slate-400">Official Listing Description</span>
                                        <Button variant="ghost" size="sm" onClick={() => handleCopy(payload.listingDescription, 'Listing')} className="h-8 px-2">
                                            {copied === 'Listing' ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                                        </Button>
                                    </div>
                                    <p className="text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">{payload.listingDescription}</p>
                                </TabsContent>
                                <TabsContent value="email">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="text-[10px] uppercase font-bold text-slate-400">Prospecting Email</span>
                                        <Button variant="ghost" size="sm" onClick={() => handleCopy(payload.emailBlast, 'Email')} className="h-8 px-2">
                                            {copied === 'Email' ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                                        </Button>
                                    </div>
                                    <p className="text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">{payload.emailBlast}</p>
                                </TabsContent>
                            </div>
                        </Tabs>
                    )}
                </div>

                <DialogFooter className="shrink-0 gap-2 border-t pt-4">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
                    {payload ? (
                        <>
                            <Button variant="secondary" onClick={handleGenerate} disabled={isLoading}>
                                <Sparkles className="w-4 h-4 mr-2" />
                                Regenerate
                            </Button>
                            <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleAutomate} disabled={isAutomating}>
                                {isAutomating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                                Send to Automation (n8n)
                            </Button>
                        </>
                    ) : (
                        <Button onClick={handleGenerate} disabled={isLoading} className="bg-blue-600 hover:bg-blue-700 text-white px-8">
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                            Generate Payload
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
