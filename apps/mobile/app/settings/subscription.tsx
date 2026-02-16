
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
import Purchases, { PurchasesOffering } from 'react-native-purchases';
import { useEffect, useState } from 'react';

export default function SubscriptionScreen() {
    const { tier: currentTier, refreshProfile } = useAuth();
    const { colors, isDark } = useTheme();
    const router = useRouter();
    const { refreshCount } = useSubscription();
    const [offerings, setOfferings] = useState<PurchasesOffering | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchOfferings = async () => {
            try {
                const availableOfferings = await Purchases.getOfferings();
                if (availableOfferings.current !== null) {
                    setOfferings(availableOfferings.current);
                }
            } catch (e) {
                console.error('[Subscription] Error fetching offerings:', e);
            }
        };
        fetchOfferings();
    }, []);

    const tiers: { id: Tier; name: string; icon: any; sub: string; price: string | null }[] = [
        { id: 'free', name: 'Starter', icon: Star, sub: 'For casual curators', price: 'Free' },
        {
            id: 'plus',
            name: 'Pro',
            icon: Crown,
            sub: 'Power through noise',
            price: offerings?.monthly?.product.priceString || null
        },
        {
            id: 'unlimited',
            name: 'Unlimited',
            icon: InfinityIcon,
            sub: 'Gems without limits',
            price: offerings?.annual?.product.priceString || null
        },
    ];

    const handleUpgrade = async (tierId: Tier) => {
        if (tierId === 'free') return;

        const packageToBuy = tierId === 'plus' ? offerings?.monthly : offerings?.annual;

        if (!packageToBuy) {
            Alert.alert("Plan Unavailable", "We couldn't load the plan details. Please try again or check your internet connection.");
            return;
        }

        setLoading(true);
        try {
            const { customerInfo } = await Purchases.purchasePackage(packageToBuy);

            // Success Case
            if (customerInfo.entitlements.active[tierId] || customerInfo.entitlements.active['unlimited']) {
                Alert.alert(
                    "Success!",
                    `You are now a ${tierId.toUpperCase()} member. Thank you for supporting Sift!`,
                    [{ text: "Great", onPress: () => router.back() }]
                );
                await refreshProfile();
                await refreshCount();
            }
        } catch (e: any) {
            // Error handling
            if (!e.userCancelled) {
                console.warn('[Subscription] Purchase Failed:', e.code, e.message);

                let errorTitle = "Purchase Failed";
                let errorMessage = e.message || "We couldn't process your transaction. Please try again.";

                if (e.code === Purchases.PURCHASES_ERROR_CODE.PURCHASE_INVALID_ERROR) {
                    errorTitle = "Invalid Purchase";
                } else if (e.code === Purchases.PURCHASES_ERROR_CODE.STORE_PROBLEM_ERROR) {
                    errorTitle = "Store Error";
                    errorMessage = "There was a problem with the App Store. Please try again later.";
                }

                Alert.alert(errorTitle, errorMessage);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleRestore = async () => {
        setLoading(true);
        try {
            const customerInfo = await Purchases.restorePurchases();

            if (Object.keys(customerInfo.entitlements.active).length > 0) {
                Alert.alert(
                    "Restore Successful",
                    "We've found your previous purchases and updated your account.",
                    [{ text: "OK", onPress: () => router.back() }]
                );
            } else {
                Alert.alert("No Purchases Found", "We couldn't find any active subscriptions associated with your Apple/Google ID.");
            }

            await refreshProfile();
            await refreshCount();
        } catch (e: any) {
            console.warn('[Subscription] Restore Failed:', e);
            Alert.alert("Restore Failed", e.message || "Something went wrong while restoring your purchases.");
        } finally {
            setLoading(false);
        }
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
                        onPress={() => (tier.id !== currentTier && !(tier.id === 'unlimited' && currentTier === 'admin')) && handleUpgrade(tier.id)}
                        index={index}
                    />
                ))}

                <View style={styles.footerLinks}>
                    <TouchableOpacity onPress={handleRestore}>
                        <Typography variant="caption" color={COLORS.stone}>Restore Purchases</Typography>
                    </TouchableOpacity>
                    <View style={styles.dot} />
                    <TouchableOpacity onPress={() => router.push('/settings/terms')}>
                        <Typography variant="caption" color={COLORS.stone}>Terms</Typography>
                    </TouchableOpacity>
                    <View style={styles.dot} />
                    <TouchableOpacity onPress={() => router.push('/settings/privacy')}>
                        <Typography variant="caption" color={COLORS.stone}>Privacy</Typography>
                    </TouchableOpacity>
                </View>

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
                        {tier.price ? (
                            <Typography variant="h3">{tier.price}</Typography>
                        ) : isCurrent ? (
                            <Typography variant="label" color={COLORS.stone} style={{ fontSize: 10 }}>INCLUDED</Typography>
                        ) : null}
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
