import { Link, Stack, usePathname, useRouter } from 'expo-router';
import { StyleSheet, View, ImageBackground, TouchableOpacity } from 'react-native';
import { Typography } from '../components/design-system/Typography';
import { useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';

export default function NotFoundScreen() {
    const pathname = usePathname();
    const router = useRouter();
    const { colors, isDark } = useTheme();

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
        <View style={[styles.container, { backgroundColor: colors.canvas }]}>
            <ImageBackground
                source={require("../assets/noise.png")}
                style={StyleSheet.absoluteFill}
                imageStyle={{ opacity: isDark ? 0.08 : 0.04 }}
                resizeMode="repeat"
            >
                <Stack.Screen options={{ title: 'Oops!', headerShown: false }} />
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 }}>
                    <Typography variant="h1" style={{ marginBottom: 12, textAlign: 'center' }}>
                        Lost in the noise?
                    </Typography>
                    <Typography variant="body" color="stone" style={{ textAlign: 'center', marginBottom: 32 }}>
                        We couldn't find the screen you're looking for.
                    </Typography>

                    <Link href="/" asChild>
                        <TouchableOpacity
                            style={{
                                backgroundColor: colors.ink,
                                paddingVertical: 16,
                                paddingHorizontal: 32,
                                borderRadius: 40,
                            }}
                        >
                            <Typography variant="label" style={{ color: colors.paper }}>Return Home</Typography>
                        </TouchableOpacity>
                    </Link>
                </View>
            </ImageBackground>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});
