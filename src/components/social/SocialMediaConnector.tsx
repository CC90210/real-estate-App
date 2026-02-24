"use client";

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from 'sonner';

interface SocialMediaConnectorProps {
    className?: string;
}

export default function SocialMediaConnector({ className = '' }: SocialMediaConnectorProps) {
    const [loadingPlatform, setLoadingPlatform] = useState<string | null>(null);

    // List of platforms highly relevant to Real Estate
    const platforms = [
        { id: 'instagram', name: 'Instagram', color: 'bg-pink-600 hover:bg-pink-700' },
        { id: 'facebook', name: 'Facebook', color: 'bg-blue-600 hover:bg-blue-700' },
        { id: 'linkedin', name: 'LinkedIn', color: 'bg-sky-700 hover:bg-sky-800' },
        { id: 'twitter', name: 'X (Twitter)', color: 'bg-slate-900 hover:bg-slate-800' },
        { id: 'tiktok', name: 'TikTok', color: 'bg-black hover:bg-gray-900' }
    ];

    const handleConnect = async (platformId: string, platformName: string) => {
        setLoadingPlatform(platformId);

        try {
            const response = await fetch('/api/social/connect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ platform: platformId })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to connect');
            }

            if (data.authUrl) {
                // Redirect the agent to the secure login page
                window.location.href = data.authUrl;
            } else {
                toast.error(`Unable to retrieve connection URL for ${platformName}`);
            }

        } catch (error: any) {
            console.error("Connection failed", error);
            toast.error(error.message || `Failed to connect to ${platformName}`);
        } finally {
            setLoadingPlatform(null);
        }
    };

    return (
        <Card className={`border-slate-200 shadow-sm ${className}`}>
            <CardHeader>
                <CardTitle className="text-xl font-bold">Connect Your Social Accounts</CardTitle>
                <CardDescription className="text-slate-500">
                    Link your accounts to automatically schedule property listings and updates across all platforms from PropFlow.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex gap-3 flex-wrap">
                    {platforms.map(platform => (
                        <Button
                            key={platform.id}
                            onClick={() => handleConnect(platform.id, platform.name)}
                            disabled={loadingPlatform === platform.id || loadingPlatform !== null}
                            className={`px-4 py-2 text-white rounded shadow-sm transition-all ${platform.color}`}
                        >
                            {loadingPlatform === platform.id ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Connecting...
                                </>
                            ) : (
                                `Connect ${platform.name}`
                            )}
                        </Button>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
