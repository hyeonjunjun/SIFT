import React, { useEffect } from 'react';
import { View, StyleSheet, ViewStyle, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../lib/theme';
import { useTheme } from '../context/ThemeContext';
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
    const { colors } = useTheme();

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

    const isWeb = Platform.OS === 'web';

    return (
        <View style={[
            styles.container,
            { backgroundColor: colors.canvas },
            isWeb && { maxWidth: 800, alignSelf: 'center', width: '100%' },
            style
        ]}>
            <View style={[styles.content, safeStyle, contentStyle]}>
                {children}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
    },
});
