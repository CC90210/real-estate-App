import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function NotFound() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-slate-50">
            <div className="text-8xl font-black text-slate-200 mb-4">404</div>
            <h2 className="text-2xl font-bold mb-2 text-slate-900">Page not found</h2>
            <p className="text-slate-500 mb-8 text-center max-w-md">
                The page you're looking for doesn't exist or has been moved.
            </p>
            <div className="flex gap-4">
                <Button asChild>
                    <Link href="/dashboard">Go to Dashboard</Link>
                </Button>
                <Button variant="outline" asChild>
                    <Link href="/">Go Home</Link>
                </Button>
            </div>
        </div>
    )
}
