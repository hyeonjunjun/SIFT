import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';

export function useUnreadNotificationCount() {
    const { user } = useAuth();

    const { data: count = 0 } = useQuery({
        queryKey: ['social_badge', user?.id],
        queryFn: async () => {
            if (!user?.id) return 0;
            const { count: unread } = await supabase
                .from('notifications')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id)
                .eq('is_read', false);
            return unread || 0;
        },
        enabled: !!user?.id,
        staleTime: 1000 * 30,
        refetchInterval: 1000 * 60,
    });

    return count;
}
