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
                    <Typography variant="h1" style={styles.logo}>Join Sift</Typography>
                    <Typography variant="body" color={COLORS.stone} style={styles.subtitle}>
                        Start curating your digital diet.
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
                            <Typography variant="bodyMedium" color={COLORS.paper}>Create Account</Typography>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Footer */}
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={styles.footer}
                >
                    <Typography variant="body" color={COLORS.stone}>
                        Already have an account? <Typography variant="bodyMedium" color={COLORS.ink}>Sign In</Typography>
                    </Typography>
                </TouchableOpacity>
            </View>
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: SPACING.xl,
        justifyContent: 'center',
    },
    header: {
        alignItems: 'center',
        marginBottom: 60,
    },
    logo: {
        fontSize: 42,
        letterSpacing: -1,
        color: COLORS.ink,
    },
    subtitle: {
        marginTop: SPACING.s,
    },
    form: {
        width: '100%',
        gap: SPACING.m,
    },
    inputContainer: {
        backgroundColor: COLORS.paper,
        borderRadius: RADIUS.m,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
        ...Theme.shadows.soft,
    },
    input: {
        padding: SPACING.m,
        fontSize: 16,
        color: COLORS.ink,
        fontFamily: 'InstrumentSerif_400Regular',
    },
    signUpButton: {
        backgroundColor: COLORS.ink,
        height: 54,
        borderRadius: RADIUS.m,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: SPACING.s,
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
