import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { WifiSlash } from 'phosphor-react-native';
import { Typography } from './design-system/Typography';
import { COLORS, RADIUS } from '../lib/theme';

export function NetworkBanner() {
    const [isOffline, setIsOffline] = useState(false);

    useEffect(() => {
        const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
            const offline = !state.isConnected || !state.isInternetReachable;
            setIsOffline(!!offline);
        });
        return () => unsubscribe();
    }, []);

    if (!isOffline) return null;

    return (
        <Animated.View
            entering={FadeInUp.duration(300)}
            exiting={FadeOutUp.duration(300)}
            style={styles.banner}
        >
            <WifiSlash size={16} color="#FFFFFF" weight="bold" />
            <Typography variant="caption" style={styles.text}>
                You're offline — showing cached data
            </Typography>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    banner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 8,
        paddingHorizontal: 16,
        backgroundColor: COLORS.stone,
        marginHorizontal: 20,
        marginTop: 4,
        borderRadius: RADIUS.pill,
    },
    text: {
        color: '#FFFFFF',
        fontWeight: '600',
    },
});
