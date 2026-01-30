import { Loader2 } from 'lucide-react';

export default function Loading() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 animate-in fade-in duration-500">
            <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
            <p className="text-slate-500 font-medium">Loading details...</p>
        </div>
    );
}
