import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';
import * as SecureStore from 'expo-secure-store';

import { Platform } from 'react-native';

const ExpoSecureStoreAdapter = {
    getItem: (key: string) => {
        if (Platform.OS === 'web') {
            if (typeof localStorage === 'undefined') return Promise.resolve(null);
            return Promise.resolve(localStorage.getItem(key));
        }
        return SecureStore.getItemAsync(key).catch(err => {
            return null; // Treat as not found on error to prevent total app crash
        });
    },
    setItem: (key: string, value: string) => {
        if (Platform.OS === 'web') {
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem(key, value);
            }
            return Promise.resolve();
        }
        return SecureStore.setItemAsync(key, value).catch(err => {
        });
    },
    removeItem: (key: string) => {
        if (Platform.OS === 'web') {
            if (typeof localStorage !== 'undefined') {
                localStorage.removeItem(key);
            }
            return Promise.resolve();
        }
        return SecureStore.deleteItemAsync(key).catch(err => {
        });
    },
};

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

if (!process.env.EXPO_PUBLIC_SUPABASE_URL || !process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY) {
}
if (supabaseUrl.includes('placeholder')) {
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        storage: ExpoSecureStoreAdapter,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: Platform.OS === 'web',
    },
});
