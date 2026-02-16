
import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { useSubscription } from './useSubscription';
import { API_URL } from '../lib/config';
import { Alert } from 'react-native';

export const useImageSifter = (onSuccess?: () => void) => {
    const { user } = useAuth();
    const { maxImagesPerSift, isOverLimit } = useSubscription();
    const [loading, setLoading] = useState(false);

    const pickAndSift = async () => {
        if (!user) {
            Alert.alert('Error', 'You must be signed in to sift images.');
            return;
        }

        if (isOverLimit) {
            // We'll let the UI handle the modal, but prevent proceeding here
            return;
        }

        try {
            // 1. Pick Image (Multi-select)
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsMultipleSelection: true,
                selectionLimit: maxImagesPerSift,
                quality: 1,
            });

            if (result.canceled || !result.assets.length) return;

            setLoading(true);

            // Process each selected image
            const processImage = async (asset: ImagePicker.ImagePickerAsset) => {
                // 2. Compress & Resize
                const manipulated = await ImageManipulator.manipulateAsync(
                    asset.uri,
                    [{ resize: { width: 1080 } }],
                    { compress: 0.65, format: ImageManipulator.SaveFormat.JPEG, base64: true }
                );

                if (!manipulated.base64) throw new Error("Failed to generate image base64");

                // 3. Create consistent URL
                const scanUrl = 'image://scan-' + Date.now() + '-' + Math.random().toString(36).substring(7);

                // 4. Create optimistic record in Supabase
                const { data: pendingData, error: pendingError } = await supabase
                    .from('pages')
                    .insert({
                        user_id: user.id,
                        url: scanUrl,
                        title: 'Sifting Image...',
                        summary: 'Extracting data with AI...',
                        tags: ['Lifestyle'],
                        metadata: { status: 'pending', source: 'Visual Scan' }
                    })
                    .select()
                    .single();

                if (pendingError) throw pendingError;

                // 5. Call Unified AI Sift API with base64
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

            // Run all uploads concurrently
            await Promise.all(result.assets.map(asset => processImage(asset)));

            if (onSuccess) onSuccess();

        } catch (error: any) {
            console.error('[VisualSift] Error:', error);
            Alert.alert('Scan Failed', error.message || 'Something went wrong while sifting images.');
        } finally {
            setLoading(false);
        }
    };

    return { pickAndSift, loading };
};
