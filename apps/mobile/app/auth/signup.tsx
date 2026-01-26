import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { COLORS, SPACING, RADIUS, Theme } from '../../lib/theme';
import { Typography } from '../../components/design-system/Typography';
import ScreenWrapper from '../../components/ScreenWrapper';

export default function SignUpScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSignUp = async () => {
        if (!email || !password) {
            Alert.alert('Missing Info', 'Please enter both email and password.');
            return;
        }

        setLoading(true);

        // Direct Auth (Open Beta)
        const { error } = await supabase.auth.signUp({
            email,
            password,
        });

        if (error) {
            Alert.alert('Sign Up Failed', error.message);
            setLoading(false);
        } else {
            Alert.alert('Success', 'Please check your inbox for email verification!');
            setLoading(false);
            router.back(); // Go back to login
        }
    };

    return (
        <ScreenWrapper edges={['top', 'bottom']}>
            <View style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <Typography variant="h1" style={styles.logoText}>join sift</Typography>
                    <Typography variant="label" color={COLORS.stone} style={styles.smallCapsLabel}>
                        START CURATING YOUR DIGITAL DIET
                    </Typography>
                </View>

                {/* Form */}
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

                    <View style={styles.inputContainer}>
                        <TextInput
                            style={styles.input}
                            placeholder="Password"
                            placeholderTextColor={COLORS.stone}
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                        />
                    </View>

                    <TouchableOpacity
                        style={[styles.signUpButton, loading && styles.buttonDisabled]}
                        onPress={handleSignUp}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color={COLORS.paper} />
                        ) : (
                            <Typography variant="label" style={{ color: COLORS.paper, fontWeight: '600' }}>CREATE ACCOUNT</Typography>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Footer */}
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={styles.footer}
                >
                    <Typography variant="body" color={COLORS.stone}>
                        Already have an account? <Typography variant="body" color={COLORS.ink} style={{ fontWeight: '600' }}>Sign In</Typography>
                    </Typography>
                </TouchableOpacity>
            </View>
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 32,
        justifyContent: 'center',
        backgroundColor: COLORS.canvas,
    },
    header: {
        alignItems: 'center',
        marginBottom: 60,
    },
    logoText: {
        fontSize: 72,
        fontFamily: 'PlayfairDisplay',
        fontWeight: '400',
        letterSpacing: -3,
        color: COLORS.ink,
        lineHeight: 80,
    },
    smallCapsLabel: {
        fontSize: 10,
        letterSpacing: 2.5,
        marginTop: -10,
        fontFamily: 'System',
        fontWeight: '500',
    },
    form: {
        width: '100%',
        gap: 16,
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
    signUpButton: {
        backgroundColor: COLORS.ink,
        height: 56,
        borderRadius: RADIUS.pill,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 8,
        ...Theme.shadows.soft,
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    footer: {
        marginTop: 60,
        alignItems: 'center',
    },
});
