import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Alert, ActivityIndicator, StyleSheet, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { COLORS, SPACING, RADIUS, Theme } from '../../lib/theme';
import { Typography } from '../../components/design-system/Typography';
import ScreenWrapper from '../../components/ScreenWrapper';
import { AppleLogo, GoogleLogo } from 'phosphor-react-native';

const { width } = Dimensions.get('window');

export default function LoginScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('Missing Info', 'Please enter both email and password.');
            return;
        }

        setLoading(true);

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            Alert.alert('Login Failed', error.message);
            setLoading(false);
        } else {
            // Redirection handled by _layout
        }
    };

    return (
        <ScreenWrapper edges={['top', 'bottom']}>
            <View style={styles.container}>
                {/* Logo / Header */}
                <View style={styles.header}>
                    <Typography variant="h1" style={styles.logo}>Sift</Typography>
                    <Typography variant="body" color={COLORS.stone} style={styles.subtitle}>
                        Refine your digital intake.
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
                        style={[styles.loginButton, loading && styles.buttonDisabled]}
                        onPress={handleLogin}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color={COLORS.paper} />
                        ) : (
                            <Typography variant="bodyMedium" color={COLORS.paper}>Sign In</Typography>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Divider */}
                <View style={styles.dividerContainer}>
                    <View style={styles.divider} />
                    <Typography variant="caption" color={COLORS.stone} style={styles.dividerText}>OR</Typography>
                    <View style={styles.divider} />
                </View>

                {/* Social Auth */}
                <View style={styles.socialContainer}>
                    <TouchableOpacity style={styles.socialButtonApple}>
                        <AppleLogo size={20} color={COLORS.paper} weight="fill" />
                        <Typography variant="bodyMedium" color={COLORS.paper} style={styles.socialText}>Continue with Apple</Typography>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.socialButtonGoogle}>
                        <GoogleLogo size={20} color={COLORS.ink} weight="bold" />
                        <Typography variant="bodyMedium" color={COLORS.ink} style={styles.socialText}>Continue with Google</Typography>
                    </TouchableOpacity>
                </View>

                {/* Footer */}
                <TouchableOpacity
                    onPress={() => router.push('/auth/signup')}
                    style={styles.footer}
                >
                    <Typography variant="body" color={COLORS.stone}>
                        New here? <Typography variant="bodyMedium" color={COLORS.ink}>Create an account</Typography>
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
        fontSize: 48,
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
        fontFamily: 'InstrumentSerif_400Regular', // Using Serif for inputs for that "Archive" feel
    },
    loginButton: {
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
    dividerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 40,
    },
    divider: {
        flex: 1,
        height: 1,
        backgroundColor: 'rgba(0,0,0,0.05)',
    },
    dividerText: {
        paddingHorizontal: SPACING.m,
        letterSpacing: 1,
    },
    socialContainer: {
        gap: SPACING.m,
    },
    socialButtonApple: {
        flexDirection: 'row',
        backgroundColor: '#000000',
        height: 50,
        borderRadius: RADIUS.pill,
        justifyContent: 'center',
        alignItems: 'center',
        ...Theme.shadows.soft,
    },
    socialButtonGoogle: {
        flexDirection: 'row',
        backgroundColor: COLORS.paper,
        height: 50,
        borderRadius: RADIUS.pill,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.08)',
        justifyContent: 'center',
        alignItems: 'center',
        ...Theme.shadows.soft,
    },
    socialText: {
        marginLeft: 10,
    },
    footer: {
        marginTop: 60,
        alignItems: 'center',
    },
});
