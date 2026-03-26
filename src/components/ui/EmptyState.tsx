import { Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
    icon?: React.ReactNode;
    title: string;
    description?: string;
    action?: {
        label: string;
        onClick: () => void;
    };
    className?: string;
}

export function EmptyState({
    icon,
    title,
    description,
    action,
    className,
}: EmptyStateProps) {
    return (
        <div className={cn(
            "flex flex-col items-center justify-center p-8 text-center rounded-xl border border-slate-200 bg-slate-50/50",
            className
        )}>
            <div className="p-3 rounded-full bg-slate-100 mb-4">
                {icon ?? <Inbox className="w-6 h-6 text-slate-400" />}
            </div>
            <h3 className="text-lg font-semibold text-slate-700 mb-1">
                {title}
            </h3>
            {description && (
                <p className="text-sm text-slate-500 max-w-sm mb-6">
                    {description}
                </p>
            )}
            {action && (
                <Button
                    variant="outline"
                    className="border-slate-200 hover:bg-slate-100 text-slate-600 hover:text-slate-700"
                    onClick={action.onClick}
                >
                    {action.label}
                </Button>
            )}
        </div>
    );
}
