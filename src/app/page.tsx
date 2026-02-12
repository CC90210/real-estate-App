'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PublicNavbar } from '@/components/layout/PublicNavbar';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { Building2, ArrowRight, Zap, Shield, Sparkles, Star } from 'lucide-react';
import { FuturisticBuilding } from '@/components/brand/FuturisticBuilding';
import { CyberGrid, DataStream } from '@/components/brand/CyberEffects';
import { useEffect, useState } from 'react';

export default function HomePage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="min-h-screen bg-[#fdfeff] text-slate-900 selection:bg-blue-100 selection:text-blue-900">
      <PublicNavbar />

      <main className="pt-20">
        {/* Deep Multi-Layered Background */}
        <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden bg-gradient-to-b from-white via-blue-50/20 to-white">
          <CyberGrid />

          {/* Ambient Glows */}
          <div className="absolute top-[10%] left-[-5%] w-[50rem] h-[50rem] bg-blue-100/30 rounded-full blur-[120px] animate-pulse-soft" />
          <div className="absolute bottom-[10%] right-[-5%] w-[40rem] h-[40rem] bg-indigo-100/20 rounded-full blur-[100px] animate-pulse-soft" style={{ animationDelay: '-4s' }} />

          {/* Detailed Futuristic Skyline - Far Background */}
          <div className="absolute inset-x-0 bottom-0 flex items-end justify-between px-10 gap-4 opacity-40">
            <FuturisticBuilding color="blue" height={400} opacity={0.08} className="w-32" delay="-3s" />
            <FuturisticBuilding color="indigo" height={550} opacity={0.06} className="w-24 hidden lg:block" delay="-1s" />
            <FuturisticBuilding color="emerald" height={300} opacity={0.05} className="w-20 hidden xl:block" delay="-5s" />
            <FuturisticBuilding color="blue" height={500} opacity={0.07} className="w-28 hidden lg:block" delay="-2s" />
            <FuturisticBuilding color="indigo" height={350} opacity={0.05} className="w-24" delay="-4s" />
          </div>

          {/* Hero Side Buildings - More Visible */}
          <FuturisticBuilding
            className="absolute -left-16 top-1/2 -translate-y-1/2 w-[450px] h-[900px] opacity-[0.12] lg:opacity-[0.15]"
            color="blue"
            height={900}
            opacity={0.15}
          />
          <FuturisticBuilding
            className="absolute -right-16 top-1/4 w-[350px] h-[700px] opacity-[0.1] lg:opacity-[0.12] scale-x-[-1]"
            color="indigo"
            height={700}
            opacity={0.12}
            delay="-3s"
          />

          {/* Floating Data Streams */}
          <DataStream className="left-[15%] top-1/4" delay="0s" color="blue" />
          <DataStream className="right-[20%] top-1/3" delay="1s" color="indigo" />
          <DataStream className="left-[40%] top-1/2" delay="2.5s" color="emerald" />
          <DataStream className="right-[10%] top-2/3" delay="1.5s" color="blue" />
        </div>

        {/* Hero Section */}
        <section className="relative px-4 pt-20 pb-32 lg:pt-32 lg:pb-48 overflow-hidden">
          <div className="max-w-7xl mx-auto relative z-10">
            <div className="max-w-4xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100/50 text-blue-600 text-xs font-bold mb-8 animate-pulse-soft">
                <Sparkles className="h-3 w-3" />
                <span>Bespoke Real Estate Infrastructure</span>
              </div>

              <h1 className="text-5xl sm:text-6xl lg:text-8xl font-black tracking-tight mb-8 leading-[1.1]">
                Scale your agency with <span className="text-gradient block sm:inline">expert systems.</span>
              </h1>

              <p className="text-lg sm:text-2xl text-slate-500 mb-12 max-w-2xl mx-auto leading-relaxed font-medium">
                PropFlow provides elite property management architecture built by experts for experts.
                Custom deployments. Private automations. Military-grade scale.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Link href="/signup" className="w-full sm:w-auto">
                  <Button size="lg" className="w-full sm:w-auto px-8 py-8 text-lg font-bold bg-blue-600 hover:bg-blue-700 shadow-2xl shadow-blue-200 rounded-2xl group">
                    Get Started Free
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
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Expert-Built Ecosystem</p>
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
            <p className="text-lg text-slate-500 mb-20 font-medium">Bespoke infrastructure for modern agencies.</p>

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
      <PublicFooter />
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
