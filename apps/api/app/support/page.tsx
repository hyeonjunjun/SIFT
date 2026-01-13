export default function SupportPage() {
    return (
        <div className="max-w-2xl mx-auto py-12 px-6 font-sans text-gray-800">
            <h1 className="text-3xl font-bold mb-6">App Support</h1>

            <section className="mb-8">
                <p className="text-lg mb-4">
                    Need help with Sift? We are here to assist you.
                </p>

                <div className="bg-gray-50 p-6 rounded-lg border border-gray-100">
                    <h2 className="text-xl font-semibold mb-2">Contact Us</h2>
                    <p className="mb-4 text-gray-600">
                        For bug reports, feature requests, or account inquiries, please email us directly:
                    </p>
                    <a
                        href="mailto:hello@sift.app"
                        className="text-blue-600 font-medium hover:underline text-lg"
                    >
                        hello@sift.app
                    </a>
                </div>
            </section>

            <section>
                <h2 className="text-xl font-semibold mb-4">Frequently Asked Questions</h2>

                <div className="space-y-4">
                    <div>
                        <h3 className="font-medium text-gray-900">How do I save a link?</h3>
                        <p className="text-gray-600 mt-1">
                            You can save a link by tapping "Share" in any app and selecting "Sift" from the share sheet, or by copying a URL and opening the Sift app.
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
                            Please email us at the address above with the subject "Account Deletion" and we will process your request immediately.
                        </p>
                    </div>
                </div>
            </section>
        </div>
    );
}
