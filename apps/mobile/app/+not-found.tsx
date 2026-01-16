import { Link, Stack, usePathname, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Typography } from '../components/design-system/Typography';
import { useEffect } from 'react';

export default function NotFoundScreen() {
    const pathname = usePathname();
    const router = useRouter();

    useEffect(() => {
        // Intercept Share Extension "handshake" path
        if (pathname?.includes("dataUrl=siftShareKey")) {
            console.log("🔄 Redirecting Share Extension handshake to Dashboard");
            router.replace("/(tabs)/");
            return;
        }

        console.error("❌ 404 Not Found hit for path:", pathname);
    }, [pathname]);

    return (
        <>
            <Stack.Screen options={{ title: 'Oops!' }} />
            <View style={styles.container}>
                <Typography variant="h1" className="mb-4">This screen doesn't exist.</Typography>

                <Link href="/" style={styles.link}>
                    <Typography variant="body" className="text-blue-500 underline">Go to home screen!</Typography>
                </Link>
            </View>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        backgroundColor: '#fff',
    },
    link: {
        marginTop: 15,
        paddingVertical: 15,
    },
});
