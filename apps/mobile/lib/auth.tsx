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
            iosClientId: '240781979317-1lblejma2h683dpjr3cmd9gdcosb98h2.apps.googleusercontent.com',
            webClientId: '240781979317-th80om2srfbroe5kv9e6tfd86tglroqc.apps.googleusercontent.com',
            offlineAccess: true,
        });
    } catch (e) {
        console.warn('Google Sign-In initialization failed:', e);
    }
} else {
    console.log('Google Sign-In is not available in this environment');
}

type AuthContextType = {
    user: User | null;
    session: Session | null;
    loading: boolean;
    tier: 'free' | 'plus' | 'unlimited' | 'admin';
    signOut: () => Promise<void>;
    refreshTier: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
    user: null,
    session: null,
    loading: true,
    tier: 'free',
    signOut: async () => { },
    refreshTier: async () => { },
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [tier, setTier] = useState<'free' | 'plus' | 'unlimited' | 'admin'>('free');
    const [loading, setLoading] = useState(true);

    const refreshTier = async () => {
        if (!user?.id) return;
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('tier')
                .eq('id', user.id)
                .single();

            if (!error && data) {
                setTier(data.tier as any);
            } else {
                setTier('free');
            }
        } catch (e) {
            setTier('free');
        }
    };

    const signOut = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) console.error('Error signing out:', error);
        setTier('free');
    };

    useEffect(() => {
        const fetchSession = async () => {
            try {
                const { data: { session }, error } = await supabase.auth.getSession();
                if (error) throw error;

                setSession(session);
                const currentUser = session?.user ?? null;
                setUser(currentUser);

                if (currentUser) {
                    // Fetch tier manually once user is set
                    const { data, error: tierError } = await supabase
                        .from('profiles')
                        .select('tier')
                        .eq('id', currentUser.id)
                        .single();
                    if (!tierError && data) setTier(data.tier as any);
                }
            } catch (error) {
                console.error('Error fetching session:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            console.log('Auth state change:', _event);
            setSession(session);
            const currentUser = session?.user ?? null;
            setUser(currentUser);

            if (currentUser) {
                const { data, error: tierError } = await supabase
                    .from('profiles')
                    .select('tier')
                    .eq('id', currentUser.id)
                    .single();
                if (!tierError && data) setTier(data.tier as any);
            } else {
                setTier('free');
            }
            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    return (
        <AuthContext.Provider value={{ user, session, loading, tier, signOut, refreshTier }}>
            {children}
        </AuthContext.Provider>
    );
};
