'use client';

import Link from 'next/link';
import { PublicNavbar } from '@/components/layout/PublicNavbar';
import { PublicFooter } from '@/components/layout/PublicFooter';
import {
  Zap,
  FileText,
  Megaphone,
  ArrowRight,
  CheckCircle2,
  Quote,
} from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <PublicNavbar />

      <main>
        {/* ── SECTION 1: Hero ── */}
        <section className="relative overflow-hidden pt-28 pb-24 px-4 sm:px-6 lg:px-8">
          {/* Gradient mesh background */}
          <div
            className="absolute inset-0 -z-10"
            style={{
              background:
                'radial-gradient(ellipse 80% 60% at 50% -10%, #dbeafe 0%, transparent 70%), radial-gradient(ellipse 60% 40% at 80% 80%, #ede9fe 0%, transparent 60%), #ffffff',
            }}
          />

          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-xs font-semibold mb-8 tracking-wide uppercase">
              <Zap className="h-3 w-3" />
              Rental automation platform
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[1.05] mb-6 text-slate-900">
              The operating system
              <br />
              <span className="text-blue-600">for rental agencies.</span>
            </h1>

            <p className="text-lg sm:text-xl text-slate-500 font-medium leading-relaxed mb-10 max-w-2xl mx-auto">
              PropFlow automates your entire rental workflow — from listing to key handoff.
              One platform. Zero manual work.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center mb-12">
              <Link
                href="/signup"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-base transition-colors shadow-lg shadow-blue-200"
              >
                Start Free Trial
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/pricing"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-base transition-colors"
              >
                View Pricing
              </Link>
            </div>

            {/* Trust line */}
            <p className="text-xs text-slate-400 font-medium uppercase tracking-widest mb-4">
              Trusted by real estate professionals across North America
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              {['REMAX', 'Century 21', 'Keller Williams', 'Coldwell Banker', 'EXIT Realty'].map(
                (name) => (
                  <span
                    key={name}
                    className="px-3 py-1 rounded-full bg-slate-100 text-slate-500 text-xs font-semibold"
                  >
                    {name}
                  </span>
                )
              )}
            </div>
          </div>
        </section>

        {/* ── SECTION 2: Logo Bar ── */}
        <section className="bg-slate-50 border-y border-slate-100 py-6 px-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-10">
              <span className="text-xs text-slate-400 font-semibold uppercase tracking-widest whitespace-nowrap">
                Integrated with
              </span>
              <div className="flex flex-wrap justify-center gap-6 sm:gap-10">
                {['Stripe', 'Google', 'Supabase', 'SingleKey'].map((name) => (
                  <span key={name} className="text-sm font-bold text-slate-400 tracking-wide">
                    {name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── SECTION 3: Feature Showcase ── */}
        <section className="py-24 px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl sm:text-5xl font-black tracking-tight text-slate-900 mb-4">
                Everything you need,
                <br />
                nothing you don&apos;t.
              </h2>
              <p className="text-slate-500 text-lg font-medium max-w-xl mx-auto">
                Purpose-built tools for every stage of the rental lifecycle.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  icon: Zap,
                  title: 'Automated Leasing',
                  description:
                    'Upload property → Generate listing → Collect applications → Screen tenants → Sign lease. All automated.',
                  color: 'text-blue-600',
                  bg: 'bg-blue-50',
                },
                {
                  icon: FileText,
                  title: 'Smart Document Engine',
                  description:
                    'Generate leases, send for e-signature, track signing status. Built-in, no DocuSign fees.',
                  color: 'text-violet-600',
                  bg: 'bg-violet-50',
                },
                {
                  icon: Megaphone,
                  title: 'Multi-Channel Marketing',
                  description:
                    'Post to 13+ social platforms simultaneously. AI-generated ad copy. Marketplace listings.',
                  color: 'text-emerald-600',
                  bg: 'bg-emerald-50',
                },
              ].map(({ icon: Icon, title, description, color, bg }) => (
                <div
                  key={title}
                  className="rounded-2xl border border-slate-100 bg-white p-8 shadow-sm hover:shadow-md hover:border-slate-200 transition-all duration-200"
                >
                  <div className={`h-12 w-12 rounded-xl ${bg} ${color} flex items-center justify-center mb-6`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-3">{title}</h3>
                  <p className="text-slate-500 leading-relaxed font-medium">{description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── SECTION 4: How It Works ── */}
        <section className="py-24 px-4 sm:px-6 lg:px-8 bg-slate-50">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl sm:text-5xl font-black tracking-tight text-slate-900 mb-4">
                From listing to lease
                <br />
                in 4 steps.
              </h2>
              <p className="text-slate-500 text-lg font-medium">
                A guided workflow that replaces a dozen disconnected tools.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  step: '1',
                  title: 'Add your property',
                  description: 'Enter details, upload photos, set rental terms.',
                },
                {
                  step: '2',
                  title: 'Market everywhere',
                  description: 'One-click listing to social media and marketplaces.',
                },
                {
                  step: '3',
                  title: 'Screen & approve',
                  description: 'AI-powered tenant screening with credit, income, and background checks.',
                },
                {
                  step: '4',
                  title: 'Sign & collect',
                  description: 'Send lease for e-signature, collect first month via Stripe.',
                },
              ].map(({ step, title, description }) => (
                <div key={step} className="relative bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
                  <div className="h-10 w-10 rounded-xl bg-blue-600 text-white text-sm font-black flex items-center justify-center mb-5">
                    {step}
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mb-2">{title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed font-medium">{description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── SECTION 5: Stats + Testimonial ── */}
        <section className="bg-slate-900 py-24 px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-10 text-center mb-20">
              {[
                { stat: '500+', label: 'Properties Managed' },
                { stat: '98%', label: 'Faster Lease Turnaround' },
                { stat: '13', label: 'Social Platforms' },
              ].map(({ stat, label }) => (
                <div key={label}>
                  <p className="text-5xl sm:text-6xl font-black text-white mb-2">{stat}</p>
                  <p className="text-slate-400 font-medium text-sm uppercase tracking-widest">{label}</p>
                </div>
              ))}
            </div>

            <div className="max-w-2xl mx-auto text-center">
              <Quote className="h-8 w-8 text-blue-400 mx-auto mb-6 opacity-60" />
              <blockquote className="text-xl sm:text-2xl font-semibold text-white leading-relaxed mb-6">
                &ldquo;PropFlow cut our vacancy time in half. The automation is unreal.&rdquo;
              </blockquote>
              <div className="flex items-center justify-center gap-3">
                <div className="h-10 w-10 rounded-full bg-slate-700 flex items-center justify-center">
                  <span className="text-xs font-bold text-slate-300">JD</span>
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-white">James D.</p>
                  <p className="text-xs text-slate-400">Principal Broker, North Shore Realty</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── SECTION 6: Final CTA ── */}
        <section className="py-28 px-4 sm:px-6 lg:px-8 text-center">
          <div className="max-w-2xl mx-auto">
            <div className="flex justify-center mb-6">
              <CheckCircle2 className="h-10 w-10 text-blue-600" />
            </div>
            <h2 className="text-4xl sm:text-5xl font-black tracking-tight text-slate-900 mb-4">
              Ready to automate your
              <br />
              rental business?
            </h2>
            <p className="text-slate-500 text-lg font-medium mb-10">
              Start your free trial today. No credit card required.
            </p>
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-2 px-10 py-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg transition-colors shadow-xl shadow-blue-200"
            >
              Get Started Free
              <ArrowRight className="h-5 w-5" />
            </Link>
            <p className="mt-5 text-xs text-slate-400 font-medium">
              14-day free trial on Brokerage Command. Cancel anytime.
            </p>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
