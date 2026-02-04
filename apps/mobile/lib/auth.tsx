import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { NativeModules, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
    updateProfileInDB: (updates: Partial<Profile>) => Promise<void>;
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
    updateProfileInDB: async () => { },
});

export const useAuth = () => useContext(AuthContext);

// Auth Constants
const PROFILE_CACHE_KEY = 'sift_user_profile';
const ADMIN_EMAILS = ['rykjun@gmail.com'];

const cacheProfileLocally = async (profile: Profile) => {
    try {
        await AsyncStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(profile));
    } catch (e) {
        console.error('[Auth] Failed to cache profile:', e);
    }
};

const getCachedProfile = async (): Promise<Profile | null> => {
    try {
        const cached = await AsyncStorage.getItem(PROFILE_CACHE_KEY);
        return cached ? JSON.parse(cached) : null;
    } catch (e) {
        console.error('[Auth] Failed to load cached profile:', e);
        return null;
    }
};

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

            // Load from cache first for immediate UI update
            if (!profile) {
                const cached = await getCachedProfile();
                if (cached) {
                    console.log('[Auth] Loaded profile from cache (Early)');
                    setProfile(cached);
                    setTier(cached.tier || 'free');
                    // Optimization: If we have a cache, we can unblock the UI immediately
                    setLoading(false);
                }
            }

            // Apple-grade resilience: 30s timeout + Retry Strategy
            const MAX_RETRIES = 2;
            let lastError = null;
            let data = null;

            for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
                try {
                    if (attempt > 0) console.log(`[Auth] Retry attempt ${attempt}...`);

                    const fetchPromise = supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', actingUser.id)
                        .single();

                    const timeoutPromise = new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('Profile fetch timeout')), 30000)
                    );

                    const result = await Promise.race([fetchPromise, timeoutPromise]) as any;
                    if (result.error) throw result.error;
                    data = result.data;
                    break; // Success!
                } catch (err: any) {
                    lastError = err;
                    console.warn(`[Auth] Attempt ${attempt} failed:`, err.message);
                    if (attempt < MAX_RETRIES) {
                        const backoff = Math.pow(2, attempt) * 1000;
                        await new Promise(resolve => setTimeout(resolve, backoff));
                    }
                }
            }

            if (data) {
                console.log('[Auth] Profile refreshed successfully');

                // ADMIN OVERRIDE: Check if user should be admin based on email
                const isAdmin = ADMIN_EMAILS.includes(actingUser.email || '');
                const resolvedTier = isAdmin ? 'admin' : (data.tier as any || 'free');

                // Sync email or tier if missing/incorrect (for discovery and access)
                const updates: any = {};
                if (!data.email && actingUser.email) updates.email = actingUser.email;
                if (isAdmin && data.tier !== 'admin') updates.tier = 'admin';

                if (Object.keys(updates).length > 0) {
                    supabase.from('profiles').update(updates).eq('id', actingUser.id).then();
                    data.tier = resolvedTier;
                    if (updates.email) data.email = actingUser.email;
                }

                setProfile(data);
                setUser(actingUser);
                setTier(resolvedTier);
                await cacheProfileLocally(data);
            } else {
                console.log('[Auth] Profile fetch failed after retries, attempting JIT creation or fallback');

                // If profiles don't exist yet, we try to create (JIT)
                if (lastError?.code === 'PGRST116' || !lastError) { // Record not found
                    const { data: newProfile, error: insertError } = await supabase
                        .from('profiles')
                        .insert({
                            id: actingUser.id,
                            display_name: actingUser.user_metadata?.display_name || actingUser.email?.split('@')[0],
                            email: actingUser.email,
                            tier: ADMIN_EMAILS.includes(actingUser.email || '') ? 'admin' : 'free'
                        })
                        .select()
                        .single();

                    if (!insertError && newProfile) {
                        console.log('[Auth] JIT Profile created successfully');
                        setProfile(newProfile);
                        setTier('free');
                        await cacheProfileLocally(newProfile);
                    }
                }

                // If still no profile, fallback to cache or default
                if (!profile) {
                    const cachedFallback = await getCachedProfile();
                    if (cachedFallback) {
                        setProfile(cachedFallback);
                        setTier(cachedFallback.tier || 'free');
                    } else {
                        setTier('free');
                        setProfile({ tier: 'free' } as Profile);
                    }
                }
            }
        } catch (e: any) {
            console.error('[Auth] Critical failure in refreshProfile:', e.message);
            // If we timed out or failed, ensure we at least use the cache
            if (!profile) {
                const cachedFallback = await getCachedProfile();
                if (cachedFallback) {
                    console.log('[Auth] Falling back to cached profile after error');
                    setProfile(cachedFallback);
                    setTier(cachedFallback.tier || 'free');
                } else {
                    setTier('free');
                }
            }
        }
    };

    const signOut = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) console.error('Error signing out:', error);
        await AsyncStorage.removeItem(PROFILE_CACHE_KEY);
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
                        // Optimistic: load cache before starting network refresh
                        const cached = await getCachedProfile();
                        if (cached) {
                            setProfile(cached);
                            setTier(cached.tier || 'free');
                            // If we have a cache, we can unblock the UI immediately
                            setLoading(false);
                            // Background refresh (won't block splash)
                            refreshProfile(currentUser);
                        } else {
                            // No cache: must wait for initial fetch to avoid empty UI
                            await refreshProfile(currentUser);
                        }
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
                        // Only show full loader if we don't have a cached profile matching this user
                        const cached = await getCachedProfile();
                        if (!cached) setLoading(true);

                        await refreshProfile(currentUser);
                    } else if (_event === 'USER_UPDATED') {
                        await refreshProfile(currentUser);
                    } else if (_event === 'SIGNED_OUT') {
                        setProfile(null);
                        setTier('free');
                        await AsyncStorage.removeItem(PROFILE_CACHE_KEY);
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
        setProfile(prev => {
            const updated = { ...prev, ...newProfile };
            cacheProfileLocally(updated); // Sync cache immediately
            return updated;
        });
        if (newProfile.tier) setTier(newProfile.tier);
    };

    const updateProfileInDB = async (updates: Partial<Profile>) => {
        if (!user?.id) return;
        try {
            const { data, error } = await supabase
                .from('profiles')
                .update(updates)
                .eq('id', user.id)
                .select()
                .single();

            if (error) throw error;
            if (data) {
                updateProfileLocally(data);
            }
        } catch (e) {
            console.error('[Auth] Failed to update profile in DB:', e);
            throw e;
        }
    };

    return (
        <AuthContext.Provider value={{ user, session, loading, tier, profile, signOut, refreshProfile, updateProfileLocally, updateProfileInDB }}>
            {children}
        </AuthContext.Provider>
    );
};
