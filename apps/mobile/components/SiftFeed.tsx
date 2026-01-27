import React, { useMemo } from 'react';
import { View, StyleSheet, Pressable, ActionSheetIOS, Alert, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { COLORS, RADIUS } from '../lib/theme';
import { getDomain } from '../lib/utils';
import { Typography } from './design-system/Typography';
import { Article, Video } from 'phosphor-react-native';
import Animated, { FadeIn, FadeOut, Layout } from 'react-native-reanimated';
import { FlashList } from '@shopify/flash-list';
import { Image } from 'expo-image';
import { SiftCardSkeleton } from './SiftCardSkeleton';

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
}

const Card = ({ item, onPin, onArchive, onDeleteForever, onEditTags, mode = 'feed' }: {
    item: any,
    onPin?: (id: string) => void,
    onArchive?: (id: string) => void,
    onDeleteForever?: (id: string) => void,
    onEditTags?: (id: string, currentTags: string[]) => void,
    mode?: 'feed' | 'archive'
}) => {
    const router = useRouter();

    const handlePress = () => {
        Haptics.selectionAsync();
        router.push(`/page/${item.id}`);
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

    const isFallback = !item.image;

    if (item.status === 'pending') {
        return <SiftCardSkeleton />;
    }

    return (
        <Animated.View
            entering={FadeIn.duration(400)}
            exiting={FadeOut.duration(200)}
            layout={Layout.springify().damping(15)}
            style={{ padding: 8 }}
        >
            <Pressable
                style={styles.cardContainer}
                onPress={handlePress}
                onLongPress={handleLongPress}
                delayLongPress={300}
            >
                <View style={styles.imageWrapper}>
                    {isFallback ? (
                        <View style={styles.fallbackContainer}>
                            {(item.category?.toLowerCase?.()?.includes('video') ||
                                item.source?.toLowerCase?.()?.includes('tiktok') ||
                                item.source?.toLowerCase?.()?.includes('youtube')) ? (
                                <Video size={32} color={COLORS.stone} weight="thin" />
                            ) : (
                                <Article size={32} color={COLORS.stone} weight="thin" />
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
                        <Typography style={styles.metadata}>
                            {(item.category || 'General').toUpperCase()} • {(item.source || 'Sift').toUpperCase()}
                        </Typography>
                        {item.is_pinned && (
                            <View style={{ marginLeft: 6, width: 4, height: 4, borderRadius: 2, backgroundColor: COLORS.accent }} />
                        )}
                    </View>
                </View>
            </Pressable>
        </Animated.View>
    );
};

export default function SiftFeed({ pages, onPin, onArchive, onDeleteForever, onEditTags, mode = 'feed', loading = false }: SiftFeedProps) {
    const transformedData = useMemo(() => {
        if (!pages) return [];
        return pages.map((page) => {
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
        });
    }, [pages]);

    if (loading) {
        return (
            <FlashList
                data={[1, 2, 3, 4, 5, 6]}
                numColumns={2}
                extraData={true} // Trigger masonry
                renderItem={() => <SiftCardSkeleton />}
                estimatedItemSize={250}
                contentContainerStyle={{ paddingHorizontal: 12 }}
            />
        );
    }

    return (
        <FlashList
            data={transformedData}
            keyExtractor={(item) => item.id}
            numColumns={2}
            extraData={true} // Trigger masonry
            estimatedItemSize={250}
            renderItem={({ item }) => (
                <Card
                    item={item}
                    onPin={onPin}
                    onArchive={onArchive}
                    onDeleteForever={onDeleteForever}
                    onEditTags={onEditTags}
                    mode={mode}
                />
            )}
            contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 40 }}
            onEndReachedThreshold={0.5}
        />
    );
}

const styles = StyleSheet.create({
    cardContainer: {
        marginBottom: 8,
    },
    imageWrapper: {
        aspectRatio: 16 / 9,
        borderRadius: RADIUS.l,
        overflow: 'hidden',
        backgroundColor: COLORS.subtle,
        shadowColor: "#5A5A50",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 3,
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
        paddingHorizontal: 4,
    },
    metadata: {
        fontSize: 13,
        color: '#8E8E93',
        fontFamily: 'System',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    }
});

