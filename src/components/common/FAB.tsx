'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Sparkles, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useUser } from '@/lib/hooks/useUser';

interface FABProps {
    onGenerateAd: () => void;
    onNewApplication: () => void;
}

export function FAB({ onGenerateAd, onNewApplication }: FABProps) {
    const [isOpen, setIsOpen] = useState(false);
    const { role } = useUser();

    if (role !== 'agent' && role !== 'admin') return null;

    return (
        <div className="fixed bottom-8 right-8 z-50 flex flex-col items-end gap-4">
            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
                            onClick={() => setIsOpen(false)}
                        />

                        {/* Actions */}
                        <motion.div
                            initial={{ opacity: 0, y: 20, scale: 0.8 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 20, scale: 0.8 }}
                            className="z-50 flex flex-col items-end gap-3 mb-2"
                        >
                            <div className="flex items-center gap-3">
                                <span className="text-sm font-medium bg-card px-2 py-1 rounded-md shadow-sm">
                                    New Application
                                </span>
                                <Button
                                    size="icon"
                                    className="h-12 w-12 rounded-full shadow-lg bg-blue-600 hover:bg-blue-700 text-white"
                                    onClick={() => {
                                        setIsOpen(false);
                                        onNewApplication();
                                    }}
                                >
                                    <FileText className="w-5 h-5" />
                                </Button>
                            </div>

                            <div className="flex items-center gap-3">
                                <span className="text-sm font-medium bg-card px-2 py-1 rounded-md shadow-sm">
                                    Generate Ad
                                </span>
                                <Button
                                    size="icon"
                                    className="h-12 w-12 rounded-full shadow-lg bg-amber-500 hover:bg-amber-600 text-white"
                                    onClick={() => {
                                        setIsOpen(false);
                                        onGenerateAd();
                                    }}
                                >
                                    <Sparkles className="w-5 h-5" />
                                </Button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            <motion.button
                className={cn(
                    "w-14 h-14 rounded-full flex items-center justify-center shadow-lg z-50 transition-colors",
                    isOpen ? "bg-muted text-foreground hover:bg-muted/80" : "gradient-bg text-white hover:opacity-90"
                )}
                onClick={() => setIsOpen(!isOpen)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
            >
                <motion.div
                    animate={{ rotate: isOpen ? 45 : 0 }}
                    transition={{ duration: 0.2 }}
                >
                    <Plus className="w-7 h-7" />
                </motion.div>
            </motion.button>
        </div>
    );
}
