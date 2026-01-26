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
import * as WebBrowser from 'expo-web-browser';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';

WebBrowser.maybeCompleteAuthSession();

// Configure Native Google Sign-In
GoogleSignin.configure({
    webClientId: '240781979317-th80om2srfbroe5kv9e6tfd86tglroqc.apps.googleusercontent.com',
    iosClientId: '240781979317-1lblejma2h683dpjr3cmd9gdcosb98h2.apps.googleusercontent.com',
});

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
        }
    };

    const handleGoogleSignIn = async () => {
        setLoading(true);
        try {
            await GoogleSignin.hasPlayServices();
            const response = await GoogleSignin.signIn();

            // Native library structure differs slightly by version
            const idToken = response.data?.idToken || (response as any).idToken;

            if (idToken) {
                const { error } = await supabase.auth.signInWithIdToken({
                    provider: 'google',
                    token: idToken,
                });
                if (error) throw error;
            } else {
                throw new Error('No ID token received from Google');
            }
        } catch (error: any) {
            setLoading(false);
            if (error.code === statusCodes.SIGN_IN_CANCELLED) {
                // user cancelled the login flow
            } else if (error.code === statusCodes.IN_PROGRESS) {
                // operation (e.g. sign in) is in progress already
            } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
                Alert.alert('Google Play Services', 'Play services not available or outdated');
            } else {
                Alert.alert('Google Auth Failed', error.message);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleAppleSignIn = async () => {
        if (loading) return;
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
                setLoading(true);
                const { error } = await supabase.auth.signInWithIdToken({
                    provider: 'apple',
                    token: credential.identityToken,
                    nonce: rawNonce,
                });

                if (error) {
                    Alert.alert('Apple Auth Failed', error.message);
                }
                setLoading(false);
            } else {
                throw new Error('No identity token received.');
            }
        } catch (e: any) {
            setLoading(false);
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
                            <Typography variant="label" style={{ color: COLORS.paper, fontWeight: '600' }}>SIGN IN</Typography>
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
                        <AppleLogo size={20} color={COLORS.paper} weight="fill" />
                        <Typography variant="label" style={{ color: COLORS.paper, marginLeft: 10 }}>CONTINUE WITH APPLE</Typography>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.socialButtonGoogle}
                        onPress={handleGoogleSignIn}
                        disabled={loading}
                    >
                        <GoogleLogo size={20} color={COLORS.ink} weight="bold" />
                        <Typography variant="label" style={{ color: COLORS.ink, marginLeft: 10 }}>CONTINUE WITH GOOGLE</Typography>
                    </TouchableOpacity>
                </View>

                {/* Footer */}
                <TouchableOpacity
                    onPress={() => router.push('/auth/signup')}
                    style={styles.footer}
                >
                    <Typography variant="body" color={COLORS.stone}>
                        New here? <Typography variant="body" color={COLORS.ink} style={{ fontWeight: '600' }}>Create an account</Typography>
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
        fontSize: 84,
        fontFamily: 'PlayfairDisplay', // Consistent with Home
        fontWeight: '400',
        letterSpacing: -4,
        color: COLORS.ink,
        lineHeight: 90,
    },
    smallCapsLabel: {
        fontSize: 10,
        letterSpacing: 3,
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
    loginButton: {
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
    dividerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 40,
    },
    divider: {
        flex: 1,
        height: StyleSheet.hairlineWidth,
        backgroundColor: COLORS.separator,
    },
    dividerText: {
        paddingHorizontal: SPACING.m,
        letterSpacing: 2,
        fontSize: 10,
        fontFamily: 'System',
        fontWeight: '600',
    },
    socialContainer: {
        gap: 12,
    },
    socialButtonApple: {
        flexDirection: 'row',
        backgroundColor: '#000000',
        height: 52,
        borderRadius: RADIUS.pill,
        justifyContent: 'center',
        alignItems: 'center',
        ...Theme.shadows.soft,
    },
    socialButtonGoogle: {
        flexDirection: 'row',
        backgroundColor: COLORS.paper,
        height: 52,
        borderRadius: RADIUS.pill,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: COLORS.separator,
        justifyContent: 'center',
        alignItems: 'center',
        ...Theme.shadows.soft,
    },
    footer: {
        marginTop: 60,
        alignItems: 'center',
    },
});
