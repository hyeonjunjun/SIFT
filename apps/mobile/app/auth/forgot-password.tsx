import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { COLORS, RADIUS, Theme } from '../../lib/theme';
import { Typography } from '../../components/design-system/Typography';
import ScreenWrapper from '../../components/ScreenWrapper';
import { CaretLeft } from 'phosphor-react-native';

export default function ForgotPasswordScreen() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleResetPassword = async () => {
        if (!email) {
            Alert.alert('Missing Info', 'Please enter your email.');
            return;
        }

        setLoading(true);
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: 'sift://reset-password',
        });

        if (error) {
            Alert.alert('Error', error.message);
        } else {
            Alert.alert(
                'Check your email',
                "We've sent a password reset link to your email."
            );
            router.back();
        }
        setLoading(false);
    };

    return (
        <ScreenWrapper edges={['top', 'bottom']}>
            <View style={styles.container}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <CaretLeft size={24} color={COLORS.ink} weight="bold" />
                </TouchableOpacity>

                <View style={styles.header}>
                    <Typography variant="h2" style={styles.title}>Reset Password</Typography>
                    <Typography variant="body" color={COLORS.stone} style={styles.subtitle}>
                        Enter your email and we'll send you a link to reset your password.
                    </Typography>
                </View>

                <View style={styles.form}>
                    <View style={styles.inputContainer}>
                        <TextInput
                            style={styles.input}
                            placeholder="Email"
                            placeholderTextColor={COLORS.stone}
                            value={email}
                            onChangeText={setEmail}
                            autoCapitalize="none"
                            keyboardType="email-address"
                        />
                    </View>

                    <TouchableOpacity
                        style={[styles.resetButton, loading && styles.buttonDisabled]}
                        onPress={handleResetPassword}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color={COLORS.paper} />
                        ) : (
                            <Typography variant="label" style={{ color: COLORS.paper, fontWeight: '600' }}>SEND LINK</Typography>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 32,
        paddingTop: 20,
        backgroundColor: COLORS.canvas,
    },
    backButton: {
        marginBottom: 40,
        marginLeft: -10,
        padding: 10,
    },
    header: {
        marginBottom: 40,
    },
    title: {
        fontSize: 32,
        fontFamily: 'PlayfairDisplay_700Bold',
        color: COLORS.ink,
        marginBottom: 12,
    },
    subtitle: {
        fontSize: 16,
        lineHeight: 24,
    },
    form: {
        gap: 20,
    },
    inputContainer: {
        backgroundColor: COLORS.paper,
        borderRadius: RADIUS.m,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: COLORS.separator,
        ...Theme.shadows.soft,
    },
    input: {
        paddingVertical: 16,
        paddingHorizontal: 20,
        fontSize: 17,
        color: COLORS.ink,
        fontFamily: 'System',
    },
    resetButton: {
        backgroundColor: COLORS.ink,
        height: 56,
        borderRadius: RADIUS.pill,
        justifyContent: 'center',
        alignItems: 'center',
        ...Theme.shadows.soft,
    },
    buttonDisabled: {
        opacity: 0.7,
    },
});
