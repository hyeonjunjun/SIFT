import { Link, Stack } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Typography } from '../components/design-system/Typography';

export default function NotFoundScreen() {
    return (
        <>
            <Stack.Screen options={{ title: 'Oops!' }} />
            <View style={styles.container}>
                <Typography variant="h1" className="mb-4">This screen doesn't exist.</Typography>

                <Link href="/" style={styles.link}>
                    <Typography variant="body" className="text-blue-500 underline">Go to home screen!</Typography>
                </Link>
            </View>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        backgroundColor: '#fff',
    },
    link: {
        marginTop: 15,
        paddingVertical: 15,
    },
});
