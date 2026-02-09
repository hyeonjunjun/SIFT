
import * as React from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Alert, Linking } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { CaretLeft, ShieldCheck, FileText, Trash } from 'phosphor-react-native';
import { Typography } from '../../components/design-system/Typography';
import { COLORS, SPACING, RADIUS, Theme } from '../../lib/theme';
import ScreenWrapper from '../../components/ScreenWrapper';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';

export default function PrivacyScreen() {
    const { signOut } = useAuth();
    const router = useRouter();

    const handleDeleteAccount = () => {
        Alert.alert(
            'Delete Account',
            'Are you sure you want to delete your account? This action is permanent and will delete all your sifts.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const { error } = await supabase.rpc('delete_user_account');
                            if (error) {
                                // Fallback info if RPC fails or requires manual steps
                                Alert.alert('Request Failed', 'We couldn\'t process your request automatically. Please contact support@sift.app to finalize your account deletion.');
                            } else {
                                await signOut();
                                router.replace('/auth/login');
                                Alert.alert('Account Deleted', 'Your account and data have been permanently removed.');
                            }
                        } catch (e) {
                            Alert.alert('Error', 'An unexpected error occurred. Please try again or contact support.');
                        }
                    }
                }
            ]
        );
    };

    return (
        <ScreenWrapper edges={['top']}>
            <Stack.Screen options={{ headerShown: false }} />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <CaretLeft size={28} color={COLORS.ink} />
                </TouchableOpacity>
                <Typography variant="h3">Privacy</Typography>
                <View style={{ width: 28 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.section}>
                    <Typography variant="label" style={styles.sectionTitle}>DATA COLLECTION</Typography>
                    <Typography variant="body" style={styles.text}>
                        We collect information to help you save and organize your library. This includes:
                        {'\n'}• URLs and content you explicitly "sift"
                        {'\n'}• Profile information (display name, bio, interests)
                        {'\n'}• Friendships and items shared within the network
                    </Typography>
                </View>

                <View style={styles.section}>
                    <Typography variant="label" style={styles.sectionTitle}>YOUR PRIVACY</Typography>
                    <Typography variant="body" style={styles.text}>
                        Sift is built on a foundation of digital hygge—comfort and security. We do not sell your personal data. Your private sifts are yours alone and are never used to train advertising or AI models without your explicit consent.
                    </Typography>
                </View>

                <View style={styles.section}>
                    <Typography variant="label" style={styles.sectionTitle}>DATA MANAGEMENT</Typography>
                    <Typography variant="body" style={[styles.text, { marginBottom: 24 }]}>
                        You have full control over your data. You can edit your profile, archive sifts, or permanently delete your account at any time.
                    </Typography>

                    <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteAccount}>
                        <Trash size={20} color="#EF4444" />
                        <Typography variant="label" style={{ color: '#EF4444', marginLeft: 8 }}>
                            DELETE ACCOUNT
                        </Typography>
                    </TouchableOpacity>
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
    },
    section: {
        marginBottom: 40,
    },
    sectionTitle: {
        color: COLORS.stone,
        marginBottom: 16,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.paper,
        padding: 16,
        borderRadius: RADIUS.m,
        marginBottom: 12,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: COLORS.separator,
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
    },
    rowText: {
        marginLeft: 12,
        flex: 1,
    },
    deleteButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderRadius: RADIUS.m,
        borderWidth: 1,
        borderColor: '#EF4444',
    }
});
