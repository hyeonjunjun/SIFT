import React from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { CaretLeft, Star, PushPin, Heart, Check, Bookmark, Lightning } from 'phosphor-react-native';
import { useTheme } from '../../context/ThemeContext';
import { Typography } from '../../components/design-system/Typography';
import { COLORS, SPACING, RADIUS } from '../../lib/theme';
import ScreenWrapper from '../../components/ScreenWrapper';
import { usePersonalization, PinIconType } from '../../context/PersonalizationContext';
import * as Haptics from 'expo-haptics';

export default function PersonalizationScreen() {
    const { colors, isDark } = useTheme();
    const router = useRouter();
    const { pinIcon, setPinIcon } = usePersonalization();

    const options: { id: PinIconType; label: string; icon: any }[] = [
        { id: 'star', label: 'Star', icon: Star },
        { id: 'pin', label: 'Push Pin', icon: PushPin },
        { id: 'heart', label: 'Heart', icon: Heart },
        { id: 'bookmark', label: 'Bookmark', icon: Bookmark },
        { id: 'lightning', label: 'Lightning', icon: Lightning },
    ];

    const handleSelect = (id: PinIconType) => {
        setPinIcon(id);
        Haptics.selectionAsync();
    };

    return (
        <ScreenWrapper edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <CaretLeft size={28} color={colors.ink} />
                </TouchableOpacity>
                <Typography variant="h3" style={styles.title}>Personalization</Typography>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.sectionHeader}>
                    <Typography variant="label">PIN ICON STYLE</Typography>
                </View>

                <View style={[styles.optionContainer, { backgroundColor: colors.paper, borderColor: colors.separator }]}>
                    {options.map((option, index) => {
                        const Icon = option.icon;
                        const isSelected = pinIcon === option.id;

                        return (
                            <TouchableOpacity
                                key={option.id}
                                style={[
                                    styles.optionRow,
                                    { borderBottomWidth: index === options.length - 1 ? 0 : StyleSheet.hairlineWidth, borderColor: colors.separator }
                                ]}
                                onPress={() => handleSelect(option.id)}
                            >
                                <View style={styles.optionLeft}>
                                    <Icon
                                        size={24}
                                        color={isSelected ? colors.ink : colors.stone}
                                        weight={isSelected ? 'fill' : 'regular'}
                                    />
                                    <Typography variant="body" style={styles.optionLabel}>
                                        {option.label}
                                    </Typography>
                                </View>
                                {isSelected && <Check size={20} color={colors.ink} weight="bold" />}
                            </TouchableOpacity>
                        );
                    })}
                </View>

                <View style={styles.previewContainer}>
                    <Typography variant="caption" color="stone" style={{ textAlign: 'center', marginTop: 16 }}>
                        This icon will appear on pinned gems in your library and collections.
                    </Typography>
                </View>
            </ScrollView>
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    backButton: {
        marginRight: 16,
    },
    title: {
        fontSize: 20,
        fontFamily: 'PlayfairDisplay_600SemiBold',
    },
    content: {
        padding: 20,
    },
    sectionHeader: {
        marginBottom: 12,
        marginLeft: 4,
    },
    optionContainer: {
        borderRadius: RADIUS.m,
        overflow: 'hidden',
        borderWidth: StyleSheet.hairlineWidth,
    },
    optionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
    },
    optionLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    optionLabel: {
        fontSize: 16,
    },
    previewContainer: {
        padding: 20,
        alignItems: 'center',
    }
});
