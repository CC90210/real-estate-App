'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
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
    FileText,
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

interface DocumentPreview {
    title: string
    type: string
    content: unknown
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
          document: DocumentPreview | null
      }
    | {
          phase: 'signed'
          title: string
          signedAt: string
          typedName: string
          branding: Branding
      }

// ============================================================================
// DOCUMENT CONTENT TYPES
// ============================================================================

interface DocumentField {
    label: string
    value: string
}

interface DocumentSection {
    title: string
    fields: DocumentField[]
}

interface ParsedDocumentContent {
    sections: DocumentSection[]
    company?: { name?: string; address?: string }
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Attempt to extract structured sections from the document content JSONB.
 * The content may be stored as `{ sections: [...] }` directly, or nested
 * under `content.content.sections` depending on how the generator saved it.
 * Returns null when the content cannot be interpreted.
 */
function parseDocumentContent(raw: unknown): ParsedDocumentContent | null {
    if (!raw || typeof raw !== 'object') return null

    // Helper: check if a value looks like a valid sections array
    const isSectionsArray = (val: unknown): val is DocumentSection[] =>
        Array.isArray(val) &&
        val.length > 0 &&
        val.every(
            (s) =>
                s !== null &&
                typeof s === 'object' &&
                'title' in (s as object) &&
                'fields' in (s as object)
        )

    const candidate = raw as Record<string, unknown>

    // Direct: { sections: [...] }
    if (isSectionsArray(candidate.sections)) {
        return { sections: candidate.sections, company: candidate.company as ParsedDocumentContent['company'] }
    }

    // Nested: { content: { sections: [...] } }
    if (candidate.content && typeof candidate.content === 'object') {
        const inner = candidate.content as Record<string, unknown>
        if (isSectionsArray(inner.sections)) {
            return { sections: inner.sections, company: inner.company as ParsedDocumentContent['company'] }
        }
    }

    return null
}

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
// SIGNATURE CANVAS COMPONENT (inline — no separate file)
// ============================================================================

interface SignatureCanvasProps {
    accentColor: string
    onSignatureChange: (dataUrl: string | null) => void
    disabled?: boolean
}

function SignatureCanvas({ accentColor, onSignatureChange, disabled }: SignatureCanvasProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const isDrawingRef = useRef(false)
    const lastPosRef = useRef<{ x: number; y: number } | null>(null)
    const hasStrokesRef = useRef(false)

    const getPos = (
        canvas: HTMLCanvasElement,
        clientX: number,
        clientY: number
    ): { x: number; y: number } => {
        const rect = canvas.getBoundingClientRect()
        const scaleX = canvas.width / rect.width
        const scaleY = canvas.height / rect.height
        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY,
        }
    }

    const startDraw = useCallback(
        (pos: { x: number; y: number }) => {
            if (disabled) return
            const canvas = canvasRef.current
            if (!canvas) return
            const ctx = canvas.getContext('2d')
            if (!ctx) return

            isDrawingRef.current = true
            lastPosRef.current = pos

            ctx.beginPath()
            ctx.arc(pos.x, pos.y, 1, 0, Math.PI * 2)
            ctx.fillStyle = accentColor
            ctx.fill()
        },
        [accentColor, disabled]
    )

    const draw = useCallback(
        (pos: { x: number; y: number }) => {
            if (!isDrawingRef.current || disabled) return
            const canvas = canvasRef.current
            if (!canvas) return
            const ctx = canvas.getContext('2d')
            if (!ctx || !lastPosRef.current) return

            ctx.beginPath()
            ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y)
            ctx.lineTo(pos.x, pos.y)
            ctx.strokeStyle = accentColor
            ctx.lineWidth = 2
            ctx.lineCap = 'round'
            ctx.lineJoin = 'round'
            ctx.stroke()

            lastPosRef.current = pos
            hasStrokesRef.current = true
        },
        [accentColor, disabled]
    )

    const stopDraw = useCallback(() => {
        if (!isDrawingRef.current) return
        isDrawingRef.current = false
        lastPosRef.current = null

        const canvas = canvasRef.current
        if (canvas && hasStrokesRef.current) {
            onSignatureChange(canvas.toDataURL('image/png'))
        }
    }, [onSignatureChange])

    const clear = useCallback(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        hasStrokesRef.current = false
        onSignatureChange(null)
    }, [onSignatureChange])

    // Mouse events
    const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current
        if (!canvas) return
        startDraw(getPos(canvas, e.clientX, e.clientY))
    }

    const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current
        if (!canvas) return
        draw(getPos(canvas, e.clientX, e.clientY))
    }

    const handleMouseUp = () => stopDraw()
    const handleMouseLeave = () => stopDraw()

    // Touch events
    const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
        e.preventDefault()
        const canvas = canvasRef.current
        if (!canvas || e.touches.length === 0) return
        const t = e.touches[0]
        startDraw(getPos(canvas, t.clientX, t.clientY))
    }

    const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
        e.preventDefault()
        const canvas = canvasRef.current
        if (!canvas || e.touches.length === 0) return
        const t = e.touches[0]
        draw(getPos(canvas, t.clientX, t.clientY))
    }

    const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
        e.preventDefault()
        stopDraw()
    }

    return (
        <div className="space-y-2">
            <div
                className="relative rounded-xl border-2 overflow-hidden bg-white"
                style={{ borderColor: accentColor + '40' }}
            >
                <canvas
                    ref={canvasRef}
                    width={800}
                    height={200}
                    className="w-full touch-none block"
                    style={{
                        cursor: disabled ? 'default' : 'crosshair',
                        height: '150px',
                    }}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseLeave}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                />
                <div
                    className="absolute bottom-2 left-3 text-[10px] font-medium pointer-events-none select-none"
                    style={{ color: accentColor + '60' }}
                >
                    Sign here
                </div>
            </div>
            {!disabled && (
                <button
                    type="button"
                    onClick={clear}
                    className="text-xs text-slate-400 hover:text-slate-600 font-medium underline underline-offset-2 transition-colors"
                >
                    Clear signature
                </button>
            )}
        </div>
    )
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
                            Signed on {format(new Date(signedAt), "MMMM d, yyyy 'at' h:mm a")}
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
    const [signatureImage, setSignatureImage] = useState<string | null>(null)
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
                document?: DocumentPreview | null
                branding?: Branding
                error?: string
            }

            if (res.status === 410) {
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
                    document: data.document ?? null,
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
                body: JSON.stringify({
                    token,
                    typed_name: typedName.trim(),
                    signature_image: signatureImage ?? undefined,
                }),
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

    const { signingRequest, branding, document } = pageState
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

                    {/* Document preview — shown when document content exists in PropFlow */}
                    {document ? (
                        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                            <div
                                className="flex items-center gap-2 px-4 py-3 border-b border-slate-100"
                                style={{ backgroundColor: `${accent}08` }}
                            >
                                <FileText className="w-4 h-4 shrink-0" style={accentTextStyle(accent)} />
                                <span className="text-xs font-black uppercase tracking-widest" style={accentTextStyle(accent)}>
                                    Document Preview
                                </span>
                            </div>
                            {(() => {
                                const parsed = parseDocumentContent(document.content)
                                if (!parsed) {
                                    return (
                                        <div className="px-4 py-3 space-y-1">
                                            <p className="text-sm font-semibold text-slate-900">{document.title}</p>
                                            <p className="text-xs text-slate-500 leading-relaxed">
                                                Please review the document carefully before signing.
                                            </p>
                                        </div>
                                    )
                                }
                                return (
                                    <div className="px-5 py-4 space-y-5 max-h-[480px] overflow-y-auto">
                                        <h2 className="text-base font-black text-slate-900">{document.title}</h2>
                                        {parsed.company?.name && (
                                            <p className="text-xs text-slate-400">
                                                {parsed.company.name}
                                                {parsed.company.address ? ` · ${parsed.company.address}` : ''}
                                            </p>
                                        )}
                                        {parsed.sections.map((section, sIdx) => (
                                            <div key={sIdx} className="space-y-2">
                                                <p
                                                    className="text-[10px] font-black uppercase tracking-widest pb-1 border-b"
                                                    style={{ ...accentTextStyle(accent), borderColor: `${accent}30` }}
                                                >
                                                    {section.title}
                                                </p>
                                                <div className="space-y-1.5">
                                                    {section.fields.map((field, fIdx) => (
                                                        <div key={fIdx} className="flex gap-2 text-sm">
                                                            <span className="text-slate-400 font-medium shrink-0 min-w-[120px]">
                                                                {field.label}:
                                                            </span>
                                                            <span className="text-slate-800 font-semibold">
                                                                {field.value}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )
                            })()}
                        </div>
                    ) : signingRequest.document_url ? (
                        /* Fallback: external document URL link (no PropFlow login required) */
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
                    ) : null}

                    {/* Signing form */}
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Typed legal name */}
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

                        {/* Drawn signature pad */}
                        <div className="space-y-1.5">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                Draw Your Signature
                            </p>
                            <SignatureCanvas
                                accentColor={accent}
                                onSignatureChange={setSignatureImage}
                                disabled={isSubmitting}
                            />
                            <p className="text-[11px] text-slate-400">
                                Use your mouse or finger to draw your signature above.
                            </p>
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
                                I agree that my typed name and drawn signature above constitute a
                                legally binding electronic signature for{' '}
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
