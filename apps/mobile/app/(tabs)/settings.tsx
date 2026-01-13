import { View, SafeAreaView, ScrollView } from "react-native";
import { Typography } from "../../components/design-system/Typography";

export default function Settings() {
    return (
        <SafeAreaView className="flex-1 bg-canvas">
            <ScrollView contentContainerStyle={{ padding: 20 }}>
                <Typography variant="h2">Profile & Settings</Typography>
                <Typography variant="body" className="text-ink-secondary mt-2 mb-8">
                    Manage your preferences here.
                </Typography>
            </ScrollView>
        </SafeAreaView>
    );
}
