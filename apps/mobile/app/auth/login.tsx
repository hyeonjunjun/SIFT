import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Alert, ActivityIndicator, StyleSheet, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { COLORS, SPACING, RADIUS, Theme } from '../../lib/theme';
import { Typography } from '../../components/design-system/Typography';
import ScreenWrapper from '../../components/ScreenWrapper';
import { AppleLogo, GoogleLogo } from 'phosphor-react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';

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

    const handleAppleSignIn = async () => {
        try {
            const rawNonce = Math.random().toString(36).substring(2, 11);
            const hashedNonce = await Crypto.digestStringAsync(
                Crypto.CryptoDigestAlgorithm.SHA256,
                rawNonce
            );

            const credential = await AppleAuthentication.signInAsync({
                requestedScopes: [
                    AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
                    AppleAuthentication.AppleAuthenticationScope.EMAIL,
                ],
                nonce: hashedNonce,
            });

            if (credential.identityToken) {
                const { error } = await supabase.auth.signInWithIdToken({
                    provider: 'apple',
                    token: credential.identityToken,
                    nonce: rawNonce,
                });

                if (error) {
                    Alert.alert('Apple Auth Failed', error.message);
                }
            } else {
                throw new Error('No identity token received.');
            }
        } catch (e: any) {
            if (e.code === 'ERR_CANCELED') {
                // handle cancel
            } else {
                Alert.alert('Error', e.message);
            }
        }
    };

    return (
        <ScreenWrapper edges={['top', 'bottom']}>
            <View style={styles.container}>
                {/* Logo / Header */}
                <View style={styles.header}>
                    <Typography variant="h1" style={styles.logoText}>sift</Typography>
                    <Typography variant="label" color={COLORS.stone} style={styles.smallCapsLabel}>
                        REFINE YOUR DIGITAL INTAKE
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
                    <TouchableOpacity
                        style={styles.socialButtonApple}
                        onPress={handleAppleSignIn}
                    >
                        <AppleLogo size={22} color={COLORS.paper} weight="fill" />
                        <Typography variant="label" color={COLORS.paper} style={styles.socialText}>Continue with Apple</Typography>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.socialButtonGoogle}>
                        <GoogleLogo size={22} color={COLORS.ink} weight="bold" />
                        <Typography variant="label" color={COLORS.ink} style={styles.socialText}>Continue with Google</Typography>
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
        paddingHorizontal: 40,
        justifyContent: 'center',
        backgroundColor: COLORS.canvas,
    },
    header: {
        alignItems: 'center',
        marginBottom: 60,
    },
    logoText: {
        fontSize: 72,
        fontFamily: 'PlayfairDisplay_700Bold',
        letterSpacing: -3,
        color: COLORS.ink,
        lineHeight: 80,
    },
    smallCapsLabel: {
        fontSize: 10,
        letterSpacing: 2,
        marginTop: -5,
    },
    form: {
        width: '100%',
        gap: 12,
    },
    inputContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.08)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 10,
        elevation: 2,
    },
    input: {
        padding: 16,
        fontSize: 17,
        color: COLORS.ink,
        fontFamily: 'PlayfairDisplay_600SemiBold',
        fontStyle: 'italic',
    },
    loginButton: {
        backgroundColor: COLORS.ink,
        height: 54,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 8,
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
        fontSize: 10,
        color: '#999',
    },
    socialContainer: {
        gap: 12,
    },
    socialButtonApple: {
        flexDirection: 'row',
        backgroundColor: '#000000',
        height: 52,
        borderRadius: 26,
        justifyContent: 'center',
        alignItems: 'center',
    },
    socialButtonGoogle: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        height: 52,
        borderRadius: 26,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.08)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    socialText: {
        marginLeft: 10,
    },
    footer: {
        marginTop: 60,
        alignItems: 'center',
    },
});
