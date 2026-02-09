
import * as React from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { CaretLeft } from 'phosphor-react-native';
import { Typography } from '../../components/design-system/Typography';
import { COLORS, RADIUS } from '../../lib/theme';
import ScreenWrapper from '../../components/ScreenWrapper';

export default function TermsScreen() {
    const router = useRouter();

    return (
        <ScreenWrapper edges={['top']}>
            <Stack.Screen options={{ headerShown: false }} />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <CaretLeft size={28} color={COLORS.ink} />
                </TouchableOpacity>
                <Typography variant="h3">Terms of Service</Typography>
                <View style={{ width: 28 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.section}>
                    <Typography variant="label" style={styles.sectionTitle}>1. ACCEPTANCE OF TERMS</Typography>
                    <Typography variant="body" style={styles.text}>
                        By accessing or using Sift, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the application.
                    </Typography>
                </View>

                <View style={styles.section}>
                    <Typography variant="label" style={styles.sectionTitle}>2. USE OF SERVICE</Typography>
                    <Typography variant="body" style={styles.text}>
                        Sift is a mindful tool for organizing digital artifacts. You are responsible for any content you "sift" or share. You agree not to use Sift for any unlawful purposes or to share prohibited content.
                    </Typography>
                </View>

                <View style={styles.section}>
                    <Typography variant="label" style={styles.sectionTitle}>3. USER CONTENT & PRIVACY</Typography>
                    <Typography variant="body" style={styles.text}>
                        You retain all rights to the content you save to Sift. We do not claim ownership of your data. For more information on how we handle your data, please see our Privacy Policy.
                    </Typography>
                </View>

                <View style={styles.section}>
                    <Typography variant="label" style={styles.sectionTitle}>4. SUBSCRIPTIONS & PAYMENTS</Typography>
                    <Typography variant="body" style={styles.text}>
                        Certain features of Sift may require a paid subscription. All payments are handled securely via third-party providers. Subscriptions can be managed or cancelled at any time through your account settings.
                    </Typography>
                </View>

                <View style={styles.section}>
                    <Typography variant="label" style={styles.sectionTitle}>5. LIMITATION OF LIABILITY</Typography>
                    <Typography variant="body" style={styles.text}>
                        Sift is provided "as is" without warranties of any kind. We are not liable for any content accessed through third-party links or for any loss of data.
                    </Typography>
                </View>

                <View style={styles.section}>
                    <Typography variant="label" style={styles.sectionTitle}>6. TERMINATION</Typography>
                    <Typography variant="body" style={styles.text}>
                        We reserve the right to suspend or terminate your access to Sift if we believe you have violated these terms. You may stop using the service at any time by deleting your account.
                    </Typography>
                </View>

                <Typography variant="caption" style={styles.footerText}>
                    Last updated: February 9, 2026
                </Typography>
            </ScrollView>
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
    },
    backButton: {
        padding: 4,
    },
    content: {
        padding: 20,
        paddingBottom: 60,
    },
    section: {
        marginBottom: 32,
    },
    sectionTitle: {
        color: COLORS.stone,
        marginBottom: 12,
    },
    text: {
        lineHeight: 24,
        color: COLORS.ink,
    },
    footerText: {
        marginTop: 40,
        textAlign: 'center',
        color: COLORS.stone,
        opacity: 0.7,
    }
});
