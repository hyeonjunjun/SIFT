
import * as React from 'react';
import { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, TextInput, Image, ScrollView, Alert } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { CaretLeft, Camera, Plus, X } from 'phosphor-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Typography } from '../../components/design-system/Typography';
import { COLORS, SPACING, RADIUS, Theme } from '../../lib/theme';
import ScreenWrapper from '../../components/ScreenWrapper';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';

export default function IdentityScreen() {
    const { user, profile, refreshProfile, updateProfileLocally } = useAuth();
    const router = useRouter();
    const [displayName, setDisplayName] = useState(profile?.display_name || user?.user_metadata?.display_name || user?.email?.split('@')[0] || '');
    const [username, setUsername] = useState(profile?.username || user?.user_metadata?.username || user?.email?.split('@')[0] || '');
    const [bio, setBio] = useState(profile?.bio || user?.user_metadata?.bio || '');
    const [interests, setInterests] = useState<string[]>(profile?.interests || user?.user_metadata?.interests || []);
    const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || user?.user_metadata?.avatar_url || '');
    const [loading, setLoading] = useState(false);
    const [newInterest, setNewInterest] = useState('');

    const INTERESTS_SUGGESTIONS = ["AI", "Cooking", "Design", "Nature", "Business", "Tech"];

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 1,
        });

        if (!result.canceled && result.assets[0]) {
            uploadAvatar(result.assets[0].uri);
        }
    };

    const uploadAvatar = async (uri: string) => {
        setLoading(true);
        try {
            const manipulated = await ImageManipulator.manipulateAsync(
                uri,
                [{ resize: { width: 400, height: 400 } }],
                { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
            );

            const fileExt = 'jpg';
            const fileName = `${user?.id}/avatar_${Date.now()}.${fileExt}`;

            const formData = new FormData();
            formData.append('file', {
                uri: manipulated.uri,
                name: fileName,
                type: 'image/jpeg',
            } as any);

            const { data, error } = await supabase.storage
                .from('avatars')
                .upload(fileName, formData, {
                    contentType: 'image/jpeg',
                    upsert: true
                });

            if (error) throw error;

            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(fileName);

            setAvatarUrl(publicUrl);
            Alert.alert('Success', 'Avatar uploaded! Save changes to finalize.');
        } catch (error: any) {
            Alert.alert('Upload Failed', error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            const { error: authError } = await supabase.auth.updateUser({
                data: {
                    display_name: displayName,
                    username: username,
                    bio: bio,
                    interests: interests,
                    avatar_url: avatarUrl
                }
            });
            if (authError) throw authError;

            // Dual write to profiles table
            const { error: profileError } = await supabase
                .from('profiles')
                .update({
                    display_name: displayName,
                    username: username,
                    bio: bio,
                    interests: interests,
                    avatar_url: avatarUrl
                })
                .eq('id', user?.id);

            if (profileError) throw profileError;

            updateProfileLocally({
                display_name: displayName,
                username: username,
                bio: bio,
                interests: interests,
                avatar_url: avatarUrl
            });

            await refreshProfile();
            Alert.alert('Success', 'Profile updated successfully.');
            router.back();
        } catch (error: any) {
            Alert.alert('Update Failed', error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScreenWrapper edges={['top']}>
            <Stack.Screen options={{ headerShown: false }} />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <CaretLeft size={28} color={COLORS.ink} />
                </TouchableOpacity>
                <Typography variant="h3">Identity</Typography>
                <View style={{ width: 28 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.avatarContainer}>
                    <TouchableOpacity onPress={pickImage} style={styles.avatarCircle}>
                        {avatarUrl ? (
                            <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
                        ) : (
                            <Typography variant="h1" style={{ fontSize: 40, color: COLORS.stone }}>
                                {(displayName?.[0] || user?.email?.[0] || 'U').toUpperCase()}
                            </Typography>
                        )}
                        <View style={styles.editBadge}>
                            <Camera size={16} color={COLORS.paper} weight="bold" />
                        </View>
                    </TouchableOpacity>
                </View>

                <View style={styles.inputGroup}>
                    <Typography variant="label" style={styles.label}>DISPLAY NAME</Typography>
                    <TextInput
                        style={styles.input}
                        value={displayName}
                        onChangeText={setDisplayName}
                        placeholder="Your name"
                        placeholderTextColor={COLORS.stone}
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Typography variant="label" style={styles.label}>USERNAME</Typography>
                    <TextInput
                        style={styles.input}
                        value={username}
                        onChangeText={setUsername}
                        placeholder="Handle"
                        placeholderTextColor={COLORS.stone}
                        autoCapitalize="none"
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Typography variant="label" style={styles.label}>BIO</Typography>
                    <TextInput
                        style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
                        value={bio}
                        onChangeText={setBio}
                        placeholder="Tell us about yourself..."
                        placeholderTextColor={COLORS.stone}
                        multiline
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Typography variant="label" style={styles.label}>PERSONAL INTERESTS</Typography>
                    <View style={styles.interestsWrapper}>
                        <View style={styles.tagList}>
                            {interests.map(interest => (
                                <View key={interest} style={styles.tagPillActive}>
                                    <Typography variant="caption" style={{ color: COLORS.paper }}>{interest}</Typography>
                                    <TouchableOpacity onPress={() => setInterests(interests.filter(i => i !== interest))}>
                                        <X size={14} color={COLORS.paper} style={{ marginLeft: 4 }} />
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </View>
                        <View style={styles.customTagInput}>
                            <TextInput
                                style={styles.smallInput}
                                placeholder="Add interest..."
                                value={newInterest}
                                onChangeText={setNewInterest}
                                onSubmitEditing={() => {
                                    if (newInterest.trim() && !interests.includes(newInterest.trim())) {
                                        setInterests([...interests, newInterest.trim()]);
                                        setNewInterest('');
                                    }
                                }}
                            />
                            <TouchableOpacity
                                onPress={() => {
                                    if (newInterest.trim() && !interests.includes(newInterest.trim())) {
                                        setInterests([...interests, newInterest.trim()]);
                                        setNewInterest('');
                                    }
                                }}
                            >
                                <Plus size={20} color={COLORS.ink} />
                            </TouchableOpacity>
                        </View>
                        <View style={styles.tagList}>
                            {INTERESTS_SUGGESTIONS.filter(i => !interests.includes(i)).map(sugg => (
                                <TouchableOpacity
                                    key={sugg}
                                    style={styles.tagPill}
                                    onPress={() => setInterests([...interests, sugg])}
                                >
                                    <Typography variant="caption" color={COLORS.stone}>{sugg}</Typography>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                </View>

                <View style={[styles.inputGroup, { opacity: 0.5 }]}>
                    <Typography variant="label" style={styles.label}>EMAIL (READ-ONLY)</Typography>
                    <TextInput
                        style={[styles.input, { backgroundColor: '#F0F0F0' }]}
                        value={user?.email}
                        editable={false}
                    />
                </View>
            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity
                    style={[styles.saveButton, loading && { opacity: 0.7 }]}
                    onPress={handleSave}
                    disabled={loading}
                >
                    <Typography variant="label" style={{ color: COLORS.paper }}>
                        {loading ? 'SAVING...' : 'SAVE CHANGES'}
                    </Typography>
                </TouchableOpacity>
            </View>
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
    },
    backButton: {
        padding: 4,
    },
    content: {
        padding: 20,
    },
    avatarContainer: {
        alignItems: 'center',
        marginVertical: 40,
    },
    avatarCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: COLORS.paper,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        ...Theme.shadows.soft,
    },
    avatarImage: {
        width: '100%',
        height: '100%',
    },
    editBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: COLORS.ink,
        padding: 8,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: COLORS.paper,
    },
    inputGroup: {
        marginBottom: 24,
    },
    label: {
        marginBottom: 8,
        color: COLORS.stone,
    },
    input: {
        backgroundColor: COLORS.paper,
        borderRadius: RADIUS.m,
        padding: 16,
        fontSize: 16,
        color: COLORS.ink,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: COLORS.separator,
    },
    footer: {
        padding: 20,
        paddingBottom: 40,
    },
    saveButton: {
        backgroundColor: COLORS.ink,
        height: 56,
        borderRadius: RADIUS.pill,
        justifyContent: 'center',
        alignItems: 'center',
        ...Theme.shadows.soft,
    },
    interestsWrapper: {
        marginTop: 8,
    },
    tagList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 12,
    },
    tagPill: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        backgroundColor: COLORS.canvas,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: COLORS.separator,
    },
    tagPillActive: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        backgroundColor: COLORS.ink,
    },
    customTagInput: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        gap: 8,
    },
    smallInput: {
        flex: 1,
        height: 40,
        backgroundColor: COLORS.paper,
        borderRadius: RADIUS.m,
        paddingHorizontal: 16,
        fontSize: 14,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: COLORS.separator,
    }
});
