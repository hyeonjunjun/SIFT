import * as React from 'react';
import { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, TextInput, Alert } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { CaretLeft, WarningCircle } from 'phosphor-react-native';
import { Typography } from '../../components/design-system/Typography';
import { Button } from '../../components/design-system/Button';
import { COLORS, SPACING, RADIUS, OVERLAYS } from '../../lib/theme';
import { useTheme } from '../../context/ThemeContext';
import ScreenWrapper from '../../components/ScreenWrapper';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';

export default function DeleteAccountScreen() {
    const router = useRouter();
    const { colors } = useTheme();
    const { user, signOut } = useAuth();
    const [confirmation, setConfirmation] = useState('');
    const [deleting, setDeleting] = useState(false);

    const canDelete = confirmation.toLowerCase() === 'delete';

    const handleDelete = async () => {
        if (!canDelete || !user?.id) return;

        Alert.alert(
            'Final Confirmation',
            'This will permanently delete your account, all sifts, collections, and data. This cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete Forever',
                    style: 'destructive',
                    onPress: async () => {
                        setDeleting(true);
                        try {
                            // Delete user data
                            await supabase.from('pages').delete().eq('user_id', user.id);
                            await supabase.from('folders').delete().eq('user_id', user.id);
                            await supabase.from('notifications').delete().eq('user_id', user.id);
                            await supabase.from('profiles').delete().eq('id', user.id);

                            await signOut();
                            router.replace('/');
                        } catch (error: any) {
                            Alert.alert('Error', error.message || 'Failed to delete account. Please contact support.');
                            setDeleting(false);
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
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton} accessibilityLabel="Go back" accessibilityRole="button">
                    <CaretLeft size={28} color={colors.ink} />
                </TouchableOpacity>
                <Typography variant="h3">Delete Account</Typography>
                <View style={{ width: 28 }} />
            </View>

            <View style={styles.content}>
                <View style={[styles.warningBox, { backgroundColor: OVERLAYS.light.dangerTint }]}>
                    <WarningCircle size={28} color={colors.danger} weight="fill" />
                    <Typography variant="body" style={{ flex: 1, marginLeft: SPACING.m, color: colors.danger }}>
                        This action is permanent and cannot be undone. All your sifts, collections, and account data will be deleted.
                    </Typography>
                </View>

                <Typography variant="body" color="stone" style={styles.instruction}>
                    Type <Typography variant="body" weight="medium">"delete"</Typography> below to confirm.
                </Typography>

                <TextInput
                    style={[styles.input, { backgroundColor: colors.subtle, color: colors.ink, borderColor: colors.separator }]}
                    value={confirmation}
                    onChangeText={setConfirmation}
                    placeholder="Type 'delete' to confirm"
                    placeholderTextColor={colors.stone}
                    autoCapitalize="none"
                    autoCorrect={false}
                    accessibilityLabel="Type delete to confirm account deletion"
                />

                <Button
                    label={deleting ? 'Deleting...' : 'Delete My Account'}
                    onPress={handleDelete}
                    variant="primary"
                    disabled={!canDelete || deleting}
                    style={[styles.deleteButton, { backgroundColor: canDelete ? colors.danger : colors.subtle }]}
                />
            </View>
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
    warningBox: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: SPACING.m,
        borderRadius: RADIUS.s,
        marginBottom: SPACING.xl,
    },
    instruction: {
        marginBottom: SPACING.m,
    },
    input: {
        height: 52,
        borderRadius: RADIUS.m,
        paddingHorizontal: SPACING.m,
        fontSize: 17,
        marginBottom: SPACING.xl,
        borderWidth: 1,
    },
    deleteButton: {
        width: '100%',
    },
});
