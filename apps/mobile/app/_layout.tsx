import "../global.css";
import { Stack, useRouter, useSegments } from "expo-router";
import { useShareIntent } from "expo-share-intent";
import { useEffect, useState, useCallback } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Theme, COLORS } from "../lib/theme";
import * as SplashScreenIs from "expo-splash-screen";
import * as SecureStore from 'expo-secure-store';
import { View, ImageBackground, StyleSheet } from "react-native";
import SplashScreen from "../components/SplashScreen";
import Onboarding from "../components/Onboarding";
import { AuthProvider, useAuth } from "../lib/auth";

// Fonts
import { useFonts, PlayfairDisplay_700Bold, PlayfairDisplay_600SemiBold } from '@expo-google-fonts/playfair-display';
import { InstrumentSerif_400Regular } from '@expo-google-fonts/instrument-serif';
import { Inter_400Regular, Inter_500Medium, Inter_700Bold } from '@expo-google-fonts/inter';

// Safe Splash Screen Prevention
try {
    SplashScreenIs.preventAutoHideAsync().catch(() => { });
} catch (e) {
    // Ignore native module missing
}

function RootLayoutNav() {
    const { session, loading: authLoading } = useAuth();
    const segments = useSegments();
    const router = useRouter();
    const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntent();

    const [fontsLoaded] = useFonts({
        PlayfairDisplay_700Bold,
        PlayfairDisplay_600SemiBold,
        InstrumentSerif_400Regular,
        Inter_400Regular,
        Inter_500Medium,
        Inter_700Bold
    });

    const [appReady, setAppReady] = useState(false);
    const [splashAnimationFinished, setSplashAnimationFinished] = useState(false);
    const [splashDismissed, setSplashDismissed] = useState(false);
    const [showOnboarding, setShowOnboarding] = useState(false);

    // Initial Preparation
    useEffect(() => {
        async function prepare() {
            try {
                const hasLaunched = await SecureStore.getItemAsync('has_launched');
                if (hasLaunched !== 'true') {
                    setShowOnboarding(true);
                }
            } catch (e) {
                console.warn(e);
            } finally {
                setAppReady(true);
            }
        }
        prepare();
    }, []);

    // Splash Dismissal Logic
    useEffect(() => {
        if (appReady && fontsLoaded && splashAnimationFinished && !authLoading) {
            setSplashDismissed(true);
            try {
                SplashScreenIs.hideAsync().catch(() => { });
            } catch (e) { }
        }
    }, [appReady, fontsLoaded, splashAnimationFinished, authLoading]);

    // Auth Redirection Logic
    useEffect(() => {
        if (!splashDismissed || authLoading) return;

        const inAuthGroup = segments[0] === 'auth';

        if (!session && !inAuthGroup) {
            // Not signed in, redirect to login
            router.replace('/auth/login');
        } else if (session && inAuthGroup) {
            // Signed in, redirect to home
            router.replace('/');
        }
    }, [session, authLoading, segments, splashDismissed]);

    // Share Intent Logic
    useEffect(() => {
        if (hasShareIntent && shareIntent.type === "weburl") {
            console.log("🚀 Sifting URL from Share Sheet:", shareIntent.webUrl);
            resetShareIntent();
        }
    }, [hasShareIntent, shareIntent, resetShareIntent]);

    if (!splashDismissed) {
        return (
            <SplashScreen
                onFinish={() => setSplashAnimationFinished(true)}
            />
        );
    }

    if (showOnboarding) {
        return (
            <Onboarding
                onComplete={() => {
                    setShowOnboarding(false);
                    SecureStore.setItemAsync('has_launched', 'true');
                }}
            />
        );
    }

    return (
        <GestureHandlerRootView style={{ flex: 1, backgroundColor: COLORS.canvas }}>
            <ImageBackground
                source={require("../assets/noise.png")}
                style={StyleSheet.absoluteFill}
                imageStyle={{ opacity: 0.04 }}
                resizeMode="repeat"
            >
                <Stack initialRouteName="(tabs)" screenOptions={{ contentStyle: { backgroundColor: 'transparent' }, headerShown: false }}>
                    <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                    <Stack.Screen name="share" options={{ headerShown: false, presentation: 'modal' }} />
                    <Stack.Screen name="+not-found" options={{ headerShown: false }} />
                </Stack>
            </ImageBackground>
        </GestureHandlerRootView>
    );
}

export default function RootLayout() {
    return (
        <AuthProvider>
            <RootLayoutNav />
        </AuthProvider>
    );
}
