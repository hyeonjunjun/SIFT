import { Tabs } from "expo-router";
import { DeviceEventEmitter, View, Platform, StyleSheet } from "react-native";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { House, Books, User, SquaresFour, UsersThree } from 'phosphor-react-native';
import { useTheme } from "../../context/ThemeContext";
import { COLORS, SPACING, RADIUS } from "../../lib/theme";
import * as Haptics from 'expo-haptics';

export default function TabLayout() {
    const { colors, isDark } = useTheme();
    const insets = useSafeAreaInsets();

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: colors.canvas, // Global canvas color
                    borderTopWidth: 0, // CLEANER LOOK (No border)
                    // borderTopColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                    height: Platform.OS === 'ios' ? 90 : 70 + insets.bottom,
                    paddingTop: 12,
                    paddingBottom: Platform.OS === 'ios' ? 30 : 12 + insets.bottom,
                    elevation: 0,
                    shadowOpacity: 0,
                },
                tabBarShowLabel: false, // HIDING LABELS for minimalist look
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
                        <UsersThree
                            size={28}
                            color={color}
                            weight={focused ? "fill" : "regular"}
                        />
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

