import { NextResponse } from 'next/server'
import type { ZodIssue } from 'zod'

export interface ApiErrorDetail {
    field?: string
    message: string
    code?: string
}

interface ApiErrorOptions {
    status?: number
    code?: string
    details?: ApiErrorDetail[]
    headers?: HeadersInit
}

export function apiError(error: string, options: ApiErrorOptions = {}) {
    return NextResponse.json(
        {
            error,
            ...(options.code ? { code: options.code } : {}),
            ...(options.details && options.details.length > 0 ? { details: options.details } : {}),
        },
        {
            status: options.status ?? 500,
            headers: options.headers,
        }
    )
}

export function zodIssuesToDetails(issues: ZodIssue[]): ApiErrorDetail[] {
    return issues.map((issue) => ({
        field: issue.path.length > 0 ? issue.path.join('.') : undefined,
        message: issue.message,
        code: issue.code,
    }))
}

export function fieldErrorsToDetails(
    fieldErrors: Record<string, string[] | undefined>
): ApiErrorDetail[] {
    return Object.entries(fieldErrors).flatMap(([field, messages]) =>
        (messages ?? []).map((message) => ({
            field,
            message,
            code: 'invalid',
        }))
    )
}
