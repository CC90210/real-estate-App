import { AlertTriangle, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ErrorStateProps {
    title?: string;
    message?: string;
    onRetry?: () => void;
    className?: string;
}

export function ErrorState({
    title = 'Something went wrong',
    message = 'We encountered an error while loading this content.',
    onRetry,
    className
}: ErrorStateProps) {
    return (
        <div className={cn(
            "flex flex-col items-center justify-center p-8 text-center rounded-xl border border-red-100 bg-red-50/50",
            className
        )}>
            <div className="p-3 rounded-full bg-red-100 mb-4">
                <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-red-900 mb-1">
                {title}
            </h3>
            <p className="text-sm text-red-600 max-w-sm mb-6">
                {message}
            </p>
            {onRetry && (
                <Button
                    variant="outline"
                    className="border-red-200 hover:bg-red-100 text-red-700 hover:text-red-800 gap-2"
                    onClick={onRetry}
                >
                    <RefreshCcw className="w-4 h-4" />
                    Try Again
                </Button>
            )}
        </div>
    );
}
