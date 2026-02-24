"use client";

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { toast } from 'sonner';

export default function PostScheduler() {
    // Basic state for the form
    const [content, setContent] = useState('');
    const [scheduledDate, setScheduledDate] = useState('');
    const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Dummy list of connected accounts for this UI 
    // In reality, you'd fetch the user's connected accounts from Late API
    const availableAccounts = [
        { id: 'acc_instagram_123', name: 'Instagram - PropFlow Real Estate' },
        { id: 'acc_facebook_456', name: 'Facebook Page' },
        { id: 'acc_linkedin_789', name: 'LinkedIn Personal' }
    ];

    const handleSchedule = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!content || !scheduledDate || selectedAccounts.length === 0) {
            toast.error("Please fill in all fields and select at least one account.");
            return;
        }

        setIsSubmitting(true);

        try {
            // ISO-8601 formatting for late API scheduling
            const dateObj = new Date(scheduledDate);
            const isoDate = dateObj.toISOString();

            const response = await fetch('/api/social/schedule', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: content,
                    scheduledFor: isoDate,
                    platformAccountIds: selectedAccounts
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to schedule post');
            }

            toast.success("Post successfully scheduled via Late!");
            setContent('');
            setScheduledDate('');
            setSelectedAccounts([]);

        } catch (error: any) {
            console.error("Scheduling failed: ", error);
            toast.error(error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const toggleAccount = (id: string) => {
        setSelectedAccounts(prev =>
            prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
        );
    };

    return (
        <Card className="border-slate-200 shadow-sm mt-6">
            <CardHeader>
                <CardTitle className="text-xl font-bold">Schedule Property Post</CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSchedule} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Post Content</label>
                        <Textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="Check out this gorgeous new listing! 🏡..."
                            rows={4}
                            className="w-full text-base"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Schedule For</label>
                        <Input
                            type="datetime-local"
                            value={scheduledDate}
                            onChange={(e) => setScheduledDate(e.target.value)}
                            className="w-full text-base"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">Select Target Accounts</label>
                        <div className="flex flex-col gap-2">
                            {availableAccounts.map(acc => (
                                <label key={acc.id} className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        checked={selectedAccounts.includes(acc.id)}
                                        onChange={() => toggleAccount(acc.id)}
                                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="text-sm">{acc.name}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <Button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                    >
                        {isSubmitting ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : 'Schedule Post'}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}
