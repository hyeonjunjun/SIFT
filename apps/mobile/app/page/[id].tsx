import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import * as React from 'react';
import { useEffect, useState, useMemo } from 'react';
import {
    TextInput,
    TouchableOpacity,
    View,
    Text,
    Alert,
    Image,
    StyleSheet,
    ScrollView,
    RefreshControl,
    Linking,
    ActionSheetIOS,
    Platform,
    Share,
    ActivityIndicator
} from 'react-native';
import ScreenWrapper from '../../components/ScreenWrapper';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { CaretLeft, DotsThree, Export, NotePencil, Trash, House, Users, PaperPlaneTilt, CookingPot } from 'phosphor-react-native';
import { Modal, FlatList } from 'react-native';
import { Theme, COLORS, SPACING, RADIUS } from '../../lib/theme';
import { Typography } from '../../components/design-system/Typography';
import { useTheme } from '../../context/ThemeContext';
import { getDomain } from '../../lib/utils';
import SafeContentRenderer from '../../components/SafeContentRenderer';
import { Plus, X, ArrowSquareOut, PlusCircle, Copy, ImageSquare } from 'phosphor-react-native';
import * as Clipboard from 'expo-clipboard';
import { ActionSheet } from '../../components/modals/ActionSheet';
import { CookModeModal } from '../../components/modals/CookModeModal';
import { useAuth } from '../../lib/auth';
import { safeSift } from '../../lib/sift-api';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { SiftDetailSkeleton } from '../../components/SiftDetailSkeleton';
import { GestureDetector, Gesture, Directions } from 'react-native-gesture-handler';
import Animated, { SlideInRight, SlideOutLeft, SlideInLeft, SlideOutRight, runOnJS, FadeOut, Easing } from 'react-native-reanimated';

const SUGGESTED_TAGS = [
    "Cooking", "Baking", "Tech", "Health", "Lifestyle", "Professional",
    "Finance", "Design", "Travel", "Entertainment", "Science", "Shopping",
    "Fitness", "Beauty", "Education", "News", "DIY", "Parenting",
    "Music", "Photography", "Gaming", "Productivity", "Fashion", "Food"
];

// Scale a quantity string like "2 cups flour" by a multiplier
/** Safely parse servings from AI output — handles "4", "4-6", "Makes 12", etc. */
function parseServings(raw: any): number {
    if (typeof raw === 'number' && !isNaN(raw)) return raw;
    if (typeof raw === 'string') {
        const match = raw.match(/(\d+)/);
        if (match) return parseInt(match[1], 10);
    }
    return 0; // 0 means unknown — hide the counter
}

function scaleIngredient(ingredient: string, multiplier: number): string {
    if (multiplier === 1) return ingredient;
    // Match leading fraction or decimal number
    const match = ingredient.match(/^(\d+\/\d+|\d+\.?\d*)\s*/);
    if (!match) return ingredient;
    let num: number;
    if (match[1].includes('/')) {
        const [n, d] = match[1].split('/');
        num = parseInt(n) / parseInt(d);
    } else {
        num = parseFloat(match[1]);
    }
    const scaled = num * multiplier;
    // Format nicely: use fractions for common values
    const formatNum = (n: number): string => {
        const rounded = Math.round(n * 4) / 4; // round to nearest quarter
        const whole = Math.floor(rounded);
        const frac = rounded - whole;
        const fracStr = frac === 0.25 ? '1/4' : frac === 0.5 ? '1/2' : frac === 0.75 ? '3/4' : '';
        if (whole === 0 && fracStr) return fracStr;
        if (fracStr) return `${whole} ${fracStr}`;
        return rounded % 1 === 0 ? rounded.toString() : rounded.toFixed(1);
    };
    return ingredient.replace(match[0], formatNum(scaled) + ' ');
}

function MacroBar({ label, value, unit, color, isDark, multiplier = 1 }: { label: string; value: number; unit: string; color: string; isDark: boolean; multiplier?: number }) {
    const scaled = Math.round(value * multiplier);
    const maxVal = label === 'Fiber' ? 30 : 100;
    const pct = Math.min(scaled / maxVal, 1);
    return (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Typography variant="caption" color="stone" style={{ width: 42, fontSize: 11 }}>{label}</Typography>
            <View style={{ flex: 1, height: 8, borderRadius: 4, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }}>
                <View style={{ width: `${pct * 100}%`, height: '100%', borderRadius: 4, backgroundColor: color, minWidth: 4 }} />
            </View>
            <Typography variant="caption" style={{ fontSize: 12, fontFamily: 'Satoshi-Bold', width: 36, textAlign: 'right' }}>
                {scaled}{unit}
            </Typography>
        </View>
    );
}

export default function PageDetail() {
    const { colors, isDark } = useTheme();
    const insets = useSafeAreaInsets();
    const { id, contextType, previewTitle, previewSummary, previewImage, previewTags, previewSource } = useLocalSearchParams();
    const { user, tier } = useAuth();
    const router = useRouter();
    const queryClient = useQueryClient();
    const [content, setContent] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [newTag, setNewTag] = useState('');
    const [editedTags, setEditedTags] = useState<string[]>([]);
    const [isShared, setIsShared] = useState(false);
    const [showDirectShare, setShowDirectShare] = useState(false);
    const [reSifting, setReSifting] = useState(false);
    const [scrollProgress, setScrollProgress] = useState(0);
    const [uploadingCover, setUploadingCover] = useState(false);
    const [servingMultiplier, setServingMultiplier] = useState(1);
    const [cookModeVisible, setCookModeVisible] = useState(false);

    // Pre-request media library permissions so gallery opens instantly
    useEffect(() => {
        ImagePicker.requestMediaLibraryPermissionsAsync();
    }, []);

    const changeCoverImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [16, 9],
            quality: 0.8,
        });

        if (result.canceled || !result.assets[0]) return;

        setUploadingCover(true);
        try {
            const manipulated = await ImageManipulator.manipulateAsync(
                result.assets[0].uri,
                [{ resize: { width: 800 } }],
                { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
            );

            const fileName = `${user?.id}/sift_cover_${id}_${Date.now()}.jpg`;
            const formData = new FormData();
            formData.append('file', {
                uri: manipulated.uri,
                name: fileName,
                type: 'image/jpeg',
            } as any);

            const { error: uploadError } = await supabase.storage
                .from('covers')
                .upload(fileName, formData, {
                    contentType: 'image/jpeg',
                    upsert: true,
                });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('covers')
                .getPublicUrl(fileName);

            await supabase
                .from('pages')
                .update({ metadata: { ...page?.metadata, image_url: publicUrl } })
                .eq('id', id);

            queryClient.invalidateQueries({ queryKey: ['page', id] });
            queryClient.invalidateQueries({ queryKey: ['sifts'] });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (e: any) {
            Alert.alert('Upload Failed', e.message || 'Could not update cover image.');
        } finally {
            setUploadingCover(false);
        }
    };

    // 1. Fetch Neighbor IDs for Navigation
    const { data: neighborIds } = useQuery({
        queryKey: ['neighbors', contextType, user?.id],
        queryFn: async () => {
            if (!user?.id) return [];
            let query = supabase
                .from('pages')
                .select('id')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(300); // Limit to recent context (Increased from 50 to 300 to allow deeper navigation)

            if (contextType === 'archive') {
                query = query.eq('is_archived', true);
            } else {
                query = query.or('is_archived.is.null,is_archived.eq.false');
            }

            const { data, error } = await query;
            if (error) {
                return [];
            }
            return data.map(row => row.id);
        },
        enabled: !!user?.id && !!contextType,
        staleTime: 1000 * 60 * 5, // Cache for 5 mins
        retry: 2,
    });

    const { prevId, nextId } = useMemo(() => {
        if (!neighborIds || !id) return { prevId: null, nextId: null };
        const currentIndex = neighborIds.indexOf(id as string);
        if (currentIndex === -1) return { prevId: null, nextId: null };

        // List is ordered DESC (Newest First).
        // Index 0 is Newest.
        // Next (Swipe Left) -> Older -> Index + 1
        // Prev (Swipe Right) -> Newer -> Index - 1
        const nextIndex = currentIndex + 1;
        const prevIndex = currentIndex - 1;

        return {
            nextId: nextIndex < neighborIds.length ? neighborIds[nextIndex] : null,
            prevId: prevIndex >= 0 ? neighborIds[prevIndex] : null
        };
    }, [id, neighborIds]);

    // Animation Logic — swipe between sifts uses reanimated, initial push uses native stack
    const direction = useLocalSearchParams().direction as string;
    const isSwipeNav = direction === 'next' || direction === 'prev';
    const [exitDirection, setExitDirection] = useState<'next' | 'prev' | null>(null);

    const transition = (anim: any) => anim.duration(300).easing(Easing.inOut(Easing.quad));

    // Only apply reanimated enter/exit for swipe navigation between sifts
    const enteringAnimation = useMemo(() => {
        if (direction === 'next') return transition(SlideInRight);
        if (direction === 'prev') return transition(SlideInLeft);
        return undefined;
    }, [direction]);

    const exitingAnimation = useMemo(() => {
        if (exitDirection === 'next') return transition(SlideOutLeft);
        if (exitDirection === 'prev') return transition(SlideOutRight);
        return undefined;
    }, [exitDirection]);

    const handleNavigate = (targetId: string, dir: 'next' | 'prev') => {
        if (!targetId) return;
        Haptics.selectionAsync();
        setExitDirection(dir);

        // Small delay to ensure state update renders before unmount
        setTimeout(() => {
            router.replace({
                pathname: `/page/${targetId}`,
                params: { contextType, direction: dir }
            });
        }, 10);
    };

    // 2. Define Gestures
    const composedGesture = Gesture.Pan()
        .activeOffsetX([-30, 30])
        .failOffsetY([-30, 30])
        .onEnd((e) => {
            if (e.velocityX < -400 && nextId) {
                runOnJS(handleNavigate)(nextId, 'next');
            } else if (e.velocityX > 400 && prevId) {
                runOnJS(handleNavigate)(prevId, 'prev');
            }
        });

    // Helper for Worklets
    // (RunOnJS removed)


    const { data: friends = [] } = useQuery({
        queryKey: ['friendships', user?.id],
        queryFn: async () => {
            if (!user?.id) return [];
            const { data, error } = await supabase
                .from('friendships')
                .select(`
                    *,
                    requester:user_id (id, username, display_name, avatar_url),
                    receiver:friend_id (id, username, display_name, avatar_url)
                `)
                .eq('status', 'accepted')
                .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);
            if (error) throw error;
            return data.map((f: any) => f.user_id === user.id ? f.receiver : f.requester);
        },
        enabled: !!user?.id && showDirectShare,
        staleTime: 1000 * 60 * 5, // 5 mins
        retry: 2,
    });

    // Build placeholder from navigation params for instant rendering
    const previewPlaceholder = useMemo(() => {
        if (!previewTitle) return undefined;
        return {
            id,
            title: previewTitle as string,
            summary: previewSummary as string || '',
            tags: previewTags ? (previewTags as string).split(',').filter(Boolean) : [],
            metadata: {
                image_url: previewImage as string || undefined,
                source: previewSource as string || undefined,
                status: 'completed',
            },
            content: null, // Will be filled by real query
        };
    }, [id, previewTitle, previewSummary, previewImage, previewTags, previewSource]);

    const { data: page, isLoading: loading, isError, error, refetch, isPlaceholderData } = useQuery({
        queryKey: ['page', id],
        queryFn: async () => {
            if (!id) return null;
            const { data, error } = await supabase
                .from('pages')
                .select('*')
                .eq('id', id)
                .single();

            if (data) {
                import('@react-native-async-storage/async-storage').then(({ default: AsyncStorage }) => {
                    AsyncStorage.setItem(`@page_${id}`, JSON.stringify(data)).catch(() => { });
                });
            }

            if (error) {
                const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');
                const cached = await AsyncStorage.getItem(`@page_${id}`);
                if (cached) {
                    return JSON.parse(cached);
                }
                throw error;
            }

            return data;
        },
        enabled: !!id,
        staleTime: 1000 * 60 * 5,
        retry: 2,
        placeholderData: previewPlaceholder,
    });

    useEffect(() => {
        if (page) {
            setIsShared(page.user_id !== user?.id);
            const fullDoc = page.content || `# ${page.title}\n\n> ${page.summary}`;
            setContent(fullDoc);
            setEditedTags(page.tags || []);
        }
    }, [page, user?.id]);

    useEffect(() => {
        if (!id) return;

        const subscription = supabase
            .channel(`page_detail_${id}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'pages',
                    filter: `id=eq.${id}`,
                },
                (payload) => {
                    queryClient.resetQueries({ queryKey: ['page', id] });
                }
            )
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, [id]);

    const onRefresh = async () => {
        setRefreshing(true);
        await queryClient.resetQueries({ queryKey: ['page', id] });
        setRefreshing(false);
    };

    const [actionSheetVisible, setActionSheetVisible] = useState(false);

    const handleMoreOptions = () => {
        setActionSheetVisible(true);
    };

    const handleDelete = async () => {
        Alert.alert(
            "Delete Sift",
            "Are you sure? This cannot be undone.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const { error } = await supabase.from('pages').delete().eq('id', id);
                            if (error) throw error;
                            router.back();
                        } catch (e: any) {
                            Alert.alert("Error", e.message);
                        }
                    }
                }
            ]
        );
    };

    if (loading && !refreshing && !page) {
        return (
            <ScreenWrapper edges={['top']} style={{ backgroundColor: colors.canvas }}>
                <Stack.Screen options={{
                    headerShown: false,
                    animation: isSwipeNav ? 'none' : 'ios_from_right',
                    contentStyle: { backgroundColor: colors.canvas },
                }} />
                <SiftDetailSkeleton />
            </ScreenWrapper>
        );
    }

    if (isError || (!loading && !page)) {
        return (
            <ScreenWrapper edges={['top']} style={{ backgroundColor: colors.canvas }}>
                <Stack.Screen options={{ headerShown: false }} />
                <View style={styles.navBar}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.navButton} accessibilityLabel="Go back" accessibilityRole="button">
                        <CaretLeft size={28} color={colors.ink} weight="bold" />
                    </TouchableOpacity>
                </View>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 }}>
                    <Typography variant="h2" style={{ marginBottom: 16, textAlign: 'center' }}>
                        Unable to Load Sift
                    </Typography>
                    <Typography variant="body" color="stone" style={{ textAlign: 'center', marginBottom: 32 }}>
                        {error ? `Error: ${(error as any)?.message || 'Unknown error'}` : 'This sift could not be found.'}
                    </Typography>
                    <TouchableOpacity
                        onPress={() => refetch()}
                        style={{
                            backgroundColor: colors.ink,
                            paddingHorizontal: 24,
                            paddingVertical: 12,
                            borderRadius: 12,
                        }}
                    >
                        <Typography variant="label" style={{ color: colors.paper }}>
                            Try Again
                        </Typography>
                    </TouchableOpacity>
                </View>
            </ScreenWrapper>
        );
    }

    const handleSaveToLibrary = async () => {
        if (!page) return;
        setSaving(true);
        try {
            const { id: _, created_at: __, ...pageData } = page;
            const { data, error } = await supabase
                .from('pages')
                .insert([{
                    ...pageData,
                    user_id: user?.id,
                    created_at: new Date().toISOString(),
                    is_pinned: false,
                    is_archived: false,
                    metadata: {
                        ...page.metadata,
                        shared_from: page.user_id,
                        original_id: page.id
                    }
                }])
                .select()
                .single();

            if (error) throw error;

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            // We don't use Alert.alert here for a smoother flow, just redirect to the NEW localized version
            router.replace({
                pathname: `/page/${data.id}`,
                params: { contextType }
            });
        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setSaving(false);
        }
    };

    const handleShare = async () => {
        if (!page) return;
        try {
            const shareUrl = `https://sift-rho.vercel.app/share/${id}`;
            await Share.share({
                message: `Check out this Sift: ${page.title}\n\n${shareUrl}`,
                url: shareUrl,
            });
        } catch (error: any) {
            Alert.alert('Error', error.message);
        }
    };



    const handleDirectShare = async (friendId: string) => {
        try {
            const { error } = await supabase
                .from('direct_messages')
                .insert([{
                    sift_id: id,
                    sender_id: user?.id,
                    receiver_id: friendId,
                    content: 'Shared a Sift',
                    message_type: 'sift'
                }]);
            if (error) throw error;

            // Fire Push Notification Webhook (Non-blocking)
            fetch(`${process.env.EXPO_PUBLIC_API_URL || 'https://sift.so'}/api/push`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    receiverId: friendId,
                    actorName: user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'A friend',
                    type: 'direct_message_sift',
                    siftTitle: page?.title || undefined,
                    messageContent: 'Shared a Sift',
                    siftId: id
                })
            }).catch(() => {});

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setShowDirectShare(false);
            Alert.alert("Sent!", "Sift shared with your friend.");
        } catch (e: any) {
            Alert.alert("Error", e.message);
        }
    };
    const handleSave = async () => {
        if (!page) return;
        setSaving(true);
        try {
            const { error } = await supabase
                .from('pages')
                .update({
                    content: content,
                    tags: editedTags
                })
                .eq('id', id);

            if (error) throw error;
            setIsEditing(false);
            queryClient.resetQueries({ queryKey: ['page', id] });
            queryClient.resetQueries({ queryKey: ['pages', user?.id] });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setSaving(false);
        }
    };

    const handleScroll = (event: any) => {
        const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
        const scrollPosition = contentOffset.y;
        const scrollViewHeight = layoutMeasurement.height;
        const contentHeight = contentSize.height;

        // Calculate progress (0 to 1)
        const maxScroll = contentHeight - scrollViewHeight;
        const progress = maxScroll > 0 ? Math.min(scrollPosition / maxScroll, 1) : 0;
        setScrollProgress(progress);
    };

    return (
        <GestureDetector gesture={composedGesture}>
            <View collapsable={false} style={{ flex: 1 }}>
                <ScreenWrapper edges={['top', 'bottom']} style={{ backgroundColor: colors.canvas }}>
                    <Stack.Screen options={{
                        headerShown: false,
                        animation: isSwipeNav ? 'none' : 'ios_from_right',
                        contentStyle: { backgroundColor: colors.canvas },
                    }} />

                    <Animated.View
                        style={{ flex: 1 }}
                        entering={isSwipeNav ? enteringAnimation : undefined}
                        exiting={exitingAnimation}
                    >
                        {/* Simplified Navigation Header */}
                        <View style={styles.navBar}>
                            <TouchableOpacity
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    router.back();
                                }}
                                style={styles.navButton}
                                hitSlop={16}
                                accessibilityLabel="Go back"
                                accessibilityRole="button"
                            >
                                <CaretLeft size={28} color={colors.ink} />
                            </TouchableOpacity>
                            <View style={{ flex: 1 }} />
                            <TouchableOpacity onPress={handleMoreOptions} style={styles.navButton} hitSlop={16} accessibilityLabel="More options" accessibilityRole="button">
                                <DotsThree size={28} color={colors.ink} />
                            </TouchableOpacity>
                            {isShared && (
                                <TouchableOpacity
                                    onPress={() => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                        router.replace('/(tabs)/');
                                    }}
                                    style={[styles.navButton, { marginLeft: SPACING.s }]}
                                    accessibilityLabel="Go to home"
                                    accessibilityRole="button"
                                    hitSlop={16}
                                >
                                    <House size={28} color={colors.ink} />
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* Reading Progress Indicator */}
                        <View style={styles.progressContainer}>
                            <View
                                style={[
                                    styles.progressBar,
                                    {
                                        width: `${scrollProgress * 100}%`,
                                        backgroundColor: colors.accent
                                    }
                                ]}
                            />
                        </View>

                        <ScrollView
                            contentContainerStyle={styles.scrollContent}
                            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.ink} />}
                            onScroll={handleScroll}
                            scrollEventThrottle={16}
                        >
                            {/* Card 1: Image */}
                            {page?.metadata?.image_url && (
                                <TouchableOpacity
                                    activeOpacity={0.85}
                                    onPress={changeCoverImage}
                                    accessibilityLabel="Change cover image"
                                    accessibilityRole="button"
                                    style={[styles.imageWrapper, { backgroundColor: colors.surface, borderRadius: RADIUS.l, overflow: 'hidden', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)' }]}
                                >
                                    <Image
                                        source={{ uri: page.metadata.image_url }}
                                        style={{ width: '100%', height: 240 }}
                                        resizeMode="cover"
                                    />
                                    {uploadingCover && (
                                        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' }}>
                                            <ActivityIndicator size="large" color="#fff" />
                                        </View>
                                    )}
                                    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: RADIUS.l, borderWidth: 1, borderColor: 'rgba(0,0,0,0.1)', pointerEvents: 'none' }} />
                                </TouchableOpacity>
                            )}

                            {/* Card 2: Header Info */}
                            <View style={[styles.bentoCard, { backgroundColor: colors.paper, borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.1)' }]}>
                                <View style={styles.tagRow}>
                                    {isEditing ? (
                                        <View style={styles.tagEditor}>
                                            <View style={styles.tagList}>
                                                {editedTags.map(tag => (
                                                    <TouchableOpacity
                                                        key={tag}
                                                        style={[
                                                            styles.tagPill,
                                                            { backgroundColor: colors.ink, borderColor: colors.ink }
                                                        ]}
                                                        onPress={() => setEditedTags(editedTags.filter(t => t !== tag))}
                                                    >
                                                        <Typography variant="caption" style={{ color: colors.paper }}>
                                                            {tag}
                                                        </Typography>
                                                        <X size={12} color={colors.paper} style={{ marginLeft: 4 }} />
                                                    </TouchableOpacity>
                                                ))}
                                                {SUGGESTED_TAGS.filter(t => !editedTags.includes(t)).slice(0, 5).map(tag => (
                                                    <TouchableOpacity
                                                        key={tag}
                                                        style={[
                                                            styles.tagPill,
                                                            { backgroundColor: colors.canvas, borderColor: colors.separator }
                                                        ]}
                                                        onPress={() => setEditedTags([...editedTags, tag])}
                                                    >
                                                        <Typography variant="caption" style={{ color: colors.stone }}>
                                                            + {tag}
                                                        </Typography>
                                                    </TouchableOpacity>
                                                ))}
                                            </View>
                                        </View>
                                    ) : (
                                        <Typography variant="label" color="stone" style={styles.metaLabel}>
                                            {page?.tags?.join(' • ') || 'SAVED'} • {page?.created_at ? new Date(page.created_at).toLocaleDateString() : 'Recent'}{page?.metadata?.reading_time_minutes ? ` • ${page.metadata.reading_time_minutes} min read` : ''}
                                        </Typography>
                                    )}
                                </View>
                                <Typography variant="h1" style={{ marginBottom: 12 }}>
                                    {page?.title || 'Sifting...'}
                                </Typography>
                                <View style={styles.sourceRow}>
                                    <Image
                                        source={{ uri: `https://www.google.com/s2/favicons?domain=${getDomain(page?.url)}` }}
                                        style={styles.favicon}
                                    />
                                    <Typography variant="caption">
                                        {getDomain(page?.url)}
                                    </Typography>
                                </View>
                            </View>

                            {/* Card 3: Actions (Primary + Secondary) */}
                            <View style={{ flexDirection: 'row', gap: SPACING.s }}>
                                {/* Primary Action: Original/Save */}
                                <TouchableOpacity
                                    style={[
                                        styles.bentoCard,
                                        styles.actionCard,
                                        {
                                            flex: 1.5,
                                            backgroundColor: isEditing || isShared ? colors.ink : colors.paper,
                                            borderColor: isEditing || isShared ? colors.ink : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.1)'),
                                            borderWidth: isEditing || isShared ? 0 : 1,
                                        }
                                    ]}
                                    onPress={async () => {
                                        if (isEditing) {
                                            handleSave();
                                        } else {
                                            if (isShared) {
                                                handleSaveToLibrary();
                                            } else {
                                                if (page?.url) {
                                                    try {
                                                        const canOpen = await Linking.canOpenURL(page.url);
                                                        if (canOpen) {
                                                            await Linking.openURL(page.url);
                                                        } else {
                                                            Alert.alert('Unable to Open', 'Cannot open this URL on your device.');
                                                        }
                                                    } catch (error) {
                                                        Alert.alert('Error', 'Unable to open this link.');
                                                    }
                                                }
                                            }
                                        }
                                    }}
                                >
                                    {isEditing ? (
                                        <NotePencil size={24} color={colors.paper} weight="fill" style={{ marginBottom: SPACING.s }} />
                                    ) : (
                                        isShared ? (
                                            <PlusCircle size={24} color={colors.paper} weight="fill" style={{ marginBottom: SPACING.s }} />
                                        ) : (
                                            <ArrowSquareOut size={24} color={colors.ink} weight="bold" style={{ marginBottom: SPACING.s }} />
                                        )
                                    )}
                                    <Typography variant="label" color={isEditing || isShared ? "paper" : "ink"} numberOfLines={1} adjustsFontSizeToFit style={{ fontWeight: '700' }}>
                                        {isEditing ? (saving ? 'Saving...' : 'Save') : (isShared ? (saving ? 'Adding...' : 'Save') : 'Original')}
                                    </Typography>
                                </TouchableOpacity>
                                {!isEditing && (
                                    <>
                                        {/* Secondary Actions */}
                                        <TouchableOpacity
                                            style={[styles.bentoCard, styles.actionCard, { flex: 1, backgroundColor: colors.surface, borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}
                                            onPress={() => setShowDirectShare(true)}
                                        >
                                            <PaperPlaneTilt size={22} color={colors.textSecondary} weight="regular" style={{ marginBottom: SPACING.s }} />
                                            <Typography variant="label" color="textSecondary" numberOfLines={1} adjustsFontSizeToFit style={{ fontSize: 10 }}>Send</Typography>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.bentoCard, styles.actionCard, { flex: 1, backgroundColor: colors.surface, borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}
                                            onPress={async () => {
                                                const textToCopy = page?.content || `# ${page?.title}\n\n${page?.summary}`;
                                                await Clipboard.setStringAsync(textToCopy);
                                                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                                                Alert.alert("Copied", "Sift contents copied to clipboard.");
                                            }}
                                        >
                                            <Copy size={22} color={colors.textSecondary} weight="regular" style={{ marginBottom: SPACING.s }} />
                                            <Typography variant="label" color="textSecondary" numberOfLines={1} adjustsFontSizeToFit style={{ fontSize: 10 }}>Copy</Typography>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.bentoCard, styles.actionCard, { flex: 1, backgroundColor: colors.surface, borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}
                                            onPress={handleShare}
                                        >
                                            <Export size={22} color={colors.textSecondary} weight="regular" style={{ marginBottom: SPACING.s }} />
                                            <Typography variant="label" color="textSecondary" numberOfLines={1} adjustsFontSizeToFit style={{ fontSize: 10 }}>Share</Typography>
                                        </TouchableOpacity>
                                    </>
                                )}
                                {isEditing && (
                                    <TouchableOpacity
                                        style={[styles.bentoCard, styles.actionCard, { flex: 1, backgroundColor: colors.paper, borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.1)' }]}
                                        onPress={() => {
                                            setIsEditing(false);
                                            setEditedTags(page.tags || []);
                                            setContent(page.content || `# ${page.title}\n\n> ${page.summary}`);
                                        }}
                                    >
                                        <X size={24} color="#EF4444" weight="thin" style={{ marginBottom: 8 }} />
                                        <Typography variant="label" style={{ color: '#EF4444' }}>Cancel</Typography>
                                    </TouchableOpacity>
                                )}
                            </View>

                            {/* Smart Data Card (recipes, tutorials, videos) */}
                            {page?.metadata?.smart_data && Object.keys(page.metadata.smart_data).filter(k => {
                                const v = page.metadata.smart_data[k];
                                return v && v !== '' && v !== null && v !== undefined && !(Array.isArray(v) && v.length === 0) && !(typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 0);
                            }).length > 0 && (
                                <View style={[styles.bentoCard, { backgroundColor: colors.surface, borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)', paddingVertical: SPACING.m, gap: SPACING.m }]}>
                                    {/* Recipe Info Row */}
                                    {(page.metadata.smart_data.preparation_time || page.metadata.smart_data.cook_time || page.metadata.smart_data.total_time || page.metadata.smart_data.servings || page.metadata.smart_data.difficulty || page.metadata.smart_data.cuisine) && (
                                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.m }}>
                                            {page.metadata.smart_data.preparation_time && (
                                                <View style={{ gap: 2 }}>
                                                    <Typography variant="label" color="stone" style={{ fontSize: 10, letterSpacing: 1 }}>PREP</Typography>
                                                    <Typography variant="bodyMedium">{page.metadata.smart_data.preparation_time}</Typography>
                                                </View>
                                            )}
                                            {page.metadata.smart_data.cook_time && (
                                                <View style={{ gap: 2 }}>
                                                    <Typography variant="label" color="stone" style={{ fontSize: 10, letterSpacing: 1 }}>COOK</Typography>
                                                    <Typography variant="bodyMedium">{page.metadata.smart_data.cook_time}</Typography>
                                                </View>
                                            )}
                                            {page.metadata.smart_data.total_time && !page.metadata.smart_data.preparation_time && (
                                                <View style={{ gap: 2 }}>
                                                    <Typography variant="label" color="stone" style={{ fontSize: 10, letterSpacing: 1 }}>TOTAL</Typography>
                                                    <Typography variant="bodyMedium">{page.metadata.smart_data.total_time}</Typography>
                                                </View>
                                            )}
                                            {page.metadata.smart_data.servings && (
                                                <View style={{ gap: 2 }}>
                                                    <Typography variant="label" color="stone" style={{ fontSize: 10, letterSpacing: 1 }}>SERVES</Typography>
                                                    <Typography variant="bodyMedium">
                                                        {parseServings(page.metadata.smart_data.servings) > 0
                                                            ? Math.max(1, Math.round(parseServings(page.metadata.smart_data.servings) * servingMultiplier))
                                                            : page.metadata.smart_data.servings}
                                                    </Typography>
                                                </View>
                                            )}
                                            {page.metadata.smart_data.difficulty && (
                                                <View style={{ gap: 2 }}>
                                                    <Typography variant="label" color="stone" style={{ fontSize: 10, letterSpacing: 1 }}>LEVEL</Typography>
                                                    <Typography variant="bodyMedium" style={{ textTransform: 'capitalize' }}>{page.metadata.smart_data.difficulty}</Typography>
                                                </View>
                                            )}
                                            {page.metadata.smart_data.cuisine && (
                                                <View style={{ gap: 2 }}>
                                                    <Typography variant="label" color="stone" style={{ fontSize: 10, letterSpacing: 1 }}>CUISINE</Typography>
                                                    <Typography variant="bodyMedium">{page.metadata.smart_data.cuisine}</Typography>
                                                </View>
                                            )}
                                        </View>
                                    )}

                                    {/* Dietary Tags */}
                                    {page.metadata.smart_data.dietary_tags && page.metadata.smart_data.dietary_tags.length > 0 && (
                                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs }}>
                                            {page.metadata.smart_data.dietary_tags.map((tag: string) => (
                                                <View
                                                    key={tag}
                                                    style={{
                                                        paddingHorizontal: SPACING.s,
                                                        paddingVertical: 4,
                                                        borderRadius: RADIUS.pill,
                                                        backgroundColor: isDark ? 'rgba(138,175,154,0.15)' : 'rgba(138,175,154,0.12)',
                                                        borderWidth: 1,
                                                        borderColor: isDark ? 'rgba(138,175,154,0.25)' : 'rgba(138,175,154,0.2)',
                                                    }}
                                                >
                                                    <Typography variant="caption" style={{ fontSize: 11, color: isDark ? '#A8C9B5' : '#5A8A6A', fontFamily: 'Satoshi-Medium' }}>
                                                        {tag}
                                                    </Typography>
                                                </View>
                                            ))}
                                        </View>
                                    )}

                                    {/* Nutrition Macros */}
                                    {page.metadata.smart_data.nutrition_per_serving && page.metadata.smart_data.nutrition_per_serving.calories && (
                                        <>
                                            <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }} />
                                            <View style={{ gap: SPACING.s }}>
                                                <Typography variant="label" color="stone" style={{ fontSize: 10, letterSpacing: 1 }}>
                                                    NUTRITION{servingMultiplier !== 1 ? ' (PER ADJUSTED SERVING)' : ' PER SERVING'}
                                                </Typography>
                                                <View style={{ flexDirection: 'row', gap: SPACING.s }}>
                                                    {/* Calories — hero stat */}
                                                    <View style={{
                                                        flex: 1,
                                                        backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                                                        borderRadius: RADIUS.m,
                                                        padding: SPACING.m,
                                                        alignItems: 'center',
                                                        gap: 2,
                                                    }}>
                                                        <Typography variant="h2" style={{ fontSize: 24, lineHeight: 28 }}>
                                                            {Math.round(page.metadata.smart_data.nutrition_per_serving.calories * servingMultiplier)}
                                                        </Typography>
                                                        <Typography variant="caption" color="stone" style={{ fontSize: 10 }}>cal</Typography>
                                                    </View>
                                                    {/* Macro pills */}
                                                    <View style={{ flex: 2, gap: SPACING.xs }}>
                                                        {page.metadata.smart_data.nutrition_per_serving.protein_g != null && (
                                                            <MacroBar label="Protein" value={page.metadata.smart_data.nutrition_per_serving.protein_g} unit="g" color="#5B8DEF" isDark={isDark} multiplier={servingMultiplier} />
                                                        )}
                                                        {page.metadata.smart_data.nutrition_per_serving.carbs_g != null && (
                                                            <MacroBar label="Carbs" value={page.metadata.smart_data.nutrition_per_serving.carbs_g} unit="g" color="#F5A623" isDark={isDark} multiplier={servingMultiplier} />
                                                        )}
                                                        {page.metadata.smart_data.nutrition_per_serving.fat_g != null && (
                                                            <MacroBar label="Fat" value={page.metadata.smart_data.nutrition_per_serving.fat_g} unit="g" color="#E85D75" isDark={isDark} multiplier={servingMultiplier} />
                                                        )}
                                                        {page.metadata.smart_data.nutrition_per_serving.fiber_g != null && (
                                                            <MacroBar label="Fiber" value={page.metadata.smart_data.nutrition_per_serving.fiber_g} unit="g" color="#7DC881" isDark={isDark} multiplier={servingMultiplier} />
                                                        )}
                                                    </View>
                                                </View>
                                            </View>
                                        </>
                                    )}

                                    {/* Video Insights (non-recipe) */}
                                    {page.metadata.smart_data.video_insights && (
                                        <View style={{ gap: 2 }}>
                                            <Typography variant="label" color="stone" style={{ fontSize: 10, letterSpacing: 1 }}>KEY TAKEAWAYS</Typography>
                                            <Typography variant="body" color="stone" style={{ lineHeight: 20 }}>{page.metadata.smart_data.video_insights}</Typography>
                                        </View>
                                    )}
                                </View>
                            )}

                            {/* Ingredients Card with Serving Adjuster */}
                            {page?.metadata?.smart_data?.ingredients && page.metadata.smart_data.ingredients.length > 0 && (
                                <View style={[styles.bentoCard, { backgroundColor: colors.paper, borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.1)', gap: SPACING.m }]}>
                                    {/* Header with serving adjuster */}
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Typography variant="label" color="stone" style={{ fontSize: 10, letterSpacing: 1 }}>
                                            INGREDIENTS
                                        </Typography>
                                        {parseServings(page.metadata.smart_data.servings) > 0 && (
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.s }}>
                                                <TouchableOpacity
                                                    onPress={() => {
                                                        Haptics.selectionAsync();
                                                        const baseServings = parseServings(page.metadata.smart_data.servings);
                                                        const newMultiplier = servingMultiplier - 0.5;
                                                        if (Math.round(baseServings * newMultiplier) >= 1) {
                                                            setServingMultiplier(newMultiplier);
                                                        }
                                                    }}
                                                    style={{
                                                        width: 28, height: 28, borderRadius: 14,
                                                        backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                                                        justifyContent: 'center', alignItems: 'center',
                                                    }}
                                                >
                                                    <Typography variant="bodyMedium" style={{ fontSize: 16, lineHeight: 18 }}>-</Typography>
                                                </TouchableOpacity>
                                                <Typography variant="bodyMedium" style={{ fontSize: 14, minWidth: 60, textAlign: 'center' }}>
                                                    {Math.max(1, Math.round(parseServings(page.metadata.smart_data.servings) * servingMultiplier))} servings
                                                </Typography>
                                                <TouchableOpacity
                                                    onPress={() => {
                                                        Haptics.selectionAsync();
                                                        setServingMultiplier(servingMultiplier + 0.5);
                                                    }}
                                                    style={{
                                                        width: 28, height: 28, borderRadius: 14,
                                                        backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                                                        justifyContent: 'center', alignItems: 'center',
                                                    }}
                                                >
                                                    <Typography variant="bodyMedium" style={{ fontSize: 16, lineHeight: 18 }}>+</Typography>
                                                </TouchableOpacity>
                                            </View>
                                        )}
                                    </View>

                                    {/* Ingredient List */}
                                    <View style={{ gap: SPACING.s }}>
                                        {page.metadata.smart_data.ingredients.map((item: string, idx: number) => (
                                            <View key={idx} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.s }}>
                                                <View style={{
                                                    width: 6, height: 6, borderRadius: 3, marginTop: 7,
                                                    backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
                                                }} />
                                                <Typography variant="body" style={{ flex: 1, lineHeight: 22 }}>
                                                    {scaleIngredient(item, servingMultiplier)}
                                                </Typography>
                                            </View>
                                        ))}
                                    </View>

                                    {/* Copy as Shopping List */}
                                    <TouchableOpacity
                                        onPress={async () => {
                                            const list = page.metadata.smart_data.ingredients
                                                .map((item: string) => `☐ ${scaleIngredient(item, servingMultiplier)}`)
                                                .join('\n');
                                            const baseServ = parseServings(page.metadata.smart_data.servings);
                                            const header = `Shopping List: ${page.title}\n${baseServ > 0 ? `(${Math.round(baseServ * servingMultiplier)} servings)\n` : ''}\n`;
                                            await Clipboard.setStringAsync(header + list);
                                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                                            Alert.alert('Copied', 'Shopping list copied to clipboard.');
                                        }}
                                        style={{
                                            flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                                            gap: SPACING.s, paddingVertical: SPACING.s,
                                            borderTopWidth: StyleSheet.hairlineWidth,
                                            borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
                                            marginTop: SPACING.xs,
                                        }}
                                        activeOpacity={0.7}
                                    >
                                        <Copy size={16} color={colors.stone} />
                                        <Typography variant="caption" color="stone" style={{ fontSize: 12 }}>
                                            Copy as Shopping List
                                        </Typography>
                                    </TouchableOpacity>
                                </View>
                            )}

                            {/* Cook Mode Button */}
                            {page?.metadata?.smart_data?.ingredients && page.metadata.smart_data.ingredients.length > 0 && (
                                <TouchableOpacity
                                    onPress={() => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                        setCookModeVisible(true);
                                    }}
                                    style={[styles.bentoCard, {
                                        backgroundColor: colors.ink,
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: SPACING.s,
                                        paddingVertical: SPACING.m,
                                    }]}
                                    activeOpacity={0.8}
                                >
                                    <CookingPot size={20} color={colors.paper} weight="fill" />
                                    <Typography variant="label" style={{ color: colors.paper, fontWeight: '700', fontSize: 14, letterSpacing: 0.5 }}>
                                        Start Cooking
                                    </Typography>
                                </TouchableOpacity>
                            )}

                            {/* Card 4: Editorial Content */}
                            <View style={{
                                minHeight: 400,
                                paddingHorizontal: 4,
                                paddingTop: 16,
                            }}>
                                {isPlaceholderData ? (
                                    <View style={{ gap: 12, paddingTop: 8 }}>
                                        <Typography variant="body" color="stone" style={{ lineHeight: 24 }}>
                                            {page?.summary || ''}
                                        </Typography>
                                        <ActivityIndicator size="small" color={colors.stone} style={{ marginTop: 16 }} />
                                    </View>
                                ) : !isEditing ? (
                                    <SafeContentRenderer content={content} />
                                ) : (
                                    <TextInput
                                        style={{ fontSize: 18, lineHeight: 30, color: colors.ink, fontFamily: 'Lora_400Regular' }}
                                        multiline
                                        scrollEnabled={false}
                                        value={content}
                                        onChangeText={setContent}
                                    />
                                )}
                            </View>

                        </ScrollView>
                    </Animated.View>
                </ScreenWrapper>

                <Modal
                    visible={showDirectShare}
                    transparent
                    animationType="fade"
                    onRequestClose={() => setShowDirectShare(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={[styles.modalContent, { backgroundColor: colors.paper, paddingBottom: insets.bottom + 20 }]}>
                            <View style={styles.modalHeader}>
                                <Typography variant="h3">Send to Friend</Typography>
                                <TouchableOpacity onPress={() => setShowDirectShare(false)}>
                                    <X size={24} color={colors.ink} />
                                </TouchableOpacity>
                            </View>

                            {friends.length === 0 ? (
                                <View style={{ padding: 40, alignItems: 'center' }}>
                                    <Typography variant="body" color="stone" style={{ textAlign: 'center' }}>
                                        No friends found. Add friends in the Social tab to share sifts directly.
                                    </Typography>
                                </View>
                            ) : (
                                <FlatList
                                    data={friends}
                                    keyExtractor={(item: any) => item.id}
                                    renderItem={({ item }) => (
                                        <TouchableOpacity
                                            style={styles.friendSelectItem}
                                            onPress={() => handleDirectShare(item.id)}
                                        >
                                            <Image source={{ uri: item.avatar_url }} style={styles.miniAvatar} />
                                            <Typography variant="body" style={{ marginLeft: 12 }}>{item.display_name}</Typography>
                                        </TouchableOpacity>
                                    )}
                                    contentContainerStyle={{ paddingBottom: 40 }}
                                />
                            )}
                        </View>
                    </View>
                </Modal>

                <CookModeModal
                    visible={cookModeVisible}
                    onClose={() => setCookModeVisible(false)}
                    title={page?.title || ''}
                    ingredients={page?.metadata?.smart_data?.ingredients || []}
                    summary={page?.summary || content}
                    servingMultiplier={servingMultiplier}
                    scaleIngredient={scaleIngredient}
                />

                <ActionSheet
                    visible={actionSheetVisible}
                    onClose={() => setActionSheetVisible(false)}
                    title="Manage Sift"
                    options={[
                        ...(page?.metadata?.smart_data?.ingredients?.length > 0 ? [{
                            label: 'Cook Mode',
                            icon: CookingPot,
                            onPress: () => {
                                setActionSheetVisible(false);
                                setTimeout(() => setCookModeVisible(true), 300);
                            }
                        }] : []),
                        {
                            label: uploadingCover ? 'Uploading...' : 'Change Cover',
                            icon: ImageSquare,
                            onPress: () => {
                                setActionSheetVisible(false);
                                setTimeout(() => changeCoverImage(), 300);
                            }
                        },
                        {
                            label: 'Edit Sift',
                            icon: require('phosphor-react-native').PencilSimple,
                            onPress: () => setIsEditing(true)
                        },
                        {
                            label: reSifting ? 'Re-Sifting...' : 'Re-Sift (Regenerate)',
                            icon: require('phosphor-react-native').ArrowsClockwise,
                            onPress: async () => {
                                if (!page?.url || reSifting) return;
                                setReSifting(true);
                                setActionSheetVisible(false);
                                try {
                                    await safeSift(page.url, user?.id, page.id, tier);
                                    queryClient.invalidateQueries({ queryKey: ['page', id] });
                                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                                    Alert.alert('Re-Sifted!', 'The summary has been regenerated.');
                                } catch (e: any) {
                                    Alert.alert('Re-Sift Failed', e.message);
                                } finally {
                                    setReSifting(false);
                                }
                            }
                        },
                        {
                            label: 'Delete Sift',
                            icon: require('phosphor-react-native').Trash,
                            isDestructive: true,
                            onPress: handleDelete
                        },
                        {
                            label: 'Cancel',
                            isCancel: true,
                            onPress: () => { }
                        }
                    ]}
                />
            </View>
        </GestureDetector>
    );
}


const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    navBar: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingTop: 60,
        paddingBottom: 12,
        alignItems: 'flex-start',
    },
    navButton: {
        marginTop: 4,
    },
    progressContainer: {
        height: 2,
        backgroundColor: 'transparent',
        width: '100%',
        marginHorizontal: 24,
        marginBottom: 8,
    },
    progressBar: {
        height: 2,
        borderRadius: 1,
    },
    headerTitleBox: {
        flex: 1,
        marginHorizontal: 16,
    },
    smallCapsLabel: {
        marginBottom: 2,
    },
    serifTitle: {
        fontSize: 20,
        fontFamily: 'PlayfairDisplay_700Bold',
    },
    scrollContent: {
        paddingHorizontal: 24, // Wider margins for editorial feel
        paddingBottom: 140,
        gap: 16,
    },
    bentoCard: {
        borderRadius: RADIUS.m,
        padding: 24, // Increased for Hygge breath
        borderWidth: StyleSheet.hairlineWidth,
        // @ts-ignore
        cornerCurve: 'continuous',
        ...Theme.shadows.soft,
    },
    imageWrapper: {
        borderRadius: RADIUS.m,
        overflow: 'hidden',
        borderWidth: StyleSheet.hairlineWidth,
        // @ts-ignore
        cornerCurve: 'continuous',
    },
    actionCard: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 4,
    },
    tagRow: {
        marginBottom: 8,
    },
    metaLabel: {
        fontSize: 11,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    sourceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 12,
        alignSelf: 'flex-start',
    },
    favicon: {
        width: 14,
        height: 14,
        marginRight: 6,
        borderRadius: 2,
    },
    tagEditor: {
        marginBottom: 16,
    },
    tagList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 12,
    },
    tagPill: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: StyleSheet.hairlineWidth,
    },
    tagPillActive: {
        // Handled dynamically
    },
    customTagPill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 16,
    },
    customTagInput: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        gap: 8,
    },
    smallInput: {
        flex: 1,
        height: 36,
        borderRadius: 8,
        paddingHorizontal: 12,
        fontSize: 14,
        borderWidth: StyleSheet.hairlineWidth,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: RADIUS.xl,
        borderTopRightRadius: RADIUS.xl,
        padding: 24,
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    friendSelectItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: COLORS.separator,
    },
    miniAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
    }
});
