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

        // 1. Check Waitlist Status
        const { data: waitlistData, error: waitlistError } = await supabase
            .from('waitlist')
            .select('status')
            .eq('email', email.toLowerCase().trim())
            .single();

        if (waitlistError || !waitlistData || waitlistData.status !== 'approved') {
            setLoading(false);
            Alert.alert(
                'Beta Access Required',
                'Your email is not yet approved for beta access. Would you like to join the waitlist?',
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Join Waitlist', onPress: () => router.push('/auth/waitlist') }
                ]
            );
            return;
        }

        // 2. Proceed with Auth
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
                            <Typography variant="body" color={COLORS.paper}>Create Account</Typography>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Footer */}
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={styles.footer}
                >
                    <Typography variant="body" color={COLORS.stone}>
                        Already have an account? <Typography variant="label" color={COLORS.ink}>Sign In</Typography>
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
        fontSize: 64,
        fontFamily: 'PlayfairDisplay_700Bold',
        letterSpacing: -3,
        color: COLORS.ink,
        lineHeight: 72,
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
    signUpButton: {
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
    footer: {
        marginTop: 60,
        alignItems: 'center',
    },
});
