export default function SupportPage() {
    return (
        <div className="max-w-2xl mx-auto py-12 px-6 font-sans text-gray-800">
            <h1 className="text-3xl font-bold mb-6">App Support</h1>

            <section className="mb-8">
                <p className="text-lg mb-4">
                    Need help with Sift? We&apos;re here to assist you.
                </p>

                <div className="bg-gray-50 p-6 rounded-lg border border-gray-100">
                    <h2 className="text-xl font-semibold mb-2">Contact Us</h2>
                    <p className="mb-4 text-gray-600">
                        For bug reports, feature requests, or account inquiries, please email us directly:
                    </p>
                    <a
                        href="mailto:siftsupportteam@gmail.com"
                        className="text-blue-600 font-medium hover:underline text-lg"
                    >
                        siftsupportteam@gmail.com
                    </a>
                </div>
            </section>

            <section>
                <h2 className="text-xl font-semibold mb-4">Frequently Asked Questions</h2>

                <div className="space-y-4">
                    <div>
                        <h3 className="font-medium text-gray-900">How do I save a link?</h3>
                        <p className="text-gray-600 mt-1">
                            Tap &ldquo;Share&rdquo; in any app (Safari, Instagram, YouTube, TikTok, etc.) and select &ldquo;Sift&rdquo; from the share sheet. You can also sift screenshots and photos directly from your camera roll.
                        </p>
                    </div>

                    <div>
                        <h3 className="font-medium text-gray-900">My Sift is taking a while to process.</h3>
                        <p className="text-gray-600 mt-1">
                            Deep analysis can take up to a minute. If it takes longer, please check your internet connection and try pulling down to refresh.
                        </p>
                    </div>

                    <div>
                        <h3 className="font-medium text-gray-900">How do I delete my account?</h3>
                        <p className="text-gray-600 mt-1">
                            Go to Settings &gt; Privacy &gt; Delete Account. This will permanently remove your account and all associated data.
                        </p>
                    </div>

                    <div>
                        <h3 className="font-medium text-gray-900">How do I manage my subscription?</h3>
                        <p className="text-gray-600 mt-1">
                            You can manage or cancel your subscription through your device&apos;s App Store or Play Store settings.
                        </p>
                    </div>
                </div>
            </section>
        </div>
    );
}
