import { Tabs } from "expo-router";
import { DeviceEventEmitter, View, Platform, StyleSheet } from "react-native";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Books, User, SquaresFour, UsersThree, Bell } from 'phosphor-react-native';
import { useTheme } from "../../context/ThemeContext";
import { COLORS, SPACING, RADIUS } from "../../lib/theme";
import { useAuth } from "../../lib/auth";
import { supabase } from "../../lib/supabase";
import { useQuery } from "@tanstack/react-query";
import * as Haptics from 'expo-haptics';

function useUnreadNotificationCount() {
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

export default function TabLayout() {
    const { colors, isDark } = useTheme();
    const insets = useSafeAreaInsets();
    const unreadCount = useUnreadNotificationCount();

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: colors.canvas,
                    borderTopWidth: 0,
                    height: Platform.OS === 'ios' ? 95 : 75 + insets.bottom,
                    paddingTop: SPACING.xs,
                    paddingBottom: Platform.OS === 'ios' ? 30 : SPACING.m + insets.bottom,
                    elevation: 0,
                    shadowOpacity: 0,
                },
                tabBarShowLabel: true,
                tabBarLabelStyle: {
                    fontFamily: 'Satoshi-Bold',
                    fontSize: 9,
                    letterSpacing: 0.8,
                    marginTop: -SPACING.xs,
                    marginBottom: SPACING.xs,
                },
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
                    title: "Home",
                    tabBarIcon: ({ color, focused }) => (
                        <SquaresFour
                            size={24}
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
                    title: "Library",
                    tabBarIcon: ({ color, focused }) => (
                        <Books
                            size={24}
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
                    title: "Friends",
                    tabBarIcon: ({ color, focused }) => (
                        <UsersThree
                            size={24}
                            color={color}
                            weight={focused ? "fill" : "regular"}
                        />
                    ),
                }}
            />
            <Tabs.Screen
                name="notifications"
                listeners={() => ({
                    tabPress: () => {
                        Haptics.selectionAsync();
                    },
                })}
                options={{
                    title: "Alerts",
                    tabBarIcon: ({ color, focused }) => (
                        <View>
                            <Bell
                                size={24}
                                color={color}
                                weight={focused ? "fill" : "regular"}
                            />
                            {unreadCount > 0 && (
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
                    title: "Profile",
                    tabBarIcon: ({ color, focused }) => (
                        <User
                            size={24}
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
        backgroundColor: COLORS.accent,
    },
});
