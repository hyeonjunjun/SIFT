import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { NativeModules, Platform } from 'react-native';

// Initialize Google Sign-In safely
let GoogleSignin: any;
const isGoogleSigninAvailable = !!NativeModules.RNGoogleSignin;

if (isGoogleSigninAvailable) {
    try {
        GoogleSignin = require('@react-native-google-signin/google-signin').GoogleSignin;
        GoogleSignin.configure({
            webClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB || '240781979317-th80om2srfbroe5kv9e6tfd86tglroqc.apps.googleusercontent.com',
            iosClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS || '240781979317-1lblejma2h683dpjr3cmd9gdcosb98h2.apps.googleusercontent.com',
            offlineAccess: true,
        });
    } catch (e) {
        console.warn('Google Sign-In initialization failed:', e);
    }
} else {
    console.log('Google Sign-In is not available in this environment');
}

export type Profile = {
    display_name?: string;
    username?: string;
    bio?: string;
    avatar_url?: string;
    interests?: string[];
    tier?: 'free' | 'plus' | 'unlimited' | 'admin';
};

type AuthContextType = {
    user: User | null;
    session: Session | null;
    loading: boolean;
    tier: 'free' | 'plus' | 'unlimited' | 'admin';
    profile: Profile | null;
    signOut: () => Promise<void>;
    refreshProfile: () => Promise<void>;
    updateProfileLocally: (newProfile: Profile) => void;
};

const AuthContext = createContext<AuthContextType>({
    user: null,
    session: null,
    loading: true,
    tier: 'free',
    profile: null,
    signOut: async () => { },
    refreshProfile: async () => { },
    updateProfileLocally: () => { },
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [tier, setTier] = useState<'free' | 'plus' | 'unlimited' | 'admin'>('free');
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);

    const refreshProfile = async (targetUser?: User | null) => {
        const actingUser = targetUser ?? user;
        if (!actingUser?.id) {
            setProfile(null);
            setTier('free');
            return;
        }

        try {
            console.log(`[Auth] Refreshing profile for: ${actingUser.id}`);

            // Apple-grade resilience: 15s timeout for profile fetch
            const fetchPromise = supabase
                .from('profiles')
                .select('*')
                .eq('id', actingUser.id)
                .single();

            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Profile fetch timeout')), 15000)
            );

            const result = await Promise.race([fetchPromise, timeoutPromise]) as any;
            const { data, error } = result;

            if (!error && data) {
                console.log('[Auth] Profile refreshed successfully');
                setProfile(data);
                setUser(actingUser);
                setTier(data.tier as any || 'free');
            } else {
                console.log('[Auth] Profile fetch error/not found, attempting JIT creation:', error?.message);

                // If profile is missing, create it proactively (JIT Creation)
                const { data: newProfile, error: insertError } = await supabase
                    .from('profiles')
                    .insert({
                        id: actingUser.id,
                        display_name: actingUser.user_metadata?.display_name || actingUser.email?.split('@')[0],
                        tier: 'free'
                    })
                    .select()
                    .single();

                if (!insertError && newProfile) {
                    console.log('[Auth] JIT Profile created successfully');
                    setProfile(newProfile);
                    setTier('free');
                } else {
                    console.error('[Auth] JIT Profile creation failed:', insertError?.message);
                    // Fallback to local state if DB insert fails
                    if (!profile) {
                        setTier('free');
                        setProfile({ tier: 'free' });
                    }
                }
            }
        } catch (e: any) {
            console.error('[Auth] Failed to refresh profile:', e.message);
            if (!profile) setTier('free');
        }
    };

    const signOut = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) console.error('Error signing out:', error);
        setTier('free');
        setProfile(null);
        setSession(null);
        setUser(null);
    };

    useEffect(() => {
        let isMounted = true;

        const fetchInitialState = async () => {
            try {
                const { data: { session }, error } = await supabase.auth.getSession();
                if (error) throw error;

                if (isMounted) {
                    setSession(session);
                    const currentUser = session?.user ?? null;
                    setUser(currentUser);

                    if (currentUser) {
                        await refreshProfile(currentUser);
                    }
                }
            } catch (error) {
                console.error('Error fetching session:', error);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        fetchInitialState();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            console.log('Auth state change:', _event);

            if (isMounted) {
                const currentUser = session?.user ?? null;
                setSession(session);
                setUser(currentUser);

                try {
                    if (_event === 'SIGNED_IN' || _event === 'TOKEN_REFRESHED') {
                        setLoading(true);
                        await refreshProfile(currentUser);
                    } else if (_event === 'USER_UPDATED') {
                        // For metadata/profile updates, refresh but don't show full-screen loader if possible
                        await refreshProfile(currentUser);
                    } else if (_event === 'SIGNED_OUT') {
                        setProfile(null);
                        setTier('free');
                    }
                } catch (err) {
                    console.error('[Auth] Event handler error:', err);
                } finally {
                    if (isMounted) setLoading(false);
                }
            }
        });

        return () => {
            isMounted = false;
            subscription.unsubscribe();
        };
    }, []);

    const updateProfileLocally = (newProfile: Profile) => {
        setProfile(prev => ({ ...prev, ...newProfile }));
        if (newProfile.tier) setTier(newProfile.tier);
    };

    return (
        <AuthContext.Provider value={{ user, session, loading, tier, profile, signOut, refreshProfile, updateProfileLocally }}>
            {children}
        </AuthContext.Provider>
    );
};
