'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, FilePlus } from 'lucide-react';
import { GenerateAdModal } from '@/components/common/GenerateAdModal';
import { toast } from 'sonner';

export function GenerateAdButton({ propertyId }: { propertyId: string }) {
    const [open, setOpen] = useState(false);

    return (
        <>
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-white/90 backdrop-blur-md border border-slate-200 shadow-xl rounded-full p-2 flex gap-2 animate-in slide-in-from-bottom-10 fade-in duration-700">
                <Button
                    className="rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md px-6"
                    onClick={() => setOpen(true)}
                >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate Ad
                </Button>
                <Button
                    variant="outline"
                    className="rounded-full bg-white hover:bg-slate-50 border-slate-200"
                    onClick={() => toast("New Application flow mock")}
                >
                    <FilePlus className="w-4 h-4 mr-2" />
                    New Application
                </Button>
            </div>

            <GenerateAdModal
                open={open}
                onOpenChange={setOpen}
                propertyId={propertyId}
            />
        </>
    );
}
