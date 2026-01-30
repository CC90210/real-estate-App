'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Copy, Check, Sparkles, Send, Globe, Zap, Megaphone, Terminal, Mail, Facebook } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface AdPayload {
    socialMedia: string;
    listingDescription: string;
    emailBlast: string;
    craigslistHtml: string;
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

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Generation failed');
            }

            if (!data.payload) {
                throw new Error('AI returned an empty payload. Please try again.');
            }

            setPayload(data.payload);
            toast.success("Marketing assets generated successfully!");
        } catch (error: any) {
            toast.error(error.message || "Failed to generate assets.");
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAutomate = async () => {
        if (!payload) return;
        setIsAutomating(true);
        try {
            // Simulated n8n Webhook
            await new Promise(r => setTimeout(r, 2000));
            toast.success("Succesfully pushed to Production Automation Hub");
        } catch (error) {
            toast.error("Automation pipeline failed.");
        } finally {
            setIsAutomating(false);
        }
    };

    const handleCopy = (text: string, type: string) => {
        navigator.clipboard.writeText(text);
        setCopied(type);
        toast.success(`${type} copied!`);
        setTimeout(() => setCopied(null), 2000);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-3xl bg-white border-none shadow-2xl p-0 overflow-hidden rounded-[2rem]">
                <div className="bg-slate-900 p-8 text-white relative">
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                        <Megaphone className="w-32 h-32 rotate-12" />
                    </div>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-3 text-3xl font-black tracking-tighter">
                            <div className="p-2 rounded-xl bg-blue-600 shadow-lg shadow-blue-500/20">
                                <Sparkles className="w-6 h-6 text-white fill-white" />
                            </div>
                            Marketing Engine
                        </DialogTitle>
                        <DialogDescription className="text-slate-400 font-medium text-lg mt-2">
                            Gemini-powered multi-channel campaign generation.
                        </DialogDescription>
                    </DialogHeader>
                </div>

                <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto">
                    {!payload && !isLoading && (
                        <div className="space-y-4 animate-in fade-in duration-500">
                            <div className="p-6 rounded-2xl bg-blue-50 border border-blue-100">
                                <h4 className="font-bold text-blue-900 flex items-center gap-2">
                                    <Zap className="w-4 h-4 fill-blue-600" />
                                    Campaign Intelligence
                                </h4>
                                <p className="text-sm text-blue-700 mt-1">Our AI will analyze the property's amenities, area, and your notes to create unique ads for every platform.</p>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Contextual Guidelines (Optional)</Label>
                                <Textarea
                                    placeholder="e.g. Focus on the luxury finishes and proximity to the financial district. Be aggressive/urgent."
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    rows={4}
                                    className="bg-slate-50 border-slate-200 rounded-2xl resize-none focus:ring-4 focus:ring-blue-100 transition-all font-medium"
                                />
                            </div>
                        </div>
                    )}

                    {isLoading && (
                        <div className="flex flex-col items-center justify-center py-20 animate-in zoom-in-95 duration-300">
                            <div className="relative">
                                <div className="w-20 h-20 rounded-full border-4 border-blue-100 border-t-blue-600 animate-spin" />
                                <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-blue-600 animate-pulse" />
                            </div>
                            <h3 className="text-xl font-black text-slate-900 mt-6 tracking-tight">Writing Copy...</h3>
                            <p className="text-slate-500 font-medium mt-2">Gemini is synthesizing property data with your notes.</p>
                        </div>
                    )}

                    {payload && !isLoading && (
                        <Tabs defaultValue="social" className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <TabsList className="grid w-full grid-cols-4 bg-slate-100 p-1 rounded-2xl h-14">
                                <TabsTrigger value="social" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm font-bold text-xs uppercase tracking-widest flex gap-2">
                                    <Facebook className="w-3.5 h-3.5" /> Social
                                </TabsTrigger>
                                <TabsTrigger value="listing" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm font-bold text-xs uppercase tracking-widest flex gap-2">
                                    <Globe className="w-3.5 h-3.5" /> Web
                                </TabsTrigger>
                                <TabsTrigger value="email" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm font-bold text-xs uppercase tracking-widest flex gap-2">
                                    <Mail className="w-3.5 h-3.5" /> Email
                                </TabsTrigger>
                                <TabsTrigger value="craigslist" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm font-bold text-xs uppercase tracking-widest flex gap-2">
                                    <Terminal className="w-3.5 h-3.5" /> HTML
                                </TabsTrigger>
                            </TabsList>

                            <div className="mt-8 relative group">
                                <div className="absolute top-4 right-4 z-10">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            const activeValue = document.querySelector('[data-state="active"][role="tab"]')?.getAttribute('data-value');
                                            const text = activeValue === 'social' ? payload.socialMedia :
                                                activeValue === 'listing' ? payload.listingDescription :
                                                    activeValue === 'email' ? payload.emailBlast : payload.craigslistHtml;
                                            handleCopy(text || '', activeValue || 'Text');
                                        }}
                                        className="bg-white/80 backdrop-blur shadow-sm rounded-xl font-bold border-slate-200"
                                    >
                                        {copied ? <Check className="w-4 h-4 text-emerald-600 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                                        Copy
                                    </Button>
                                </div>
                                <div className="bg-slate-50 border border-slate-200 rounded-[2rem] p-8 pt-12 min-h-[300px]">
                                    <TabsContent value="social" className="mt-0">
                                        <p className="text-lg leading-relaxed text-slate-700 font-medium italic">"{payload.socialMedia}"</p>
                                    </TabsContent>
                                    <TabsContent value="listing" className="mt-0">
                                        <p className="text-sm leading-relaxed text-slate-600 font-medium whitespace-pre-wrap">{payload.listingDescription}</p>
                                    </TabsContent>
                                    <TabsContent value="email" className="mt-0">
                                        <p className="text-sm leading-relaxed text-slate-600 font-medium whitespace-pre-wrap">{payload.emailBlast}</p>
                                    </TabsContent>
                                    <TabsContent value="craigslist" className="mt-0">
                                        <code className="text-[11px] font-mono leading-relaxed text-blue-600 whitespace-pre-wrap block p-6 bg-slate-900 rounded-3xl border border-slate-800 h-full overflow-auto">
                                            {payload.craigslistHtml}
                                        </code>
                                    </TabsContent>
                                </div>
                            </div>
                        </Tabs>
                    )}
                </div>

                <DialogFooter className="p-8 border-t bg-slate-50 flex flex-col sm:flex-row gap-3">
                    <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl font-bold">Cancel</Button>
                    {payload ? (
                        <>
                            <Button variant="outline" onClick={handleGenerate} disabled={isLoading} className="rounded-xl font-bold border-slate-200 h-12">
                                <Sparkles className="w-4 h-4 mr-2 text-blue-600" />
                                Regenerate
                            </Button>
                            <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold px-8 h-12 shadow-xl shadow-blue-200 flex-1" onClick={handleAutomate} disabled={isAutomating}>
                                {isAutomating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                                Push to n8n Hub
                            </Button>
                        </>
                    ) : (
                        <Button onClick={handleGenerate} disabled={isLoading} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold px-12 h-14 shadow-xl shadow-blue-200 text-lg transition-all active:scale-95">
                            {isLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Sparkles className="w-5 h-5 mr-2 fill-white" />}
                            Generate Campaign
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
