export const PASSWORD_RECOVERY_COOKIE = 'propflow-password-recovery'

export function isPasswordRecoveryRedirect(value: string | null | undefined): boolean {
    return value === 'PASSWORD_RECOVERY'
}
