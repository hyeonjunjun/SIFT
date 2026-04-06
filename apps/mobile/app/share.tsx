import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, StyleSheet, Image, Platform, BackHandler, Pressable } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
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
import { CheckCircle, WarningCircle, ArrowCounterClockwise } from 'phosphor-react-native';
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
    const [targetUrl, setTargetUrl] = useState<string | null>(null);
    const mountedRef = useRef(true);
    const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

    // Safe timeout that tracks for cleanup
    const safeTimeout = useCallback((fn: () => void, ms: number) => {
        const id = setTimeout(() => {
            if (mountedRef.current) fn();
        }, ms);
        timersRef.current.push(id);
        return id;
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            mountedRef.current = false;
            timersRef.current.forEach(clearTimeout);
        };
    }, []);

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

    // Shared logic for creating pending record + firing sift (with dedup check)
    // Returns true if a new record was created, false if dedup matched
    const createAndSift = useCallback(async (url: string): Promise<boolean> => {
        // Dedup: check if this URL was already saved in the last 60 seconds
        const { data: existing } = await supabase
            .from('pages')
            .select('id')
            .eq('user_id', user!.id)
            .eq('url', url)
            .gte('created_at', new Date(Date.now() - 60000).toISOString())
            .limit(1);

        if (existing && existing.length > 0) {
            return false; // Already saved recently
        }

        const smartTag = getSmartTag(url);
        const domain = getDomain(url);
        const { data: pendingData, error: pendingError } = await supabase
            .from('pages')
            .insert({
                user_id: user!.id,
                url,
                title: 'Saving recipe...',
                summary: 'Extracting ingredients & details...',
                tags: [smartTag],
                metadata: { status: 'pending', source: domain }
            })
            .select()
            .single();

        if (pendingError) throw pendingError;

        // Process in background — don't await, let it finish after we dismiss
        safeSift(url, user!.id, pendingData.id, tier).catch(() => {});
        return true;
    }, [user?.id, tier]);

    // Animate from saving → success → auto-dismiss
    const animateSuccess = useCallback(() => {
        progressWidth.value = withTiming(1, { duration: 300 });
        statusOpacity.value = withTiming(0, { duration: 200 });

        safeTimeout(() => {
            setState('success');
            statusOpacity.value = withTiming(1, { duration: 300 });
            checkScale.value = withSequence(
                withSpring(1.2, { damping: 8, stiffness: 200 }),
                withSpring(1, { damping: 12 }),
            );
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }, 250);

        safeTimeout(() => {
            router.replace('/(tabs)/');
        }, 2800);
    }, [safeTimeout]);

    // Initial share processing
    useEffect(() => {
        if (processed) return;
        if (!user?.id) return;

        const handleShare = async () => {
            const directUrl = params.url as string;
            const intentUrl = (hasShareIntent && shareIntent.type === 'weburl') ? shareIntent.webUrl : null;
            const url = directUrl || intentUrl;

            if (!url) {
                router.replace('/(tabs)/');
                return;
            }

            resetShareIntent();
            setProcessed(true);
            setTargetUrl(url);
            setRecipeTitle(getDomain(url));

            try {
                const isNew = await createAndSift(url);
                if (isNew) {
                    await new Promise<void>(r => safeTimeout(r, 1200));
                }
                if (!mountedRef.current) return;
                animateSuccess();
            } catch (e: any) {
                if (!mountedRef.current) return;
                setState('error');
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            }
        };

        handleShare();
    }, [params, hasShareIntent, shareIntent, user?.id, processed, tier, createAndSift, animateSuccess, safeTimeout]);

    const handleRetry = useCallback(() => {
        if (!targetUrl || !user?.id) return;
        setState('saving');
        progressWidth.value = withTiming(0, { duration: 0 });
        progressWidth.value = withTiming(0.7, { duration: 2000, easing: Easing.bezier(0.25, 0.1, 0.25, 1) });
        statusOpacity.value = withTiming(1, { duration: 200 });

        (async () => {
            try {
                const isNew = await createAndSift(targetUrl);
                if (isNew) {
                    await new Promise<void>(r => safeTimeout(r, 1200));
                }
                if (!mountedRef.current) return;
                animateSuccess();
            } catch {
                if (!mountedRef.current) return;
                setState('error');
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            }
        })();
    }, [targetUrl, user?.id, createAndSift, animateSuccess, safeTimeout]);

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
        <Pressable
            style={[styles.container, { backgroundColor: 'rgba(0,0,0,0.4)' }]}
            onPress={state === 'success' || state === 'error' ? () => router.replace('/(tabs)/') : undefined}
        >
            <Pressable style={[styles.card, { backgroundColor: colors.canvas }]} onPress={(e) => e.stopPropagation()}>
                {/* App Icon */}
                <Animated.View style={iconStyle}>
                    <Image
                        source={require('../assets/sift-icon-transparent.png')}
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
                            <WarningCircle size={36} color={colors.danger} weight="fill" />
                            <Typography variant="bodyMedium" style={{ fontSize: 16, marginTop: 8, textAlign: 'center' }}>
                                Couldn't save this recipe
                            </Typography>
                            <Pressable
                                onPress={handleRetry}
                                style={[styles.retryButton, { backgroundColor: colors.ink }]}
                                hitSlop={8}
                            >
                                <ArrowCounterClockwise size={16} color={colors.paper} weight="bold" />
                                <Typography variant="label" style={{ color: colors.paper, marginLeft: 6 }}>
                                    Retry
                                </Typography>
                            </Pressable>
                            <Pressable onPress={() => router.replace('/(tabs)/')} hitSlop={8}>
                                <Typography variant="caption" color="stone" style={{ marginTop: 8, textAlign: 'center' }}>
                                    Dismiss
                                </Typography>
                            </Pressable>
                        </>
                    )}
                </Animated.View>
            </Pressable>
        </Pressable>
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
    retryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
        marginTop: 12,
    },
});
