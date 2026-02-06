import 'react-native-url-polyfill/auto';
import "../global.css";
import { Stack, useRouter, useSegments } from "expo-router";
import { useShareIntent } from "expo-share-intent";
import React, { useEffect, useState, useCallback } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Theme, COLORS, LIGHT_COLORS, DARK_COLORS } from "../lib/theme";
import * as SplashScreenIs from "expo-splash-screen";
import * as SecureStore from 'expo-secure-store';
import { View, ImageBackground, StyleSheet, TouchableOpacity, Text, useColorScheme } from "react-native";
import SplashScreen from "../components/SplashScreen";
import Onboarding from "../components/Onboarding";
import { AuthProvider, useAuth } from "../lib/auth";
import { Typography } from "../components/design-system/Typography";
import { ThemeProvider, useTheme } from "../context/ThemeContext";
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: 2,
            staleTime: 1000 * 60 * 5, // 5 minutes
            gcTime: 1000 * 60 * 60 * 24, // 24 hours
        },
    },
});

const asyncStoragePersister = createAsyncStoragePersister({
    storage: AsyncStorage,
});

// Basic Error Boundary
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: Error | null }> {
    constructor(props: any) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error) {
        return { hasError: true, error };
    }

    componentDidCatch(error: any, errorInfo: any) {
        console.error("App Crash:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <View style={{ flex: 1, backgroundColor: LIGHT_COLORS.canvas }}>
                    <ImageBackground
                        source={require("../assets/noise.png")}
                        style={StyleSheet.absoluteFill}
                        imageStyle={{ opacity: 0.04 }}
                        resizeMode="repeat"
                    >
                        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 }}>
                            <Text style={{
                                fontSize: 32,
                                fontFamily: 'PlayfairDisplay_700Bold',
                                color: LIGHT_COLORS.ink,
                                marginBottom: 12,
                                textAlign: 'center'
                            }}>
                                Something went wrong.
                            </Text>
                            <Text style={{
                                fontSize: 16,
                                fontFamily: 'Inter_400Regular',
                                textAlign: 'center',
                                color: LIGHT_COLORS.stone,
                                marginBottom: 24,
                                lineHeight: 24
                            }}>
                                Sift encountered an unexpected error. We've been notified and are looking into it.
                            </Text>

                            {this.state.error && (
                                <View style={{
                                    backgroundColor: 'rgba(0,0,0,0.03)',
                                    padding: 16,
                                    borderRadius: 12,
                                    marginBottom: 32,
                                    width: '100%'
                                }}>
                                    <Text style={{
                                        fontSize: 12,
                                        color: '#C47F65',
                                        fontFamily: 'GeistMono_400Regular',
                                        textAlign: 'left'
                                    }}>
                                        {this.state.error.message}
                                    </Text>
                                </View>
                            )}

                            <TouchableOpacity
                                onPress={() => this.setState({ hasError: false, error: null })}
                                style={{
                                    backgroundColor: LIGHT_COLORS.ink,
                                    paddingVertical: 16,
                                    paddingHorizontal: 32,
                                    borderRadius: 40,
                                    shadowColor: "#000",
                                    shadowOffset: { width: 0, height: 4 },
                                    shadowOpacity: 0.1,
                                    shadowRadius: 10,
                                    elevation: 3
                                }}
                            >
                                <Text style={{ color: LIGHT_COLORS.paper, fontWeight: '600', fontSize: 16, letterSpacing: 0.5 }}>Try Again</Text>
                            </TouchableOpacity>
                        </View>
                    </ImageBackground>
                </View>
            );
        }
        return this.props.children;
    }
}

// Fonts
import { useFonts, PlayfairDisplay_700Bold, PlayfairDisplay_600SemiBold } from '@expo-google-fonts/playfair-display';
import { InstrumentSerif_400Regular } from '@expo-google-fonts/instrument-serif';
import { Inter_400Regular, Inter_500Medium, Inter_700Bold } from '@expo-google-fonts/inter';
import { GeistMono_400Regular } from '@expo-google-fonts/geist-mono';
import { Lora_400Regular, Lora_500Medium, Lora_600SemiBold, Lora_400Regular_Italic } from '@expo-google-fonts/lora';

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
    const { colors } = useTheme();

    const [fontsLoaded] = useFonts({
        PlayfairDisplay_700Bold,
        PlayfairDisplay_600SemiBold,
        InstrumentSerif_400Regular,
        Inter_400Regular,
        Inter_500Medium,
        Inter_700Bold,
        GeistMono_400Regular,
        Lora_400Regular,
        Lora_500Medium,
        Lora_600SemiBold,
        Lora_400Regular_Italic
    });

    const [appReady, setAppReady] = useState(false);
    const [splashAnimationFinished, setSplashAnimationFinished] = useState(false);
    const [splashDismissed, setSplashDismissed] = useState(false);
    const [showOnboarding, setShowOnboarding] = useState(false);

    // Initial Preparation
    useEffect(() => {
        async function prepare() {
            try {
                const hasLaunched = await AsyncStorage.getItem('has_launched');
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
        // Safety timeout: Force hide splash after 6 seconds regardless of state
        // Runs once on mount to ensure we never get stuck
        const safetyTimer = setTimeout(() => {
            console.warn("[Splash] Safety timer triggered. Forcing dismissal.");
            setSplashDismissed(true);
            setSplashAnimationFinished(true);
            try {
                SplashScreenIs.hideAsync().catch(() => { /* Benign: Already hidden */ });
            } catch (e) { }
        }, 6000);
        return () => clearTimeout(safetyTimer);
    }, []);

    useEffect(() => {
        if (appReady && fontsLoaded && splashAnimationFinished && !authLoading) {
            setSplashDismissed(true);
            try {
                // Ensure this call doesn't throw unhandled promise rejection
                SplashScreenIs.hideAsync().catch(() => { /* Benign: Already hidden */ });
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
        if (hasShareIntent && shareIntent.type === "weburl" && shareIntent.webUrl) {
            console.log("🚀 Sifting URL from Share Sheet:", shareIntent.webUrl);
            const url = shareIntent.webUrl;
            resetShareIntent();
            router.replace(`/(tabs)/?siftUrl=${encodeURIComponent(url.trim())}`);
        }
    }, [hasShareIntent, shareIntent, resetShareIntent]);

    // CRITICAL: Block rendering of potentially themed components until fonts are loaded 
    // to prevent "font family not found" crashes on launch.
    if (!fontsLoaded || !splashDismissed) {
        return (
            <SplashScreen
                onFinish={() => setSplashAnimationFinished(true)}
            />
        );
    }

    return (
        <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.canvas }}>
            <StatusBar
                style={colors.canvas === '#0D0D0C' ? 'light' : 'dark'}
                translucent
                backgroundColor="transparent"
            />
            <ImageBackground
                source={require("../assets/noise.png")}
                style={StyleSheet.absoluteFill}
                imageStyle={{ opacity: colors.canvas === '#0D0D0C' ? 0.08 : 0.04 }}
                resizeMode="repeat"
            >
                {showOnboarding ? (
                    <Onboarding
                        onComplete={() => {
                            setShowOnboarding(false);
                            AsyncStorage.setItem('has_launched', 'true');
                        }}
                    />
                ) : (
                    <Stack initialRouteName="(tabs)" screenOptions={{ contentStyle: { backgroundColor: 'transparent' }, headerShown: false }}>
                        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                        <Stack.Screen name="share" options={{ headerShown: false, presentation: 'modal' }} />
                        <Stack.Screen name="+not-found" options={{ headerShown: false }} />
                    </Stack>
                )}
            </ImageBackground>
        </GestureHandlerRootView>
    );
}

export default function RootLayout() {
    return (
        <ErrorBoundary>
            <ThemeProvider>
                <PersistQueryClientProvider
                    client={queryClient}
                    persistOptions={{ persister: asyncStoragePersister }}
                >
                    <AuthProvider>
                        <RootLayoutNav />
                    </AuthProvider>
                </PersistQueryClientProvider>
            </ThemeProvider>
        </ErrorBoundary>
    );
}
