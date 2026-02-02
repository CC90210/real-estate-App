'use client';

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { AutomationButton } from "./AutomationButton"
import { Mail, Share2, Image, Sparkles } from "lucide-react"

export function PropertyAutomations({ property }: { property: any }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                    <Sparkles className="w-5 h-5 text-purple-600" />
                    Smart Automations
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col gap-3">
                    <AutomationButton
                        actionType="send_listing_email"
                        entityType="property"
                        entityId={property.id}
                        label="Send Listing Campaign"
                        icon={<Mail className="h-4 w-4" />}
                    />

                    <AutomationButton
                        actionType="post_social"
                        entityType="property"
                        entityId={property.id}
                        label="Post to Social Media"
                        icon={<Share2 className="h-4 w-4" />}
                    />

                    <AutomationButton
                        actionType="generate_ad"
                        entityType="property"
                        entityId={property.id}
                        label="Generate Ad Creative"
                        icon={<Image className="h-4 w-4" />}
                    />
                </div>
            </CardContent>
        </Card>
    )
}
