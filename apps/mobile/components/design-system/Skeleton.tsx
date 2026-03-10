import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, ViewStyle } from 'react-native';
import { COLORS, RADIUS } from '../../lib/theme';

interface SkeletonProps {
    width?: number | string;
    height?: number | string;
    style?: ViewStyle;
    borderRadius?: number;
}

export function Skeleton({ width, height, style, borderRadius = RADIUS.s }: SkeletonProps) {
    const opacity = useRef(new Animated.Value(0.3)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(opacity, {
                    toValue: 0.7,
                    duration: 800,
                    useNativeDriver: true,
                }),
                Animated.timing(opacity, {
                    toValue: 0.3,
                    duration: 800,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    }, [opacity]);

    return (
        <Animated.View
            style={[
                styles.skeleton,
                {
                    width: width as any,
                    height: height as any,
                    borderRadius,
                    opacity,
                },
                style,
            ]}
        />
    );
}

const styles = StyleSheet.create({
    skeleton: {
        backgroundColor: COLORS.border,
    },
});
