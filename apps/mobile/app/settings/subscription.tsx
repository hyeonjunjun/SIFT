
import * as React from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Alert, Platform, Linking, ActivityIndicator } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { CaretLeft, Check, Crown, Star, ArrowsClockwise as InfinityIcon, ArrowUpRight } from 'phosphor-react-native';
import { Typography } from '../../components/design-system/Typography';
import { COLORS, SPACING, RADIUS, Theme } from '../../lib/theme';
import ScreenWrapper from '../../components/ScreenWrapper';
import { useAuth } from '../../lib/auth';
import { useTheme } from '../../context/ThemeContext';
import { useSubscription, Tier, TIER_LIMITS } from '../../hooks/useSubscription';
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
    const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly');
    const [showLegalDetails, setShowLegalDetails] = useState(false);

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

    // Fallback prices from tier capabilities
    const getFallbackPrice = (tierId: Tier, period: 'monthly' | 'annual') => {
        if (tierId === 'free') return 'Free';
        const monthlyPrice = parseFloat(TIER_LIMITS[tierId].price.replace('$', ''));
        if (period === 'annual') {
            const annualPrice = (monthlyPrice * 12 * 0.8).toFixed(2); // 20% discount
            return `$${annualPrice} / yr`;
        }
        return `${TIER_LIMITS[tierId].price} / mo`;
    };

    const getAnnualSavings = (tierId: Tier) => {
        const monthlyPrice = parseFloat(TIER_LIMITS[tierId].price.replace('$', ''));
        const annualTotal = monthlyPrice * 12;
        const discountedAnnual = annualTotal * 0.8;
        const savings = annualTotal - discountedAnnual;
        return `Save $${savings.toFixed(0)}`;
    };

    const tiers: { id: Tier; name: string; icon: any; sub: string; price: string; savings?: string }[] = [
        { id: 'free', name: 'Free', icon: Star, sub: 'Start your curation journey', price: 'Free' },
        {
            id: 'plus',
            name: 'Pro',
            icon: Crown,
            sub: 'Unlock AI-powered insights',
            price: billingPeriod === 'monthly'
                ? (offerings?.monthly?.product.priceString
                    ? `${offerings.monthly.product.priceString} / mo`
                    : getFallbackPrice('plus', 'monthly'))
                : (offerings?.availablePackages.find(p => p.identifier === 'plus_annual')?.product.priceString
                    ? `${offerings.availablePackages.find(p => p.identifier === 'plus_annual')?.product.priceString} / yr`
                    : getFallbackPrice('plus', 'annual')),
            savings: billingPeriod === 'annual' ? getAnnualSavings('plus') : undefined
        },
        {
            id: 'unlimited',
            name: 'Unlimited',
            icon: InfinityIcon,
            sub: 'Sifts without limits',
            price: billingPeriod === 'monthly'
                ? (offerings?.availablePackages.find(p => p.identifier === 'unlimited')?.product.priceString
                    ? `${offerings.availablePackages.find(p => p.identifier === 'unlimited')?.product.priceString} / mo`
                    : getFallbackPrice('unlimited', 'monthly'))
                : (offerings?.availablePackages.find(p => p.identifier === 'unlimited_annual')?.product.priceString
                    ? `${offerings.availablePackages.find(p => p.identifier === 'unlimited_annual')?.product.priceString} / yr`
                    : getFallbackPrice('unlimited', 'annual')),
            savings: billingPeriod === 'annual' ? getAnnualSavings('unlimited') : undefined
        },
    ];

    const handleUpgrade = async (tierId: Tier) => {
        if (tierId === 'free') {
            Alert.alert(
                "Switch to Free Plan",
                `To downgrade to the Free plan, you'll need to cancel your subscription through ${Platform.OS === 'ios' ? 'App Store' : 'Google Play'}.\n\nDon't worry - you'll keep all your premium features until your current billing period ends.`,
                [
                    { text: "Not Now", style: "cancel" },
                    {
                        text: `Open ${Platform.OS === 'ios' ? 'App Store' : 'Google Play'}`,
                        onPress: () => {
                            if (Platform.OS === 'ios') {
                                Linking.openURL('https://apps.apple.com/account/subscriptions');
                            } else {
                                Linking.openURL('https://play.google.com/store/account/subscriptions');
                            }
                        }
                    }
                ]
            );
            return;
        }

        let packageToBuy;
        if (tierId === 'plus') {
            packageToBuy = billingPeriod === 'monthly'
                ? offerings?.monthly
                : offerings?.availablePackages.find(p => p.identifier === 'plus_annual');
        } else {
            packageToBuy = billingPeriod === 'monthly'
                ? offerings?.availablePackages.find(p => p.identifier === 'unlimited')
                : offerings?.availablePackages.find(p => p.identifier === 'unlimited_annual');
        }

        if (!packageToBuy) {
            Alert.alert(
                "Connection Issue",
                "We're having trouble connecting to the App Store. Please check your internet connection and try again in a moment.",
                [{ text: "OK" }]
            );
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

                    {!offerings && !loading && (
                        <View style={[styles.infoContainer, { backgroundColor: `${colors.accent}0D`, borderColor: `${colors.accent}1A` }]}>
                            <Typography variant="caption" style={[styles.infoText, { color: colors.accent }]}>
                                Showing estimated prices. Actual prices may vary by region.
                            </Typography>
                        </View>
                    )}
                </View>

                {/* Billing Period Toggle */}
                <View style={styles.billingToggleContainer}>
                    <TouchableOpacity
                        style={[
                            styles.billingOption,
                            billingPeriod === 'monthly' && styles.billingOptionActive
                        ]}
                        onPress={() => setBillingPeriod('monthly')}
                        activeOpacity={0.7}
                    >
                        <Typography
                            variant="label"
                            style={[
                                styles.billingOptionText,
                                billingPeriod === 'monthly' && styles.billingOptionTextActive
                            ]}
                        >
                            Monthly
                        </Typography>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[
                            styles.billingOption,
                            billingPeriod === 'annual' && styles.billingOptionActive
                        ]}
                        onPress={() => setBillingPeriod('annual')}
                        activeOpacity={0.7}
                    >
                        <Typography
                            variant="label"
                            style={[
                                styles.billingOptionText,
                                billingPeriod === 'annual' && styles.billingOptionTextActive
                            ]}
                        >
                            Annual
                        </Typography>
                        <View style={styles.savingsBadge}>
                            <Typography variant="caption" style={styles.savingsBadgeText}>
                                Save 20%
                            </Typography>
                        </View>
                    </TouchableOpacity>
                </View>

                {tiers.map((tier, index) => {
                    // All tiers are available since we have fallback prices
                    const isAvailable = true;
                    const isCurrent = currentTier === tier.id || (tier.id === 'unlimited' && currentTier === 'admin');
                    return (
                        <TierCard
                            key={tier.id}
                            tier={tier}
                            isCurrent={isCurrent}
                            onPress={() => !isCurrent && isAvailable && handleUpgrade(tier.id)}
                            index={index}
                            isAvailable={isAvailable}
                            isLoading={loading && !isCurrent}
                        />
                    );
                })}

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
                    <View style={styles.legalHighlights}>
                        <Typography variant="caption" style={styles.legalHighlight}>
                            ✓ Cancel anytime
                        </Typography>
                        <View style={styles.dot} />
                        <Typography variant="caption" style={styles.legalHighlight}>
                            ✓ Secure payments
                        </Typography>
                        <View style={styles.dot} />
                        <Typography variant="caption" style={styles.legalHighlight}>
                            ✓ No hidden fees
                        </Typography>
                    </View>

                    <TouchableOpacity
                        onPress={() => setShowLegalDetails(!showLegalDetails)}
                        style={styles.legalToggle}
                    >
                        <Typography variant="caption" style={styles.legalToggleText}>
                            {showLegalDetails ? "Hide" : "View"} subscription details
                        </Typography>
                    </TouchableOpacity>

                    {showLegalDetails && (
                        <MotiView
                            from={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ type: 'timing', duration: 200 }}
                            style={styles.legalDetails}
                        >
                            <Typography variant="caption" style={styles.legalDetailText}>
                                • Subscriptions managed via {Platform.OS === 'ios' ? 'Apple App Store' : 'Google Play Store'}{'\n'}
                                • Upgrades charged immediately with prorated pricing{'\n'}
                                • Premium access continues until end of billing period{'\n'}
                                • Automatic renewal unless canceled 24 hours before period ends
                            </Typography>
                        </MotiView>
                    )}
                </View>
            </ScrollView>
        </ScreenWrapper>
    );
}

function TierCard({ tier, isCurrent, onPress, index, isAvailable = true, isLoading = false }: {
    tier: any;
    isCurrent: boolean;
    onPress: () => void;
    index: number;
    isAvailable?: boolean;
    isLoading?: boolean;
}) {
    const { colors } = useTheme();
    const Icon = tier.icon;
    const isPremium = tier.id !== 'free';

    const benefits = tier.id === 'free'
        ? [
            "10 sifts to get started",
            "Single image per sift",
            "Basic URL & text support",
            "Core features included"
        ]
        : tier.id === 'plus'
            ? [
                "50 sifts per month",
                "Up to 5 images per sift",
                "AI-powered data extraction",
                "Priority support & processing"
            ]
            : [
                "Unlimited sifts forever",
                "Unlimited images & videos",
                "Advanced AI video analysis",
                "Early access to new features"
            ];

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
                    {
                        backgroundColor: isPremium ? COLORS.ink : 'transparent',
                        borderColor: isPremium ? 'transparent' : COLORS.separator,
                        borderWidth: isPremium ? 0 : 1,
                        ...(isPremium ? Theme.shadows.medium : {})
                    },
                    isCurrent && { borderColor: isPremium ? COLORS.stone : COLORS.ink, borderWidth: 2 }
                ]}
            >
                <View style={styles.cardTop}>
                    <View style={[styles.iconCircle, { backgroundColor: isPremium ? 'rgba(255,255,255,0.1)' : COLORS.canvas }]}>
                        <Icon size={24} color={isPremium ? COLORS.paper : COLORS.ink} weight={isCurrent ? "fill" : "regular"} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Typography variant="h3" style={{ color: isPremium ? COLORS.paper : COLORS.ink }}>{tier.name}</Typography>
                        <Typography variant="caption" style={{ color: isPremium ? 'rgba(253, 252, 248, 0.7)' : COLORS.stone }}>{tier.sub}</Typography>
                    </View>
                    <View style={styles.priceContainer}>
                        <Typography variant="h3" style={{ color: isPremium ? COLORS.paper : COLORS.ink }}>
                            {tier.price}
                        </Typography>
                        {tier.savings && (
                            <Typography variant="caption" style={{ color: isPremium ? 'rgba(253, 252, 248, 0.7)' : COLORS.success, fontSize: 10, marginTop: 4 }}>
                                {tier.savings}
                            </Typography>
                        )}
                    </View>
                </View>

                <View style={styles.cardMiddle}>
                    {benefits.map((benefit, i) => (
                        <View key={i} style={styles.benefitRow}>
                            <Check size={14} color={isPremium ? COLORS.paper : COLORS.success} weight="bold" />
                            <Typography variant="body" style={[styles.benefitText, { color: isPremium ? COLORS.paper : COLORS.ink }]}>{benefit}</Typography>
                        </View>
                    ))}
                </View>

                <View style={[
                    styles.cardAction,
                    {
                        backgroundColor: isCurrent
                            ? (isPremium ? 'rgba(255,255,255,0.1)' : COLORS.subtle)
                            : !isAvailable
                                ? COLORS.separator
                                : (isPremium ? COLORS.paper : COLORS.ink)
                    }
                ]}>
                    {isLoading ? (
                        <ActivityIndicator size="small" color={isPremium ? COLORS.ink : COLORS.paper} />
                    ) : (
                        <Typography
                            variant="label"
                            style={{
                                color: isCurrent
                                    ? (isPremium ? COLORS.paper : COLORS.ink)
                                    : !isAvailable
                                        ? COLORS.stone
                                        : (isPremium ? COLORS.ink : COLORS.paper),
                                fontSize: 12,
                                letterSpacing: 1
                            }}
                        >
                            {isCurrent
                                ? `CURRENT PLAN • ${tier.price.toUpperCase()}`
                                : !isAvailable
                                    ? "CHECK CONNECTION"
                                    : "CHANGE PLANS"}
                        </Typography>
                    )}
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
        fontSize: 48,
        fontFamily: 'PlayfairDisplay_700Bold',
        marginBottom: 16,
        textAlign: 'center',
        paddingHorizontal: 10,
        lineHeight: 52,
    },
    heroSubtitle: {
        textAlign: 'center',
        paddingHorizontal: 36,
        lineHeight: 24,
        color: COLORS.stone,
        fontSize: 16,
    },
    infoContainer: {
        marginTop: 24,
        padding: 12,
        borderRadius: RADIUS.m,
        borderWidth: 1,
        maxWidth: 320,
    },
    infoText: {
        textAlign: 'center',
        fontSize: 12,
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
    legalHighlights: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
        marginBottom: 16,
    },
    legalHighlight: {
        color: COLORS.success,
        fontSize: 12,
        fontWeight: '600',
    },
    legalToggle: {
        alignSelf: 'center',
        paddingVertical: 8,
        paddingHorizontal: 12,
    },
    legalToggleText: {
        color: COLORS.stone,
        textDecorationLine: 'underline',
        fontSize: 12,
    },
    legalDetails: {
        marginTop: 16,
        padding: 16,
        backgroundColor: COLORS.subtle,
        borderRadius: RADIUS.m,
    },
    legalDetailText: {
        color: COLORS.stone,
        lineHeight: 20,
        fontSize: 11,
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
    },
    billingToggleContainer: {
        flexDirection: 'row',
        backgroundColor: COLORS.subtle,
        borderRadius: RADIUS.m,
        padding: 4,
        marginBottom: 24,
        gap: 4,
    },
    billingOption: {
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: RADIUS.s,
        alignItems: 'center',
        position: 'relative',
    },
    billingOptionActive: {
        backgroundColor: COLORS.paper,
        ...Theme.shadows.soft,
    },
    billingOptionText: {
        fontSize: 14,
        color: COLORS.stone,
    },
    billingOptionTextActive: {
        color: COLORS.ink,
        fontWeight: '600',
    },
    savingsBadge: {
        position: 'absolute',
        top: -6,
        right: -6,
        backgroundColor: COLORS.success,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: RADIUS.xs,
    },
    savingsBadgeText: {
        color: COLORS.paper,
        fontSize: 9,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
});
