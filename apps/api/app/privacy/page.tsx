export default function PrivacyPolicy() {
    return (
        <div className="max-w-2xl mx-auto py-12 px-6 font-sans text-gray-800">
            <h1 className="text-3xl font-bold mb-6">Privacy Policy for Sift</h1>
            <p className="mb-4 text-sm text-gray-500">Last Updated: January 12, 2026</p>

            <div className="space-y-6">
                <section>
                    <p className="mb-4">
                        At Sift, we believe your digital curiosities should remain private. This policy outlines how we handle your information with the same care you use to curate your library.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-2">1. Information We Collect</h2>
                    <ul className="list-disc pl-5 space-y-2">
                        <li>
                            <strong>Authentication Data:</strong> We use Supabase for secure login. This includes your email address and a unique user identifier.
                        </li>
                        <li>
                            <strong>Curated Content:</strong> When you "Sift" a link, our system processes the URL to extract structured data (like recipes or routines). This content is stored in your private database.
                        </li>
                        <li>
                            <strong>Service Providers:</strong> We utilize OpenAI to analyze and structure your content and Apify for web scraping. These providers do not use your data for their own purposes beyond providing the requested service to Sift.
                        </li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-2">2. Data Security & Privacy</h2>
                    <ul className="list-disc pl-5 space-y-2">
                        <li>
                            <strong>Isolation:</strong> Your data is protected by Row Level Security (RLS). No other user can access your saved items.
                        </li>
                        <li>
                            <strong>No Sale of Data:</strong> We do not sell, rent, or trade your personal information or your curated library to third parties.
                        </li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-2">3. Your Rights</h2>
                    <p>
                        You have the right to delete your account and all associated data at any time through the application settings.
                    </p>
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-2">4. Contact</h2>
                    <p>
                        For questions regarding your privacy, contact us at: <a href="mailto:hello@sift.app" className="text-blue-600 hover:underline">hello@sift.app</a>
                    </p>
                </section>
            </div>
        </div>
    );
}
