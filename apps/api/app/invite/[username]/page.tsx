import { redirect } from 'next/navigation';
import { Metadata } from 'next';

interface Props {
    params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { username } = await params;
    return {
        title: `Join ${username} on Sift`,
        description: 'Save recipes from TikTok, Instagram & YouTube. Download Sift for free.',
        openGraph: {
            title: `${username} invited you to Sift`,
            description: 'Save recipes from anywhere, instantly. Download Sift for free.',
            type: 'website',
        },
    };
}

export default async function InvitePage({ params }: Props) {
    const { username } = await params;

    return (
        <html>
            <head>
                <meta name="apple-itunes-app" content="app-id=YOUR_APP_ID, app-argument=sift://user/{username}" />
                <style dangerouslySetInnerHTML={{ __html: `
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #FDFCF8; color: #3B3231; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
                    .card { text-align: center; padding: 40px; max-width: 400px; }
                    h1 { font-size: 28px; margin-bottom: 8px; font-weight: 700; }
                    p { font-size: 16px; color: #8B8178; margin-bottom: 24px; line-height: 1.5; }
                    .btn { display: inline-block; background: #3B3231; color: #FDFCF8; padding: 14px 32px; border-radius: 40px; text-decoration: none; font-weight: 600; font-size: 16px; }
                    .btn:hover { opacity: 0.9; }
                    .secondary { margin-top: 16px; font-size: 14px; color: #8B8178; }
                    .secondary a { color: #3B3231; }
                `}} />
                <script dangerouslySetInnerHTML={{ __html: `
                    // Try to open the app via deep link
                    var deepLink = 'sift://user/${username}';
                    var appStoreUrl = 'https://apps.apple.com/app/sift/id6743187498';
                    var playStoreUrl = 'https://play.google.com/store/apps/details?id=com.hkjstudio.sift';

                    var isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
                    var isAndroid = /Android/.test(navigator.userAgent);

                    // Try deep link first
                    var start = Date.now();
                    window.location.href = deepLink;

                    // If app didn't open after 1.5s, redirect to store
                    setTimeout(function() {
                        if (Date.now() - start < 2000) {
                            if (isIOS) window.location.href = appStoreUrl;
                            else if (isAndroid) window.location.href = playStoreUrl;
                        }
                    }, 1500);
                `}} />
            </head>
            <body>
                <div className="card">
                    <h1>Join @{username} on Sift</h1>
                    <p>Save recipes from TikTok, Instagram & YouTube — ingredients, nutrition, and step-by-step instructions, all in one place.</p>
                    <a className="btn" href="https://apps.apple.com/app/sift/id6743187498">Download Sift</a>
                    <p className="secondary">
                        Already have the app? <a href={`sift://user/${username}`}>Open in Sift</a>
                    </p>
                </div>
            </body>
        </html>
    );
}
