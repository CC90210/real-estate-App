
import { createClient } from '@/lib/supabase/server';
import {
    Building2,
    Users,
    FileText,
    ArrowRight,
    Activity,
    Calendar,
    TrendingUp,
    DollarSign,
    CheckCircle2,
    Clock,
    Sparkles
} from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

export default async function DashboardPage() {
    const supabase = await createClient();

    // Fetch Portfolio Financials
    const { data: properties } = await supabase
        .from('properties')
        .select('rent, status, bedrooms, bathrooms');

    const totalMonthlyRent = properties?.reduce((sum, p) => sum + (Number(p.rent) || 0), 0) || 0;
    const annualRent = totalMonthlyRent * 12;

    // Using a mock portfolio value since field might not exist or be empty
    const mockTotalValue = (properties?.length || 0) * 450000;
    const portfolioYield = mockTotalValue > 0 ? (annualRent / mockTotalValue) * 100 : 0;

    const totalProperties = properties?.length || 0;
    const availableCount = properties?.filter(p => p.status === 'available').length || 0;
    const occupiedCount = totalProperties - availableCount;

    const { count: applicationCount } = await supabase
        .from('applications')
        .select('*', { count: 'exact', head: true });

    const { data: recentApplications } = await supabase
        .from('applications')
        .select('*, properties(address)')
        .order('created_at', { ascending: false })
        .limit(3);

    // Fetch Recent Activity
    const { data: recentActivity } = await supabase
        .from('activity_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(4);

    return (
        <div className="space-y-10 pb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 bg-white p-8 rounded-3xl border border-slate-200/60 shadow-sm">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <div className="px-2 py-0.5 rounded-md bg-blue-50 text-[10px] font-bold text-blue-600 border border-blue-100 uppercase tracking-widest">Performance Active</div>
                    </div>
                    <h1 className="text-4xl font-black tracking-tight text-slate-900">Portfolio Overview</h1>
                    <p className="text-slate-500 mt-2 font-medium">Welcome back. Your portfolio is currently generating <span className="text-slate-900 font-bold">${totalMonthlyRent.toLocaleString()}</span> in monthly revenue.</p>
                </div>
                <div className="flex gap-3">
                    <Link href="/documents">
                        <button className="px-6 py-3 bg-slate-900 text-white rounded-2xl font-bold text-sm shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all active:scale-95 flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-blue-400 fill-blue-400" />
                            AI Documents
                        </button>
                    </Link>
                </div>
            </div>

            {/* Premium Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Monthly Revenue"
                    value={`$${(totalMonthlyRent / 1000).toFixed(1)}k`}
                    description="Gross rental income"
                    icon={DollarSign}
                    trend="+4.2%"
                    color="text-blue-600"
                    bg="bg-blue-50"
                />
                <StatCard
                    title="Portfolio Yield"
                    value={`${portfolioYield.toFixed(1)}%`}
                    description="Est. annual return"
                    icon={TrendingUp}
                    trend="Stable"
                    color="text-emerald-600"
                    bg="bg-emerald-50"
                />
                <StatCard
                    title="Occupancy"
                    value={`${totalProperties > 0 ? Math.round((occupiedCount / totalProperties) * 100) : 0}%`}
                    description={`${occupiedCount} of ${totalProperties} units`}
                    icon={CheckCircle2}
                    color="text-indigo-600"
                    bg="bg-indigo-50"
                />
                <StatCard
                    title="New Leads"
                    value={applicationCount || 0}
                    description="Active screenings"
                    icon={Users}
                    trend="New"
                    color="text-orange-600"
                    bg="bg-orange-50"
                />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* Main Content Area */}
                <div className="xl:col-span-2 space-y-8">
                    {/* Recent Applications Card */}
                    <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white rounded-3xl overflow-hidden">
                        <CardHeader className="p-8 pb-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-xl font-black text-slate-900">Recent Applications</CardTitle>
                                    <CardDescription>Latest prospect interest across units</CardDescription>
                                </div>
                                <Link href="/applications" className="text-sm font-bold text-blue-600 hover:underline">View All</Link>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="divide-y divide-slate-100">
                                {recentApplications?.map((app: any) => (
                                    <div key={app.id} className="p-8 hover:bg-slate-50 transition-colors flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center font-bold text-slate-900 border border-slate-200">
                                                {app.applicant_name?.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-900">{app.applicant_name}</p>
                                                <p className="text-xs text-slate-500 font-medium">{app.properties?.address}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className={cn(
                                                "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                                                app.status === 'pending' ? "bg-amber-50 text-amber-600 border-amber-100" :
                                                    app.status === 'screening' ? "bg-blue-50 text-blue-600 border-blue-100" :
                                                        "bg-emerald-50 text-emerald-600 border-emerald-100"
                                            )}>
                                                {app.status}
                                            </div>
                                            <p className="text-[10px] text-slate-400 mt-2 font-bold">{formatDistanceToNow(new Date(app.created_at), { addSuffix: true })}</p>
                                        </div>
                                    </div>
                                ))}
                                {(!recentApplications || recentApplications.length === 0) && (
                                    <div className="p-12 text-center text-slate-400 font-medium italic">No recent applications found.</div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Quick Actions Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <QuickActionCard
                            title="Generate Ads"
                            desc="Create Gemini-powered marketing"
                            icon={Sparkles}
                            href="/areas"
                            color="blue"
                        />
                        <QuickActionCard
                            title="Portfolio Map"
                            desc="View units by geographic area"
                            icon={Map}
                            href="/areas"
                            color="indigo"
                        />
                    </div>
                </div>

                {/* Sidebar Activity List */}
                <div className="space-y-8">
                    <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-slate-900 text-white rounded-3xl overflow-hidden">
                        <CardHeader className="p-8">
                            <CardTitle className="text-xl font-black text-white flex items-center gap-2">
                                <Activity className="w-5 h-5 text-blue-400" />
                                Live Feed
                            </CardTitle>
                            <CardDescription className="text-slate-400 font-medium font-sans mt-1">Real-time system updates</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="space-y-0">
                                {recentActivity?.map((activity: any) => (
                                    <div key={activity.id} className="px-8 py-6 border-t border-white/5 hover:bg-white/5 transition-colors group">
                                        <div className="flex gap-4">
                                            <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 shadow-[0_0_10px_rgba(59,130,246,0.5)] group-hover:scale-125 transition-transform" />
                                            <div>
                                                <p className="text-sm font-bold text-slate-100 leading-tight">{activity.description}</p>
                                                <p className="text-[10px] text-slate-500 mt-1 font-black uppercase tracking-widest">
                                                    {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {(!recentActivity || recentActivity.length === 0) && (
                                    <div className="p-8 text-center text-slate-600 font-bold italic text-sm">Waiting for activity logs...</div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <div className="bg-gradient-to-br from-indigo-600 to-violet-700 p-8 rounded-3xl text-white shadow-xl shadow-indigo-200">
                        <h3 className="text-lg font-black mb-2">New Feature: AI Lease</h3>
                        <p className="text-sm text-indigo-100 font-medium mb-6 leading-relaxed">Instantly draft legally-sound lease proposals with AI analysis of tenant income and credit.</p>
                        <Link href="/documents">
                            <button className="w-full py-3 bg-white text-indigo-700 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-50 transition-colors shadow-lg shadow-black/10">Try Documents Now</button>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatCard({ title, value, description, icon: Icon, trend, color, bg }: any) {
    return (
        <div className="bg-white rounded-3xl p-8 border border-slate-200/60 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
            <div className="flex justify-between items-start mb-6">
                <div className={cn("p-4 rounded-2xl ring-1 ring-slate-200/50 shadow-inner group-hover:scale-110 transition-transform", bg)}>
                    <Icon className={cn("w-6 h-6", color)} />
                </div>
                {trend && (
                    <div className={cn(
                        "px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border border-slate-100 bg-slate-50",
                        trend.startsWith('+') ? "text-emerald-600" : "text-blue-600"
                    )}>
                        {trend}
                    </div>
                )}
            </div>
            <div>
                <h3 className="text-sm font-bold text-slate-500 tracking-tight uppercase tracking-widest text-[10px] mb-1">{title}</h3>
                <p className="text-3xl font-black text-slate-900 tracking-tighter tabular-nums mb-1">{value}</p>
                <p className="text-xs text-slate-400 font-medium">{description}</p>
            </div>
        </div>
    );
}

function QuickActionCard({ title, desc, icon: Icon, href, color }: any) {
    const colors: any = {
        blue: "bg-blue-50 text-blue-600 group-hover:bg-blue-600 border-blue-100",
        indigo: "bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 border-indigo-100",
    };

    return (
        <Link href={href}>
            <button className="w-full flex items-center justify-between p-6 bg-white rounded-3xl border border-slate-200/60 hover:border-slate-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition-all group text-left">
                <div className="flex items-center gap-5">
                    <div className={cn("p-4 rounded-2xl border transition-all duration-300 group-hover:text-white", colors[color])}>
                        <Icon className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="font-black text-slate-900 text-lg tracking-tight">{title}</p>
                        <p className="text-xs text-slate-500 font-medium">{desc}</p>
                    </div>
                </div>
                <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-slate-900 group-hover:translate-x-1 transition-all" />
            </button>
        </Link>
    );
}

function Map({ className }: { className?: string }) {
    return (
        <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z" /><path d="M15 5.764v15" /><path d="M9 3.236v15" /></svg>
    );
}
