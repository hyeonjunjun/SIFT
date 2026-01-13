import "../global.css";
import { Stack } from "expo-router";
import { useShareIntent } from "expo-share-intent";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Theme } from "../lib/theme";
import * as SplashScreen from "expo-splash-screen";
import { View, Text } from "react-native";

// Safe Splash Screen Prevention
try {
    SplashScreen.preventAutoHideAsync().catch(() => { });
} catch (e) {
    // Ignore native module missing
}

export default function RootLayout() {
    const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntent();

    useEffect(() => {
        // Safe Hide
        try {
            SplashScreen.hideAsync().catch(err => console.warn("Splash hide error", err));
        } catch (e) { }
    }, []);

    useEffect(() => {
        if (hasShareIntent && shareIntent.type === "weburl") {
            console.log("🚀 Sifting URL from Share Sheet:", shareIntent.webUrl);
            // TODO: Handle the URL (e.g., navigate to a specific screen or call an API)
            resetShareIntent();
        }
    }, [hasShareIntent, shareIntent, resetShareIntent]);


    return (
        <GestureHandlerRootView className="flex-1 bg-canvas">
            <Stack initialRouteName="(tabs)" screenOptions={{ contentStyle: { backgroundColor: Theme.colors.background } }}>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="share" options={{ headerShown: false, presentation: 'modal' }} />
                <Stack.Screen name="+not-found" options={{ headerShown: false }} />
            </Stack>
        </GestureHandlerRootView>
    );
}
