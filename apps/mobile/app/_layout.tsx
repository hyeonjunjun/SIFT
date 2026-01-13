import "../global.css";
import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Theme } from "../lib/theme";

import { useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { AuthProvider, useAuth } from "../lib/auth";

// Separate component to handle the hook usage safely inside Provider
function RootLayoutNav() {
    const { session, loading } = useAuth();
    const segments = useSegments();
    const router = useRouter();

    useEffect(() => {
        if (loading) return;

        const inAuthGroup = segments[0] === 'auth';

        if (!session && !inAuthGroup) {
            // Not signed in, redirect to login
            router.replace('/auth/login');
        } else if (session && inAuthGroup) {
            // Signed in, redirect to home
            router.replace('/');
        }
    }, [session, loading, segments]);

    return (
        <GestureHandlerRootView className="flex-1 bg-canvas">
            <Stack
                screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor: Theme.colors.background },
                }}
            />
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
