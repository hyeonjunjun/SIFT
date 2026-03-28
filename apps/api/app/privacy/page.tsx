export default function PrivacyPolicy() {
    return (
        <div className="max-w-2xl mx-auto py-12 px-6 font-sans text-gray-800">
            <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
            <p className="text-gray-500 mb-1">Sift — Recipe & Content Saving App</p>
            <p className="mb-8 text-sm text-gray-400">Effective Date: March 26, 2026</p>

            <div className="space-y-8">
                <section>
                    <h2 className="text-xl font-semibold mb-3">1. Introduction</h2>
                    <p>
                        Sift (&ldquo;we,&rdquo; &ldquo;our,&rdquo; or &ldquo;us&rdquo;) is a recipe and content saving application. This Privacy Policy explains how we collect, use, and protect your information when you use our mobile application and related services (collectively, the &ldquo;Service&rdquo;). By using Sift, you agree to the collection and use of information as described in this policy.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-3">2. Information We Collect</h2>
                    <div className="space-y-3">
                        <p><strong>Account Information:</strong> When you create an account, we may collect your name, email address, and authentication credentials.</p>
                        <p><strong>Content You Save:</strong> Recipes, links, articles, images, and other content you choose to save, organize, or curate within the app.</p>
                        <p><strong>Usage Data:</strong> We may collect information about how you interact with the app, including features used, pages viewed, and actions taken.</p>
                        <p><strong>Device Information:</strong> Device type, operating system version, unique device identifiers, and general diagnostic data.</p>
                    </div>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-3">3. How We Use Your Information</h2>
                    <p className="mb-2">We use the information we collect to:</p>
                    <ul className="list-disc pl-5 space-y-1">
                        <li>Provide, maintain, and improve the Service</li>
                        <li>Save and organize your recipes and content across devices</li>
                        <li>Process your subscription and manage your account</li>
                        <li>Send important service-related communications</li>
                        <li>Analyze usage patterns to improve the user experience</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-3">4. Data Sharing</h2>
                    <p className="mb-2">We do not sell your personal information. We may share your information only in the following circumstances:</p>
                    <ul className="list-disc pl-5 space-y-1">
                        <li><strong>Service Providers:</strong> Third-party vendors who help us operate the Service (e.g., cloud hosting, analytics), bound by confidentiality agreements.</li>
                        <li><strong>Legal Requirements:</strong> When required by law, regulation, or legal process.</li>
                        <li><strong>Safety:</strong> To protect the rights, safety, or property of Sift, our users, or the public.</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-3">5. Data Storage & Security</h2>
                    <p>Your data is stored securely using industry-standard encryption and security practices. While we take reasonable measures to protect your information, no method of electronic storage is 100% secure.</p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-3">6. Your Rights</h2>
                    <p className="mb-2">You may:</p>
                    <ul className="list-disc pl-5 space-y-1">
                        <li>Access, update, or delete your account information at any time through the app settings</li>
                        <li>Request a copy of your data by contacting us</li>
                        <li>Delete your account, which will remove your data from our active systems</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-3">7. Children&apos;s Privacy</h2>
                    <p>Sift is not intended for children under the age of 13. We do not knowingly collect personal information from children under 13. If you believe a child has provided us with personal information, please contact us so we can take appropriate action.</p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-3">8. Subscriptions & Payments</h2>
                    <p>Sift offers auto-renewable subscriptions. Payment is processed through the Apple App Store or Google Play Store. We do not directly collect or store your payment information — this is handled entirely by the respective platform.</p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-3">9. Changes to This Policy</h2>
                    <p>We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the updated policy within the app. Your continued use of the Service after changes are posted constitutes your acceptance of the revised policy.</p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-3">10. Contact Us</h2>
                    <p>
                        If you have questions about this Privacy Policy, please contact us at:{' '}
                        <a href="mailto:support@siftsave.app" className="text-blue-600 hover:underline">support@siftsave.app</a>
                    </p>
                </section>
            </div>
        </div>
    );
}
