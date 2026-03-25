
import { useState, useCallback, useEffect } from 'react';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { useSubscription } from './useSubscription';
import { API_URL } from '../lib/config';
import { Alert } from 'react-native';

export interface SelectedImage {
    uri: string;
    width: number;
    height: number;
    asset: ImagePicker.ImagePickerAsset;
}

export const useImageSifter = (onSuccess?: () => void) => {
    const { user } = useAuth();
    const { maxImagesPerSift, isOverLimit } = useSubscription();
    const [loading, setLoading] = useState(false);
    const [selectedImages, setSelectedImages] = useState<SelectedImage[]>([]);
    const [previewVisible, setPreviewVisible] = useState(false);

    // Pre-request permissions so gallery opens instantly
    useEffect(() => {
        ImagePicker.requestMediaLibraryPermissionsAsync();
    }, []);

    const pickImages = useCallback(async () => {
        if (!user) {
            Alert.alert('Error', 'You must be signed in to sift images.');
            return;
        }

        if (isOverLimit) return;

        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsMultipleSelection: true,
                selectionLimit: maxImagesPerSift,
                quality: 1,
            });

            if (result.canceled || !result.assets.length) return;

            const images: SelectedImage[] = result.assets.map(asset => ({
                uri: asset.uri,
                width: asset.width,
                height: asset.height,
                asset,
            }));

            setSelectedImages(images);
            setPreviewVisible(true);
        } catch (error: any) {
            Alert.alert('Error', 'Failed to open image picker.');
        }
    }, [user, isOverLimit, maxImagesPerSift]);

    const removeImage = useCallback((uri: string) => {
        setSelectedImages(prev => prev.filter(img => img.uri !== uri));
    }, []);

    const dismissPreview = useCallback(() => {
        setPreviewVisible(false);
        setSelectedImages([]);
    }, []);

    const confirmAndSift = useCallback(async () => {
        if (!user || selectedImages.length === 0) return;

        setPreviewVisible(false);
        setLoading(true);

        try {
            const processImage = async (image: SelectedImage) => {
                const manipulated = await ImageManipulator.manipulateAsync(
                    image.asset.uri,
                    [{ resize: { width: 1080 } }],
                    { compress: 0.65, format: ImageManipulator.SaveFormat.JPEG, base64: true }
                );

                if (!manipulated.base64) throw new Error("Failed to generate image base64");

                const scanUrl = 'image://scan-' + Date.now() + '-' + Math.random().toString(36).substring(7);

                const { data: pendingData, error: pendingError } = await supabase
                    .from('pages')
                    .insert({
                        user_id: user.id,
                        url: scanUrl,
                        title: 'Sifting Image...',
                        summary: 'Extracting data with AI...',
                        tags: ['Saved'],
                        metadata: { status: 'pending', source: 'Visual Scan' }
                    })
                    .select()
                    .single();

                if (pendingError) throw pendingError;

                const response = await fetch(`${API_URL}/api/sift`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        url: scanUrl,
                        user_id: user.id,
                        id: pendingData.id,
                        image_base64: manipulated.base64
                    })
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.message || 'Image sifting failed');
                }
            };

            const results = await Promise.allSettled(selectedImages.map(img => processImage(img)));

            const failures = results.filter(r => r.status === 'rejected');
            if (failures.length > 0 && failures.length < selectedImages.length) {
                Alert.alert('Partial Success', `${selectedImages.length - failures.length} of ${selectedImages.length} images sifted. ${failures.length} failed.`);
            } else if (failures.length === selectedImages.length) {
                throw new Error('All images failed to process.');
            }

            if (onSuccess) onSuccess();
        } catch (error: any) {
            console.error('[VisualSift] Error:', error);
            Alert.alert('Scan Failed', error.message || 'Something went wrong while sifting images.');
        } finally {
            setLoading(false);
            setSelectedImages([]);
        }
    }, [user, selectedImages, onSuccess]);

    // Legacy single-call API for backwards compat
    const pickAndSift = pickImages;

    return {
        pickAndSift,
        pickImages,
        selectedImages,
        previewVisible,
        removeImage,
        dismissPreview,
        confirmAndSift,
        loading,
    };
};
