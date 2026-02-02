'use client';

import { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
    onReset?: () => void;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null });
        this.props.onReset?.();
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
                    <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-6">
                        <AlertTriangle className="w-8 h-8 text-red-500" />
                    </div>

                    <h2 className="text-xl font-bold text-slate-900 mb-2">
                        Something went wrong
                    </h2>

                    <p className="text-slate-500 max-w-md mb-6">
                        An unexpected error occurred. Please try again or contact support if the problem persists.
                    </p>

                    {process.env.NODE_ENV === 'development' && this.state.error && (
                        <pre className="text-left text-xs text-red-600 bg-red-50 p-4 rounded-lg mb-6 max-w-lg overflow-auto">
                            {this.state.error.message}
                        </pre>
                    )}

                    <Button onClick={this.handleReset} className="gap-2">
                        <RefreshCw className="w-4 h-4" />
                        Try Again
                    </Button>
                </div>
            );
        }

        return this.props.children;
    }
}

// Functional component wrapper for use with hooks
interface ErrorBoundaryWrapperProps {
    children: ReactNode;
    fallback?: ReactNode;
}

export function withErrorBoundary<P extends object>(
    Component: React.ComponentType<P>,
    fallback?: ReactNode
) {
    return function WrappedComponent(props: P) {
        return (
            <ErrorBoundary fallback={fallback}>
                <Component {...props} />
            </ErrorBoundary>
        );
    };
}

// Simple error message component
export function ErrorMessage({
    title = 'Error',
    message = 'Something went wrong',
    onRetry
}: {
    title?: string;
    message?: string;
    onRetry?: () => void;
}) {
    return (
        <div className="flex flex-col items-center justify-center p-8 text-center bg-red-50 rounded-2xl border border-red-100">
            <AlertTriangle className="w-10 h-10 text-red-500 mb-4" />
            <h3 className="font-bold text-slate-900 mb-1">{title}</h3>
            <p className="text-sm text-slate-500 mb-4">{message}</p>
            {onRetry && (
                <Button variant="outline" size="sm" onClick={onRetry} className="gap-2">
                    <RefreshCw className="w-4 h-4" />
                    Retry
                </Button>
            )}
        </div>
    );
}
