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
                    <Typography variant="h1" style={styles.logoText}>You're on the list!</Typography>
                    <Typography variant="label" color={COLORS.stone} style={styles.smallCapsLabel}>
                        WE'LL NOTIFY YOU AS SOON AS A SPOT OPENS UP
                    </Typography>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => router.replace('/auth/login')}
                    >
                        <Typography variant="label" color={COLORS.paper}>Back to Login</Typography>
                    </TouchableOpacity>
                </View>
            </ScreenWrapper>
        );
    }

    return (
        <ScreenWrapper edges={['top', 'bottom']}>
            <View style={styles.container}>
                <View style={styles.header}>
                    <Typography variant="h1" style={styles.logoText}>sift beta</Typography>
                    <Typography variant="label" color={COLORS.stone} style={styles.smallCapsLabel}>
                        JOIN THE WAITLIST FOR EARLY ACCESS
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
    button: {
        backgroundColor: COLORS.ink,
        height: 54,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 8,
    },
    backButton: {
        backgroundColor: COLORS.ink,
        height: 54,
        borderRadius: 12,
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
