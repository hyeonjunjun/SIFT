import "../global.css";
import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Theme } from "../lib/theme";

export default function RootLayout() {
    return (
        <GestureHandlerRootView className="flex-1 bg-canvas">
            <Stack
                screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor: Theme.colors.background },
                }}
            />
        </GestureHandlerRootView>
    );
}
