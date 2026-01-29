'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Key, Copy, Check, Eye, EyeOff } from 'lucide-react';
import { useUser } from '@/lib/hooks/useUser';
import { canViewLockbox, copyToClipboard } from '@/lib/utils';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

interface LockboxCodeProps {
    code: string | null;
}

export function LockboxCode({ code }: LockboxCodeProps) {
    const { role } = useUser();
    const [isVisible, setIsVisible] = useState(false);
    const [copied, setCopied] = useState(false);

    if (!role || !canViewLockbox(role)) return null;

    const handleCopy = async () => {
        if (!code) return;
        const success = await copyToClipboard(code);
        if (success) {
            setCopied(true);
            toast.success('Lockbox code copied');
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <Card className="border-amber-200 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-950/20 overflow-hidden">
            <CardContent className="p-4 sm:p-6">
                <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center shrink-0">
                        <Key className="w-5 h-5 text-amber-600 dark:text-amber-500" />
                    </div>

                    <div className="flex-1 space-y-1">
                        <h3 className="font-semibold text-amber-900 dark:text-amber-100">Access Information</h3>
                        <p className="text-sm text-amber-800/80 dark:text-amber-200/70">
                            Strictly for agent use only. Do not share with tenants.
                        </p>

                        <div className="mt-4 flex items-center gap-3">
                            <div className="relative h-12 flex-1 max-w-[200px] bg-background rounded-md border flex items-center px-4 font-mono text-lg tracking-wider">
                                <AnimatePresence mode="wait">
                                    {isVisible ? (
                                        <motion.span
                                            key="code"
                                            initial={{ opacity: 0, filter: 'blur(4px)' }}
                                            animate={{ opacity: 1, filter: 'blur(0px)' }}
                                            exit={{ opacity: 0, filter: 'blur(4px)' }}
                                        >
                                            {code || '----'}
                                        </motion.span>
                                    ) : (
                                        <motion.span
                                            key="hidden"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            className="text-muted-foreground tracking-widest"
                                        >
                                            ••••••
                                        </motion.span>
                                    )}
                                </AnimatePresence>
                            </div>

                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => setIsVisible(!isVisible)}
                                className="h-12 w-12"
                                title={isVisible ? "Hide code" : "Show code"}
                            >
                                {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </Button>

                            <Button
                                variant="outline"
                                size="icon"
                                onClick={handleCopy}
                                className="h-12 w-12"
                                title="Copy code"
                                disabled={!code}
                            >
                                {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                            </Button>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
