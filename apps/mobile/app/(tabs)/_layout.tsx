import { Tabs } from "expo-router";
import { User, LayoutGrid, Layers } from "lucide-react-native";
import { View, StyleSheet, DeviceEventEmitter, Pressable, Dimensions } from "react-native";
import { Theme } from "../../lib/theme";
import { BlurView } from "expo-blur";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";

const { width } = Dimensions.get('window');

function TabBarIcon({ Icon, color, focused }: { Icon: any, color: string, focused: boolean }) {
    const scale = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [{ scale: scale.value }]
        };
    });

    const onPressIn = () => {
        scale.value = withSpring(0.9);
    };

    const onPressOut = () => {
        scale.value = withSpring(1);
    };

    return (
        <Animated.View
            style={[styles.iconContainer, animatedStyle]}
            onTouchStart={onPressIn}
            onTouchEnd={onPressOut}
        >
            <Icon size={24} color={color} strokeWidth={focused ? 2.5 : 2} />
        </Animated.View>
    );
}

export default function TabLayout() {
    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    position: 'absolute',
                    bottom: 40,
                    left: '5%',
                    right: '5%',
                    width: '90%',
                    maxWidth: 400,
                    alignSelf: 'center',
                    height: 64,
                    borderRadius: 30,
                    backgroundColor: Theme.colors.surface,
                    borderTopWidth: 0,
                    borderWidth: 1,
                    borderColor: Theme.colors.border,
                    ...Theme.shadows.dock,
                    elevation: 10,
                    paddingBottom: 0,
                },
                tabBarBackground: () => (
                    <BlurView
                        intensity={50}
                        style={[StyleSheet.absoluteFill, { borderRadius: 30, overflow: 'hidden' }]}
                        tint="light"
                    />
                ),
                tabBarActiveTintColor: Theme.colors.text.action,
                tabBarInactiveTintColor: Theme.colors.text.tertiary,
                tabBarShowLabel: false,
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
                    tabBarIcon: ({ color, focused }) => <TabBarIcon Icon={LayoutGrid} color={color} focused={focused} />,
                }}
            />
            <Tabs.Screen
                name="library"
                options={{
                    title: "Library",
                    tabBarIcon: ({ color, focused }) => <TabBarIcon Icon={Layers} color={color} focused={focused} />,
                }}
            />
            <Tabs.Screen
                name="settings"
                options={{
                    title: "Profile",
                    tabBarIcon: ({ color, focused }) => <TabBarIcon Icon={User} color={color} focused={focused} />,
                }}
            />
        </Tabs>
    );
}

const styles = StyleSheet.create({
    iconContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        height: 44,
        width: 44,
    }
});
