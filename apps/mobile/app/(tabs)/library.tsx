import { View, SafeAreaView } from "react-native";
import { Typography } from "../../components/design-system/Typography";

export default function Library() {
    return (
        <SafeAreaView className="flex-1 bg-canvas items-center justify-center">
            <Typography variant="h2">Library</Typography>
            <Typography variant="body" className="text-ink-secondary mt-2">
                Your curated collection will utilize this space.
            </Typography>
        </SafeAreaView>
    );
}
