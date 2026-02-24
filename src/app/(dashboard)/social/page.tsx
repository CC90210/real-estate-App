'use client'

import { useState, useEffect, useCallback } from 'react'
import { useUser } from '@/lib/hooks/useUser'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
    Share2, Plus, Send, Clock, CheckCircle2,
    Instagram, Linkedin, Facebook, Hash, Sparkles, Loader2,
    Trash2, Youtube, Globe, MessageCircle, Camera, MapPin,
    AtSign, Radio, Bookmark,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { useSearchParams } from 'next/navigation'

// ─── All 13 Late-supported platforms ─────────────────────────────
const PLATFORM_OPTIONS = [
    { id: 'instagram', name: 'Instagram', icon: Instagram, color: 'bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400' },
    { id: 'youtube', name: 'YouTube', icon: Youtube, color: 'bg-red-600' },
    { id: 'facebook', name: 'Facebook', icon: Facebook, color: 'bg-blue-600' },
    { id: 'linkedin', name: 'LinkedIn', icon: Linkedin, color: 'bg-blue-700' },
    { id: 'twitter', name: 'X / Twitter', icon: AtSign, color: 'bg-black' },
    { id: 'tiktok', name: 'TikTok', icon: Radio, color: 'bg-gray-900' },
    { id: 'threads', name: 'Threads', icon: MessageCircle, color: 'bg-gray-800' },
    { id: 'pinterest', name: 'Pinterest', icon: Bookmark, color: 'bg-red-700' },
    { id: 'reddit', name: 'Reddit', icon: Globe, color: 'bg-orange-600' },
    { id: 'bluesky', name: 'Bluesky', icon: Globe, color: 'bg-sky-500' },
    { id: 'googlebusiness', name: 'Google Business', icon: MapPin, color: 'bg-green-600' },
    { id: 'telegram', name: 'Telegram', icon: Send, color: 'bg-sky-500' },
    { id: 'snapchat', name: 'Snapchat', icon: Camera, color: 'bg-yellow-400' },
]

interface SocialAccount {
    id: string
    platform: string
    account_name: string
    account_avatar: string | null
    status: string
    connected_at: string
    late_account_id: string
}

interface SocialPost {
    id: string
    content: string
    platforms: string[]
    status: string
    scheduled_for: string | null
    published_at: string | null
    created_at: string
}

export default function SocialPage() {
    const { profile } = useUser()
    const supabase = createClient()
    const searchParams = useSearchParams()

    const [activeTab, setActiveTab] = useState<'accounts' | 'post' | 'history'>('accounts')
    const [accounts, setAccounts] = useState<SocialAccount[]>([])
    const [posts, setPosts] = useState<SocialPost[]>([])
    const [loading, setLoading] = useState(true)

    // Post form state
    const [postContent, setPostContent] = useState('')
    const [selectedAccounts, setSelectedAccounts] = useState<string[]>([])
    const [hashtagTopic, setHashtagTopic] = useState('')
    const [generatedHashtags, setGeneratedHashtags] = useState<string[]>([])
    const [selectedHashtags, setSelectedHashtags] = useState<string[]>([])
    const [publishing, setPublishing] = useState(false)
    const [generatingTags, setGeneratingTags] = useState(false)
    const [connecting, setConnecting] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)

    // Check for success/error from callback redirect
    useEffect(() => {
        const connected = searchParams.get('connected')
        const callbackError = searchParams.get('error')
        if (connected) {
            toast.success(`${connected} connected successfully!`)
            // Clean URL
            window.history.replaceState({}, '', '/social')
        }
        if (callbackError) {
            toast.error('Failed to connect account. Please try again.')
            window.history.replaceState({}, '', '/social')
        }
    }, [searchParams])

    const fetchData = useCallback(async () => {
        if (!profile?.company_id) return
        setLoading(true)
        try {
            const [accountsRes, postsRes] = await Promise.all([
                supabase
                    .from('social_accounts')
                    .select('id, platform, account_name, account_avatar, status, connected_at, late_account_id')
                    .eq('company_id', profile.company_id)
                    .order('connected_at', { ascending: false }),
                supabase
                    .from('social_posts')
                    .select('id, content, platforms, status, scheduled_for, published_at, created_at')
                    .eq('company_id', profile.company_id)
                    .order('created_at', { ascending: false })
                    .range(0, 19),
            ])

            setAccounts(accountsRes.data || [])
            setPosts(postsRes.data || [])
        } catch (err) {
            console.error('Failed to fetch social data:', err)
        } finally {
            setLoading(false)
        }
    }, [profile?.company_id, supabase])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    async function handleConnect(platform: string) {
        setConnecting(platform)
        setError(null)
        try {
            const res = await fetch('/api/social/connect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ platform }),
            })
            const data = await res.json()

            if (data.error) {
                setError(data.error)
                toast.error(data.error)
                return
            }

            if (data.authUrl) {
                // Redirect to Late's OAuth page
                window.location.href = data.authUrl
            } else {
                setError('No authorization URL returned. Please try again.')
            }
        } catch (err: any) {
            const msg = err.message || 'Failed to connect platform'
            setError(msg)
            toast.error(msg)
        } finally {
            setConnecting(null)
        }
    }

    async function handleDisconnect(accountId: string) {
        try {
            await supabase
                .from('social_accounts')
                .update({ status: 'disconnected' })
                .eq('id', accountId)
            toast.success('Account disconnected')
            fetchData()
        } catch {
            toast.error('Failed to disconnect')
        }
    }

    async function generateHashtags() {
        if (!hashtagTopic.trim()) return
        setGeneratingTags(true)
        try {
            const res = await fetch('/api/social/hashtags', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ topic: hashtagTopic, count: 15 }),
            })
            const data = await res.json()
            setGeneratedHashtags(data.hashtags || [])
        } catch {
            toast.error('Failed to generate hashtags')
        } finally {
            setGeneratingTags(false)
        }
    }

    async function handlePublish(publishNow: boolean) {
        if (!postContent.trim()) {
            toast.error('Post content is required')
            return
        }
        if (selectedAccounts.length === 0) {
            toast.error('Select at least one platform to post to')
            return
        }
        setPublishing(true)
        try {
            const res = await fetch('/api/social/post', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: postContent,
                    hashtags: selectedHashtags,
                    platformAccountIds: selectedAccounts,
                    publishNow,
                }),
            })
            const data = await res.json()

            if (data.error) {
                toast.error(data.error)
                return
            }

            toast.success(publishNow ? 'Post published successfully!' : 'Post saved as draft!')
            setPostContent('')
            setSelectedAccounts([])
            setSelectedHashtags([])
            setGeneratedHashtags([])
            setHashtagTopic('')
            fetchData()
            setActiveTab('history')
        } catch {
            toast.error('Failed to publish post')
        } finally {
            setPublishing(false)
        }
    }

    const activeAccounts = accounts.filter(a => a.status === 'active')
    const charCount = postContent.length

    if (loading) {
        return (
            <div className="p-6 animate-pulse space-y-4">
                <div className="h-8 bg-gray-200 rounded w-1/3" />
                <div className="h-4 bg-gray-200 rounded w-2/3" />
                <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4 mt-6">
                    {Array.from({ length: 10 }).map((_, i) => <div key={i} className="h-28 bg-gray-200 rounded-xl" />)}
                </div>
            </div>
        )
    }

    return (
        <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">Social Media Suite</h1>
                <p className="text-sm text-slate-500 font-medium mt-1">
                    Connect your social accounts, schedule posts, and grow your brand — all powered by&nbsp;
                    <a href="https://getlate.dev" target="_blank" rel="noopener" className="text-blue-600 hover:underline font-bold">Late</a>.
                </p>
            </div>

            {/* Error Banner */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-800 px-5 py-3 rounded-xl text-sm font-medium flex items-center gap-3">
                    <span>⚠️ {error}</span>
                    <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-700 font-bold text-lg">✕</button>
                </div>
            )}

            {/* Tab Navigation */}
            <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit">
                {[
                    { key: 'accounts' as const, label: `Platforms (${activeAccounts.length})` },
                    { key: 'post' as const, label: 'Create Post' },
                    { key: 'history' as const, label: 'Post History' },
                ].map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={cn(
                            'px-4 py-2 rounded-lg text-sm font-bold transition-all',
                            activeTab === tab.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                        )}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* ═══════════════════ ACCOUNTS TAB ═══════════════════ */}
            {activeTab === 'accounts' && (
                <div className="space-y-6">
                    {/* Connected Accounts */}
                    {activeAccounts.length > 0 && (
                        <div>
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Connected Accounts</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {activeAccounts.map(account => {
                                    const platformInfo = PLATFORM_OPTIONS.find(p => p.id === account.platform)
                                    return (
                                        <div key={account.id} className="p-5 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all flex items-center gap-4 group">
                                            <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center text-white flex-shrink-0', platformInfo?.color || 'bg-gray-600')}>
                                                {platformInfo ? <platformInfo.icon className="w-6 h-6" /> : <Share2 className="w-6 h-6" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-slate-900 text-sm truncate">{account.account_name || account.platform}</p>
                                                <p className="text-xs text-slate-400 font-medium capitalize">{platformInfo?.name || account.platform}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                                <button
                                                    onClick={() => handleDisconnect(account.id)}
                                                    className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                                    title="Disconnect"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    {/* Connect new platform grid — ALL 13 platforms */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                        <h3 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
                            <Plus className="w-5 h-5" /> Connect a Platform
                        </h3>
                        <p className="text-xs text-slate-500 mb-5">
                            Click to connect your social media accounts. You&apos;ll be redirected to authorize access.
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-3">
                            {PLATFORM_OPTIONS.map(platform => {
                                const isConnected = activeAccounts.some(a => a.platform === platform.id)
                                const isConnecting = connecting === platform.id
                                return (
                                    <button
                                        key={platform.id}
                                        onClick={() => !isConnected && !isConnecting && handleConnect(platform.id)}
                                        disabled={isConnected || connecting !== null}
                                        className={cn(
                                            'p-4 rounded-xl border-2 text-center transition-all ease-out',
                                            isConnected
                                                ? 'border-emerald-200 bg-emerald-50 cursor-default'
                                                : isConnecting
                                                    ? 'border-blue-200 bg-blue-50 cursor-wait'
                                                    : 'border-slate-100 hover:border-blue-200 hover:-translate-y-1 hover:shadow-lg bg-white cursor-pointer'
                                        )}
                                    >
                                        <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center mx-auto mb-2 text-white transition-transform', platform.color)}>
                                            {isConnecting ? (
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                            ) : (
                                                <platform.icon className="w-5 h-5" />
                                            )}
                                        </div>
                                        <p className="text-xs font-bold text-slate-700 leading-tight">{platform.name}</p>
                                        {isConnected && <p className="text-[10px] text-emerald-600 font-bold mt-1">✓ Connected</p>}
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* ═══════════════════ POST TAB ═══════════════════ */}
            {activeTab === 'post' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Post Editor */}
                    <div className="lg:col-span-2 space-y-4">
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                            <textarea
                                value={postContent}
                                onChange={(e) => setPostContent(e.target.value)}
                                placeholder="Write your post... Share a listing, market update, open house, or industry insight."
                                className="w-full h-40 resize-none text-sm text-slate-900 font-medium border-0 focus:ring-0 focus:outline-none placeholder:text-slate-400"
                                maxLength={2200}
                            />
                            <div className="flex items-center justify-between border-t border-slate-100 pt-3 mt-3">
                                <span className={cn('text-xs font-bold', charCount > 280 ? 'text-orange-500' : 'text-slate-400')}>
                                    {charCount} / 2,200 characters
                                </span>
                                {charCount > 280 && (
                                    <span className="text-[10px] text-orange-500 font-medium">
                                        Note: Twitter/X limits to 280 chars
                                    </span>
                                )}
                            </div>

                            {/* Hashtag Generator */}
                            <div className="border-t border-slate-100 pt-4 mt-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <Hash className="w-4 h-4 text-blue-500" />
                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">AI Hashtag Generator</span>
                                </div>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={hashtagTopic}
                                        onChange={(e) => setHashtagTopic(e.target.value)}
                                        placeholder="e.g. luxury condos in Miami, open house, new listing"
                                        className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none text-slate-900"
                                        onKeyDown={(e) => e.key === 'Enter' && generateHashtags()}
                                    />
                                    <Button
                                        onClick={generateHashtags}
                                        disabled={generatingTags || !hashtagTopic.trim()}
                                        size="sm"
                                        className="bg-blue-600 hover:bg-blue-700 px-4"
                                    >
                                        {generatingTags ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Sparkles className="w-4 h-4 mr-1" /> Generate</>}
                                    </Button>
                                </div>

                                {generatedHashtags.length > 0 && (
                                    <div className="mt-3">
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2">
                                            Click to add ({selectedHashtags.length} selected)
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            {generatedHashtags.map((tag, i) => {
                                                const isSelected = selectedHashtags.includes(tag)
                                                return (
                                                    <button
                                                        key={i}
                                                        onClick={() => setSelectedHashtags(prev =>
                                                            isSelected ? prev.filter(t => t !== tag) : [...prev, tag]
                                                        )}
                                                        className={cn(
                                                            'text-xs px-3 py-1.5 rounded-full font-bold transition-all',
                                                            isSelected
                                                                ? 'bg-blue-600 text-white shadow-md scale-105'
                                                                : 'bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-blue-600'
                                                        )}
                                                    >
                                                        #{tag}
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3">
                            <Button
                                onClick={() => handlePublish(true)}
                                disabled={publishing || !postContent.trim() || selectedAccounts.length === 0}
                                className="bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200 font-bold"
                            >
                                {publishing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                                Post Now
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => handlePublish(false)}
                                disabled={publishing || !postContent.trim()}
                                className="font-bold"
                            >
                                <Clock className="w-4 h-4 mr-2" /> Save Draft
                            </Button>
                        </div>
                    </div>

                    {/* Platform Selector Sidebar */}
                    <div className="space-y-4">
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Post To</h3>
                            {activeAccounts.length > 0 ? (
                                <div className="space-y-2">
                                    {activeAccounts.map(account => {
                                        const platformInfo = PLATFORM_OPTIONS.find(p => p.id === account.platform)
                                        const isSelected = selectedAccounts.includes(account.id)
                                        return (
                                            <button
                                                key={account.id}
                                                onClick={() => setSelectedAccounts(prev =>
                                                    isSelected ? prev.filter(id => id !== account.id) : [...prev, account.id]
                                                )}
                                                className={cn(
                                                    'w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left',
                                                    isSelected
                                                        ? 'bg-blue-50 border-2 border-blue-300 shadow-sm'
                                                        : 'border-2 border-transparent hover:bg-slate-50'
                                                )}
                                            >
                                                <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center text-white flex-shrink-0', platformInfo?.color || 'bg-gray-600')}>
                                                    {platformInfo ? <platformInfo.icon className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
                                                </div>
                                                <span className="text-sm font-bold text-slate-700 truncate">{account.account_name || account.platform}</span>
                                                {isSelected && <CheckCircle2 className="w-4 h-4 text-blue-600 ml-auto flex-shrink-0" />}
                                            </button>
                                        )
                                    })}
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <Share2 className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                                    <p className="text-sm text-slate-500 font-medium mb-1">No accounts connected</p>
                                    <p className="text-xs text-slate-400">
                                        <button
                                            onClick={() => setActiveTab('accounts')}
                                            className="text-blue-600 hover:underline font-bold"
                                        >
                                            Connect a platform →
                                        </button>
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Quick Character Limits Reference */}
                        <div className="bg-slate-50 rounded-2xl border border-slate-100 p-5">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Character Limits</h3>
                            <div className="space-y-2 text-xs text-slate-500">
                                <div className="flex justify-between"><span>Twitter/X</span><span className="font-bold">280</span></div>
                                <div className="flex justify-between"><span>LinkedIn</span><span className="font-bold">3,000</span></div>
                                <div className="flex justify-between"><span>Facebook</span><span className="font-bold">63,206</span></div>
                                <div className="flex justify-between"><span>Instagram</span><span className="font-bold">2,200</span></div>
                                <div className="flex justify-between"><span>TikTok</span><span className="font-bold">2,200</span></div>
                                <div className="flex justify-between"><span>YouTube</span><span className="font-bold">5,000</span></div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══════════════════ HISTORY TAB ═══════════════════ */}
            {activeTab === 'history' && (
                <div className="space-y-4">
                    {posts.length > 0 ? (
                        posts.map(post => (
                            <div key={post.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:shadow-md transition-all">
                                <p className="text-sm text-slate-800 font-medium whitespace-pre-wrap">{post.content}</p>
                                <div className="flex items-center gap-3 mt-4 pt-3 border-t border-slate-50">
                                    <span className={cn(
                                        'text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full',
                                        post.status === 'published' ? 'bg-emerald-100 text-emerald-700' :
                                            post.status === 'scheduled' ? 'bg-blue-100 text-blue-700' :
                                                post.status === 'failed' ? 'bg-red-100 text-red-700' :
                                                    'bg-slate-100 text-slate-500'
                                    )}>
                                        {post.status}
                                    </span>
                                    <div className="flex gap-1">
                                        {post.platforms?.map((p, i) => {
                                            const info = PLATFORM_OPTIONS.find(opt => opt.id === p)
                                            return info ? (
                                                <div key={i} className={cn('w-5 h-5 rounded flex items-center justify-center text-white', info.color)} title={info.name}>
                                                    <info.icon className="w-3 h-3" />
                                                </div>
                                            ) : null
                                        })}
                                    </div>
                                    <span className="text-[10px] text-slate-400 ml-auto font-medium">
                                        {new Date(post.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </span>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-20">
                            <Share2 className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                            <p className="text-lg font-bold text-slate-400">No posts yet</p>
                            <p className="text-sm text-slate-400 mt-1">
                                <button onClick={() => setActiveTab('post')} className="text-blue-600 hover:underline font-bold">
                                    Create your first post →
                                </button>
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
