import { Tabs } from "expo-router";
import { Compass, Book, User, LayoutGrid, Layers } from "lucide-react-native";
import { View, StyleSheet, DeviceEventEmitter } from "react-native";
import { Theme } from "../../lib/theme";
import { BlurView } from "expo-blur";

export default function TabLayout() {
    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    position: 'absolute',
                    borderTopWidth: 0,
                    elevation: 0,
                    height: 85,
                    paddingTop: 8,
                },
                tabBarBackground: () => (
                    <BlurView intensity={80} style={StyleSheet.absoluteFill} tint="light" />
                ),
                tabBarActiveTintColor: Theme.colors.text.primary,
                tabBarInactiveTintColor: Theme.colors.text.tertiary,
                tabBarShowLabel: true,
                tabBarLabelStyle: {
                    fontSize: 11,
                    fontWeight: '600',
                    marginTop: 4,
                }
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
                    title: "Dashboard",
                    tabBarIcon: ({ color }) => <LayoutGrid size={24} color={color} />,
                }}
            />
            <Tabs.Screen
                name="library"
                options={{
                    title: "Library",
                    tabBarIcon: ({ color }) => <Layers size={24} color={color} />,
                }}
            />
            <Tabs.Screen
                name="settings"
                options={{
                    title: "Profile",
                    tabBarIcon: ({ color }) => <User size={24} color={color} />,
                }}
            />
        </Tabs>
    );
}
