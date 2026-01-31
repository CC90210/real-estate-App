'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { deletePropertyAction } from '@/lib/actions/property-actions';
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

    const [isOpen, setIsOpen] = useState(false);

    const handleDelete = async () => {
        setIsLoading(true);
        try {
            console.log("DeletePropertyButton: Deleting property", propertyId);

            // Server Action
            const result = await deletePropertyAction(propertyId);

            if (!result.success) {
                console.error("Server Action Failed:", result.error);
                throw new Error(result.error);
            }

            toast.success("Listing deleted successfully");
            setIsOpen(false);

            // Force a hard refresh and navigation - client side still helps feels snappy
            router.refresh();
            router.replace('/areas');

        } catch (error: any) {
            console.error("Delete error:", error);
            toast.error("Failed to delete listing: " + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
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
                    <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isLoading}>
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
