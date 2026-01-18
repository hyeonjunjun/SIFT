import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useShareIntent } from 'expo-share-intent';
import { Typography } from '../components/design-system/Typography';

export default function ShareScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntent();

    useEffect(() => {
        // Log for debugging (remove in prod if desired, but helpful for now)
        console.log("Share Screen Params:", params);
        console.log("Share Intent Hook:", shareIntent);

        const handleShare = async () => {
            // 1. Check if we have a URL from the deep link query params
            // format: sift://share?url=...
            const directUrl = params.url as string;

            // 2. Or from the hook (sometimes reliable depending on implementation)
            const intentUrl = (hasShareIntent && shareIntent.type === 'weburl') ? shareIntent.webUrl : null;

            const targetUrl = directUrl || intentUrl;

            if (targetUrl) {
                // Navigate to dashboard and trigger processing
                // We pass the url back to index via query param or global state
                // Simplest: Replace to index with a param found

                // Reset intent to clear native cache
                resetShareIntent();

                // Small delay to ensure navigation is ready
                setTimeout(() => {
                    // We can pass it as a param to index to auto-trigger
                    // But index.tsx already listens to deep links.
                    // If we just go to "/", index.tsx's useShareIntent or Linking listener should pick it up.
                    // However, to be explicit since we are ALREADY handling the deep link here:
                    // Let's rely on index.tsx's "Link detected" or manual handling.
                    // Actually, passing it explicitly is safer.

                    // router.replace(`/?siftUrl=${encodeURIComponent(targetUrl)}`); 
                    // To keep it simple and reuse existing logic, let's just go home.
                    // The native intent is usually cleared, but if index checks Linking.getInitialURL it might double process.
                    // Let's just go home and let the user confirm or let the context pick it up.

                    if (targetUrl && typeof targetUrl === 'string') {
                        router.replace(`/(tabs)/?siftUrl=${encodeURIComponent(targetUrl.trim())}`);
                    } else {
                        router.replace('/(tabs)/');
                    }
                }, 100);
            } else {
                // No URL found? Just go home.
                console.warn("Share screen opened but no URL found.");
                router.replace('/');
            }
        };

        handleShare();
    }, [params, hasShareIntent, shareIntent, resetShareIntent, router]);

    return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'white' }}>
            <ActivityIndicator size="large" color="#000" />
            <Typography variant="body" className="mt-4 text-gray-500">Redirecting...</Typography>
        </View>
    );
}
