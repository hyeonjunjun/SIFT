export default function PrivacyPolicy() {
    return (
        <div className="max-w-2xl mx-auto py-12 px-6 font-sans text-gray-800">
            <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
            <p className="mb-4 text-sm text-gray-500">Last Updated: {new Date().toLocaleDateString()}</p>

            <div className="space-y-6">
                <section>
                    <h2 className="text-xl font-semibold mb-2">1. Overview</h2>
                    <p>
                        Sift ("we", "us", or "our") respects your privacy. This Privacy Policy explains how we collect, use, and safe-guard your information when you use our mobile application and services.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-2">2. Data We Collect</h2>
                    <ul className="list-disc pl-5 space-y-1">
                        <li>
                            <strong>Authentication Data:</strong> When you sign up or log in, we authenticate your identity using a third-party provider (Supabase). We may store your email address and basic profile information to manage your account.
                        </li>
                        <li>
                            <strong>Content Data:</strong> We collect and process the URLs you submit ("Sift"). These URLs and their content are sent to OpenAI for processing and summarization.
                        </li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-2">3. How We Use Your Data</h2>
                    <p>
                        We use your data solely to provide functionality of the Sift application:
                    </p>
                    <ul className="list-disc pl-5 space-y-1 mt-2">
                        <li>To authenticate your access to your saved content.</li>
                        <li>To generate summaries and extract recipes/content from the links you provide.</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-2">4. Third-Party Sharing</h2>
                    <p>
                        <strong>We do not sell your personal data to third parties.</strong>
                    </p>
                    <p className="mt-2">
                        We share data only with the following service providers necessary to operate the app:
                    </p>
                    <ul className="list-disc pl-5 space-y-1 mt-2">
                        <li><strong>Supabase:</strong> For authentication and database hosting.</li>
                        <li><strong>OpenAI:</strong> For processing and summarizing content.</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-2">5. Contact Us</h2>
                    <p>
                        If you have any questions about this Privacy Policy, please contact us.
                    </p>
                </section>
            </div>
        </div>
    );
}
