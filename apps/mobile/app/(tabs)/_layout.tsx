import { Tabs } from "expo-router";
import { DeviceEventEmitter, StyleSheet } from "react-native";
import { COLORS, Theme } from "../../lib/theme";
import { House, Archive, User } from 'phosphor-react-native';
import { BlurView } from 'expo-blur';

export default function TabLayout() {
    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    position: 'absolute',
                    backgroundColor: 'rgba(238, 235, 230, 0.85)', // Oatmeal with slight transparency
                    borderTopWidth: 0,
                    height: 90,
                    paddingTop: 12,
                    paddingBottom: 32,
                    elevation: 0,
                    shadowOpacity: 0.05,
                    shadowRadius: 15,
                    shadowOffset: { width: 0, height: -4 },
                },
                tabBarBackground: () => (
                    <BlurView intensity={20} style={StyleSheet.absoluteFill} tint="light" />
                ),
                tabBarLabelStyle: {
                    fontSize: 10,
                    fontFamily: 'Inter_700Bold',
                    letterSpacing: 0.5,
                    marginTop: 4,
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
                        <House
                            size={22}
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
                        <Archive
                            size={22}
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
                        <User
                            size={22}
                            color={color}
                            weight={focused ? "fill" : "regular"}
                        />
                    ),
                }}
            />
        </Tabs>
    );
}

