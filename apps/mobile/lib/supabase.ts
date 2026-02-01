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
            console.warn(`[Supabase Storage] Error reading ${key}:`, err.message);
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
            console.warn(`[Supabase Storage] Error writing ${key}:`, err.message);
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
            console.warn(`[Supabase Storage] Error deleting ${key}:`, err.message);
        });
    },
};

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

if (!process.env.EXPO_PUBLIC_SUPABASE_URL || !process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY) {
    console.warn("Supabase environment variables are missing! The app will likely fail to fetch data.");
}

console.log(`[Supabase] Initializing with URL: ${supabaseUrl ? `${supabaseUrl.substring(0, 15)}...` : 'MISSING'}`);
if (supabaseUrl.includes('placeholder')) {
    console.warn("⚠️ [Supabase] Using PLACEHOLDER URL. This will likely fail.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        storage: ExpoSecureStoreAdapter,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: Platform.OS === 'web',
    },
});
