import { Tabs } from "expo-router";
import { DeviceEventEmitter, View, Platform, StyleSheet } from "react-native";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { House, Books, User, SquaresFour, UsersThree } from 'phosphor-react-native';
import { useTheme } from "../../context/ThemeContext";
import { COLORS, SPACING, RADIUS } from "../../lib/theme";
import { useAuth } from "../../lib/auth";
import { supabase } from "../../lib/supabase";
import { useQuery } from "@tanstack/react-query";
import * as Haptics from 'expo-haptics';

function useSocialBadgeCount() {
    const { user } = useAuth();

    const { data: badgeCount = 0 } = useQuery({
        queryKey: ['social_badge', user?.id],
        queryFn: async () => {
            if (!user?.id) return 0;

            // Count pending incoming friend requests
            const { count: friendCount } = await supabase
                .from('friendships')
                .select('*', { count: 'exact', head: true })
                .eq('friend_id', user.id)
                .eq('status', 'pending');

            // Count unread shared sifts
            const { count: shareCount } = await supabase
                .from('sift_shares')
                .select('*', { count: 'exact', head: true })
                .eq('receiver_id', user.id);

            return (friendCount || 0) + (shareCount || 0);
        },
        enabled: !!user?.id,
        staleTime: 1000 * 30, // Refresh every 30s
        refetchInterval: 1000 * 60, // Background poll every 60s
    });

    return badgeCount;
}

export default function TabLayout() {
    const { colors, isDark } = useTheme();
    const insets = useSafeAreaInsets();
    const socialBadgeCount = useSocialBadgeCount();

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: colors.canvas,
                    borderTopWidth: 0,
                    height: Platform.OS === 'ios' ? 90 : 70 + insets.bottom,
                    paddingTop: 12,
                    paddingBottom: Platform.OS === 'ios' ? 30 : 12 + insets.bottom,
                    elevation: 0,
                    shadowOpacity: 0,
                },
                tabBarShowLabel: false,
                tabBarActiveTintColor: colors.ink,
                tabBarInactiveTintColor: colors.stone,
            }}
        >
            <Tabs.Screen
                name="index"
                listeners={({ navigation }) => ({
                    tabPress: (e: any) => {
                        Haptics.selectionAsync();
                        if (navigation.isFocused()) {
                            e.preventDefault();
                            DeviceEventEmitter.emit('scrollToTopDashboard');
                        }
                    },
                })}
                options={{
                    title: "DASHBOARD",
                    tabBarIcon: ({ color, focused }) => (
                        <SquaresFour
                            size={28}
                            color={color}
                            weight={focused ? "fill" : "regular"}
                        />
                    ),
                }}
            />
            <Tabs.Screen
                name="library"
                listeners={() => ({
                    tabPress: () => {
                        Haptics.selectionAsync();
                    },
                })}
                options={{
                    title: "LIBRARY",
                    tabBarIcon: ({ color, focused }) => (
                        <Books
                            size={28}
                            color={color}
                            weight={focused ? "fill" : "regular"}
                        />
                    ),
                }}
            />
            <Tabs.Screen
                name="social"
                listeners={() => ({
                    tabPress: () => {
                        Haptics.selectionAsync();
                    },
                })}
                options={{
                    title: "SOCIAL",
                    tabBarIcon: ({ color, focused }) => (
                        <View>
                            <UsersThree
                                size={28}
                                color={color}
                                weight={focused ? "fill" : "regular"}
                            />
                            {socialBadgeCount > 0 && (
                                <View style={styles.badge}>
                                    <View style={styles.badgeDot} />
                                </View>
                            )}
                        </View>
                    ),
                }}
            />
            <Tabs.Screen
                name="settings"
                listeners={() => ({
                    tabPress: () => {
                        Haptics.selectionAsync();
                    },
                })}
                options={{
                    title: "PROFILE",
                    tabBarIcon: ({ color, focused }) => (
                        <User
                            size={28}
                            color={color}
                            weight={focused ? "fill" : "regular"}
                        />
                    ),
                }}
            />
        </Tabs>
    );
}

const styles = StyleSheet.create({
    badge: {
        position: 'absolute',
        top: -2,
        right: -6,
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: COLORS.canvas,
        justifyContent: 'center',
        alignItems: 'center',
    },
    badgeDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: COLORS.accent, // Clay accent dot
    },
});
