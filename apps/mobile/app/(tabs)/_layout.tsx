import { Tabs } from "expo-router";
import { DeviceEventEmitter, StyleSheet } from "react-native";
import { Theme } from "../../lib/theme";
import { Ionicons } from '@expo/vector-icons';

export default function TabLayout() {
    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                // 1. THE BELI-STYLE CONTAINER
                tabBarStyle: {
                    backgroundColor: Theme.colors.background, // Oatmeal
                    borderTopWidth: 0.5,        // Hairline divider
                    borderTopColor: 'rgba(0,0,0,0.1)',
                    height: 95,                 // Taller = More Premium
                    paddingTop: 10,
                    paddingBottom: 35,          // Space for home indicator
                    elevation: 0,               // Flat look
                    shadowOpacity: 0,
                },
                // 2. THE TEXT
                tabBarLabelStyle: {
                    fontSize: 11,
                    fontWeight: '700',
                    marginTop: 4,
                },
                // 3. THE COLORS
                tabBarActiveTintColor: Theme.colors.text.primary,   // Charcoal/Black
                tabBarInactiveTintColor: '#999999',                 // Muted Gray
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
                    title: "Home",
                    tabBarIcon: ({ color, focused }) => (
                        <Ionicons
                            name={focused ? "grid" : "grid-outline"}
                            size={24}
                            color={color}
                        />
                    ),
                }}
            />
            <Tabs.Screen
                name="library"
                options={{
                    title: "Library",
                    tabBarIcon: ({ color, focused }) => (
                        <Ionicons
                            name={focused ? "layers" : "layers-outline"}
                            size={24}
                            color={color}
                        />
                    ),
                }}
            />
            <Tabs.Screen
                name="settings"
                options={{
                    title: "Profile",
                    tabBarIcon: ({ color, focused }) => (
                        <Ionicons
                            name={focused ? "person" : "person-outline"}
                            size={24}
                            color={color}
                        />
                    ),
                }}
            />
        </Tabs>
    );
}

