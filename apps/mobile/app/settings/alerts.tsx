
import * as React from 'react';
import { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Switch } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { CaretLeft, BellSimple, Sparkle, ShieldCheck } from 'phosphor-react-native';
import { Typography } from '../../components/design-system/Typography';
import { COLORS, SPACING, RADIUS, Theme } from '../../lib/theme';
import ScreenWrapper from '../../components/ScreenWrapper';

export default function AlertsScreen() {
    const router = useRouter();
    const [weeklyDigest, setWeeklyDigest] = useState(true);
    const [productUpdates, setProductUpdates] = useState(false);

    return (
        <ScreenWrapper edges={['top']}>
            <Stack.Screen options={{ headerShown: false }} />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <CaretLeft size={28} color={COLORS.ink} />
                </TouchableOpacity>
                <Typography variant="h3">Alerts</Typography>
                <View style={{ width: 28 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.section}>
                    <Typography variant="label" style={styles.sectionTitle}>NOTIFICATIONS</Typography>

                    <View style={styles.row}>
                        <View style={styles.iconBox}>
                            <BellSimple size={24} color={COLORS.stone} />
                        </View>
                        <View style={styles.rowContent}>
                            <Typography variant="body" weight="medium">Weekly Digest</Typography>
                            <Typography variant="caption" color={COLORS.stone}>Summary of your sifts</Typography>
                        </View>
                        <Switch
                            value={weeklyDigest}
                            onValueChange={setWeeklyDigest}
                            trackColor={{ false: '#767577', true: COLORS.ink }}
                        />
                    </View>

                    <View style={styles.row}>
                        <View style={styles.iconBox}>
                            <Sparkle size={24} color={COLORS.stone} />
                        </View>
                        <View style={styles.rowContent}>
                            <Typography variant="body" weight="medium">Product Updates</Typography>
                            <Typography variant="caption" color={COLORS.stone}>New features and news</Typography>
                        </View>
                        <Switch
                            value={productUpdates}
                            onValueChange={setProductUpdates}
                            trackColor={{ false: '#767577', true: COLORS.ink }}
                        />
                    </View>

                    <View style={[styles.row, { opacity: 0.6 }]}>
                        <View style={styles.iconBox}>
                            <ShieldCheck size={24} color={COLORS.stone} />
                        </View>
                        <View style={styles.rowContent}>
                            <Typography variant="body" weight="medium">Security Alerts</Typography>
                            <Typography variant="caption" color={COLORS.stone}>Always enabled for your safety</Typography>
                        </View>
                        <Switch
                            value={true}
                            disabled={true}
                            trackColor={{ false: '#767577', true: COLORS.ink }}
                        />
                    </View>
                </View>
            </ScrollView>
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
    },
    section: {
        marginBottom: 40,
    },
    sectionTitle: {
        color: COLORS.stone,
        marginBottom: 16,
    },
    row: {
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
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.canvas,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    rowContent: {
        flex: 1,
    }
});
