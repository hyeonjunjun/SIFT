
import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { API_URL } from '../lib/config';
import { Alert } from 'react-native';

export const useImageSifter = (onSuccess?: () => void) => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);

    const pickAndSift = async () => {
        if (!user) {
            Alert.alert('Error', 'You must be signed in to sift images.');
            return;
        }

        try {
            // 1. Pick Image
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                quality: 1,
            });

            if (result.canceled || !result.assets[0]) return;

            setLoading(true);
            const asset = result.assets[0];

            // 2. Compress & Resize
            const manipulated = await ImageManipulator.manipulateAsync(
                asset.uri,
                [{ resize: { width: 1080 } }],
                { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
            );

            // 3. Upload to Supabase Storage
            const fileName = `${user.id}/${Date.now()}.jpg`;
            const fileUri = manipulated.uri;

            // Create form data for upload
            const formData = new FormData();
            formData.append('file', {
                uri: fileUri,
                name: fileName,
                type: 'image/jpeg',
            } as any);

            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('sifts')
                .upload(fileName, formData, {
                    contentType: 'image/jpeg',
                    upsert: true
                });

            if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

            // 4. Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('sifts')
                .getPublicUrl(fileName);

            // 5. Call AI Analysis API
            const response = await fetch(`${API_URL}/api/analyze-image`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ imageUrl: publicUrl })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'AI analysis failed');
            }

            const { data: aiData } = await response.json();

            // 6. Save to Database
            const { error: insertError } = await supabase
                .from('pages')
                .insert({
                    user_id: user.id,
                    url: publicUrl,
                    title: aiData.title,
                    summary: aiData.summary,
                    content: aiData.summary,
                    tags: aiData.tags || ['Lifestyle'],
                    metadata: {
                        image_url: publicUrl,
                        category: aiData.category,
                        source: 'Visual Scan',
                        scraped_at: new Date().toISOString(),
                        status: 'completed'
                    }
                });

            if (insertError) throw insertError;

            if (onSuccess) onSuccess();

        } catch (error: any) {
            console.error('[VisualSift] Error:', error);
            Alert.alert('Scan Failed', error.message || 'Something went wrong while sifting the image.');
        } finally {
            setLoading(false);
        }
    };

    return { pickAndSift, loading };
};
