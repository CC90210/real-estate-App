'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
import { deleteAreaAction } from '@/lib/actions/area-actions';

interface DeleteAreaButtonProps {
    areaId: string;
    areaName: string;
}

export function DeleteAreaButton({ areaId, areaName }: DeleteAreaButtonProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const router = useRouter();

    const handleDelete = async () => {
        setIsLoading(true);
        try {
            const result = await deleteAreaAction(areaId);
            if (!result.success) throw new Error(result.error);

            toast.success(`${areaName} deleted successfully`);
            setIsOpen(false);
            router.push('/areas');
            router.refresh();
        } catch (error: any) {
            toast.error("Failed to delete area: " + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full">
                    <Trash2 className="w-5 h-5" />
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-red-100 rounded-lg text-red-600">
                            <AlertTriangle className="w-6 h-6" />
                        </div>
                        <DialogTitle>Delete {areaName}?</DialogTitle>
                    </div>
                    <DialogDescription>
                        This will permanently delete <strong>{areaName}</strong> and ALL associated buildings, properties, and applications.
                        <br /><br />
                        <span className="font-bold text-red-600">This action cannot be undone.</span>
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="mt-4 gap-2 sm:gap-0">
                    <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isLoading}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleDelete}
                        className="bg-red-600 hover:bg-red-700 text-white"
                        disabled={isLoading}
                    >
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                        Delete Area
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
