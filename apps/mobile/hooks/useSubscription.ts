import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { useQuery } from '@tanstack/react-query';
import Purchases, { CustomerInfo } from 'react-native-purchases';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

export type Tier = 'free' | 'plus' | 'unlimited' | 'admin';

export interface TierCapabilities {
    maxImagesPerSift: number;
    maxSiftsTotal: number;
    price: string;
    description: string;
    canUseSmartExtraction: boolean;
    canUseVideoComprehension: boolean;
    hasPriorityProcessing: boolean;
}

export const TIER_LIMITS: Record<Tier, TierCapabilities> = {
    free: {
        maxImagesPerSift: 1,
        maxSiftsTotal: 10,
        price: '$0',
        description: 'Free',
        canUseSmartExtraction: false,
        canUseVideoComprehension: false,
        hasPriorityProcessing: false,
    },
    plus: {
        maxImagesPerSift: 5,
        maxSiftsTotal: 50,
        price: '$3.99',
        description: 'Pro',
        canUseSmartExtraction: true,
        canUseVideoComprehension: false,
        hasPriorityProcessing: true,
    },
    unlimited: {
        maxImagesPerSift: 999,
        maxSiftsTotal: 999999,
        price: '$6.99',
        description: 'Unlimited',
        canUseSmartExtraction: true,
        canUseVideoComprehension: true,
        hasPriorityProcessing: true,
    },
    admin: {
        maxImagesPerSift: 999,
        maxSiftsTotal: 999999,
        price: '$0',
        description: 'Admin',
        canUseSmartExtraction: true,
        canUseVideoComprehension: true,
        hasPriorityProcessing: true,
    },
};

let getCustomerInfoPromise: Promise<CustomerInfo> | null = null;

export const useSubscription = () => {
    const { user, profile, updateProfileInDB } = useAuth();
    const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);

    // Initial fetch of RevenueCat customer info
    useEffect(() => {
        if (Platform.OS === 'web') return; // Skip RevenueCat on Web

        let isMounted = true;

        const fetchInfo = async () => {
            try {
                if (!await Purchases.isConfigured()) return;

                if (!getCustomerInfoPromise) {
                    getCustomerInfoPromise = Purchases.getCustomerInfo();
                }
                const info = await getCustomerInfoPromise;
                if (isMounted) setCustomerInfo(info);
            } catch (e: any) {
                if (e?.code === 16) return; // Ignore concurrent request errors defensively
            } finally {
                // Clear the promise so future calls can request fresh data
                // RevenueCat's internal cache will handle subsequent sequential calls efficiently
                setTimeout(() => { getCustomerInfoPromise = null; }, 500);
            }
        };

        fetchInfo();

        const listener = (info: CustomerInfo) => {
            if (isMounted) setCustomerInfo(info);
        };
        Purchases.addCustomerInfoUpdateListener(listener);

        return () => {
            isMounted = false;
            Purchases.removeCustomerInfoUpdateListener(listener);
        };
    }, []);

    // Derived Tier from RevenueCat Entitlements
    const tier: Tier = (() => {
        if (!user) return 'free';
        // Admin override first
        if (profile?.tier === 'admin') return 'admin';
        // Unlimited override from backend
        if (profile?.tier === 'unlimited') return 'unlimited';

        if (Platform.OS === 'web') return 'unlimited'; // Mock for web

        if (customerInfo?.entitlements.active['unlimited']) return 'unlimited';
        if (customerInfo?.entitlements.active['plus']) return 'plus';

        return 'free';
    })();

    // Synchronize Tier back to Supabase if it changed
    useEffect(() => {
        if (Platform.OS === 'web') return; // Skip syncing mock tier on web
        if (user && profile && tier !== profile.tier && profile.tier !== 'admin') {
            updateProfileInDB({ tier });
        }
    }, [tier, user, profile?.tier]);

    // Fetch actual count from DB
    const { data: currentCount = 0, isLoading: loadingCount, refetch: refreshCount } = useQuery({
        queryKey: ['sift-count', user?.id],
        queryFn: async () => {
            if (!user) return 0;
            const { count, error } = await supabase
                .from('pages')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id);

            if (error) throw error;
            return count || 0;
        },
        enabled: !!user,
        staleTime: 1000 * 60 * 5,
    });

    const capabilities = TIER_LIMITS[tier] || TIER_LIMITS.free;

    return {
        tier,
        currentCount,
        loadingCount,
        refreshCount,
        ...capabilities,
        isPlus: tier === 'plus' || tier === 'unlimited' || tier === 'admin',
        isUnlimited: tier === 'unlimited' || tier === 'admin',
        isAdmin: tier === 'admin',
        isOverLimit: tier !== 'unlimited' && tier !== 'admin' && currentCount >= capabilities.maxSiftsTotal,
    };
};
