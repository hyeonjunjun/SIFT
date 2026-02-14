
import * as React from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Alert, Platform, Linking } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { CaretLeft, Check, Crown, Star, ArrowsClockwise as InfinityIcon, ArrowUpRight } from 'phosphor-react-native';
import { Typography } from '../../components/design-system/Typography';
import { COLORS, SPACING, RADIUS, Theme } from '../../lib/theme';
import ScreenWrapper from '../../components/ScreenWrapper';
import { useAuth } from '../../lib/auth';
import { useTheme } from '../../context/ThemeContext';
import { useSubscription, Tier } from '../../hooks/useSubscription';
import { MotiView } from 'moti';

export default function SubscriptionScreen() {
    const { tier: currentTier, updateProfileInDB } = useAuth();
    const { colors, isDark } = useTheme();
    const router = useRouter();
    const { maxSiftsTotal, currentCount, refreshCount } = useSubscription();

    const tiers: { id: Tier; name: string; icon: any; sub: string; price: string }[] = [
        { id: 'free', name: 'Starter', icon: Star, sub: 'For casual curators', price: 'Free' },
        { id: 'plus', name: 'Pro', icon: Crown, sub: 'Power through noise', price: '$9.99/mo' },
        { id: 'unlimited', name: 'Unlimited', icon: InfinityIcon, sub: 'Gems without limits', price: '$19.99/mo' },
    ];

    const handleUpgrade = (tierName: string) => {
        Alert.alert(
            "Upgrade to " + tierName,
            "We are finalizing our secure payment connection through Apple/Google. Check back in a few days!",
            [{ text: "Can't wait", style: 'default' }]
        );
    };

    const handleSimulateUnlimited = async () => {
        try {
            await updateProfileInDB({ tier: 'unlimited' });
            await refreshCount();
            Alert.alert("Success", "You are now an Unlimited member (Simulation).");
        } catch (e) {
            Alert.alert("Error", "Failed to simulate upgrade.");
        }
    };

    const handleRestore = () => {
        Alert.alert("Restore", "Checking for previous purchases...");
    };

    return (
        <ScreenWrapper edges={['top']} style={{ backgroundColor: COLORS.canvas }}>
            <Stack.Screen options={{ headerShown: false }} />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <CaretLeft size={28} color={COLORS.ink} weight="bold" />
                </TouchableOpacity>
                <Typography variant="label" color={COLORS.ink} style={{ letterSpacing: 2 }}>Membership</Typography>
                <View style={{ width: 28 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <View style={styles.heroSection}>
                    <Typography variant="h1" style={styles.heroTitle}>Pick your power.</Typography>
                    <Typography variant="body" style={styles.heroSubtitle}>
                        Your library, your rules. Enhance your curation with advanced AI and higher limits.
                    </Typography>
                </View>

                {tiers.map((tier, index) => (
                    <TierCard
                        key={tier.id}
                        tier={tier}
                        isCurrent={currentTier === tier.id || (tier.id === 'unlimited' && currentTier === 'admin')}
                        onPress={() => (tier.id !== currentTier && !(tier.id === 'unlimited' && currentTier === 'admin')) && handleUpgrade(tier.name)}
                        index={index}
                    />
                ))}

                <View style={styles.footerLinks}>
                    <TouchableOpacity onPress={handleRestore}>
                        <Typography variant="caption" color={COLORS.stone}>Restore Purchases</Typography>
                    </TouchableOpacity>
                    <View style={styles.dot} />
                    <TouchableOpacity>
                        <Typography variant="caption" color={COLORS.stone}>Terms</Typography>
                    </TouchableOpacity>
                    <View style={styles.dot} />
                    <TouchableOpacity onPress={async () => {
                        try {
                            await Linking.openURL('https://sift.app/privacy');
                        } catch (error) {
                            console.error('Error opening privacy policy:', error);
                        }
                    }}>
                        <Typography variant="caption" color={COLORS.stone}>Privacy</Typography>
                    </TouchableOpacity>
                </View>

                {__DEV__ && (
                    <TouchableOpacity
                        style={[styles.simulateButton, { borderColor: colors.separator }]}
                        onPress={handleSimulateUnlimited}
                    >
                        <Star size={18} color={COLORS.accent} weight="fill" />
                        <Typography variant="label" style={{ marginLeft: 8, color: COLORS.accent }}>SIMULATE UNLIMITED (DEV ONLY)</Typography>
                    </TouchableOpacity>
                )}

                <View style={styles.legalInfo}>
                    <Typography variant="caption" style={{ textAlign: 'center', opacity: 0.5 }}>
                        Subscriptions are managed via the Apple App Store or Google Play Store. Cancel anytime in your account settings.
                    </Typography>
                </View>
            </ScrollView>
        </ScreenWrapper>
    );
}

function TierCard({ tier, isCurrent, onPress, index }: {
    tier: any;
    isCurrent: boolean;
    onPress: () => void;
    index: number;
}) {
    const { colors } = useTheme();
    const Icon = tier.icon;

    const benefits = tier.id === 'free'
        ? ["10 Total Sifts", "Basic Link Support", "Social Integration"]
        : tier.id === 'plus'
            ? ["50 Total Sifts", "Smart Data Extraction", "Priority Processing", "Multiple Image Scan"]
            : ["Unlimited Sifts", "Advanced Video Analysis", "Infinite History", "Early Beta Access"];

    return (
        <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 500, delay: 100 * index }}
        >
            <TouchableOpacity
                activeOpacity={0.9}
                onPress={onPress}
                style={[
                    styles.card,
                    { backgroundColor: COLORS.paper },
                    isCurrent && { borderColor: COLORS.ink, borderWidth: 1 }
                ]}
            >
                <View style={styles.cardTop}>
                    <View style={styles.iconCircle}>
                        <Icon size={24} color={COLORS.ink} weight={isCurrent ? "fill" : "regular"} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Typography variant="h3">{tier.name}</Typography>
                        <Typography variant="caption" color={COLORS.stone}>{tier.sub}</Typography>
                    </View>
                    <View style={styles.priceContainer}>
                        <Typography variant="h3">{tier.price}</Typography>
                    </View>
                </View>

                <View style={styles.cardMiddle}>
                    {benefits.map((benefit, i) => (
                        <View key={i} style={styles.benefitRow}>
                            <Check size={14} color={COLORS.success} weight="bold" />
                            <Typography variant="body" style={styles.benefitText}>{benefit}</Typography>
                        </View>
                    ))}
                </View>

                <View style={[
                    styles.cardAction,
                    { backgroundColor: isCurrent ? COLORS.subtle : COLORS.ink }
                ]}>
                    <Typography
                        variant="label"
                        style={{ color: isCurrent ? COLORS.ink : COLORS.paper, fontSize: 12 }}
                    >
                        {isCurrent ? "ACTIVE PLAN" : "UPGRADE"}
                    </Typography>
                </View>
            </TouchableOpacity>
        </MotiView>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
        backgroundColor: 'transparent',
    },
    backButton: {
        padding: 4,
    },
    content: {
        padding: 20,
        paddingBottom: 60,
    },
    heroSection: {
        marginBottom: 40,
        alignItems: 'center',
    },
    heroTitle: {
        fontSize: 36,
        marginBottom: 12,
        textAlign: 'center',
    },
    heroSubtitle: {
        textAlign: 'center',
        paddingHorizontal: 30,
        lineHeight: 22,
        color: COLORS.stone,
    },
    card: {
        borderRadius: RADIUS.l,
        padding: 24,
        marginBottom: 20,
        ...Theme.shadows.medium,
    },
    cardTop: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    iconCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: COLORS.canvas,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    priceContainer: {
        alignItems: 'flex-end',
    },
    cardMiddle: {
        marginBottom: 24,
    },
    benefitRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    benefitText: {
        marginLeft: 12,
        fontSize: 15,
        color: COLORS.ink,
    },
    cardAction: {
        height: 52,
        borderRadius: RADIUS.m,
        justifyContent: 'center',
        alignItems: 'center',
    },
    footerLinks: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 20,
        gap: 12,
    },
    dot: {
        width: 3,
        height: 3,
        borderRadius: 2,
        backgroundColor: COLORS.separator,
    },
    legalInfo: {
        marginTop: 32,
        paddingHorizontal: 30,
    },
    simulateButton: {
        marginTop: 40,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderWidth: 1,
        borderRadius: RADIUS.m,
        borderStyle: 'dashed',
    }
});
