import React, { useEffect } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../lib/theme';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';

interface Props {
    children: React.ReactNode;
    style?: ViewStyle;
    contentStyle?: ViewStyle;
    edges?: ('top' | 'bottom' | 'left' | 'right')[];
}

export default function ScreenWrapper({ children, style, contentStyle, edges = ['top'] }: Props) {
    const insets = useSafeAreaInsets();
    const navigation = useNavigation();

    useEffect(() => {
        const unsubscribe = navigation.addListener('beforeRemove', () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        });
        return unsubscribe;
    }, [navigation]);

    const safeStyle = {
        paddingTop: edges.includes('top') ? insets.top : 0,
        paddingBottom: edges.includes('bottom') ? insets.bottom : 0,
        paddingLeft: edges.includes('left') ? insets.left : 0,
        paddingRight: edges.includes('right') ? insets.right : 0,
    };

    return (
        <View style={[styles.container, style]}>
            <View style={[styles.content, safeStyle, contentStyle]}>
                {children}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.canvas,
    },
    content: {
        flex: 1,
    },
});
