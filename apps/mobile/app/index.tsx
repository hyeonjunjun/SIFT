import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';

export default function Index() {
    const router = useRouter();

    useEffect(() => {
        // Use replace to avoid back-navigating to index
        // Small timeout to ensure router is ready
        const timer = setTimeout(() => {
            router.replace('/(tabs)/');
        }, 10);
        return () => clearTimeout(timer);
    }, []);

    return <View style={{ flex: 1, backgroundColor: '#ffffff' }} />;
}
