import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { Typography } from '../design-system/Typography';
import { useRouter } from 'expo-router';
import { COLORS, BORDER } from '../../lib/theme';

interface HeroCardProps {
    id: string;
    title: string;
    tags?: string[];
    imageUrl?: string;
}

export const HeroCard = React.memo(({ id, title, tags = [], imageUrl }: HeroCardProps) => {
    const router = useRouter();
    const category = tags[0] || 'Uncategorized';

    return (
        <Pressable
            onPress={() => router.push(`/page/${id}`)}
            style={styles.container}
        >
            <View style={styles.imageContainer}>
                {imageUrl ? (
                    <Image
                        source={imageUrl}
                        style={styles.image}
                        contentFit="cover"
                        transition={500}
                    />
                ) : (
                    <View style={styles.placeholder} />
                )}
            </View>
            <View style={styles.textContainer}>
                <Typography variant="label" style={styles.categoryText}>
                    {category.toUpperCase()}
                </Typography>
                <Typography style={styles.heroTitle} numberOfLines={2}>
                    {title}
                </Typography>
            </View>
        </Pressable>
    );
});

const styles = StyleSheet.create({
    container: {
        width: 240, // Slightly smaller than before for cleaner look
        marginRight: 16,
    },
    imageContainer: {
        width: 240,
        height: 140, // 16:9ish
        borderRadius: 8,
        overflow: 'hidden',
        borderWidth: BORDER.hairline,
        borderColor: 'rgba(0,0,0,0.1)',
        backgroundColor: '#F2F2F7',
        // @ts-ignore
        cornerCurve: 'continuous',
    },
    image: {
        width: '100%',
        height: '100%',
    },
    placeholder: {
        flex: 1,
        backgroundColor: COLORS.ink,
    },
    textContainer: {
        marginTop: 10,
    },
    categoryText: {
        fontSize: 11,
        color: COLORS.stone, // Secondary Text
        marginBottom: 2,
    },
    heroTitle: {
        color: COLORS.ink,
        fontSize: 15,
        fontWeight: '600',
        lineHeight: 20,
    },
});
