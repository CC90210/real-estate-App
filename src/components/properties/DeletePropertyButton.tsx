'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Trash2, Loader2, AlertTriangle } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from 'sonner';

interface DeletePropertyButtonProps {
    propertyId: string;
    propertyName: string;
}

export function DeletePropertyButton({ propertyId, propertyName }: DeletePropertyButtonProps) {
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();
    const supabase = createClient();

    const handleDelete = async () => {
        setIsLoading(true);
        try {
            const { error } = await supabase
                .from('properties')
                .delete()
                .eq('id', propertyId);

            if (error) throw error;

            toast.success("Listing deleted successfully");
            router.push('/areas'); // Redirect to areas since the building might be empty or hard to track back easily without buildingId
            router.refresh();
        } catch (error: any) {
            console.error("Delete error:", error);
            toast.error("Failed to delete listing: " + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors">
                    <Trash2 className="w-5 h-5" />
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-red-100 rounded-lg text-red-600">
                            <AlertTriangle className="w-6 h-6" />
                        </div>
                        <DialogTitle>Delete listing?</DialogTitle>
                    </div>
                    <DialogDescription>
                        Are you sure you want to delete <span className="font-bold text-slate-900">{propertyName}</span>?
                        This will permanently remove the listing and all associated applications. This action cannot be undone.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="mt-6 gap-2 sm:gap-0">
                    <Button variant="outline" onClick={() => (document.querySelector('[data-state="open"]')?.parentElement?.querySelector('button[aria-label="Close"]') as any)?.click()}>
                        Cancel
                    </Button>
                    <Button
                        onClick={(e: React.MouseEvent) => {
                            e.preventDefault();
                            handleDelete();
                        }}
                        className="bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-200"
                        disabled={isLoading}
                    >
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                        Delete Listing
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
