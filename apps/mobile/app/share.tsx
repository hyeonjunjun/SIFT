import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Image, Platform, BackHandler } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withDelay,
    withSpring,
    withSequence,
    Easing,
} from 'react-native-reanimated';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useShareIntent } from 'expo-share-intent';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../lib/auth';
import { Typography } from '../components/design-system/Typography';
import { supabase } from '../lib/supabase';
import { safeSift } from '../lib/sift-api';
import { getDomain, getSmartTag } from '../lib/utils';
import { CheckCircle } from 'phosphor-react-native';
import * as Haptics from 'expo-haptics';

type ShareState = 'saving' | 'success' | 'error';

export default function ShareScreen() {
    const { colors, isDark } = useTheme();
    const router = useRouter();
    const params = useLocalSearchParams();
    const { user, tier } = useAuth();
    const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntent();

    const [state, setState] = useState<ShareState>('saving');
    const [recipeTitle, setRecipeTitle] = useState('');
    const [processed, setProcessed] = useState(false);

    // Animations
    const iconScale = useSharedValue(0.8);
    const iconOpacity = useSharedValue(0);
    const progressWidth = useSharedValue(0);
    const checkScale = useSharedValue(0);
    const statusOpacity = useSharedValue(1);

    useEffect(() => {
        // Entrance animation
        iconOpacity.value = withTiming(1, { duration: 300 });
        iconScale.value = withSpring(1, { damping: 12, stiffness: 120 });
        progressWidth.value = withTiming(0.7, { duration: 2000, easing: Easing.bezier(0.25, 0.1, 0.25, 1) });
    }, []);

    // Android back button — go home instead of back
    useEffect(() => {
        if (Platform.OS !== 'android') return;
        const sub = BackHandler.addEventListener('hardwareBackPress', () => {
            router.replace('/(tabs)/');
            return true;
        });
        return () => sub.remove();
    }, []);

    useEffect(() => {
        if (processed) return;

        const handleShare = async () => {
            const directUrl = params.url as string;
            const intentUrl = (hasShareIntent && shareIntent.type === 'weburl') ? shareIntent.webUrl : null;
            const targetUrl = directUrl || intentUrl;

            if (!targetUrl || !user?.id) {
                router.replace('/(tabs)/');
                return;
            }

            resetShareIntent();
            setProcessed(true);

            const domain = getDomain(targetUrl);
            setRecipeTitle(domain);

            try {
                // Create pending record
                const smartTag = getSmartTag(targetUrl);
                const { data: pendingData, error: pendingError } = await supabase
                    .from('pages')
                    .insert({
                        user_id: user.id,
                        url: targetUrl,
                        title: 'Saving recipe...',
                        summary: 'Extracting ingredients & details...',
                        tags: [smartTag],
                        metadata: { status: 'pending', source: domain }
                    })
                    .select()
                    .single();

                if (pendingError) throw pendingError;

                // Process in background — don't await, let it finish after we dismiss
                safeSift(targetUrl, user.id, pendingData.id, tier).catch(() => {});

                // Show success after a short delay (API is processing in background)
                await new Promise(r => setTimeout(r, 1200));

                // Animate to success state
                progressWidth.value = withTiming(1, { duration: 300 });
                statusOpacity.value = withTiming(0, { duration: 200 });

                setTimeout(() => {
                    setState('success');
                    statusOpacity.value = withTiming(1, { duration: 300 });
                    checkScale.value = withSequence(
                        withSpring(1.2, { damping: 8, stiffness: 200 }),
                        withSpring(1, { damping: 12 }),
                    );
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                }, 250);

                // Auto-dismiss after 2s
                setTimeout(() => {
                    router.replace('/(tabs)/');
                }, 2800);

            } catch (e: any) {
                setState('error');
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                setTimeout(() => {
                    router.replace('/(tabs)/');
                }, 2000);
            }
        };

        handleShare();
    }, [params, hasShareIntent, shareIntent, user?.id, processed]);

    const iconStyle = useAnimatedStyle(() => ({
        opacity: iconOpacity.value,
        transform: [{ scale: iconScale.value }],
    }));

    const progressStyle = useAnimatedStyle(() => ({
        width: `${progressWidth.value * 100}%` as any,
    }));

    const checkStyle = useAnimatedStyle(() => ({
        transform: [{ scale: checkScale.value }],
    }));

    const statusStyle = useAnimatedStyle(() => ({
        opacity: statusOpacity.value,
    }));

    return (
        <View style={[styles.container, { backgroundColor: 'rgba(0,0,0,0.4)' }]}>
            <View style={[styles.card, { backgroundColor: colors.canvas }]}>
                {/* App Icon */}
                <Animated.View style={iconStyle}>
                    <Image
                        source={require('../assets/sift-logo.png')}
                        style={styles.appIcon}
                        resizeMode="contain"
                    />
                </Animated.View>

                {/* Status */}
                <Animated.View style={[styles.statusArea, statusStyle]}>
                    {state === 'saving' && (
                        <>
                            <Typography variant="bodyMedium" style={{ fontSize: 16, textAlign: 'center' }}>
                                Saving recipe...
                            </Typography>
                            <Typography variant="caption" color="stone" style={{ marginTop: 4, textAlign: 'center' }}>
                                {recipeTitle}
                            </Typography>

                            {/* Progress bar */}
                            <View style={[styles.progressTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
                                <Animated.View style={[styles.progressFill, { backgroundColor: colors.accent }, progressStyle]} />
                            </View>
                        </>
                    )}

                    {state === 'success' && (
                        <>
                            <Animated.View style={checkStyle}>
                                <CheckCircle size={36} color="#22C55E" weight="fill" />
                            </Animated.View>
                            <Typography variant="bodyMedium" style={{ fontSize: 16, marginTop: 8, textAlign: 'center' }}>
                                Recipe saved!
                            </Typography>
                            <Typography variant="caption" color="stone" style={{ marginTop: 4, textAlign: 'center' }}>
                                It'll be ready when you open Sift
                            </Typography>
                        </>
                    )}

                    {state === 'error' && (
                        <>
                            <Typography variant="bodyMedium" style={{ fontSize: 16, textAlign: 'center' }}>
                                Couldn't save this link
                            </Typography>
                            <Typography variant="caption" color="stone" style={{ marginTop: 4, textAlign: 'center' }}>
                                Try again from the app
                            </Typography>
                        </>
                    )}
                </Animated.View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    card: {
        alignItems: 'center',
        gap: 20,
        paddingVertical: 32,
        paddingHorizontal: 40,
        borderRadius: 24,
        ...Platform.select({
            ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 24 },
            android: { elevation: 8 },
        }),
    },
    appIcon: {
        width: 72,
        height: 72,
        borderRadius: 16,
    },
    statusArea: {
        alignItems: 'center',
        minHeight: 80,
    },
    progressTrack: {
        width: 200,
        height: 4,
        borderRadius: 2,
        marginTop: 16,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 2,
    },
});
