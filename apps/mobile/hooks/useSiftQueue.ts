import { useState, useCallback, useRef, useEffect } from 'react';
import { Keyboard } from 'react-native';
import * as Haptics from 'expo-haptics';
import { supabase } from '../lib/supabase';
import { safeSift } from '../lib/sift-api';
import { getDomain, getSmartTag } from '../lib/utils';
import { useAuth } from '../lib/auth';
import { useSubscription, TIER_LIMITS } from './useSubscription';
import { useToast } from '../context/ToastContext';
import { useQueryClient } from '@tanstack/react-query';

export function useSiftQueue() {
    const { user, tier } = useAuth();
    const { isOverLimit, currentCount } = useSubscription();
    const { showToast } = useToast();
    const queryClient = useQueryClient();

    const [queue, setQueue] = useState<string[]>([]);
    const [isProcessingQueue, setIsProcessingQueue] = useState(false);
    const [manualUrl, setManualUrl] = useState("");
    const processingUrls = useRef<Set<string>>(new Set());
    const lastCheckedUrl = useRef<string | null>(null);

    const [limitReachedVisible, setLimitReachedVisible] = useState(false);
    const [upgradeUrl, setUpgradeUrl] = useState<string | undefined>(undefined);

    const triggerHaptic = useCallback((type: 'selection' | 'impact' | 'notification', style?: any) => {
        if (type === 'selection') Haptics.selectionAsync();
        else if (type === 'impact') Haptics.impactAsync(style || Haptics.ImpactFeedbackStyle.Light);
        else if (type === 'notification') Haptics.notificationAsync(style || Haptics.NotificationFeedbackType.Success);
    }, []);

    const addToQueue = useCallback((urlOrText: string) => {
        if (!urlOrText || typeof urlOrText !== 'string') return;

        const lines = urlOrText.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);

        let duplicateCount = 0;
        for (const url of lines) {
            if (processingUrls.current.has(url)) {
                duplicateCount++;
                continue;
            }
            setQueue(prev => [...prev, url]);
            lastCheckedUrl.current = url;
        }

        if (duplicateCount > 0 && duplicateCount === lines.length) {
            showToast({ message: 'Already sifting this link', duration: 2000, type: 'error' });
        }
    }, [showToast]);

    const processQueue = useCallback(async () => {
        if (queue.length === 0 || isProcessingQueue) return;
        setIsProcessingQueue(true);

        const urlsToProcess = [...queue];
        setQueue([]);

        const count = urlsToProcess.length;
        if (count > 1) {
            showToast({ message: `Sifting ${count} items...`, duration: 2000 });
        } else {
            showToast({ message: "Sifting...", duration: 1500 });
        }

        const tasks = await Promise.all(urlsToProcess.map(async (url) => {
            if (processingUrls.current.has(url)) return null;
            processingUrls.current.add(url);

            try {
                const domain = getDomain(url);
                const smartTag = getSmartTag(url);
                const { data: pendingData, error } = await supabase
                    .from('pages')
                    .insert({
                        user_id: user?.id,
                        url,
                        title: "Sifting Sift...",
                        summary: "Synthesizing content...",
                        tags: [smartTag],
                        metadata: { status: 'pending', source: domain }
                    })
                    .select()
                    .single();

                if (error) throw error;
                return { url, id: pendingData.id };
            } catch (e) {
                processingUrls.current.delete(url);
                return null;
            }
        }));

        const validTasks = tasks.filter((t): t is { url: string; id: string } => t !== null);

        const results = await Promise.allSettled(validTasks.map(async (task) => {
            try {
                if (!user?.id) throw new Error('Not authenticated');
                await safeSift(task.url, user.id, task.id, tier);
            } catch (apiError: any) {
                if (apiError.status === 'limit_reached') {
                    setUpgradeUrl(apiError.upgrade_url);
                    setLimitReachedVisible(true);
                    triggerHaptic('notification', Haptics.NotificationFeedbackType.Error);
                } else {
                    const retryCount = (apiError.retryCount || 0) + 1;
                    await supabase.from('pages').update({
                        metadata: { status: 'failed', error: apiError.message, retry_count: retryCount }
                    }).eq('id', task.id);

                    const isTimeout = apiError.message?.toLowerCase().includes('time') || apiError.message?.toLowerCase().includes('deadline');
                    showToast({
                        message: isTimeout ? "Sift timed out" : (apiError.message || "Sift failed"),
                        duration: 5000,
                        type: 'error',
                        action: retryCount < 3 ? { label: 'Retry', onPress: () => addToQueue(task.url) } : undefined
                    });
                    triggerHaptic('notification', Haptics.NotificationFeedbackType.Error);
                }
                throw apiError;
            } finally {
                processingUrls.current.delete(task.url);
            }
        }));

        queryClient.invalidateQueries({ queryKey: ['pages', user?.id, tier] });

        const hasSuccess = results.some(r => r.status === 'fulfilled');
        if (hasSuccess) {
            triggerHaptic('notification', Haptics.NotificationFeedbackType.Success);

            // Soft limit nudge — warn when approaching limit
            const limit = TIER_LIMITS[tier as keyof typeof TIER_LIMITS]?.maxSiftsTotal || 10;
            const remaining = limit - (currentCount + validTasks.length);
            if (tier !== 'unlimited' && tier !== 'admin' && remaining > 0 && remaining <= 3) {
                setTimeout(() => {
                    showToast({
                        message: `${remaining} sift${remaining === 1 ? '' : 's'} remaining on your plan`,
                        duration: 4000,
                        type: 'info',
                    });
                }, 1500);
            }
        }
        setIsProcessingQueue(false);
    }, [queue, isProcessingQueue, user, tier, showToast, queryClient, triggerHaptic, addToQueue]);

    useEffect(() => {
        if (queue.length > 0 && !isProcessingQueue) {
            processQueue();
        }
    }, [queue, isProcessingQueue, processQueue]);

    const handleSubmitUrl = useCallback(() => {
        if (isOverLimit) {
            setLimitReachedVisible(true);
            triggerHaptic('notification', Haptics.NotificationFeedbackType.Warning);
            return;
        }

        if (manualUrl.trim()) {
            const url = manualUrl.trim();
            Keyboard.dismiss();
            addToQueue(url);
            setManualUrl("");
        }
    }, [isOverLimit, manualUrl, addToQueue, triggerHaptic]);

    return {
        addToQueue,
        manualUrl,
        setManualUrl,
        handleSubmitUrl,
        isProcessingQueue,
        limitReachedVisible,
        setLimitReachedVisible,
        upgradeUrl,
        setUpgradeUrl,
        lastCheckedUrl
    };
}
