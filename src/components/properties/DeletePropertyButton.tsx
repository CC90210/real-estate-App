'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
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
    redirectTo?: string;
}

export function DeletePropertyButton({ propertyId, propertyName, redirectTo = '/areas' }: DeletePropertyButtonProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isPending, startTransition] = useTransition();
    const router = useRouter();

    const handleDelete = () => {
        startTransition(async () => {
            try {
                console.log("[DeletePropertyButton] Initiating delete for:", propertyId);

                const result = await deletePropertyAction(propertyId);

                if (!result.success) {
                    throw new Error(result.error || 'Deletion failed');
                }

                toast.success('Property deleted successfully');
                setIsOpen(false);

                // Navigate immediately - React will handle the transition
                router.push(redirectTo);
                router.refresh();

            } catch (error: any) {
                console.error("Delete error:", error);
                toast.error('Failed to delete property: ' + error.message);
            }
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                >
                    <Trash2 className="w-5 h-5" />
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-red-100 rounded-lg text-red-600">
                            <AlertTriangle className="w-6 h-6" />
                        </div>
                        <DialogTitle>Delete property?</DialogTitle>
                    </div>
                    <DialogDescription>
                        Are you sure you want to delete <span className="font-bold text-slate-900">{propertyName}</span>?
                        <br /><br />
                        This will permanently remove:
                        <ul className="list-disc list-inside mt-2 text-sm">
                            <li>The property listing</li>
                            <li>All related applications</li>
                            <li>All scheduled showings</li>
                            <li>All related invoices</li>
                            <li>All generated documents</li>
                        </ul>
                        <br />
                        <span className="text-red-600 font-medium">This action cannot be undone.</span>
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="mt-6 gap-2 sm:gap-0">
                    <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isPending}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleDelete}
                        className="bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-200"
                        disabled={isPending}
                    >
                        {isPending ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                Deleting...
                            </>
                        ) : (
                            'Delete Property'
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
