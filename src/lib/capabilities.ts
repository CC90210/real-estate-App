
// Define the tiers
export type SubscriptionTier = 'tier_1' | 'tier_2' | 'tier_3' | 'enterprise';

export interface TierConfig {
    label: string;
    features: string[];
    price: string;
    description: string;
    color: string;
}

export const TIERS: Record<SubscriptionTier, TierConfig> = {
    tier_1: {
        label: 'Essentials',
        features: ['crm', 'properties', 'dashboard'],
        price: '$29/mo',
        description: 'For solo agents starting their journey.',
        color: 'bg-slate-100 text-slate-600'
    },
    tier_2: {
        label: 'Professional',
        features: ['crm', 'properties', 'dashboard', 'documents', 'applications'],
        price: '$49/mo',
        description: 'Automate your paper trail.',
        color: 'bg-blue-100 text-blue-700'
    },
    tier_3: {
        label: 'Business Elite',
        features: ['crm', 'properties', 'dashboard', 'documents', 'applications', 'invoices', 'showings', 'approvals'],
        price: '$79/mo',
        description: 'Run your entire brokerage.',
        color: 'bg-indigo-100 text-indigo-700'
    },
    enterprise: {
        label: 'Enterprise',
        features: ['all', 'automations', 'priority_support'],
        price: 'Custom',
        description: 'Full-scale operations at scale.',
        color: 'bg-purple-100 text-purple-700'
    }
};

// Define capability requirements for features
export const FEATURE_GUARD: Record<string, SubscriptionTier[]> = {
    // Features only available to specific tiers and above
    'invoices': ['tier_3', 'enterprise'], // Tier 3+
    'documents': ['tier_2', 'tier_3', 'enterprise'], // Tier 2+
    'showings': ['tier_3', 'enterprise'], // Tier 3+
    'automations': ['enterprise'], // Enterprise Only (or upsell flag)
};

export function hasAccess(userTier: SubscriptionTier | string, feature: string, automationEnabled: boolean = false): boolean {
    if (!userTier) return false;

    // Enterprise always has base access, plus automation check
    if (userTier === 'enterprise') return true;

    // Check automation specifically
    if (feature === 'automations') {
        return automationEnabled || userTier === 'enterprise';
    }

    const allowedTiers = FEATURE_GUARD[feature];
    if (!allowedTiers) return true; // Feature lacks restriction, allow all

    return allowedTiers.includes(userTier as SubscriptionTier);
}
