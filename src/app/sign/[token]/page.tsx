'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
    CheckCircle2,
    AlertTriangle,
    Clock,
    FileSignature,
    Loader2,
    ShieldCheck,
    XCircle,
    Mail,
} from 'lucide-react'
import { format } from 'date-fns'

// ============================================================================
// TYPES
// ============================================================================

interface Branding {
    name: string
    logo_url: string | null
    primary_color: string | null
}

interface SigningRequestInfo {
    title: string
    recipient_name: string | null
    document_url: string | null
    status: string
    message: string | null
    expires_at: string | null
}

type PageState =
    | { phase: 'loading' }
    | { phase: 'error'; message: string }
    | { phase: 'expired' }
    | { phase: 'cancelled' }
    | { phase: 'already_signed'; title: string; recipient_name: string | null }
    | {
          phase: 'ready'
          signingRequest: SigningRequestInfo
          branding: Branding
      }
    | {
          phase: 'signed'
          title: string
          signedAt: string
          typedName: string
          branding: Branding
      }

// ============================================================================
// HELPERS
// ============================================================================

function accentStyle(color: string | null | undefined): React.CSSProperties {
    return { backgroundColor: color || '#3b82f6' }
}

function accentTextStyle(color: string | null | undefined): React.CSSProperties {
    return { color: color || '#3b82f6' }
}

function accentBorderStyle(color: string | null | undefined): React.CSSProperties {
    return { borderColor: color || '#3b82f6' }
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function BrandingHeader({ branding }: { branding: Branding }) {
    return (
        <div className="flex flex-col items-center gap-2 pb-6 border-b border-slate-100">
            {branding.logo_url ? (
                <img
                    src={branding.logo_url}
                    alt={branding.name}
                    className="h-12 w-auto object-contain"
                />
            ) : (
                <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center shadow-md"
                    style={accentStyle(branding.primary_color)}
                >
                    <FileSignature className="w-6 h-6 text-white" />
                </div>
            )}
            <p className="text-base font-black tracking-tight text-slate-900">{branding.name}</p>
        </div>
    )
}

function LoadingState() {
    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-md shadow-xl border-0">
                <CardContent className="flex flex-col items-center gap-4 py-12">
                    <Loader2 className="w-10 h-10 text-slate-300 animate-spin" />
                    <p className="text-slate-500 text-sm font-medium">Loading document...</p>
                </CardContent>
            </Card>
        </div>
    )
}

function ErrorState({ message }: { message: string }) {
    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-md shadow-xl border-0">
                <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center">
                        <XCircle className="w-8 h-8 text-red-500" />
                    </div>
                    <div>
                        <h2 className="text-lg font-black text-slate-900 mb-1">Unable to Load Document</h2>
                        <p className="text-slate-500 text-sm leading-relaxed">{message}</p>
                    </div>
                </CardContent>
            </Card>
            <PoweredByFooter />
        </div>
    )
}

function ExpiredState() {
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 gap-6">
            <Card className="w-full max-w-md shadow-xl border-0">
                <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center">
                        <Clock className="w-8 h-8 text-amber-500" />
                    </div>
                    <div>
                        <h2 className="text-lg font-black text-slate-900 mb-1">Link Expired</h2>
                        <p className="text-slate-500 text-sm leading-relaxed">
                            This signing link is no longer valid. Please contact the sender to request
                            a new link.
                        </p>
                    </div>
                    <div className="flex items-center gap-2 mt-2 text-slate-400 text-xs">
                        <Mail className="w-3.5 h-3.5" />
                        <span>Contact the sender to request a new signing link</span>
                    </div>
                </CardContent>
            </Card>
            <PoweredByFooter />
        </div>
    )
}

function CancelledState() {
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 gap-6">
            <Card className="w-full max-w-md shadow-xl border-0">
                <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
                        <XCircle className="w-8 h-8 text-slate-400" />
                    </div>
                    <div>
                        <h2 className="text-lg font-black text-slate-900 mb-1">Request Cancelled</h2>
                        <p className="text-slate-500 text-sm leading-relaxed">
                            This signing request has been cancelled by the sender. Please reach out
                            to them if you believe this is a mistake.
                        </p>
                    </div>
                    <div className="flex items-center gap-2 mt-2 text-slate-400 text-xs">
                        <Mail className="w-3.5 h-3.5" />
                        <span>Contact the sender for more information</span>
                    </div>
                </CardContent>
            </Card>
            <PoweredByFooter />
        </div>
    )
}

function AlreadySignedState({
    title,
    recipientName,
}: {
    title: string
    recipientName: string | null
}) {
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 gap-6">
            <Card className="w-full max-w-md shadow-xl border-0">
                <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center">
                        <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                    </div>
                    <div>
                        <h2 className="text-lg font-black text-slate-900 mb-1">Already Signed</h2>
                        {recipientName && (
                            <p className="text-slate-500 text-sm mb-1">Hi {recipientName},</p>
                        )}
                        <p className="text-slate-500 text-sm leading-relaxed">
                            You have already signed <strong className="text-slate-700">{title}</strong>.
                            No further action is required.
                        </p>
                    </div>
                </CardContent>
            </Card>
            <PoweredByFooter />
        </div>
    )
}

function SuccessState({
    title,
    signedAt,
    typedName,
    branding,
}: {
    title: string
    signedAt: string
    typedName: string
    branding: Branding
}) {
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 gap-6">
            <Card className="w-full max-w-md shadow-xl border-0">
                <CardHeader className="pb-0">
                    <BrandingHeader branding={branding} />
                </CardHeader>
                <CardContent className="flex flex-col items-center gap-6 py-8 text-center">
                    <div
                        className="w-20 h-20 rounded-full flex items-center justify-center shadow-lg"
                        style={{ backgroundColor: '#dcfce7' }}
                    >
                        <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                    </div>

                    <div>
                        <h2 className="text-xl font-black text-slate-900 mb-1">Document Signed</h2>
                        <p className="text-slate-500 text-sm">
                            Signed on {format(new Date(signedAt), 'MMMM d, yyyy \'at\' h:mm a')}
                        </p>
                    </div>

                    <div className="w-full bg-slate-50 rounded-xl border border-slate-100 p-4 space-y-3 text-left">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">
                                Document
                            </p>
                            <p className="text-sm font-semibold text-slate-900">{title}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">
                                Signed As
                            </p>
                            <p className="text-sm font-semibold text-slate-900 font-serif italic">
                                {typedName}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-400">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span>
                            Your electronic signature is legally binding and has been recorded.
                        </span>
                    </div>
                </CardContent>
            </Card>
            <PoweredByFooter />
        </div>
    )
}

function PoweredByFooter() {
    return (
        <p className="text-[11px] text-slate-400 font-medium">
            Powered by{' '}
            <span className="font-black text-slate-500">PropFlow</span>
        </p>
    )
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function SigningPage() {
    const params = useParams()
    const token = params?.token as string

    const [pageState, setPageState] = useState<PageState>({ phase: 'loading' })
    const [typedName, setTypedName] = useState('')
    const [agreed, setAgreed] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [submitError, setSubmitError] = useState<string | null>(null)

    const fetchDocument = useCallback(async () => {
        if (!token) {
            setPageState({ phase: 'error', message: 'Invalid signing link.' })
            return
        }

        try {
            const res = await fetch(`/api/signing/verify?token=${encodeURIComponent(token)}`)
            const data = await res.json() as {
                success?: boolean
                already_signed?: boolean
                signing_request?: SigningRequestInfo & { title: string; recipient_name: string | null }
                branding?: Branding
                error?: string
            }

            if (res.status === 410) {
                // Expired or cancelled
                const msg = data.error || ''
                if (msg.toLowerCase().includes('cancel')) {
                    setPageState({ phase: 'cancelled' })
                } else {
                    setPageState({ phase: 'expired' })
                }
                return
            }

            if (!res.ok || !data.success) {
                setPageState({
                    phase: 'error',
                    message: data.error || 'This signing link is invalid or could not be loaded.',
                })
                return
            }

            if (data.already_signed && data.signing_request) {
                setPageState({
                    phase: 'already_signed',
                    title: data.signing_request.title,
                    recipient_name: data.signing_request.recipient_name ?? null,
                })
                return
            }

            if (data.signing_request && data.branding) {
                setPageState({
                    phase: 'ready',
                    signingRequest: data.signing_request,
                    branding: data.branding,
                })
            } else {
                setPageState({
                    phase: 'error',
                    message: 'Unexpected response from server.',
                })
            }
        } catch {
            setPageState({
                phase: 'error',
                message: 'A network error occurred. Please check your connection and try again.',
            })
        }
    }, [token])

    useEffect(() => {
        fetchDocument()
    }, [fetchDocument])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!typedName.trim() || !agreed || pageState.phase !== 'ready') return

        setIsSubmitting(true)
        setSubmitError(null)

        try {
            const res = await fetch('/api/signing/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, typed_name: typedName.trim() }),
            })

            const data = await res.json() as { success?: boolean; error?: string }

            if (!res.ok || !data.success) {
                if (res.status === 409) {
                    // Already signed — race condition; re-fetch to show correct state
                    await fetchDocument()
                    return
                }
                setSubmitError(data.error || 'Failed to submit signature. Please try again.')
                return
            }

            const signedAt = new Date().toISOString()
            const { branding, signingRequest } = pageState

            setPageState({
                phase: 'signed',
                title: signingRequest.title,
                signedAt,
                typedName: typedName.trim(),
                branding,
            })
        } catch {
            setSubmitError('A network error occurred. Please check your connection and try again.')
        } finally {
            setIsSubmitting(false)
        }
    }

    // ---- Render phase-specific states ----

    if (pageState.phase === 'loading') return <LoadingState />
    if (pageState.phase === 'error') return <ErrorState message={pageState.message} />
    if (pageState.phase === 'expired') return <ExpiredState />
    if (pageState.phase === 'cancelled') return <CancelledState />
    if (pageState.phase === 'already_signed') {
        return (
            <AlreadySignedState
                title={pageState.title}
                recipientName={pageState.recipient_name}
            />
        )
    }
    if (pageState.phase === 'signed') {
        return (
            <SuccessState
                title={pageState.title}
                signedAt={pageState.signedAt}
                typedName={pageState.typedName}
                branding={pageState.branding}
            />
        )
    }

    // ---- Ready state: main signing UI ----

    const { signingRequest, branding } = pageState
    const accent = branding.primary_color || '#3b82f6'
    const canSign = typedName.trim().length > 0 && agreed && !isSubmitting

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 py-12 gap-6">
            <Card className="w-full max-w-lg shadow-xl border-0">
                {/* Header with branding */}
                <CardHeader className="pb-0">
                    <BrandingHeader branding={branding} />
                </CardHeader>

                <CardContent className="space-y-6 pt-6">
                    {/* Document info block */}
                    <div className="space-y-1">
                        <p
                            className="text-[10px] font-black uppercase tracking-widest"
                            style={accentTextStyle(accent)}
                        >
                            Signature Requested
                        </p>
                        <h1 className="text-xl font-black text-slate-900 leading-tight">
                            {signingRequest.title}
                        </h1>
                        {signingRequest.recipient_name && (
                            <p className="text-sm text-slate-500">
                                Hi{' '}
                                <span className="font-semibold text-slate-700">
                                    {signingRequest.recipient_name}
                                </span>
                                , please review and sign the document below.
                            </p>
                        )}
                    </div>

                    {/* Sender message */}
                    {signingRequest.message && (
                        <div
                            className="rounded-xl p-4 text-sm text-slate-700 italic leading-relaxed border-l-4"
                            style={{
                                backgroundColor: `${accent}10`,
                                ...accentBorderStyle(accent),
                            }}
                        >
                            &ldquo;{signingRequest.message}&rdquo;
                        </div>
                    )}

                    {/* Status badge */}
                    <div className="flex items-center gap-2">
                        <span
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold"
                            style={{
                                backgroundColor: `${accent}15`,
                                ...accentTextStyle(accent),
                            }}
                        >
                            <span
                                className="w-1.5 h-1.5 rounded-full inline-block"
                                style={accentStyle(accent)}
                            />
                            {signingRequest.status === 'viewed' ? 'Viewed — ready to sign' : 'Awaiting signature'}
                        </span>
                        {signingRequest.expires_at && (
                            <span className="text-xs text-slate-400">
                                Expires {format(new Date(signingRequest.expires_at), 'MMM d, yyyy')}
                            </span>
                        )}
                    </div>

                    {/* Document preview link */}
                    {signingRequest.document_url && (
                        <a
                            href={signingRequest.document_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-sm font-semibold rounded-xl border border-slate-200 bg-white px-4 py-3 hover:bg-slate-50 transition-colors"
                            style={accentTextStyle(accent)}
                        >
                            <FileSignature className="w-4 h-4 shrink-0" />
                            View Document
                        </a>
                    )}

                    {/* Signing form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-1.5">
                            <label
                                htmlFor="typed-name"
                                className="text-[10px] font-black uppercase tracking-widest text-slate-400"
                            >
                                Type Your Full Legal Name
                            </label>
                            <Input
                                id="typed-name"
                                type="text"
                                placeholder="e.g. Jane Marie Smith"
                                value={typedName}
                                onChange={(e) => setTypedName(e.target.value)}
                                className="h-11 rounded-xl text-base font-medium"
                                autoComplete="name"
                                disabled={isSubmitting}
                            />
                            {typedName.trim() && (
                                <p
                                    className="text-xl font-serif italic pl-1 mt-1"
                                    style={accentTextStyle(accent)}
                                >
                                    {typedName}
                                </p>
                            )}
                        </div>

                        {/* Legal agreement checkbox */}
                        <label className="flex items-start gap-3 cursor-pointer group">
                            <div className="relative mt-0.5 shrink-0">
                                <input
                                    type="checkbox"
                                    className="sr-only"
                                    checked={agreed}
                                    onChange={(e) => setAgreed(e.target.checked)}
                                    disabled={isSubmitting}
                                />
                                <div
                                    className="w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all"
                                    style={
                                        agreed
                                            ? { ...accentStyle(accent), borderColor: accent }
                                            : { borderColor: '#cbd5e1', backgroundColor: 'white' }
                                    }
                                >
                                    {agreed && (
                                        <svg
                                            className="w-3 h-3 text-white"
                                            viewBox="0 0 12 12"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        >
                                            <polyline points="2,6 5,9 10,3" />
                                        </svg>
                                    )}
                                </div>
                            </div>
                            <span className="text-xs text-slate-600 leading-relaxed select-none">
                                I agree that my typed name above constitutes a legally binding
                                electronic signature for{' '}
                                <strong className="text-slate-800">{signingRequest.title}</strong>,
                                with the same legal effect as a handwritten signature.
                            </span>
                        </label>

                        {/* Submit error */}
                        {submitError && (
                            <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-100 p-3">
                                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                                <p className="text-xs text-red-700 font-medium">{submitError}</p>
                            </div>
                        )}

                        {/* Submit button */}
                        <Button
                            type="submit"
                            disabled={!canSign}
                            className="w-full h-12 rounded-xl font-black text-white text-sm tracking-wide shadow-lg transition-all"
                            style={canSign ? accentStyle(accent) : {}}
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                    Signing...
                                </>
                            ) : (
                                <>
                                    <ShieldCheck className="w-4 h-4 mr-2" />
                                    Sign Document
                                </>
                            )}
                        </Button>
                    </form>

                    {/* Legal disclaimer */}
                    <p className="text-[11px] text-slate-400 leading-relaxed text-center border-t border-slate-100 pt-4">
                        By signing, you confirm you have read and agree to the document above.
                        Your signature is recorded with your IP address and timestamp for audit
                        purposes.
                    </p>
                </CardContent>
            </Card>

            <PoweredByFooter />
        </div>
    )
}
