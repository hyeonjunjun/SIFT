import * as React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import ScreenWrapper from '../../components/ScreenWrapper';
import { Stack } from 'expo-router';
import { Typography } from '../../components/design-system/Typography';
import { COLORS, RADIUS, Theme } from '../../lib/theme';
import { useTheme } from '../../context/ThemeContext';
import { ShareNetwork, ClipboardText } from 'phosphor-react-native';
import { SettingsRow } from '../../components/design-system/SettingsRow';
import * as Haptics from 'expo-haptics';

export default function AccessibilityScreen() {
    const { colors } = useTheme();

    return (
        <ScreenWrapper edges={['top']}>
            <Stack.Screen
                options={{
                    headerShown: true,
                    title: 'Accessibility',
                    headerStyle: { backgroundColor: colors.paper },
                    headerTintColor: colors.ink,
                    headerShadowVisible: false,
                }}
            />

            <ScrollView contentContainerStyle={styles.container}>

                {/* Hero Card */}
                <View style={[styles.card, { backgroundColor: colors.paper, borderColor: colors.separator }]}>
                    <View style={styles.cardHeader}>
                        <View style={[styles.iconBox, { backgroundColor: colors.subtle }]}>
                            <ShareNetwork size={32} color={colors.stone} weight="thin" />
                        </View>
                        <View style={{ flex: 1, justifyContent: 'center' }}>
                            <Typography variant="h3" style={{ marginBottom: 4 }}>Accessibility First</Typography>
                            <Typography variant="caption" color="stone" style={{ lineHeight: 18 }}>
                                WCAG 2.1 AA compliance with adjustable text scaling, high-contrast modes, and screen reader optimization.
                            </Typography>
                        </View>
                    </View>
                </View>

                <View style={styles.sectionHeader}>
                    <Typography variant="label">Display</Typography>
                </View>

                <View style={[styles.settingsBox, { backgroundColor: colors.paper, borderColor: colors.separator, padding: 16 }]}>
                    {/* Text Scale Slider (Visual Mock) */}
                    <View style={{ marginBottom: 8 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                            <Typography variant="label">Text Scale</Typography>
                            <Typography variant="caption" color="stone">100%</Typography>
                        </View>
                        <View style={{ height: 4, backgroundColor: colors.subtle, borderRadius: 2, overflow: 'hidden' }}>
                            <View style={{ width: '40%', height: '100%', backgroundColor: colors.ink }} />
                        </View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
                            <Typography variant="caption" style={{ fontSize: 12 }}>A</Typography>
                            <Typography variant="h3">A</Typography>
                        </View>
                    </View>
                </View>

                <View style={styles.sectionHeader}>
                    <Typography variant="label">Controls</Typography>
                </View>

                <View style={[styles.settingsBox, { backgroundColor: colors.paper, borderColor: colors.separator }]}>
                    <SettingsRow
                        label="High Contrast"
                        description="Increase legibility"
                        type="toggle"
                        value={false} // Mock state
                        onValueChange={() => Haptics.selectionAsync()}
                        icon={<ClipboardText size={20} color={colors.ink} />}
                    />
                    <SettingsRow
                        label="Reduce Motion"
                        description="Minimize animations"
                        type="toggle"
                        value={false} // Mock state
                        onValueChange={() => Haptics.selectionAsync()}
                        icon={<ShareNetwork size={20} color={colors.ink} />} // Reusing icon for mock
                    />
                </View>

            </ScrollView>
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 20,
    },
    card: {
        padding: 16,
        borderRadius: RADIUS.m,
        borderWidth: StyleSheet.hairlineWidth,
        marginBottom: 24,
        ...Theme.shadows.soft,
    },
    cardHeader: {
        flexDirection: 'row',
    },
    iconBox: {
        width: 80,
        height: 80,
        borderRadius: RADIUS.s,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    sectionHeader: {
        marginBottom: 8,
        marginLeft: 4,
    },
    settingsBox: {
        borderRadius: RADIUS.m,
        overflow: 'hidden',
        borderWidth: StyleSheet.hairlineWidth,
        marginBottom: 24,
    },
});
