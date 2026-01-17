import { Tabs } from "expo-router";
import { DeviceEventEmitter, StyleSheet } from "react-native";
import { COLORS, Theme } from "../../lib/theme";
import { House, Books, Fingerprint, SquaresFour } from 'phosphor-react-native';
import { View } from "react-native";

export default function TabLayout() {
    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: COLORS.canvas,
                    borderTopWidth: 0.5,
                    borderTopColor: 'rgba(0,0,0,0.05)',
                    height: 85,
                    paddingTop: 12,
                    paddingBottom: 25,
                    elevation: 0,
                    shadowOpacity: 0, // Remove shadow for flat anchor look
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
                    title: "FEED",
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
                    title: "ARCHIVE",
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
                    title: "IDENTITY",
                    tabBarIcon: ({ color, focused }) => (
                        <Fingerprint
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

