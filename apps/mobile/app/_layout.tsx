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
import { PersonalizationProvider } from "../context/PersonalizationContext";
import { ToastProvider } from "../context/ToastContext";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import * as NavigationBar from 'expo-navigation-bar';
import { Platform } from 'react-native';
import Purchases from 'react-native-purchases';
import { NetworkBanner } from '../components/NetworkBanner';
import { usePushNotifications } from '../hooks/usePushNotifications';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: 2,
            staleTime: 1000 * 60 * 5, // 5 minutes
            gcTime: 1000 * 60 * 60 * 24, // 24 hours
        },
    },
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
                                fontFamily: 'Satoshi-Regular',
                                textAlign: 'center',
                                color: LIGHT_COLORS.stone,
                                marginBottom: 24,
                                lineHeight: 24
                            }}>
                                An unexpected error occurred. Tap below to continue.
                            </Text>

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
                                <Text style={{ color: LIGHT_COLORS.paper, fontWeight: '600', fontSize: 16, letterSpacing: 0.5 }}>Go Back</Text>
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
// Satoshi: self-hosted humanist sans-serif (replaces Inter)
import { GeistMono_400Regular } from '@expo-google-fonts/geist-mono';
import { Lora_400Regular, Lora_500Medium, Lora_600SemiBold, Lora_400Regular_Italic } from '@expo-google-fonts/lora';

// Safe Splash Screen Prevention
let isSplashPrevented = false;
try {
    SplashScreenIs.preventAutoHideAsync()
        .then(() => { isSplashPrevented = true; })
        .catch(() => { isSplashPrevented = false; });
} catch (e) {
    isSplashPrevented = false;
}

function RootLayoutNav() {
    const { session, loading: authLoading } = useAuth();
    const segments = useSegments();
    const router = useRouter();
    const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntent();
    const { colors, isDark } = useTheme();

    // Push Notifications Registration
    usePushNotifications();


    // Android Navigation Bar Configuration for Edge-to-Edge
    useEffect(() => {
        if (Platform.OS === 'android') {
            NavigationBar.setBackgroundColorAsync('transparent');
            NavigationBar.setPositionAsync('absolute');
            NavigationBar.setBehaviorAsync('overlay-swipe');
            NavigationBar.setButtonStyleAsync(isDark ? 'light' : 'dark');
        }
    }, [isDark]);

    const [fontsLoaded] = useFonts({
        PlayfairDisplay_700Bold,
        PlayfairDisplay_600SemiBold,
        InstrumentSerif_400Regular,
        'Satoshi-Regular': require('../assets/fonts/Satoshi-Regular.ttf'),
        'Satoshi-Medium': require('../assets/fonts/Satoshi-Medium.ttf'),
        'Satoshi-Bold': require('../assets/fonts/Satoshi-Bold.ttf'),
        GeistMono_400Regular,
        Lora_400Regular,
        Lora_500Medium,
        Lora_600SemiBold,
        Lora_400Regular_Italic
    });

    const [appReady, setAppReady] = useState(false);
    const [rcReady, setRcReady] = useState(false);
    const [splashAnimationFinished, setSplashAnimationFinished] = useState(false);
    const [splashDismissed, setSplashDismissed] = useState(false);
    const [hasLaunched, setHasLaunched] = useState<boolean | null>(null);
    const splashHiddenRef = React.useRef(false);

    // RevenueCat Initialization
    useEffect(() => {
        const initPurchases = async () => {
            if (Platform.OS === 'web') {
                setRcReady(true);
                return;
            }

            try {
                const appleKey = process.env.EXPO_PUBLIC_REVENUECAT_APPLE_KEY;
                const googleKey = process.env.EXPO_PUBLIC_REVENUECAT_GOOGLE_KEY;

                if (Platform.OS === 'ios' && appleKey) {
                    await Purchases.configure({ apiKey: appleKey });
                } else if (Platform.OS === 'android' && googleKey) {
                    await Purchases.configure({ apiKey: googleKey });
                }
            } catch (error) {
            } finally {
                setRcReady(true);
            }
        };
        initPurchases();
    }, []);

    // RevenueCat User Identification
    useEffect(() => {
        const syncUser = async () => {
            if (Platform.OS === 'web' || !rcReady) return;

            try {
                if (session?.user?.id) {
                    await Purchases.logIn(session.user.id);
                } else {
                    const customerInfo = await Purchases.getCustomerInfo();
                    if (customerInfo?.originalAppUserId && !customerInfo.originalAppUserId.startsWith("$RCAnonymousID")) {
                        await Purchases.logOut();
                    }
                }
            } catch (error) {
            }
        };
        syncUser();
    }, [session?.user?.id, rcReady]);

    // Check if first launch
    useEffect(() => {
        AsyncStorage.getItem('has_launched').then(val => {
            setHasLaunched(val === 'true');
        }).catch(() => setHasLaunched(false));
    }, []);

    // Initial Preparation
    useEffect(() => {
        setAppReady(true);
    }, []);

    // Helper for safe splash dismissal
    const safeHideSplash = useCallback(async () => {
        if (splashHiddenRef.current) return;
        splashHiddenRef.current = true;

        try {
            if (isSplashPrevented) {
                await SplashScreenIs.hideAsync().catch(() => { /* Benign */ });
            }
        } catch (e) {
            // Benign error during reloading or if native screen was already gone
        }
    }, []);

    // Splash Dismissal Logic
    useEffect(() => {
        const safetyTimer = setTimeout(() => {
            setSplashDismissed(true);
            setSplashAnimationFinished(true);
            safeHideSplash();
        }, 6000);
        return () => clearTimeout(safetyTimer);
    }, [safeHideSplash]);

    useEffect(() => {
        if (appReady && fontsLoaded && splashAnimationFinished && !authLoading && rcReady) {
            setSplashDismissed(true);
            safeHideSplash();
        }
    }, [appReady, fontsLoaded, splashAnimationFinished, authLoading, safeHideSplash, rcReady]);

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

    // Show onboarding for first-time users
    if (hasLaunched === false) {
        return <Onboarding onComplete={() => setHasLaunched(true)} />;
    }

    return (
        <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.canvas }}>
            <StatusBar
                style={isDark ? 'light' : 'dark'}
                translucent
                backgroundColor="transparent"
            />
            <NetworkBanner />
            <ImageBackground
                source={require("../assets/noise.png")}
                style={StyleSheet.absoluteFill}
                imageStyle={{ opacity: isDark ? 0.08 : 0.04 }}
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
        <ErrorBoundary>
            <ThemeProvider>
                <QueryClientProvider client={queryClient}>
                    <AuthProvider>
                        <PersonalizationProvider>
                            <ToastProvider>
                                <RootLayoutNav />
                            </ToastProvider>
                        </PersonalizationProvider>
                    </AuthProvider>
                </QueryClientProvider>
            </ThemeProvider>
        </ErrorBoundary>
    );
}
