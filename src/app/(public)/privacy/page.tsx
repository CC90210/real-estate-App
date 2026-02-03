import { Metadata } from 'next'
import Link from 'next/link'
import { Building2, ArrowLeft, Shield } from 'lucide-react'

export const metadata: Metadata = {
    title: 'Privacy Policy | PropFlow',
    description: 'PropFlow Privacy Policy - How we collect, use, and protect your data',
}

import { PublicNavbar } from '@/components/layout/PublicNavbar'

export default function PrivacyPolicyPage() {
    const lastUpdated = 'February 3, 2026'

    return (
        <div className="min-h-screen bg-gray-50">
            <PublicNavbar />

            {/* Content */}
            <main className="max-w-4xl mx-auto px-4 pt-32 pb-12">
                <div className="bg-white rounded-[1.5rem] sm:rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 p-6 sm:p-8 md:p-16">
                    <div className="flex items-center gap-3 mb-10">
                        <div className="h-10 w-10 sm:h-12 sm:w-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200">
                            <Shield className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
                        </div>
                        <span className="text-xl sm:text-2xl font-black tracking-tight">PropFlow</span>
                    </div>

                    <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 mb-2">Privacy Policy</h1>
                    <p className="text-sm sm:text-base text-slate-500 font-medium mb-10 italic">Last updated: {lastUpdated}</p>

                    {/* Security Badge */}
                    <div className="bg-emerald-50 border border-emerald-100 rounded-[1.5rem] p-6 mb-12 flex flex-col sm:flex-row items-center gap-6">
                        <div className="h-14 w-14 bg-white rounded-2xl flex items-center justify-center shadow-sm flex-shrink-0">
                            <Shield className="h-8 w-8 text-emerald-500" />
                        </div>
                        <div>
                            <div className="text-emerald-900 font-black tracking-tight text-lg mb-1">
                                Enterprise-Grade Security
                            </div>
                            <p className="text-sm text-emerald-700/80 font-medium leading-relaxed">
                                Your data is protected with AES-256 encryption, SOC 2 compliant infrastructure,
                                and continuous security monitoring. We treat your privacy with military-grade seriousness.
                            </p>
                        </div>
                    </div>

                    <div className="prose prose-slate max-w-none prose-headings:font-black prose-headings:tracking-tight prose-headings:text-slate-900 prose-p:text-slate-600 prose-p:leading-relaxed prose-li:text-slate-600">
                        <h2 className="text-2xl">1. Introduction</h2>
                        <p>
                            PropFlow Inc. ("PropFlow," "we," "us," or "our") is committed to protecting your privacy.
                            This Privacy Policy explains how we collect, use, disclose, and safeguard your information
                            when you use our property management platform ("Service").
                        </p>
                        <p>
                            We take data protection seriously and have implemented industry-leading security measures
                            to ensure your information remains safe and confidential.
                        </p>

                        <h2 className="text-2xl">2. Information We Collect</h2>

                        <h3 className="text-xl">2.1 Information You Provide</h3>
                        <ul className="list-disc pl-6 space-y-2">
                            <li><strong>Account Information:</strong> Name, email address, phone number, company name, and password</li>
                            <li><strong>Property Data:</strong> Property addresses, rental prices, unit details, photos, and descriptions</li>
                            <li><strong>Tenant/Applicant Data:</strong> Names, contact information, income details, employment history, and references</li>
                            <li><strong>Financial Information:</strong> Invoice details, payment history (we do not store credit card numbers)</li>
                            <li><strong>Documents:</strong> Leases, applications, ID documents, and other uploaded files</li>
                        </ul>

                        <h3 className="text-xl">2.2 Automatically Collected Information</h3>
                        <ul className="list-disc pl-6 space-y-2">
                            <li><strong>Usage Data:</strong> Pages visited, features used, time spent on the Service</li>
                            <li><strong>Device Information:</strong> Browser type, operating system, device type</li>
                            <li><strong>Log Data:</strong> IP address, access times, referring URLs</li>
                            <li><strong>Cookies:</strong> Session cookies for authentication and analytics cookies</li>
                        </ul>

                        <h2 className="text-2xl">3. How We Use Your Information</h2>
                        <p>We use the information we collect to:</p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>Provide, maintain, and improve the Service</li>
                            <li>Process transactions and send related information</li>
                            <li>Send administrative notifications (updates, security alerts)</li>
                            <li>Respond to your comments, questions, and support requests</li>
                            <li>Monitor and analyze usage patterns to improve user experience</li>
                            <li>Detect, prevent, and address technical issues and fraud</li>
                            <li>Comply with legal obligations</li>
                        </ul>

                        <h2 className="text-2xl">4. Data Sharing and Disclosure</h2>
                        <p>We do NOT sell your personal information. We may share information only in these circumstances:</p>

                        <h3 className="text-xl">4.1 With Your Consent</h3>
                        <p>We may share information when you explicitly authorize us to do so.</p>

                        <h3 className="text-xl">4.2 Service Providers</h3>
                        <p>
                            We work with trusted third-party service providers who assist us in operating the Service,
                            including:
                        </p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li><strong>Supabase:</strong> Database and authentication (SOC 2 Type II compliant)</li>
                            <li><strong>Vercel:</strong> Hosting and deployment (SOC 2 compliant)</li>
                            <li><strong>Payment Processors:</strong> For subscription billing (PCI DSS compliant)</li>
                        </ul>
                        <p>
                            These providers are contractually obligated to protect your information and may only use
                            it to perform services on our behalf.
                        </p>

                        <h3 className="text-xl">4.3 Legal Requirements</h3>
                        <p>We may disclose information if required to do so by law or in response to valid legal process.</p>

                        <h3 className="text-xl">4.4 Business Transfers</h3>
                        <p>
                            In the event of a merger, acquisition, or sale of assets, your information may be transferred
                            as part of that transaction. We will notify you of any such change.
                        </p>

                        <h2 className="text-2xl">5. Data Security</h2>
                        <p>
                            We implement enterprise-grade security measures to protect your data:
                        </p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li><strong>Encryption in Transit:</strong> All data transmitted via TLS 1.3 (HTTPS)</li>
                            <li><strong>Encryption at Rest:</strong> AES-256 encryption for stored data</li>
                            <li><strong>Access Controls:</strong> Role-based access with the principle of least privilege</li>
                            <li><strong>Authentication:</strong> Secure password hashing with bcrypt</li>
                            <li><strong>Infrastructure:</strong> SOC 2 compliant cloud infrastructure</li>
                            <li><strong>Monitoring:</strong> 24/7 security monitoring and intrusion detection</li>
                            <li><strong>Audit Logging:</strong> Comprehensive logging of all data access</li>
                            <li><strong>Regular Audits:</strong> Periodic security assessments and penetration testing</li>
                        </ul>

                        <h2 className="text-2xl">6. Data Retention</h2>
                        <p>
                            We retain your information for as long as your account is active or as needed to provide
                            the Service. Upon account deletion:
                        </p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>Personal account data is deleted within 30 days</li>
                            <li>Anonymized usage analytics may be retained indefinitely</li>
                            <li>Data required for legal compliance may be retained as required by law</li>
                        </ul>

                        <h2 className="text-2xl">7. Your Rights and Choices</h2>
                        <p>You have the following rights regarding your data:</p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li><strong>Access:</strong> Request a copy of your personal data</li>
                            <li><strong>Correction:</strong> Request correction of inaccurate data</li>
                            <li><strong>Deletion:</strong> Request deletion of your data</li>
                            <li><strong>Export:</strong> Request your data in a portable format</li>
                            <li><strong>Restriction:</strong> Request restriction of data processing</li>
                            <li><strong>Objection:</strong> Object to certain data processing</li>
                        </ul>
                        <p>
                            To exercise these rights, contact us at privacy@propflow.agency. We will respond within 30 days.
                        </p>

                        <h2 className="text-2xl">14. Contact Us</h2>
                        <div className="bg-slate-50 p-8 rounded-2xl border border-slate-100 mt-6">
                            <p className="font-black text-slate-900 mb-1">PropFlow Inc.</p>
                            <p className="text-slate-600 italic mb-4">Privacy Team</p>
                            <p className="text-slate-600">Email: privacy@propflow.agency</p>
                            <p className="text-slate-600">Address: Toronto, Ontario, Canada</p>
                        </div>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="py-12 text-center text-sm font-bold text-slate-400 uppercase tracking-widest">
                © {new Date().getFullYear()} PropFlow Inc. All rights reserved.
            </footer>
        </div>
    )
}
