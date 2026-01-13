import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Theme } from '../../lib/theme';

export default function LoginScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleLogin = async () => {
        if (loading) return;
        setLoading(true);

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            Alert.alert('Login Failed', error.message);
            setLoading(false);
        } else {
            // AuthStateChange in _layout will handle redirect
        }
    };

    return (
        <View className="flex-1 bg-canvas justify-center px-6">
            <View className="mb-10">
                <Text className="text-4xl font-serif text-slate-900 mb-2">Welcome Back</Text>
                <Text className="text-slate-500 text-lg">Sign in to continue sifting.</Text>
            </View>

            <View className="space-y-4">
                <TextInput
                    className="bg-white border border-slate-200 rounded-xl p-4 text-lg font-sans"
                    placeholder="Email"
                    placeholderTextColor="#94a3b8"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                />

                <TextInput
                    className="bg-white border border-slate-200 rounded-xl p-4 text-lg font-sans"
                    placeholder="Password"
                    placeholderTextColor="#94a3b8"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                />
            </View>

            <TouchableOpacity
                className="bg-slate-900 rounded-xl p-4 mt-8 items-center justify-center h-14"
                onPress={handleLogin}
                disabled={loading}
            >
                {loading ? (
                    <ActivityIndicator color="white" />
                ) : (
                    <Text className="text-white font-bold text-lg">Sign In</Text>
                )}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.push('/auth/signup')} className="mt-8">
                <Text className="text-center text-slate-500">
                    New here? <Text className="text-slate-900 font-bold">Create an account</Text>
                </Text>
            </TouchableOpacity>
        </View>
    );
}
