import { useAuth } from '../lib/auth';

export type Tier = 'free' | 'plus' | 'unlimited' | 'admin';

export interface TierCapabilities {
    maxImagesPerSift: number;
    canUseSmartExtraction: boolean;
    canUseVideoComprehension: boolean;
    hasPriorityProcessing: boolean;
}

const TIER_LIMITS: Record<Tier, TierCapabilities> = {
    free: {
        maxImagesPerSift: 1,
        canUseSmartExtraction: false,
        canUseVideoComprehension: false,
        hasPriorityProcessing: false,
    },
    plus: {
        maxImagesPerSift: 5,
        canUseSmartExtraction: true,
        canUseVideoComprehension: false,
        hasPriorityProcessing: true,
    },
    unlimited: {
        maxImagesPerSift: 10,
        canUseSmartExtraction: true,
        canUseVideoComprehension: true,
        hasPriorityProcessing: true,
    },
    admin: {
        maxImagesPerSift: 99,
        canUseSmartExtraction: true,
        canUseVideoComprehension: true,
        hasPriorityProcessing: true,
    },
};

export const useSubscription = () => {
    const { tier } = useAuth();

    const capabilities = TIER_LIMITS[tier] || TIER_LIMITS.free;

    return {
        tier,
        ...capabilities,
        isPlus: tier === 'plus' || tier === 'unlimited' || tier === 'admin',
        isUnlimited: tier === 'unlimited' || tier === 'admin',
        isAdmin: tier === 'admin',
    };
};
