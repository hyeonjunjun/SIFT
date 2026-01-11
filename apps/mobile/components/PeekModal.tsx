import React from 'react';
import { View, Modal, TouchableWithoutFeedback, Image, Dimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, { FadeIn, ZoomIn, Easing } from 'react-native-reanimated';
import { Typography } from './design-system/Typography';
import { Theme } from '../lib/theme';
import { ArrowUpRight } from 'lucide-react-native';

interface PeekModalProps {
    visible: boolean;
    onClose: () => void;
    onOpen: () => void;
    item: {
        title: string;
        url: string;
        imageUrl?: string;
    } | null;
}

const { width } = Dimensions.get('window');

export function PeekModal({ visible, onClose, onOpen, item }: PeekModalProps) {
    if (!item) return null;

    return (
        <Modal
            transparent
            visible={visible}
            animationType="fade"
            onRequestClose={onClose}
        >
            <TouchableWithoutFeedback onPress={onClose}>
                <View className="flex-1 justify-center items-center">
                    <BlurView intensity={70} tint="dark" className="absolute inset-0" />

                    <Animated.View
                        entering={ZoomIn.duration(250).easing(Easing.inOut(Easing.ease))}
                        className="bg-white rounded-2xl overflow-hidden shadow-2xl"
                        style={{ width: width * 0.85, maxHeight: width * 1.2 }}
                    >
                        {/* Preview Image */}
                        <View className="h-48 bg-gray-200 w-full relative">
                            {item.imageUrl ? (
                                <Image
                                    source={{ uri: item.imageUrl }}
                                    className="w-full h-full"
                                    resizeMode="cover"
                                />
                            ) : (
                                <View className="flex-1 items-center justify-center bg-gray-100">
                                    <Typography variant="h3" className="text-gray-300">No Preview</Typography>
                                </View>
                            )}
                        </View>

                        {/* Content */}
                        <View className="p-6">
                            <Typography variant="h2" className="text-ink mb-2">{item.title}</Typography>
                            <Typography variant="caption" className="text-ink-secondary mb-6" numberOfLines={1}>{item.url}</Typography>

                            <TouchableWithoutFeedback onPress={() => {
                                onOpen();
                                onClose();
                            }}>
                                <View className="bg-ink py-3 rounded-xl flex-row justify-center items-center active:opacity-90">
                                    <Typography variant="body" className="text-white font-bold mr-2">Open Sift</Typography>
                                    <ArrowUpRight size={18} color="white" />
                                </View>
                            </TouchableWithoutFeedback>
                        </View>
                    </Animated.View>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
}
