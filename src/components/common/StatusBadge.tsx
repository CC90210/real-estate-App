
import { cn } from '@/lib/utils';

export function StatusBadge({ status }: { status: string }) {
    const styles: Record<string, string> = {
        available: 'bg-green-100 text-green-700',
        pending: 'bg-amber-100 text-amber-700',
        rented: 'bg-slate-100 text-slate-700',
        denied: 'bg-red-100 text-red-700',
        approved: 'bg-green-100 text-green-700',
        maintenance: 'bg-red-50 text-red-600',
        screening: 'bg-blue-100 text-blue-700'
    };

    const normalizedStatus = status?.toLowerCase() || 'unknown';

    return (
        <span className={cn('px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wide', styles[normalizedStatus] || 'bg-slate-100 text-slate-600')}>
            {normalizedStatus}
        </span>
    );
}
