// Configurable thresholds for tenant vetting
export const DEFAULT_VETTING_CONFIG = {
    income_to_rent_ratio: 3.0,   // Tenant must earn 3x rent (30% rule)
    min_credit_score: 650,
    require_background_check: true,
    max_dti_ratio: 0.43,         // Debt-to-income ratio
};

export type VettingConfig = typeof DEFAULT_VETTING_CONFIG;

export interface VettingFlag {
    type: 'critical' | 'warning' | 'info';
    code: string;
    message: string;
}

export interface VettingResult {
    overall: 'pass' | 'fail' | 'review';
    score: number; // 0-100
    flags: VettingFlag[];
    breakdown: {
        income: {
            status: 'pass' | 'fail' | 'review';
            ratio: number;
            required: number;
        };
        credit: {
            status: 'pass' | 'fail' | 'review';
            score: number | null;
            min: number;
        };
        background: {
            status: 'pass' | 'fail' | 'pending';
        };
        income_verification: {
            status: 'pass' | 'fail' | 'pending';
            declared: number;
            verified: number | null;
            discrepancy_pct: number | null;
        };
    };
}

// Application shape used by vetting — typed loosely to accept raw DB rows
interface ApplicationForVetting {
    monthly_income?: number | null;
    credit_score?: number | null;
    background_check_passed?: boolean | null;
    income_verified?: number | null;
}

export function runVetting(
    application: ApplicationForVetting,
    propertyRent: number,
    config: VettingConfig = DEFAULT_VETTING_CONFIG
): VettingResult {
    const flags: VettingFlag[] = [];

    // -------------------------------------------------------------------------
    // 1. Income check
    // -------------------------------------------------------------------------
    const monthlyIncome = application.monthly_income ?? 0;
    const incomeRatio = propertyRent > 0 ? monthlyIncome / propertyRent : 0;

    let incomeStatus: 'pass' | 'fail' | 'review';
    if (incomeRatio >= config.income_to_rent_ratio) {
        incomeStatus = 'pass';
    } else if (incomeRatio >= config.income_to_rent_ratio * 0.8) {
        // Within 20% of threshold — borderline
        incomeStatus = 'review';
        flags.push({
            type: 'warning',
            code: 'INCOME_BORDERLINE',
            message: `Income-to-rent ratio is ${incomeRatio.toFixed(2)}x, just below the required ${config.income_to_rent_ratio}x threshold.`,
        });
    } else {
        incomeStatus = 'fail';
        flags.push({
            type: 'critical',
            code: 'INCOME_INSUFFICIENT',
            message: `Income-to-rent ratio is ${incomeRatio.toFixed(2)}x, significantly below the required ${config.income_to_rent_ratio}x minimum.`,
        });
    }

    // -------------------------------------------------------------------------
    // 2. Credit score check
    // -------------------------------------------------------------------------
    const creditScore = application.credit_score ?? null;

    let creditStatus: 'pass' | 'fail' | 'review';
    if (creditScore === null) {
        creditStatus = 'review';
        flags.push({
            type: 'warning',
            code: 'CREDIT_MISSING',
            message: 'No credit score on file. Manual verification required.',
        });
    } else if (creditScore >= config.min_credit_score) {
        creditStatus = 'pass';
    } else if (creditScore >= config.min_credit_score - 50) {
        // Within 50 points of minimum — borderline
        creditStatus = 'review';
        flags.push({
            type: 'warning',
            code: 'CREDIT_BORDERLINE',
            message: `Credit score of ${creditScore} is below the minimum of ${config.min_credit_score} but within the review threshold.`,
        });
    } else {
        creditStatus = 'fail';
        flags.push({
            type: 'critical',
            code: 'CREDIT_INSUFFICIENT',
            message: `Credit score of ${creditScore} is below the required minimum of ${config.min_credit_score}.`,
        });
    }

    // -------------------------------------------------------------------------
    // 3. Background check
    // -------------------------------------------------------------------------
    const bgPassed = application.background_check_passed;

    let backgroundStatus: 'pass' | 'fail' | 'pending';
    if (bgPassed === null || bgPassed === undefined) {
        backgroundStatus = 'pending';
        if (config.require_background_check) {
            flags.push({
                type: 'warning',
                code: 'BACKGROUND_PENDING',
                message: 'Background check has not been completed.',
            });
        }
    } else if (bgPassed) {
        backgroundStatus = 'pass';
    } else {
        backgroundStatus = 'fail';
        flags.push({
            type: 'critical',
            code: 'BACKGROUND_FAILED',
            message: 'Background check did not pass.',
        });
    }

    // -------------------------------------------------------------------------
    // 4. Income verification
    // -------------------------------------------------------------------------
    const declared = monthlyIncome;
    const verified = application.income_verified ?? null;

    let incomeVerificationStatus: 'pass' | 'fail' | 'pending';
    let discrepancyPct: number | null = null;

    if (verified === null) {
        incomeVerificationStatus = 'pending';
        flags.push({
            type: 'info',
            code: 'INCOME_UNVERIFIED',
            message: 'Income has not been independently verified yet.',
        });
    } else {
        // Discrepancy as a fraction of declared income
        discrepancyPct = declared > 0 ? Math.abs(declared - verified) / declared : 0;

        if (discrepancyPct > 0.15) {
            incomeVerificationStatus = 'fail';
            flags.push({
                type: 'critical',
                code: 'INCOME_DISCREPANCY',
                message: `Verified income ($${verified.toLocaleString()}) differs from declared income ($${declared.toLocaleString()}) by ${(discrepancyPct * 100).toFixed(1)}%, exceeding the 15% threshold.`,
            });
        } else {
            incomeVerificationStatus = 'pass';
        }
    }

    // -------------------------------------------------------------------------
    // 5. Score calculation (0-100)
    // -------------------------------------------------------------------------

    // Income: 30 points — proportional to ratio, capped at 4x
    const incomePoints = Math.min(30, (incomeRatio / 4) * 30);

    // Credit: 30 points — proportional from 500 to 850
    const creditRange = 850 - 500; // 350 range
    const creditPoints =
        creditScore === null
            ? 0
            : Math.min(30, Math.max(0, ((creditScore - 500) / creditRange) * 30));

    // Background: 20 points — all or nothing; pending counts as 10
    const backgroundPoints =
        backgroundStatus === 'pass' ? 20 : backgroundStatus === 'pending' ? 10 : 0;

    // Income verification: 20 points — pass=20, pending=10, fail=0
    const verificationPoints =
        incomeVerificationStatus === 'pass'
            ? 20
            : incomeVerificationStatus === 'pending'
            ? 10
            : 0;

    const score = Math.round(incomePoints + creditPoints + backgroundPoints + verificationPoints);

    // -------------------------------------------------------------------------
    // 6. Overall determination
    // -------------------------------------------------------------------------
    const hasCriticalFlag = flags.some((f) => f.type === 'critical');

    let overall: 'pass' | 'fail' | 'review';
    if (hasCriticalFlag) {
        overall = 'fail';
    } else if (score >= 70) {
        overall = 'pass';
    } else {
        overall = 'review';
    }

    return {
        overall,
        score,
        flags,
        breakdown: {
            income: {
                status: incomeStatus,
                ratio: incomeRatio,
                required: config.income_to_rent_ratio,
            },
            credit: {
                status: creditStatus,
                score: creditScore,
                min: config.min_credit_score,
            },
            background: {
                status: backgroundStatus,
            },
            income_verification: {
                status: incomeVerificationStatus,
                declared,
                verified,
                discrepancy_pct: discrepancyPct,
            },
        },
    };
}
