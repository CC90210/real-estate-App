function parseSuperAdminEmails(rawEmails: string | undefined): string[] {
    return (rawEmails || '')
        .split(',')
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean)
}

export function isServerSuperAdmin(email?: string | null, isSuperAdmin = false): boolean {
    if (isSuperAdmin) {
        return true
    }

    if (!email) {
        return false
    }

    const superAdminEmails = parseSuperAdminEmails(process.env.SUPER_ADMIN_EMAILS)
    return superAdminEmails.includes(email.trim().toLowerCase())
}
