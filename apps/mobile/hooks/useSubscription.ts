import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { useQuery } from '@tanstack/react-query';

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

const TIER_LIMITS: Record<Tier, TierCapabilities> = {
    free: {
        maxImagesPerSift: 99,
        maxSiftsTotal: 10,
        price: '$0',
        description: 'Free',
        canUseSmartExtraction: true,
        canUseVideoComprehension: true,
        hasPriorityProcessing: true,
    },
    plus: {
        maxImagesPerSift: 99,
        maxSiftsTotal: 50, // Increased for Pro
        price: '$9.99',
        description: 'Pro',
        canUseSmartExtraction: true,
        canUseVideoComprehension: true,
        hasPriorityProcessing: true,
    },
    unlimited: {
        maxImagesPerSift: 999,
        maxSiftsTotal: 999999,
        price: '$19.99',
        description: 'Unlimited',
        canUseSmartExtraction: true,
        canUseVideoComprehension: true,
        hasPriorityProcessing: true,
    },
    admin: {
        maxImagesPerSift: 999,
        maxSiftsTotal: 999999,
        price: '$0',
        description: 'System Administrator',
        canUseSmartExtraction: true,
        canUseVideoComprehension: true,
        hasPriorityProcessing: true,
    },
};

export const useSubscription = () => {
    const { user, tier } = useAuth();

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
        staleTime: 1000 * 60 * 5, // 5 minutes - prevents redundant re-fetches
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
