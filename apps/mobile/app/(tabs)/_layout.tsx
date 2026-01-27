import { Tabs } from "expo-router";
import { DeviceEventEmitter, View } from "react-native";
import { House, Books, User, SquaresFour } from 'phosphor-react-native';
import { useTheme } from "../../context/ThemeContext";
import { COLORS } from "../../lib/theme";

export default function TabLayout() {
    const { colors, isDark } = useTheme();

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: colors.canvas,
                    borderTopWidth: 0.5,
                    borderTopColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                    height: 95,
                    paddingTop: 12,
                    paddingBottom: 35,
                    elevation: 0,
                    shadowOpacity: 0,
                },
                tabBarLabelStyle: {
                    fontSize: 10,
                    fontFamily: 'Inter_500Medium',
                    letterSpacing: 1,
                    marginTop: 4,
                    textTransform: 'uppercase',
                },
                tabBarActiveTintColor: colors.ink,
                tabBarInactiveTintColor: colors.stone,
            }}
        >
            <Tabs.Screen
                name="index"
                listeners={({ navigation }) => ({
                    tabPress: (e: any) => {
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
                            size={24}
                            color={color}
                            weight={focused ? "fill" : "regular"}
                        />
                    ),
                }}
            />
            <Tabs.Screen
                name="library"
                options={{
                    title: "LIBRARY",
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
                name="settings"
                options={{
                    title: "PROFILE",
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

