import React from 'react';
import { Modal, View, StyleSheet, TouchableOpacity, FlatList, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { Typography } from '../design-system/Typography';
import { COLORS, SPACING, RADIUS, Theme } from '../../lib/theme';
import { X, XCircle } from 'phosphor-react-native';
import { useTheme } from '../../context/ThemeContext';
import type { SelectedImage } from '../../hooks/useImageSifter';

interface ImagePreviewModalProps {
    visible: boolean;
    images: SelectedImage[];
    onRemove: (uri: string) => void;
    onDismiss: () => void;
    onConfirm: () => void;
}

export const ImagePreviewModal = ({ visible, images, onRemove, onDismiss, onConfirm }: ImagePreviewModalProps) => {
    const { colors } = useTheme();
    const { width: screenWidth } = useWindowDimensions();
    const imageSize = (screenWidth - SPACING.xl * 2 - SPACING.m * 2 - SPACING.s) / 3;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onDismiss}
            statusBarTranslucent
        >
            <View style={styles.overlay}>
                <View style={[styles.content, { backgroundColor: colors.paper }]}>
                    <View style={styles.header}>
                        <Typography variant="h3" style={{ flex: 1 }}>
                            {images.length} {images.length === 1 ? 'image' : 'images'} selected
                        </Typography>
                        <TouchableOpacity onPress={onDismiss} hitSlop={8}>
                            <X size={22} color={colors.stone} />
                        </TouchableOpacity>
                    </View>

                    <Typography variant="caption" color="stone" style={styles.hint}>
                        Tap the X to remove an image before sifting.
                    </Typography>

                    <FlatList
                        data={images}
                        keyExtractor={(item) => item.uri}
                        numColumns={3}
                        contentContainerStyle={styles.grid}
                        columnWrapperStyle={{ gap: SPACING.s }}
                        renderItem={({ item }) => (
                            <View style={[styles.imageContainer, { width: imageSize, height: imageSize }]}>
                                <Image
                                    source={{ uri: item.uri }}
                                    style={styles.image}
                                    contentFit="cover"
                                    transition={200}
                                />
                                <TouchableOpacity
                                    style={styles.removeButton}
                                    onPress={() => onRemove(item.uri)}
                                    hitSlop={6}
                                >
                                    <XCircle size={22} color="#FFF" weight="fill" />
                                </TouchableOpacity>
                            </View>
                        )}
                    />

                    <View style={styles.footer}>
                        <TouchableOpacity onPress={onDismiss} style={styles.cancelButton}>
                            <Typography variant="label" color="stone">Cancel</Typography>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={onConfirm}
                            style={[styles.siftButton, images.length === 0 && { opacity: 0.4 }]}
                            disabled={images.length === 0}
                        >
                            <Typography variant="label" style={{ color: '#FFF' }}>
                                Sift {images.length > 0 ? images.length : ''} {images.length === 1 ? 'Image' : 'Images'}
                            </Typography>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-end',
    },
    content: {
        borderTopLeftRadius: RADIUS.xl,
        borderTopRightRadius: RADIUS.xl,
        padding: SPACING.xl,
        paddingBottom: SPACING.xxl,
        maxHeight: '80%',
        ...Theme.shadows.medium,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.xs,
    },
    hint: {
        marginBottom: SPACING.m,
    },
    grid: {
        gap: SPACING.s,
        paddingBottom: SPACING.m,
    },
    imageContainer: {
        borderRadius: RADIUS.s,
        overflow: 'hidden',
        position: 'relative',
    },
    image: {
        width: '100%',
        height: '100%',
    },
    removeButton: {
        position: 'absolute',
        top: 6,
        right: 6,
        backgroundColor: 'rgba(0,0,0,0.4)',
        borderRadius: 12,
    },
    footer: {
        flexDirection: 'row',
        gap: SPACING.m,
        paddingTop: SPACING.m,
    },
    cancelButton: {
        flex: 1,
        height: 48,
        borderRadius: RADIUS.m,
        backgroundColor: COLORS.subtle,
        justifyContent: 'center',
        alignItems: 'center',
    },
    siftButton: {
        flex: 2,
        height: 48,
        borderRadius: RADIUS.m,
        backgroundColor: COLORS.ink,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
