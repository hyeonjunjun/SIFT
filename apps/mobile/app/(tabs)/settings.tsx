import { View, SafeAreaView } from "react-native";
import { Typography } from "../../components/design-system/Typography";

export default function Settings() {
    return (
        <SafeAreaView className="flex-1 bg-canvas items-center justify-center">
            <Typography variant="h2">Profile & Settings</Typography>
            <Typography variant="body" className="text-ink-secondary mt-2">
                Manage your preferences here.
            </Typography>
        </SafeAreaView>
    );
}
