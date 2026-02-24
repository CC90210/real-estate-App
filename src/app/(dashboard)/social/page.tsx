'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@/lib/hooks/useUser'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
    Share2, Plus, Send, Clock, CheckCircle2, AlertCircle,
    Instagram, Linkedin, Facebook, Hash, Sparkles, Loader2, ExternalLink,
    Trash2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

const PLATFORM_OPTIONS = [
    { id: 'instagram', name: 'Instagram', icon: Instagram, color: 'bg-gradient-to-br from-purple-500 to-pink-500' },
    { id: 'linkedin', name: 'LinkedIn', icon: Linkedin, color: 'bg-blue-700' },
    { id: 'facebook', name: 'Facebook', icon: Facebook, color: 'bg-blue-600' },
    { id: 'twitter', name: 'X / Twitter', icon: Share2, color: 'bg-black' },
    { id: 'tiktok', name: 'TikTok', icon: Share2, color: 'bg-gray-900' },
]

interface SocialAccount {
    id: string
    platform: string
    account_name: string
    account_avatar: string | null
    status: string
    connected_at: string
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
    const { user, profile } = useUser()
    const supabase = createClient()
    const [activeTab, setActiveTab] = useState<'accounts' | 'post'>('accounts')
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

    useEffect(() => {
        if (profile?.company_id) {
            fetchData()
        }
    }, [profile?.company_id])

    async function fetchData() {
        setLoading(true)
        try {
            const [accountsRes, postsRes] = await Promise.all([
                supabase
                    .from('social_accounts')
                    .select('id, platform, account_name, account_avatar, status, connected_at')
                    .eq('company_id', profile?.company_id)
                    .order('connected_at', { ascending: false }),
                supabase
                    .from('social_posts')
                    .select('id, content, platforms, status, scheduled_for, published_at, created_at')
                    .eq('company_id', profile?.company_id)
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
    }

    async function handleConnect(platform: string) {
        setConnecting(platform)
        try {
            // First ensure we have a Late profile
            await fetch('/api/social/profile', { method: 'POST' })

            // Then get OAuth URL
            const res = await fetch('/api/social/connect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ platform }),
            })
            const data = await res.json()

            if (data.error) {
                toast.error(data.error)
                return
            }

            if (data.authUrl) {
                window.location.href = data.authUrl
            }
        } catch (err: any) {
            toast.error(err.message || 'Failed to connect platform')
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
            toast.error('Select at least one platform')
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

            toast.success(publishNow ? 'Post published!' : 'Post saved!')
            setPostContent('')
            setSelectedAccounts([])
            setSelectedHashtags([])
            setGeneratedHashtags([])
            fetchData()
        } catch {
            toast.error('Failed to publish post')
        } finally {
            setPublishing(false)
        }
    }

    const activeAccounts = accounts.filter(a => a.status === 'active')

    if (loading) {
        return (
            <div className="p-6 animate-pulse space-y-4">
                <div className="h-8 bg-gray-200 rounded w-1/3" />
                <div className="h-4 bg-gray-200 rounded w-2/3" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                    {[1, 2, 3].map(i => <div key={i} className="h-32 bg-gray-200 rounded-xl" />)}
                </div>
            </div>
        )
    }

    return (
        <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">Social Media Suite</h1>
                    <p className="text-sm text-slate-500 font-medium mt-1">Connect accounts, create posts, and grow your social presence.</p>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-2 p-1 bg-slate-100 rounded-xl w-fit">
                <button
                    onClick={() => setActiveTab('accounts')}
                    className={cn(
                        'px-4 py-2 rounded-lg text-sm font-bold transition-all',
                        activeTab === 'accounts' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    )}
                >
                    Connected Accounts ({activeAccounts.length})
                </button>
                <button
                    onClick={() => setActiveTab('post')}
                    className={cn(
                        'px-4 py-2 rounded-lg text-sm font-bold transition-all',
                        activeTab === 'post' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    )}
                >
                    Create Post
                </button>
            </div>

            {/* ACCOUNTS TAB */}
            {activeTab === 'accounts' && (
                <div className="space-y-6">
                    {/* Connected Accounts */}
                    {activeAccounts.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {activeAccounts.map(account => {
                                const platformInfo = PLATFORM_OPTIONS.find(p => p.id === account.platform)
                                return (
                                    <div key={account.id} className="p-5 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all flex items-center gap-4">
                                        <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center text-white flex-shrink-0', platformInfo?.color || 'bg-gray-600')}>
                                            {platformInfo ? <platformInfo.icon className="w-6 h-6" /> : <Share2 className="w-6 h-6" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-slate-900 text-sm truncate">{account.account_name || account.platform}</p>
                                            <p className="text-xs text-slate-400 font-medium capitalize">{account.platform}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                            <button
                                                onClick={() => handleDisconnect(account.id)}
                                                className="text-slate-300 hover:text-red-500 transition-colors"
                                                title="Disconnect"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}

                    {/* Connect new platform */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                        <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                            <Plus className="w-5 h-5" /> Connect a Platform
                        </h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                            {PLATFORM_OPTIONS.map(platform => {
                                const isConnected = activeAccounts.some(a => a.platform === platform.id)
                                return (
                                    <button
                                        key={platform.id}
                                        onClick={() => !isConnected && handleConnect(platform.id)}
                                        disabled={isConnected || connecting !== null}
                                        className={cn(
                                            'p-4 rounded-xl border-2 text-center transition-all hover:-translate-y-0.5 hover:shadow-lg',
                                            isConnected
                                                ? 'border-emerald-200 bg-emerald-50 opacity-60 cursor-default'
                                                : 'border-slate-100 hover:border-blue-200 bg-white cursor-pointer'
                                        )}
                                    >
                                        <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center mx-auto mb-2 text-white', platform.color)}>
                                            {connecting === platform.id ? (
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                            ) : (
                                                <platform.icon className="w-5 h-5" />
                                            )}
                                        </div>
                                        <p className="text-xs font-bold text-slate-700">{platform.name}</p>
                                        {isConnected && <p className="text-[10px] text-emerald-600 font-bold mt-1">Connected</p>}
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* POST TAB */}
            {activeTab === 'post' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Post Editor */}
                    <div className="lg:col-span-2 space-y-4">
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                            <textarea
                                value={postContent}
                                onChange={(e) => setPostContent(e.target.value)}
                                placeholder="What's happening in your market? Share a listing, market update, or insight..."
                                className="w-full h-40 resize-none text-sm text-slate-900 font-medium border-0 focus:ring-0 focus:outline-none placeholder:text-slate-400"
                            />

                            {/* Hashtag Generator */}
                            <div className="border-t border-slate-100 pt-4 mt-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <Hash className="w-4 h-4 text-slate-400" />
                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">AI Hashtag Generator</span>
                                </div>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={hashtagTopic}
                                        onChange={(e) => setHashtagTopic(e.target.value)}
                                        placeholder="Enter a topic (e.g., 'luxury condos in Miami')"
                                        className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none text-slate-900"
                                        onKeyDown={(e) => e.key === 'Enter' && generateHashtags()}
                                    />
                                    <Button
                                        onClick={generateHashtags}
                                        disabled={generatingTags || !hashtagTopic.trim()}
                                        size="sm"
                                        className="bg-blue-600 hover:bg-blue-700"
                                    >
                                        {generatingTags ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                    </Button>
                                </div>

                                {generatedHashtags.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mt-3">
                                        {generatedHashtags.map((tag, i) => {
                                            const isSelected = selectedHashtags.includes(tag)
                                            return (
                                                <button
                                                    key={i}
                                                    onClick={() => {
                                                        setSelectedHashtags(prev =>
                                                            isSelected ? prev.filter(t => t !== tag) : [...prev, tag]
                                                        )
                                                    }}
                                                    className={cn(
                                                        'text-xs px-3 py-1.5 rounded-full font-bold transition-all',
                                                        isSelected
                                                            ? 'bg-blue-600 text-white shadow-md'
                                                            : 'bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-blue-600'
                                                    )}
                                                >
                                                    #{tag}
                                                </button>
                                            )
                                        })}
                                    </div>
                                )}

                                {selectedHashtags.length > 0 && (
                                    <p className="text-xs text-slate-400 mt-2">{selectedHashtags.length} hashtags selected</p>
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

                    {/* Platform Selector */}
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
                                                onClick={() => {
                                                    setSelectedAccounts(prev =>
                                                        isSelected ? prev.filter(id => id !== account.id) : [...prev, account.id]
                                                    )
                                                }}
                                                className={cn(
                                                    'w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left',
                                                    isSelected
                                                        ? 'bg-blue-50 border-2 border-blue-200'
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
                                <div className="text-center py-6">
                                    <Share2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                                    <p className="text-xs text-slate-400 font-medium">
                                        No accounts connected yet.
                                        <button
                                            onClick={() => setActiveTab('accounts')}
                                            className="text-blue-600 hover:underline ml-1 font-bold"
                                        >
                                            Connect one →
                                        </button>
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Recent Posts */}
                        {posts.length > 0 && (
                            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Recent Posts</h3>
                                <div className="space-y-3">
                                    {posts.slice(0, 5).map(post => (
                                        <div key={post.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                                            <p className="text-xs text-slate-700 font-medium line-clamp-2">{post.content}</p>
                                            <div className="flex items-center gap-2 mt-2">
                                                <span className={cn(
                                                    'text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full',
                                                    post.status === 'published' ? 'bg-emerald-100 text-emerald-700' :
                                                        post.status === 'scheduled' ? 'bg-blue-100 text-blue-700' :
                                                            post.status === 'failed' ? 'bg-red-100 text-red-700' :
                                                                'bg-slate-100 text-slate-500'
                                                )}>
                                                    {post.status}
                                                </span>
                                                <span className="text-[10px] text-slate-400 ml-auto">
                                                    {new Date(post.created_at).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
