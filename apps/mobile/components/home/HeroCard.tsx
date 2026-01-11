import { LinearGradient } from 'expo-linear-gradient';
import { ImageBackground, View, StyleSheet, Pressable } from 'react-native';
import { Typography } from '../design-system/Typography';
import { useRouter } from 'expo-router';
import { Theme } from '../../lib/theme';

interface HeroCardProps {
    id: string;
    title: string;
    tags?: string[];
    imageUrl?: string;
}

export function HeroCard({ id, title, tags = [], imageUrl }: HeroCardProps) {
    const router = useRouter();
    const category = tags[0] || 'Uncategorized';

    return (
        <Pressable
            onPress={() => router.push(`/page/${id}`)}
            className="mr-4"
            style={styles.containerShadow}
        >
            <View style={styles.container}>
                <ImageBackground
                    source={imageUrl ? { uri: imageUrl } : undefined}
                    style={styles.image}
                    imageStyle={{ borderRadius: 20 }}
                    className={!imageUrl ? "bg-slate-800" : ""}
                >
                    {/* Gradient overlay for text readability */}
                    <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.8)']}
                        style={styles.gradient}
                    >
                        <View style={styles.textContainer}>
                            <Typography style={styles.categoryBadge}>
                                {category.toUpperCase()}
                            </Typography>
                            <Typography style={styles.heroTitle} numberOfLines={2}>
                                {title}
                            </Typography>
                        </View>
                    </LinearGradient>
                </ImageBackground>
            </View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    containerShadow: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
        elevation: 8,
    },
    container: {
        width: 280,
        height: 180,
        borderRadius: 20,
    },
    image: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    gradient: {
        width: '100%',
        height: '100%',
        justifyContent: 'flex-end',
        borderRadius: 20,
        padding: 16,
    },
    textContainer: {
        marginBottom: 4,
    },
    categoryBadge: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 11,
        fontWeight: '700',
        marginBottom: 4,
        letterSpacing: 1,
    },
    heroTitle: {
        color: '#FFFFFF',
        fontSize: 20,
        fontWeight: '700',
        lineHeight: 24,
        letterSpacing: -0.5,
    },
});
