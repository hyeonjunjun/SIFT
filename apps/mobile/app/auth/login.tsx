import React, { useState, useEffect } from 'react';
import { ActionSheetIOS, Platform, View, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, TextInput, KeyboardAvoidingView, ScrollView, Pressable, NativeModules, Dimensions, Switch } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Crypto from 'expo-crypto';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { supabase } from '../../lib/supabase';
import { COLORS, SPACING, RADIUS, Theme } from '../../lib/theme';
import { Typography } from '../../components/design-system/Typography';
import ScreenWrapper from '../../components/ScreenWrapper';
import { AppleLogo, GoogleLogo } from 'phosphor-react-native';
import Constants from 'expo-constants';

// Native modules handled conditionally below
let statusCodes: any = {};
if (NativeModules.RNGoogleSignin) {
    try {
        statusCodes = require('@react-native-google-signin/google-signin').statusCodes;
    } catch (e) { }
}

WebBrowser.maybeCompleteAuthSession();

// Safer way to handle optional native modules
const AppleAuthentication = Platform.OS === 'ios' ? require('expo-apple-authentication') : null;

const { width } = Dimensions.get('window');

const REMEMBER_ME_KEY = 'auth_remembered_email';

export default function LoginScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const loadRememberedEmail = async () => {
            try {
                const savedEmail = await SecureStore.getItemAsync(REMEMBER_ME_KEY);
                if (savedEmail) {
                    setEmail(savedEmail);
                    setRememberMe(true);
                }
            } catch (e) { }
        };
        loadRememberedEmail();
    }, []);

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
            // Success
            try {
                if (rememberMe) {
                    await SecureStore.setItemAsync(REMEMBER_ME_KEY, email);
                } else {
                    await SecureStore.deleteItemAsync(REMEMBER_ME_KEY);
                }
            } catch (e) { }
        }
    };

    const handleGoogleSignIn = async () => {
        setLoading(true);
        try {
            if (Platform.OS === 'web') {
                const redirectTo = window.location.origin + '/';
                console.log(`[Google Auth] Web Redirect URL: ${redirectTo}`);
                const { error } = await supabase.auth.signInWithOAuth({
                    provider: 'google',
                    options: {
                        redirectTo,
                        queryParams: {
                            access_type: 'offline',
                            prompt: 'consent',
                        },
                    },
                });
                if (error) throw error;
                return;
            }

            const isAvailable = !!NativeModules.RNGoogleSignin;
            if (!isAvailable) {
                Alert.alert('Google Auth', 'Google Sign-In is not supported in this environment (e.g. Expo Go). Please use a development build.');
                setLoading(false);
                return;
            }

            // Generate nonce for security (similar to Apple Sign-In)
            const rawNonce = Math.random().toString(36).substring(2, 11);
            const hashedNonce = await Crypto.digestStringAsync(
                Crypto.CryptoDigestAlgorithm.SHA256,
                rawNonce
            );

            const { GoogleSignin } = require('@react-native-google-signin/google-signin');
            await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

            // Pass the hashed nonce to Google Sign-In (iOS only for nonce support)
            const response = await GoogleSignin.signIn({
                ...(Platform.OS === 'ios' ? { nonce: hashedNonce } : {}),
            });

            // Native library structure differs slightly by version
            const idToken = response.data?.idToken || (response as any).idToken;

            if (idToken) {
                const { error } = await supabase.auth.signInWithIdToken({
                    provider: 'google',
                    token: idToken,
                    ...(Platform.OS === 'ios' ? { nonce: rawNonce } : {}),
                });
                if (error) throw error;
            } else {
                throw new Error('No ID token received from Google');
            }
        } catch (error: any) {
            setLoading(false);
            if (error.code === statusCodes.SIGN_IN_CANCELLED) {
                // user cancelled
            } else if (error.code === statusCodes.IN_PROGRESS) {
                // in progress
            } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
                Alert.alert('Google Play Services', 'Play services not available or outdated');
            } else {
                console.error('[Google Auth] Detailed Error:', error);
                Alert.alert(
                    'Google Auth Failed',
                    `${error.message}\n\nCode: ${error.code || 'unknown'}\n\nCheck terminal/logs for full object.`
                );
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

            if (!AppleAuthentication) {
                Alert.alert('Apple Auth', 'Apple Sign-In is not supported in this environment.');
                return;
            }

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

                    <View style={styles.optionsRow}>
                        <View style={styles.rememberMeContainer}>
                            <Switch
                                value={rememberMe}
                                onValueChange={setRememberMe}
                                trackColor={{ false: COLORS.subtle, true: COLORS.ink }}
                                thumbColor={COLORS.paper}
                                ios_backgroundColor={COLORS.subtle}
                                style={{ transform: Platform.OS === 'ios' ? [{ scaleX: .7 }, { scaleY: .7 }] : [] }}
                            />
                            <Typography variant="caption" color={COLORS.stone}>Remember me</Typography>
                        </View>
                        <TouchableOpacity onPress={() => router.push('/auth/forgot-password')}>
                            <Typography variant="caption" color={COLORS.stone} style={{ fontWeight: '500' }}>Forgot password?</Typography>
                        </TouchableOpacity>
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
                    {Platform.OS === 'ios' && AppleAuthentication && (
                        <View style={{ height: 52, marginVertical: 6 }}>
                            <AppleAuthentication.AppleAuthenticationButton
                                buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
                                buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                                cornerRadius={RADIUS.pill}
                                style={{ width: '100%', height: '100%' }}
                                onPress={handleAppleSignIn}
                            />
                        </View>
                    )}

                    {Platform.OS !== 'ios' && (
                        <Pressable
                            onPress={handleAppleSignIn}
                            disabled={loading}
                            style={({ hovered }: any) => [
                                styles.socialButtonApple,
                                loading && { opacity: 0.5 },
                                hovered && Platform.OS === 'web' && { opacity: 0.8, transform: [{ scale: 1.01 }] }
                            ]}
                        >
                            <AppleLogo size={20} color={COLORS.paper} weight="fill" />
                            <Typography variant="label" style={{ color: COLORS.paper, marginLeft: 10 }}>CONTINUE WITH APPLE</Typography>
                        </Pressable>
                    )}

                    <Pressable
                        onPress={handleGoogleSignIn}
                        disabled={loading}
                        style={({ hovered }: any) => [
                            styles.socialButtonGoogle,
                            loading && { opacity: 0.5 },
                            hovered && Platform.OS === 'web' && { backgroundColor: COLORS.subtle, transform: [{ scale: 1.01 }] }
                        ]}
                    >
                        <GoogleLogo size={20} color={COLORS.ink} weight="bold" />
                        <Typography variant="label" style={{ color: COLORS.ink, marginLeft: 10 }}>CONTINUE WITH GOOGLE</Typography>
                    </Pressable>
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
        marginBottom: 40,
    },
    logoText: {
        fontSize: 84,
        fontFamily: 'PlayfairDisplay',
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
        gap: 12,
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
    optionsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 4,
        marginTop: 4,
        marginBottom: 8,
    },
    rememberMeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
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
        marginVertical: 32,
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
        marginTop: 40,
        alignItems: 'center',
    },
});
