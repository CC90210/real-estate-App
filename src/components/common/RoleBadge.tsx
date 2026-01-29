'use client';

import { Badge } from '@/components/ui/badge';
import { UserRole } from '@/types/database';
import { Shield, User, Crown } from 'lucide-react';

interface RoleBadgeProps {
    role: UserRole;
    className?: string;
}

export function RoleBadge({ role, className }: RoleBadgeProps) {
    const config = {
        admin: {
            label: 'Administrator',
            icon: Shield,
            variant: 'default' as const,
            className: 'bg-destructive/10 text-destructive hover:bg-destructive/20 border-destructive/20'
        },
        landlord: {
            label: 'Landlord',
            icon: Crown,
            variant: 'secondary' as const,
            className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-800'
        },
        agent: {
            label: 'Agent',
            icon: User,
            variant: 'outline' as const,
            className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800'
        }
    };

    const { label, icon: Icon, variant, className: styleClass } = config[role] || config.agent;

    return (
        <Badge variant={variant} className={`gap-1 pr-3 ${styleClass} ${className}`}>
            <Icon className="w-3 h-3" />
            {label}
        </Badge>
    );
}
