
import * as React from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { CaretLeft, Check, Crown, Star, Infinity as InfinityIcon } from 'phosphor-react-native';
import { Typography } from '../../components/design-system/Typography';
import { COLORS, SPACING, RADIUS, Theme } from '../../lib/theme';
import ScreenWrapper from '../../components/ScreenWrapper';
import { useAuth } from '../../lib/auth';
import { useTheme } from '../../context/ThemeContext';
import { useSubscription, Tier } from '../../hooks/useSubscription';

export default function SubscriptionScreen() {
    const { tier: currentTier } = useAuth();
    const { colors, isDark } = useTheme();
    const router = useRouter();

    // Define tiers to display
    const tiers: { id: Tier; name: string; icon: any; color: string }[] = [
        { id: 'free', name: 'Free', icon: Star, color: colors.stone },
        { id: 'plus', name: 'Pro', icon: Crown, color: colors.accent },
        { id: 'unlimited', name: 'Unlimited', icon: InfinityIcon, color: colors.ink },
    ];

    const handleUpgrade = (tierName: string) => {
        Alert.alert(
            "Upgrade to " + tierName,
            "In-app purchases will be implemented in a future update. For now, contact support or use the web dashboard to upgrade.",
            [{ text: "Heard" }]
        );
    };

    return (
        <ScreenWrapper edges={['top']}>
            <Stack.Screen options={{ headerShown: false }} />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <CaretLeft size={28} color={colors.ink} />
                </TouchableOpacity>
                <Typography variant="h3">Membership</Typography>
                <View style={{ width: 28 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <View style={styles.heroSection}>
                    <Typography variant="h1" style={styles.heroTitle}>Pick your power.</Typography>
                    <Typography variant="body" color="stone" style={styles.heroSubtitle}>
                        Enhance your curation with advanced AI and higher limits.
                    </Typography>
                </View>

                {tiers.map((tier) => (
                    <TierCard
                        key={tier.id}
                        tierId={tier.id}
                        name={tier.name}
                        icon={tier.icon}
                        color={tier.color}
                        isCurrent={currentTier === tier.id}
                        onPress={() => tier.id !== currentTier && handleUpgrade(tier.name)}
                    />
                ))}

                <View style={styles.footerInfo}>
                    <Typography variant="caption" color="stone" style={{ textAlign: 'center' }}>
                        Subscription tiers help cover the costs of high-performance AI processing and content scraping.
                    </Typography>
                </View>
            </ScrollView>
        </ScreenWrapper>
    );
}

function TierCard({ tierId, name, icon: Icon, color, isCurrent, onPress }: {
    tierId: Tier;
    name: string;
    icon: any;
    color: string;
    isCurrent: boolean;
    onPress: () => void;
}) {
    const { colors, isDark } = useTheme();
    // Use the hook to get specific capabilities for this tier
    // We mock the hook call by passing a temporary tier object or just accessing TIER_LIMITS if exported
    // For now, we'll manually define benefits based on the known plan

    const benefits = [];
    if (tierId === 'free') {
        benefits.push("10 Total Sifts", "Basic AI Extraction", "Social Link Support");
    } else if (tierId === 'plus') {
        benefits.push("30 Total Sifts", "Smart Data Extraction", "Priority AI Processing", "Multiple Image Scan");
    } else {
        benefits.push("Unlimited Sifts", "Video Transcript Analysis", "Advanced OCR Scan", "White-glove Processing");
    }

    const price = tierId === 'free' ? '$0' : tierId === 'plus' ? '$9.99' : '$19.99';

    return (
        <TouchableOpacity
            activeOpacity={0.9}
            onPress={onPress}
            style={[
                styles.card,
                { backgroundColor: colors.paper, borderColor: isCurrent ? colors.ink : colors.separator },
                isCurrent && { borderWidth: 2 }
            ]}
        >
            <View style={styles.cardHeader}>
                <View style={[styles.iconBox, { backgroundColor: isDark ? colors.subtle : '#F9F9F7' }]}>
                    <Icon size={24} color={isCurrent ? colors.ink : colors.stone} weight={isCurrent ? "fill" : "regular"} />
                </View>
                <View style={{ flex: 1 }}>
                    <Typography variant="h3">{name}</Typography>
                    <Typography variant="caption" color="stone">{tierId === 'free' ? 'Starter' : tierId === 'plus' ? 'Curation Pro' : 'Digital Archivist'}</Typography>
                </View>
                <View style={styles.priceBox}>
                    <Typography variant="h3" style={{ fontSize: 20 }}>{price}</Typography>
                    <Typography variant="caption" color="stone" style={{ fontSize: 10 }}>/MONTH</Typography>
                </View>
            </View>

            <View style={styles.benefitsList}>
                {benefits.map((benefit, i) => (
                    <View key={i} style={styles.benefitRow}>
                        <Check size={16} color={colors.success} weight="bold" />
                        <Typography variant="body" style={styles.benefitText}>{benefit}</Typography>
                    </View>
                ))}
            </View>

            {isCurrent ? (
                <View style={[styles.statusBadge, { backgroundColor: colors.subtle }]}>
                    <Typography variant="label" color="ink">YOUR CURRENT PLAN</Typography>
                </View>
            ) : (
                <View style={[styles.actionButton, { backgroundColor: colors.ink }]}>
                    <Typography variant="label" style={{ color: colors.paper }}>UPGRADE NOW</Typography>
                </View>
            )}
        </TouchableOpacity>
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
        paddingBottom: 60,
    },
    heroSection: {
        marginBottom: 32,
        alignItems: 'center',
    },
    heroTitle: {
        fontSize: 32,
        marginBottom: 8,
        textAlign: 'center',
    },
    heroSubtitle: {
        textAlign: 'center',
        paddingHorizontal: 40,
        lineHeight: 20,
    },
    card: {
        borderRadius: RADIUS.l,
        padding: 24,
        marginBottom: 20,
        borderWidth: 1,
        ...Theme.shadows.soft,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    iconBox: {
        width: 48,
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    priceBox: {
        alignItems: 'flex-end',
    },
    benefitsList: {
        marginBottom: 24,
    },
    benefitRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    benefitText: {
        marginLeft: 12,
        fontSize: 15,
    },
    statusBadge: {
        height: 48,
        borderRadius: RADIUS.pill,
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionButton: {
        height: 48,
        borderRadius: RADIUS.pill,
        justifyContent: 'center',
        alignItems: 'center',
        ...Theme.shadows.soft,
    },
    footerInfo: {
        marginTop: 12,
        paddingHorizontal: 40,
    }
});
