import { Tabs } from "expo-router";
import { DeviceEventEmitter, StyleSheet } from "react-native";
import { COLORS, Theme } from "../../lib/theme";
import { House, Books, User, SquaresFour } from 'phosphor-react-native';
import { View } from "react-native";

export default function TabLayout() {
    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: COLORS.canvas, // #FDFCF8 (Oatmeal)
                    borderTopWidth: 0.5,
                    borderTopColor: 'rgba(0,0,0,0.05)',
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
                tabBarActiveTintColor: COLORS.ink,
                tabBarInactiveTintColor: COLORS.stone,
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

