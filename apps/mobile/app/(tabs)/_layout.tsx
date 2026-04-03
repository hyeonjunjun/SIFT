import { Tabs } from "expo-router";
import { DeviceEventEmitter, Platform, StyleSheet } from "react-native";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Books, User, SquaresFour, UsersThree, CalendarBlank } from 'phosphor-react-native';
import { useTheme } from "../../context/ThemeContext";
import { SPACING } from "../../lib/theme";
import { useAuth } from "../../lib/auth";
import * as Haptics from 'expo-haptics';

export default function TabLayout() {
    const { colors, isDark } = useTheme();
    const insets = useSafeAreaInsets();
    const { user } = useAuth();

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
                name="plan"
                listeners={() => ({
                    tabPress: () => {
                        Haptics.selectionAsync();
                    },
                })}
                options={{
                    title: "Plan",
                    tabBarIcon: ({ color, focused }) => (
                        <CalendarBlank
                            size={24}
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

const styles = StyleSheet.create({});
