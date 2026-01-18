import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    TextInput,
    TouchableOpacity,
    View,
    Text,
    Alert,
    Image,
    StyleSheet,
    ScrollView,
    RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { CaretLeft, DotsThree, Export, NotePencil, Trash } from 'phosphor-react-native';
import { Theme, COLORS, SPACING } from '../../lib/theme';
import { Typography } from '../../components/design-system/Typography';
import { getDomain } from '../../lib/utils';
import SafeContentRenderer from '../../components/SafeContentRenderer';

export default function PageDetail() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState<any>(null);
    const [content, setContent] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        if (!id) return;
        fetchPage();
    }, [id]);

    const fetchPage = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('pages')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;

            setPage(data);
            const fullDoc = data.content || `# ${data.title}\n\n> ${data.summary}`;
            setContent(fullDoc);

        } catch (error) {
            console.error('Error fetching page:', error);
            Alert.alert('Error', 'Could not load page.');
            router.back();
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchPage();
    };

    if (loading && !refreshing) {
        return <View style={styles.container} />;
    }

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Standardized Header */}
            <View style={styles.navBar}>
                <TouchableOpacity onPress={() => router.back()} style={styles.navButton}>
                    <CaretLeft size={28} color={COLORS.ink} />
                </TouchableOpacity>
                <View style={styles.headerTitleBox}>
                    <Typography variant="label" color={COLORS.stone} style={styles.smallCapsLabel}>SAVED ARTIFACT</Typography>
                    <Typography variant="h1" numberOfLines={1} style={styles.serifTitle}>{page?.title || 'Loading...'}</Typography>
                </View>
                <TouchableOpacity style={styles.navButton}>
                    <DotsThree size={28} color={COLORS.ink} />
                </TouchableOpacity>
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.ink} />}
            >
                {/* Card 1: Image */}
                {page?.metadata?.image_url && (
                    <View style={styles.imageWrapper}>
                        <Image
                            source={{ uri: page.metadata.image_url }}
                            style={{ width: '100%', height: 240 }}
                            resizeMode="cover"
                        />
                    </View>
                )}

                {/* Card 2: Header Info */}
                <View style={styles.bentoCard}>
                    <View style={styles.tagRow}>
                        <Typography variant="label" style={styles.metaLabel}>
                            {page?.tags?.[0] || 'SAVED'} • {page?.created_at ? new Date(page.created_at).toLocaleDateString() : 'Recent'}
                        </Typography>
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

                {/* Card 3: Actions (2 cols) */}
                <View style={{ flexDirection: 'row', gap: 16 }}>
                    <TouchableOpacity style={[styles.bentoCard, styles.actionCard, { flex: 1 }]}>
                        <NotePencil size={24} color={COLORS.stone} weight="thin" style={{ marginBottom: 8 }} />
                        <Typography variant="label">Edit</Typography>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.bentoCard, styles.actionCard, { flex: 1 }]}>
                        <Export size={24} color={COLORS.stone} weight="thin" style={{ marginBottom: 8 }} />
                        <Typography variant="label">Share</Typography>
                    </TouchableOpacity>
                </View>

                {/* Card 4: Content */}
                <View style={[styles.bentoCard, { minHeight: 400 }]}>
                    {!isEditing ? (
                        <SafeContentRenderer content={content} />
                    ) : (
                        <TextInput
                            style={{ fontSize: 16, lineHeight: 24, color: COLORS.ink }}
                            multiline
                            scrollEnabled={false}
                            value={content}
                            onChangeText={setContent}
                        />
                    )}
                </View>

            </ScrollView>
        </View>
    );
}


const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.canvas,
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
    headerTitleBox: {
        flex: 1,
        marginHorizontal: 16,
    },
    smallCapsLabel: {
        color: COLORS.stone,
        marginBottom: 2,
    },
    serifTitle: {
        fontSize: 20, // Smaller for detail page header to fit long titles
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 140,
        gap: 16,
    },
    bentoCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        padding: 20,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(0,0,0,0.1)',
        // @ts-ignore
        cornerCurve: 'continuous',
    },
    imageWrapper: {
        borderRadius: 8,
        overflow: 'hidden',
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(0,0,0,0.1)',
        // @ts-ignore
        cornerCurve: 'continuous',
    },
    actionCard: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 20,
    },
    tagRow: {
        marginBottom: 8,
    },
    metaLabel: {
        fontSize: 11,
        color: COLORS.stone,
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
});
