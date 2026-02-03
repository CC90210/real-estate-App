'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Building2, CheckCircle, ArrowRight, Zap, Shield, Sparkles, Star } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function HomePage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="min-h-screen bg-[#fdfeff] text-slate-900 selection:bg-blue-100 selection:text-blue-900">
      {/* Premium Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-slate-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center gap-3 group pointer-events-auto">
              <div className="h-10 w-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200 group-hover:scale-110 transition-transform duration-300">
                <Building2 className="h-6 w-6 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-black tracking-tight leading-none">PropFlow</span>
                <span className="text-[10px] uppercase tracking-widest font-bold text-blue-600 opacity-80 mt-1">Intelligence</span>
              </div>
            </div>

            <div className="hidden md:flex items-center gap-8 text-sm font-bold text-slate-600 uppercase tracking-widest">
              <Link href="/features" className="hover:text-blue-600 transition-colors">Features</Link>
              <Link href="/solutions" className="hover:text-blue-600 transition-colors">Solutions</Link>
              <Link href="/pricing" className="hover:text-blue-600 transition-colors">Pricing</Link>
            </div>

            <div className="flex items-center gap-3">
              <Link href="/login">
                <Button variant="ghost" className="font-bold text-slate-600 hover:text-blue-600">
                  Sign In
                </Button>
              </Link>
              <Link href="/signup">
                <Button className="font-bold px-6 bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200 rounded-xl">
                  Start Free Trial
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="pt-20">
        {/* Floating Background Elements */}
        <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
          <div className="absolute top-[20%] left-[10%] w-[40rem] h-[40rem] bg-blue-50 rounded-full blur-[100px] opacity-60 animate-float" />
          <div className="absolute bottom-[20%] right-[10%] w-[30rem] h-[30rem] bg-indigo-50 rounded-full blur-[80px] opacity-40 animate-float" style={{ animationDelay: '-3s' }} />
        </div>

        {/* Hero Section */}
        <section className="relative px-4 pt-20 pb-32 lg:pt-32 lg:pb-48 overflow-hidden">
          <div className="max-w-7xl mx-auto relative z-10">
            <div className="max-w-4xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100/50 text-blue-600 text-xs font-bold mb-8 animate-pulse-soft">
                <Sparkles className="h-3 w-3" />
                <span>Next-Gen Real Estate OS</span>
              </div>

              <h1 className="text-5xl sm:text-6xl lg:text-8xl font-black tracking-tight mb-8 leading-[1.1]">
                Real estate management,{' '}
                <span className="text-gradient block sm:inline">perfected.</span>
              </h1>

              <p className="text-lg sm:text-2xl text-slate-500 mb-12 max-w-2xl mx-auto leading-relaxed font-medium">
                The all-in-one platform for elite property managers.
                Automate messy workflows, delight landlords, and scale your portfolio with AI-powered intelligence.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Link href="/signup" className="w-full sm:w-auto">
                  <Button size="lg" className="w-full sm:w-auto px-8 py-8 text-lg font-bold bg-blue-600 hover:bg-blue-700 shadow-2xl shadow-blue-200 rounded-2xl group">
                    Start 14-Day Free Trial
                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
                <div className="flex items-center gap-2 ml-4">
                  <div className="flex -space-x-2">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-slate-200" />
                    ))}
                  </div>
                  <div className="text-left">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map(i => <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />)}
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Trusted by 5,000+ Managers</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Grid */}
        <section id="features" className="py-24 bg-white border-y border-slate-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-4xl font-black tracking-tight mb-4">Enterprise-grade toolkit.</h2>
            <p className="text-lg text-slate-500 mb-20 font-medium">Built for the modern real estate agency.</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <FeatureCard
                icon={Zap}
                title="AI Automations"
                description="Auto-generate leases, analyze applications, and schedule showings while you sleep."
                gradient="bg-blue-50 text-blue-600"
                href="/features"
              />
              <FeatureCard
                icon={Shield}
                title="Smart Screening"
                description="Instant background checks and income verification integrated directly into your flow."
                gradient="bg-indigo-50 text-indigo-600"
                href="/features"
              />
              <FeatureCard
                icon={Building2}
                title="Portfolio Manager"
                description="A centralized brain for all your properties, units, and maintenance requests."
                gradient="bg-emerald-50 text-emerald-600"
                href="/features"
              />
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-slate-50 border-t border-slate-200 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Building2 className="h-5 w-5 text-white" />
              </div>
              <span className="text-lg font-black tracking-tight">PropFlow</span>
            </div>

            <div className="flex gap-8 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
              <Link href="/terms" className="hover:text-blue-600 transition-colors">Terms</Link>
              <Link href="/privacy" className="hover:text-blue-600 transition-colors">Privacy</Link>
              <Link href="/pricing" className="hover:text-blue-600 transition-colors">Pricing</Link>
              <Link href="/contact" className="hover:text-blue-600 transition-colors">Contact</Link>
            </div>

            <p className="text-xs font-bold text-slate-400">
              © 2026 PropFlow Intelligence. Built for high performance.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, description, gradient, href = "/features" }: any) {
  return (
    <Link href={href} className="group p-8 rounded-3xl border border-slate-100 hover:border-blue-100 hover:bg-slate-50/50 transition-all duration-300 text-left relative overflow-hidden block">
      <div className={`h-14 w-14 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 ${gradient}`}>
        <Icon className="h-7 w-7" />
      </div>
      <h3 className="text-xl font-bold mb-3">{title}</h3>
      <p className="text-slate-500 leading-relaxed font-medium mb-4">{description}</p>
      <div className="flex items-center gap-2 text-blue-600 font-bold text-sm cursor-pointer hover:gap-3 transition-all">
        Learn more <ArrowRight className="h-4 w-4" />
      </div>
    </Link>
  );
}
