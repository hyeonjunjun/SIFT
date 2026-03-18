import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';

export interface NotificationPreferences {
    sift_complete: boolean;
    sift_shared: boolean;
    friend_requests: boolean;
    collection_activity: boolean;
    weekly_digest: boolean;
    product_updates: boolean;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
    sift_complete: true,
    sift_shared: true,
    friend_requests: true,
    collection_activity: true,
    weekly_digest: true,
    product_updates: false,
};

export function useNotificationPreferences() {
    const { user } = useAuth();
    const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_PREFERENCES);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user?.id) return;

        const load = async () => {
            try {
                const { data } = await supabase
                    .from('profiles')
                    .select('notification_preferences')
                    .eq('id', user.id)
                    .single();

                if (data?.notification_preferences) {
                    setPreferences({ ...DEFAULT_PREFERENCES, ...data.notification_preferences });
                }
            } catch {
                // Use defaults
            } finally {
                setLoading(false);
            }
        };

        load();
    }, [user?.id]);

    const updatePreference = useCallback(async (key: keyof NotificationPreferences, value: boolean) => {
        if (!user?.id) return;

        const updated = { ...preferences, [key]: value };
        setPreferences(updated); // Optimistic

        try {
            await supabase
                .from('profiles')
                .update({ notification_preferences: updated })
                .eq('id', user.id);
        } catch {
            // Revert on failure
            setPreferences(preferences);
        }
    }, [user?.id, preferences]);

    return { preferences, updatePreference, loading };
}
