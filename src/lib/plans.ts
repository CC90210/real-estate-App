export interface PlanFeatureSet {
    dashboard: boolean;
    properties: boolean;
    applications: boolean;
    documents: boolean;
    basicReporting: boolean;
    emailSupport: boolean;
    areas: boolean;
    approvals: boolean;
    leases: boolean;
    maintenance: boolean;
    showings: boolean;
    invoices: boolean;
    analytics: boolean;
    activity: boolean;
    automations: boolean;
    social: boolean;
    tenantPortal: boolean;
    paymentProcessing: boolean;
    customIntegrations: boolean;
    prioritySupport: boolean;
}

export interface PlanConfig {
    id: string;
    name: string;
    firstMonthPrice: number;
    monthlyPrice: number;
    limits: {
        properties: number;
        teamMembers: number;
    };
    features: PlanFeatureSet;
    nav: string[];
}

const essentialsConfig: PlanConfig = {
    id: 'agent_pro',
    name: 'Agent Pro',
    firstMonthPrice: 14900,
    monthlyPrice: 14900,
    limits: {
        properties: 25,
        teamMembers: 1,
    },
    features: {
        dashboard: true,
        properties: true,
        applications: true,
        documents: true,
        basicReporting: true,
        emailSupport: true,
        areas: false,
        approvals: false,
        leases: false,
        maintenance: false,
        showings: false,
        invoices: false,
        analytics: false,
        activity: false,
        automations: false,
        social: true,
        tenantPortal: false,
        paymentProcessing: false,
        customIntegrations: false,
        prioritySupport: false,
    },
    nav: [
        'dashboard',
        'properties',
        'applications',
        'documents',
        'social',
        'settings',
    ],
};

const professionalConfig: PlanConfig = {
    id: 'agency_growth',
    name: 'Agency Growth',
    firstMonthPrice: 28900,
    monthlyPrice: 28900,
    limits: {
        properties: 100,
        teamMembers: 5,
    },
    features: {
        dashboard: true,
        properties: true,
        applications: true,
        documents: true,
        basicReporting: true,
        emailSupport: true,
        areas: true,
        approvals: true,
        leases: true,
        maintenance: true,
        showings: true,
        invoices: true,
        analytics: true,
        activity: true,
        automations: true,
        social: true,
        tenantPortal: true,
        paymentProcessing: true,
        customIntegrations: false,
        prioritySupport: false,
    },
    nav: [
        'dashboard',
        'areas',
        'properties',
        'applications',
        'approvals',
        'leases',
        'maintenance',
        'showings',
        'invoices',
        'documents',
        'analytics',
        'activity',
        'social',
        'automations',
        'settings',
    ],
};

const enterpriseConfig: PlanConfig = {
    id: 'brokerage_command',
    name: 'Brokerage Command',
    firstMonthPrice: 49900,
    monthlyPrice: 49900,
    limits: {
        properties: Infinity,
        teamMembers: Infinity,
    },
    features: {
        dashboard: true,
        properties: true,
        applications: true,
        documents: true,
        basicReporting: true,
        emailSupport: true,
        areas: true,
        approvals: true,
        leases: true,
        maintenance: true,
        showings: true,
        invoices: true,
        analytics: true,
        activity: true,
        automations: true,
        social: true,
        tenantPortal: true,
        paymentProcessing: true,
        customIntegrations: true,
        prioritySupport: true,
    },
    nav: [
        'dashboard',
        'areas',
        'properties',
        'applications',
        'approvals',
        'leases',
        'maintenance',
        'showings',
        'invoices',
        'documents',
        'analytics',
        'activity',
        'social',
        'automations',
        'settings',
    ],
};

export const PLANS = {
    // Legacy mapping
    essentials: essentialsConfig,
    professional: professionalConfig,
    enterprise: enterpriseConfig,

    // Named plan aliases
    agent_pro: essentialsConfig,
    agency_growth: professionalConfig,
    brokerage_command: enterpriseConfig,
} as const;

export type PlanId = keyof typeof PLANS;
export type FeatureKey = keyof typeof PLANS.essentials.features;
