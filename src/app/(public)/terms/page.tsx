import { Metadata } from 'next'
import Link from 'next/link'
import { Building2, ArrowLeft } from 'lucide-react'

export const metadata: Metadata = {
    title: 'Terms of Service | PropFlow',
    description: 'PropFlow Terms of Service and User Agreement',
}

import { PublicNavbar } from '@/components/layout/PublicNavbar'

export default function TermsOfServicePage() {
    const lastUpdated = 'February 3, 2026'

    return (
        <div className="min-h-screen bg-gray-50">
            <PublicNavbar />

            {/* Content */}
            <main className="max-w-4xl mx-auto px-4 pt-32 pb-12">
                <div className="bg-white rounded-[1.5rem] sm:rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 p-6 sm:p-8 md:p-16">
                    <div className="flex items-center gap-3 mb-10">
                        <div className="h-10 w-10 sm:h-12 sm:w-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200">
                            <Building2 className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
                        </div>
                        <span className="text-xl sm:text-2xl font-black tracking-tight">PropFlow</span>
                    </div>

                    <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 mb-2">Terms of Service</h1>
                    <p className="text-sm sm:text-base text-slate-500 font-medium mb-12 italic">Last updated: {lastUpdated}</p>

                    <div className="prose prose-slate max-w-none prose-headings:font-black prose-headings:tracking-tight prose-headings:text-slate-900 prose-p:text-slate-600 prose-p:leading-relaxed prose-li:text-slate-600">
                        <h2 className="text-2xl">1. Agreement to Terms</h2>
                        <p>
                            By accessing or using PropFlow ("Service"), operated by PropFlow Inc. ("Company," "we," "us," or "our"),
                            you agree to be bound by these Terms of Service ("Terms"). If you disagree with any part of these terms,
                            you do not have permission to access the Service.
                        </p>

                        <h2 className="text-2xl">2. Description of Service</h2>
                        <p>
                            PropFlow is a property management software platform that provides tools for real estate professionals
                            to manage properties, applications, tenants, documents, and related business operations. The Service
                            is provided on a subscription basis.
                        </p>

                        <h2 className="text-2xl">3. User Accounts</h2>
                        <h3 className="text-xl">3.1 Account Registration</h3>
                        <p>
                            To access the Service, you must create an account. You agree to provide accurate, current, and
                            complete information during registration and to update such information to keep it accurate,
                            current, and complete.
                        </p>

                        <h3 className="text-xl">3.2 Account Security</h3>
                        <p>
                            You are responsible for safeguarding your password and for all activities that occur under your
                            account. You agree to notify us immediately of any unauthorized use of your account. We cannot
                            and will not be liable for any loss or damage arising from your failure to comply with this
                            security obligation.
                        </p>

                        <h3 className="text-xl">3.3 Account Termination</h3>
                        <p>
                            We reserve the right to suspend or terminate your account at any time for any reason, including
                            but not limited to violation of these Terms. Upon termination, your right to use the Service
                            will immediately cease.
                        </p>

                        <h2 className="text-2xl">4. Subscription and Payment</h2>
                        <h3 className="text-xl">4.1 Billing</h3>
                        <p>
                            Subscription fees are billed in advance on a monthly or annual basis depending on the plan
                            selected. You authorize us to charge your designated payment method for all fees due.
                        </p>

                        <h3 className="text-xl">4.2 Free Trial</h3>
                        <p>
                            We may offer a free trial period. At the end of the trial, your account will automatically
                            convert to a paid subscription unless you cancel before the trial ends.
                        </p>

                        <h3 className="text-xl">4.3 Refunds</h3>
                        <p>
                            Subscription fees are non-refundable except as required by law or as explicitly stated in
                            these Terms. If you cancel your subscription, you will continue to have access until the
                            end of your current billing period.
                        </p>

                        <h2 className="text-2xl">5. Acceptable Use</h2>
                        <p>You agree not to use the Service to:</p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>Violate any applicable laws or regulations</li>
                            <li>Infringe on the intellectual property rights of others</li>
                            <li>Transmit any malicious code, viruses, or harmful data</li>
                            <li>Attempt to gain unauthorized access to our systems</li>
                            <li>Interfere with or disrupt the Service or servers</li>
                            <li>Collect or harvest user data without consent</li>
                            <li>Use the Service for any illegal or fraudulent purpose</li>
                            <li>Discriminate against any person or group in violation of fair housing laws</li>
                        </ul>

                        <h2 className="text-2xl">6. Data and Privacy</h2>
                        <p>
                            Your use of the Service is also governed by our Privacy Policy, which is incorporated into
                            these Terms by reference. Please review our Privacy Policy to understand our practices.
                        </p>

                        <h3 className="text-xl">6.1 Your Data</h3>
                        <p>
                            You retain all rights to the data you input into the Service ("Your Data"). You grant us a
                            limited license to use, process, and store Your Data solely to provide the Service to you.
                        </p>

                        <h3 className="text-xl">6.2 Data Security</h3>
                        <p>
                            We implement industry-standard security measures to protect Your Data. However, no method of
                            transmission over the Internet is 100% secure, and we cannot guarantee absolute security.
                        </p>

                        <h2 className="text-2xl">7. Intellectual Property</h2>
                        <p>
                            The Service and its original content, features, and functionality are owned by PropFlow Inc.
                            and are protected by international copyright, trademark, patent, trade secret, and other
                            intellectual property laws.
                        </p>

                        <h2 className="text-2xl">8. Third-Party Services</h2>
                        <p>
                            The Service may integrate with third-party services (e.g., tenant screening providers,
                            payment processors). Your use of such services is subject to their respective terms and
                            policies. We are not responsible for third-party services.
                        </p>

                        <h2 className="text-2xl">9. Disclaimer of Warranties</h2>
                        <p>
                            THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER
                            EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY,
                            FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
                        </p>

                        <h2 className="text-2xl">10. Limitation of Liability</h2>
                        <p>
                            TO THE MAXIMUM EXTENT PERMITTED BY LAW, PROPFLOW INC. SHALL NOT BE LIABLE FOR ANY INDIRECT,
                            INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES,
                            WHETHER INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, USE, GOODWILL, OR OTHER
                            INTANGIBLE LOSSES RESULTING FROM:
                        </p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>Your use or inability to use the Service</li>
                            <li>Any unauthorized access to or use of our servers</li>
                            <li>Any interruption or cessation of transmission to or from the Service</li>
                            <li>Any bugs, viruses, or similar issues transmitted through the Service</li>
                        </ul>

                        <h2 className="text-2xl">11. Indemnification</h2>
                        <p>
                            You agree to indemnify, defend, and hold harmless PropFlow Inc. and its officers, directors,
                            employees, and agents from any claims, damages, losses, liabilities, and expenses (including
                            attorneys' fees) arising from your use of the Service or violation of these Terms.
                        </p>

                        <h2 className="text-2xl">12. Governing Law</h2>
                        <p>
                            These Terms shall be governed by and construed in accordance with the laws of the Province
                            of Ontario, Canada, without regard to its conflict of law provisions. Any disputes arising
                            under these Terms shall be resolved in the courts of Ontario, Canada.
                        </p>

                        <h2 className="text-2xl">13. Changes to Terms</h2>
                        <p>
                            We reserve the right to modify these Terms at any time. We will notify you of any changes
                            by posting the new Terms on this page and updating the "Last updated" date. Your continued
                            use of the Service after such changes constitutes acceptance of the new Terms.
                        </p>

                        <h2 className="text-2xl">14. Contact Information</h2>
                        <p>
                            If you have questions about these Terms, please contact us at:
                        </p>
                        <div className="bg-slate-50 p-8 rounded-2xl border border-slate-100 mt-6">
                            <p className="font-black text-slate-900 mb-1">PropFlow Inc.</p>
                            <p className="text-slate-600">Email: propflowpartners@gmail.com</p>
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
