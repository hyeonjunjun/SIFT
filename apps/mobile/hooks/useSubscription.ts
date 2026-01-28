import { useAuth } from '../lib/auth';

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
        maxImagesPerSift: 1,
        maxSiftsTotal: 10,
        price: '$0',
        description: 'Basic Sifting',
        canUseSmartExtraction: false,
        canUseVideoComprehension: false,
        hasPriorityProcessing: false,
    },
    plus: {
        maxImagesPerSift: 5,
        maxSiftsTotal: 30,
        price: '$9.99',
        description: 'Advanced Curation',
        canUseSmartExtraction: true,
        canUseVideoComprehension: false,
        hasPriorityProcessing: true,
    },
    unlimited: {
        maxImagesPerSift: 10,
        maxSiftsTotal: 999999,
        price: '$19.99',
        description: 'Ultimate Power',
        canUseSmartExtraction: true,
        canUseVideoComprehension: true,
        hasPriorityProcessing: true,
    },
    admin: {
        maxImagesPerSift: 99,
        maxSiftsTotal: 999999,
        price: '$0',
        description: 'System Administrator',
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
