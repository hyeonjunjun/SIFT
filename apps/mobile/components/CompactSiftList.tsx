import React, { useMemo } from 'react';
import { View, StyleSheet, Pressable, ActionSheetIOS, Alert, Platform, FlatList } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { Typography } from './design-system/Typography';
import { COLORS, SPACING, Theme, RADIUS } from '../lib/theme';
import { DotsThreeVertical, ArrowClockwise, Warning } from 'phosphor-react-native';
import { Image } from 'expo-image';
import { useTheme } from '../context/ThemeContext';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

interface SiftItem {
    id: string;
    title: string;
    url: string;
    tags?: string[];
    created_at: string;
    metadata?: {
        image_url?: string;
        category?: string;
        status?: string;
    };
}

interface PendingSift {
    id: string;
    url: string;
    status: 'pending' | 'processing' | 'failed' | 'completed';
    error_message?: string;
    retry_count: number;
    created_at: string;
}

interface CompactSiftListProps {
    pages: SiftItem[];
    pendingSifts?: PendingSift[];
    onRetry?: (id: string, url: string) => void;
    onArchive?: (id: string) => void;
    onEditTags?: (id: string, currentTags: string[]) => void;
    refreshControl?: any;
    contentContainerStyle?: any;
    onEndReached?: () => void;
}

const ROW_HEIGHT = 76;

export default function CompactSiftList({
    pages,
    pendingSifts = [],
    onRetry,
    onArchive,
    onEditTags,
    refreshControl,
    contentContainerStyle,
    onEndReached,
}: CompactSiftListProps) {
    const { colors, isDark } = useTheme();
    const router = useRouter();

    // Combine pending/failed sifts with completed pages
    const combinedData = useMemo(() => {
        const failedItems = pendingSifts
            .filter(p => p.status === 'failed' || p.status === 'pending' || p.status === 'processing')
            .map(p => ({
                id: p.id,
                type: 'pending' as const,
                url: p.url,
                status: p.status,
                error_message: p.error_message,
                created_at: p.created_at,
                retry_count: p.retry_count,
            }));

        const pageItems = pages.map(p => ({
            id: p.id,
            type: 'page' as const,
            title: p.title,
            url: p.url,
            image_url: p.metadata?.image_url,
            category: p.metadata?.category || p.tags?.[0],
            created_at: p.created_at,
            tags: p.tags || [],
        }));

        return [...failedItems, ...pageItems];
    }, [pages, pendingSifts]);

    const getDomain = (url: string) => {
        try {
            return new URL(url).hostname.replace('www.', '');
        } catch {
            return url;
        }
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffHrs = diffMs / (1000 * 60 * 60);

        if (diffHrs < 1) return 'Just now';
        if (diffHrs < 24) return `${Math.floor(diffHrs)}h ago`;
        if (diffHrs < 48) return 'Yesterday';
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const renderItem = ({ item }: { item: typeof combinedData[0] }) => {
        if (item.type === 'pending') {
            return (
                <PendingRow
                    item={item}
                    colors={colors}
                    onRetry={onRetry}
                    getDomain={getDomain}
                    formatDate={formatDate}
                />
            );
        }

        return (
            <PageRow
                item={item}
                colors={colors}
                isDark={isDark}
                router={router}
                onArchive={onArchive}
                onEditTags={onEditTags}
                getDomain={getDomain}
                formatDate={formatDate}
            />
        );
    };

    return (
        <FlatList
            data={combinedData}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            refreshControl={refreshControl}
            contentContainerStyle={contentContainerStyle}
            onEndReached={onEndReached}
            onEndReachedThreshold={0.5}
            ItemSeparatorComponent={() => (
                <View style={[styles.separator, { backgroundColor: colors.separator }]} />
            )}
            getItemLayout={(_, index) => ({
                length: ROW_HEIGHT,
                offset: ROW_HEIGHT * index,
                index,
            })}
        />
    );
}

// Pending/Failed row component
const PendingRow = React.memo(({ item, colors, onRetry, getDomain, formatDate }: any) => {
    const isFailed = item.status === 'failed';
    const isProcessing = item.status === 'processing';

    const handleRetry = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onRetry?.(item.id, item.url);
    };

    return (
        <Animated.View
            entering={FadeIn.duration(300)}
            exiting={FadeOut.duration(200)}
            style={[styles.row, { backgroundColor: isFailed ? `${colors.danger}10` : 'transparent' }]}
        >
            {/* Status indicator */}
            <View style={[styles.thumbnail, styles.pendingThumbnail, { backgroundColor: isFailed ? colors.danger : colors.stone }]}>
                {isFailed ? (
                    <Warning size={20} color={colors.paper} weight="bold" />
                ) : (
                    <ArrowClockwise size={20} color={colors.paper} weight="bold" />
                )}
            </View>

            {/* Content */}
            <View style={styles.content}>
                <Typography variant="body" numberOfLines={1} style={[styles.title, { color: colors.ink }]}>
                    {getDomain(item.url)}
                </Typography>
                <Typography variant="caption" numberOfLines={1} style={{ color: isFailed ? colors.danger : colors.stone }}>
                    {isFailed ? (item.error_message || 'Failed to process') : (isProcessing ? 'Processing...' : 'Pending...')}
                </Typography>
            </View>

            {/* Retry button */}
            {isFailed && (
                <Pressable onPress={handleRetry} style={styles.retryButton} hitSlop={12}>
                    <ArrowClockwise size={20} color={colors.ink} weight="bold" />
                </Pressable>
            )}
        </Animated.View>
    );
});

// Page row component
const PageRow = React.memo(({ item, colors, isDark, router, onArchive, onEditTags, getDomain, formatDate }: any) => {
    const handlePress = () => {
        Haptics.selectionAsync();
        router.push(`/page/${item.id}`);
    };

    const handleLongPress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        if (Platform.OS === 'ios') {
            ActionSheetIOS.showActionSheetWithOptions(
                {
                    options: ['Cancel', 'Edit Tags', 'Archive'],
                    destructiveButtonIndex: 2,
                    cancelButtonIndex: 0,
                },
                (buttonIndex) => {
                    if (buttonIndex === 1) onEditTags?.(item.id, item.tags);
                    if (buttonIndex === 2) onArchive?.(item.id);
                }
            );
        } else {
            Alert.alert(item.title || 'Sift', 'Choose an action', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Edit Tags', onPress: () => onEditTags?.(item.id, item.tags) },
                { text: 'Archive', style: 'destructive', onPress: () => onArchive?.(item.id) },
            ]);
        }
    };

    return (
        <Pressable
            onPress={handlePress}
            onLongPress={handleLongPress}
            delayLongPress={300}
            style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
        >
            {/* Thumbnail */}
            <View style={[styles.thumbnail, { backgroundColor: colors.subtle }]}>
                {item.image_url ? (
                    <Image
                        source={{ uri: item.image_url }}
                        style={styles.thumbnailImage}
                        contentFit="cover"
                        transition={200}
                    />
                ) : (
                    <Typography variant="h1" style={[styles.fallbackLetter, { color: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' }]}>
                        {(item.title || 'S').charAt(0).toUpperCase()}
                    </Typography>
                )}
            </View>

            {/* Content */}
            <View style={styles.content}>
                <Typography variant="body" numberOfLines={1} style={[styles.title, { color: colors.ink }]}>
                    {item.title || 'Untitled'}
                </Typography>
                <Typography variant="caption" numberOfLines={1} style={[styles.subtitle, { color: colors.stone }]}>
                    {getDomain(item.url)} · {formatDate(item.created_at)}
                </Typography>
            </View>

            {/* Category tag */}
            {item.category && (
                <View style={[styles.categoryPill, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : colors.subtle }]}>
                    <Typography variant="caption" style={[styles.categoryText, { color: colors.stone }]}>
                        {item.category.toUpperCase()}
                    </Typography>
                </View>
            )}
        </Pressable>
    );
});

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
        minHeight: ROW_HEIGHT,
    },
    thumbnail: {
        width: 52,
        height: 52,
        borderRadius: 10,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    pendingThumbnail: {
        opacity: 0.9,
    },
    thumbnailImage: {
        width: '100%',
        height: '100%',
    },
    fallbackLetter: {
        fontSize: 22,
        fontWeight: '700',
    },
    content: {
        flex: 1,
        marginLeft: 14,
        marginRight: 8,
        justifyContent: 'center',
    },
    title: {
        fontSize: 15,
        fontWeight: '600',
        lineHeight: 20,
        marginBottom: 3,
    },
    subtitle: {
        fontSize: 13,
        lineHeight: 16,
    },
    categoryPill: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 6,
        flexShrink: 0,
    },
    categoryText: {
        fontSize: 9,
        fontWeight: '700',
        letterSpacing: 0.8,
    },
    separator: {
        height: StyleSheet.hairlineWidth,
        marginLeft: 86, // 20 (padding) + 52 (thumbnail) + 14 (gap)
    },
    retryButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
