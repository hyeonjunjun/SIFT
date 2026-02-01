import React, { useMemo } from 'react';
import { View, StyleSheet, Pressable, ActionSheetIOS, Alert, Platform, Dimensions } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { COLORS, RADIUS, TRANSITIONS } from '../lib/theme';
import { getDomain } from '../lib/utils';
import { Typography } from './design-system/Typography';
import { Article, Video } from 'phosphor-react-native';
import Animated, { FadeIn, FadeOut, Layout, Easing } from 'react-native-reanimated';
import { FlashList } from '@shopify/flash-list';
import { Image } from 'expo-image';
import { SiftCardSkeleton } from './SiftCardSkeleton';
import { useTheme } from '../context/ThemeContext';

interface Page {
    id: string;
    title: string;
    summary?: string;
    tags?: string[];
    url?: string;
    created_at: string;
    metadata?: {
        image_url?: string;
        blurhash?: string;
        status?: string;
        debug_info?: string;
    };
    is_pinned?: boolean;
}

interface SiftFeedProps {
    pages: Page[];
    onPin?: (id: string) => void;
    onArchive?: (id: string) => void;
    onDeleteForever?: (id: string) => void;
    onEditTags?: (id: string, currentTags: string[]) => void;
    mode?: 'feed' | 'archive';
    loading?: boolean;
    ListHeaderComponent?: React.ComponentType<any> | React.ReactElement | null;
    ListEmptyComponent?: React.ComponentType<any> | React.ReactElement | null;
    onScroll?: (event: any) => void;
    refreshControl?: any;
    contentContainerStyle?: any;
    onEndReached?: () => void;
    onEndReachedThreshold?: number;
}

const { width } = Dimensions.get('window');
const GRID_PADDING = 20;
const GRID_GAP = 15;
// Exact same math as library.tsx
const TILE_WIDTH = (width - (GRID_PADDING * 2) - GRID_GAP) / 2;

const Card = React.memo(({ item: page, index, onPin, onArchive, onDeleteForever, onEditTags, mode = 'feed' }: {
    item: Page,
    index: number,
    onPin?: (id: string) => void,
    onArchive?: (id: string) => void,
    onDeleteForever?: (id: string) => void,
    onEditTags?: (id: string, currentTags: string[]) => void,
    mode?: 'feed' | 'archive'
}) => {
    const { colors, isDark } = useTheme();
    const router = useRouter();

    // Transform page data on-demand in the virtualized item
    const item = useMemo(() => {
        const domain = getDomain(page.url);
        return {
            id: page.id,
            title: page.title || 'Untitled',
            category: page.tags?.[0] || 'Saved',
            source: domain,
            image: page.metadata?.image_url,
            blurhash: page.metadata?.blurhash,
            is_pinned: page.is_pinned,
            summary: page.summary,
            rawTags: page.tags || [],
            status: page.metadata?.status || 'completed',
            debug_info: page.metadata?.debug_info
        };
    }, [page]);

    const handlePress = () => {
        Haptics.selectionAsync();
        router.push({
            pathname: `/page/${item.id}`,
            params: {
                contextType: mode === 'feed' ? 'feed' : 'archive', // simple context for now
                // We'll need to enhance this dynamically for tags/search later if needed
            }
        });
    };

    const handleLongPress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const archiveLabel = mode === 'archive' ? 'Restore' : 'Archive';
        const options = ['Cancel', item.is_pinned ? 'Unpin' : 'Pin', 'Edit Tags', archiveLabel, 'Delete Forever'];
        const isIOS = Platform.OS === 'ios';

        if (__DEV__) {
            options.push('View Diagnostics');
        }

        if (isIOS) {
            ActionSheetIOS.showActionSheetWithOptions(
                {
                    options,
                    cancelButtonIndex: 0,
                    destructiveButtonIndex: options.indexOf('Delete Forever'),
                    title: item.title,
                    userInterfaceStyle: isDark ? 'dark' : 'light',
                },
                (buttonIndex) => {
                    const selectedOption = options[buttonIndex];
                    if (selectedOption === (item.is_pinned ? 'Unpin' : 'Pin')) onPin?.(item.id);
                    if (selectedOption === 'Edit Tags') onEditTags?.(item.id, item.rawTags || []);
                    if (selectedOption === archiveLabel) onArchive?.(item.id);
                    if (selectedOption === 'Delete Forever') onDeleteForever?.(item.id);
                    if (selectedOption === 'View Diagnostics') {
                        Alert.alert("Sift Diagnostics", item.debug_info || "No diagnostic information available.", [{ text: "Close" }]);
                    }
                }
            );
        } else {
            const androidButtons: any[] = [
                { text: 'Cancel', style: 'cancel' },
                { text: item.is_pinned ? 'Unpin' : 'Pin', onPress: () => onPin?.(item.id) },
                { text: 'Edit Tags', onPress: () => onEditTags?.(item.id, item.rawTags || []) },
                { text: archiveLabel, onPress: () => onArchive?.(item.id) },
            ];

            if (__DEV__) {
                androidButtons.push({ text: 'View Diagnostics', onPress: () => Alert.alert("Sift Diagnostics", item.debug_info || "No diagnostic information available.") });
            }

            androidButtons.push({ text: 'Delete Forever', style: 'destructive', onPress: () => onDeleteForever?.(item.id) });

            Alert.alert(
                item.title,
                'Manage this Sift',
                androidButtons
            );
        }
    };

    // Container Padding Strategy:
    // Container has 20px padding.
    // Items naturally fill the space. Gap is handled by TILE_WIDTH logic.
    const isLeftColumn = index % 2 === 0;

    const isFallback = !item.image;

    // STALE CHECK: If pending for > 5 mins, show as FAILED or HIDE
    const isStale = useMemo(() => {
        if (item.status !== 'pending') return false;
        try {
            const created = new Date(page.created_at).getTime();
            const now = Date.now();
            return (now - created) > (5 * 60 * 1000); // 5 minutes
        } catch { return false; }
    }, [item.status, page.created_at]);

    // CLEANUP: If failed or stale (timed out), do not render.
    if (item.status === 'failed' || isStale) {
        return null;
    }

    if (item.status === 'pending') {
        return (
            <View style={{
                width: TILE_WIDTH,
                marginBottom: GRID_GAP,
                // Natural flow, no forced margins
            }}>
                <SiftCardSkeleton />
            </View>
        );
    }

    return (
        <Animated.View
            entering={FadeIn.duration(400).easing(Easing.out(Easing.quad))}
            exiting={FadeOut.duration(200)}
            style={{
                width: TILE_WIDTH,
                marginBottom: GRID_GAP,
            }}
        >
            <Pressable
                style={styles.cardContainer}
                onPress={handlePress}
                onLongPress={handleLongPress}
                delayLongPress={300}
            >
                <View style={[styles.imageWrapper, { backgroundColor: colors.subtle }]}>
                    {(item.status === 'failed' || isStale) ? (
                        <View style={[styles.fallbackContainer, { backgroundColor: colors.danger }]}>
                            <Typography variant="label" style={{ color: 'white', fontWeight: 'bold' }}>
                                {isStale ? "TIMED OUT" : "FAILED"}
                            </Typography>
                        </View>
                    ) : isFallback ? (
                        <View style={[styles.fallbackContainer, { backgroundColor: colors.paper }]}>
                            {(item.category?.toLowerCase?.()?.includes('video') ||
                                item.source?.toLowerCase?.()?.includes('tiktok') ||
                                item.source?.toLowerCase?.()?.includes('youtube')) ? (
                                <Video size={32} color={colors.stone} weight="thin" />
                            ) : (
                                <Article size={32} color={colors.stone} weight="thin" />
                            )}
                        </View>
                    ) : (
                        <Image
                            source={item.image}
                            placeholder={item.blurhash || 'LKO2?V%2Tw=w]~RBVZRi_Noz9HkC'} // Default blurhash
                            contentFit="cover"
                            transition={500}
                            style={styles.image}
                        />
                    )}
                </View>

                <View style={styles.meta}>
                    <Typography variant="h3" numberOfLines={2}>
                        {item.title || 'Untitled'}
                    </Typography>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Typography style={[styles.metadata, { color: colors.stone }]}>
                            {(item.category || 'General').toUpperCase()} • {(item.source || 'Sift').toUpperCase()}
                        </Typography>
                        {item.is_pinned && (
                            <View style={{ marginLeft: 6, width: 4, height: 4, borderRadius: 2, backgroundColor: colors.accent }} />
                        )}
                    </View>
                </View>
            </Pressable>
        </Animated.View>
    );
});

export default function SiftFeed({
    pages,
    onPin,
    onArchive,
    onDeleteForever,
    onEditTags,
    mode = 'feed',
    loading = false,
    ListHeaderComponent,
    ListEmptyComponent,
    onScroll,
    refreshControl,
    contentContainerStyle,
    onEndReached,
    onEndReachedThreshold = 0.5
}: SiftFeedProps) {
    const { colors, isDark } = useTheme();

    if (loading) {
        return (
            <FlashList
                data={[1, 2, 3, 4, 5, 6]}
                numColumns={2}
                extraData={true}
                renderItem={({ index }) => {
                    return (
                        <View style={{
                            width: TILE_WIDTH,
                            marginBottom: GRID_GAP,
                        }}>
                            <SiftCardSkeleton />
                        </View>
                    );
                }}
                // @ts-ignore
                estimatedItemSize={250}
                contentContainerStyle={{
                    paddingHorizontal: 20, // Inherited Alignment
                    paddingBottom: 40,
                    ...contentContainerStyle
                }}
            />
        );
    }

    return (
        <FlashList
            data={pages}
            keyExtractor={(item) => item.id}
            numColumns={2}
            extraData={isDark} // Minimal extraData to prevent unnecessary re-renders
            // @ts-ignore
            estimatedItemSize={250}
            renderItem={({ item, index }) => (
                <Card
                    item={item}
                    index={index}
                    onPin={onPin}
                    onArchive={onArchive}
                    onDeleteForever={onDeleteForever}
                    onEditTags={onEditTags}
                    mode={mode}
                />
            )}
            ListHeaderComponent={ListHeaderComponent}
            ListEmptyComponent={!loading ? ListEmptyComponent : null}
            onScroll={onScroll}
            refreshControl={refreshControl}
            scrollEventThrottle={16}
            contentContainerStyle={{
                paddingHorizontal: 20, // Padded Container governs alignment
                paddingBottom: 40,
                ...contentContainerStyle
            }}
            onEndReached={onEndReached}
            onEndReachedThreshold={onEndReachedThreshold}
        />
    );
}

const styles = StyleSheet.create({
    cardContainer: {
        marginBottom: 8,
    },
    imageWrapper: {
        aspectRatio: 16 / 9,
        borderRadius: RADIUS.xl,
        overflow: 'hidden',
    },
    fallbackContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.paper,
    },
    image: {
        width: '100%',
        height: '100%',
    },
    meta: {
        marginTop: 10,
        gap: 2,
        // paddingHorizontal: 4, // Removed to align text with image edge
    },
    metadata: {
        fontSize: 13,
        fontFamily: 'System',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    }
});

