import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { COLORS, SPACING, RADIUS, Theme } from '../../lib/theme';
import { Typography } from '../../components/design-system/Typography';
import ScreenWrapper from '../../components/ScreenWrapper';

export default function WaitlistScreen() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [joined, setJoined] = useState(false);
    const router = useRouter();

    const handleJoinWaitlist = async () => {
        if (!email) {
            Alert.alert('Email Required', 'Please enter your email to join.');
            return;
        }

        setLoading(true);

        const { error } = await supabase
            .from('waitlist')
            .insert({ email, status: 'pending' });

        if (error) {
            if (error.code === '23505') { // Unique constraint
                setJoined(true);
            } else {
                Alert.alert('Error', error.message);
            }
            setLoading(false);
        } else {
            setJoined(true);
            setLoading(false);
        }
    };

    if (joined) {
        return (
            <ScreenWrapper edges={['top', 'bottom']}>
                <View style={styles.container}>
                    <Typography variant="h1" style={styles.logo}>You're on the list!</Typography>
                    <Typography variant="body" color={COLORS.stone} style={styles.subtitle}>
                        We'll notify you as soon as a spot opens up.
                    </Typography>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => router.replace('/auth/login')}
                    >
                        <Typography variant="bodyMedium" color={COLORS.paper}>Back to Login</Typography>
                    </TouchableOpacity>
                </View>
            </ScreenWrapper>
        );
    }

    return (
        <ScreenWrapper edges={['top', 'bottom']}>
            <View style={styles.container}>
                <View style={styles.header}>
                    <Typography variant="h1" style={styles.logo}>Sift is in Beta</Typography>
                    <Typography variant="body" color={COLORS.stone} style={styles.subtitle}>
                        Join the waitlist to get early access.
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
                        style={[styles.button, loading && styles.buttonDisabled]}
                        onPress={handleJoinWaitlist}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color={COLORS.paper} />
                        ) : (
                            <Typography variant="body" color={COLORS.paper}>Join Waitlist</Typography>
                        )}
                    </TouchableOpacity>
                </View>

                <TouchableOpacity
                    onPress={() => router.replace('/auth/login')}
                    style={styles.footer}
                >
                    <Typography variant="body" color={COLORS.stone}>
                        Already approved? <Typography variant="bodyMedium" color={COLORS.ink}>Sign In</Typography>
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
        fontSize: 32,
        letterSpacing: -1,
        color: COLORS.ink,
        textAlign: 'center',
    },
    subtitle: {
        marginTop: SPACING.s,
        textAlign: 'center',
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
    button: {
        backgroundColor: COLORS.ink,
        height: 54,
        borderRadius: RADIUS.m,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: SPACING.s,
        ...Theme.shadows.soft,
    },
    backButton: {
        backgroundColor: COLORS.ink,
        height: 54,
        borderRadius: RADIUS.m,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 40,
        width: '100%',
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    footer: {
        marginTop: 60,
        alignItems: 'center',
    },
});
