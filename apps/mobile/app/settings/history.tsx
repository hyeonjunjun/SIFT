
import * as React from 'react';
import { View, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { CaretLeft, ClockCounterClockwise } from 'phosphor-react-native';
import { Typography } from '../../components/design-system/Typography';
import { COLORS, SPACING, RADIUS, Theme } from '../../lib/theme';
import ScreenWrapper from '../../components/ScreenWrapper';

const MOCK_HISTORY = [
    { id: '1', title: 'You sifted "Vision Blueprint"', time: '2h ago' },
    { id: '2', title: 'You updated your Identity settings', time: '3h ago' },
    { id: '3', title: 'You sifted "Sift V2 Launch"', time: '5h ago' },
    { id: '4', title: 'You archived 2 items', time: 'Yesterday' },
    { id: '5', title: 'You joined Sift', time: 'Jan 20, 2026' },
];

export default function HistoryScreen() {
    const router = useRouter();

    return (
        <ScreenWrapper edges={['top']}>
            <Stack.Screen options={{ headerShown: false }} />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <CaretLeft size={28} color={COLORS.ink} />
                </TouchableOpacity>
                <Typography variant="h3">History</Typography>
                <View style={{ width: 28 }} />
            </View>

            <FlatList
                data={MOCK_HISTORY}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.content}
                ListHeaderComponent={() => (
                    <Typography variant="label" style={styles.sectionTitle}>RECENT ACTIONS</Typography>
                )}
                renderItem={({ item }) => (
                    <View style={styles.historyRow}>
                        <View style={styles.iconBox}>
                            <ClockCounterClockwise size={20} color={COLORS.stone} />
                        </View>
                        <View style={styles.rowContent}>
                            <Typography variant="body" weight="medium">{item.title}</Typography>
                            <Typography variant="caption" color={COLORS.stone}>{item.time}</Typography>
                        </View>
                    </View>
                )}
                ListEmptyComponent={() => (
                    <View style={styles.emptyState}>
                        <Typography variant="body" color={COLORS.stone}>No history yet. Go sift something.</Typography>
                    </View>
                )}
            />
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
    },
    backButton: {
        padding: 4,
    },
    content: {
        padding: 20,
        paddingBottom: 100,
    },
    sectionTitle: {
        color: COLORS.stone,
        marginBottom: 16,
    },
    historyRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.paper,
        padding: 16,
        borderRadius: RADIUS.m,
        marginBottom: 12,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: COLORS.separator,
    },
    iconBox: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: COLORS.canvas,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    rowContent: {
        flex: 1,
    },
    emptyState: {
        marginTop: 100,
        alignItems: 'center',
    }
});
