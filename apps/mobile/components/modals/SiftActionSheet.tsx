import React, { useState } from 'react';
import { ActionSheet, ActionSheetOption } from './ActionSheet';
import ShareSiftModal from './ShareSiftModal';
import { PushPin, Trash, Link, PaperPlaneTilt, Tag, Folder } from 'phosphor-react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { Alert } from 'react-native';

interface SiftActionSheetProps {
    visible: boolean;
    onClose: () => void;
    sift: {
        id: string;
        title: string;
        url: string;
        is_pinned?: boolean;
        tags?: string[];
    } | null;
    onPin?: (id: string) => void;
    onArchive?: (id: string) => void;
    onEditTags?: (id: string, tags: string[]) => void;
    additionalOptions?: ActionSheetOption[];
}

export const SiftActionSheet = ({
    visible,
    onClose,
    sift,
    onPin,
    onArchive,
    onEditTags,
    additionalOptions = []
}: SiftActionSheetProps) => {
    const [shareModalVisible, setShareModalVisible] = useState(false);

    if (!sift) return null;

    const handleCopyLink = async () => {
        await Clipboard.setStringAsync(sift.url);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onClose();
    };

    const options: ActionSheetOption[] = [
        {
            label: sift.is_pinned ? 'Unpin Gem' : 'Pin Gem',
            icon: PushPin,
            onPress: () => onPin?.(sift.id),
        },
        {
            label: 'Send to Friend',
            icon: PaperPlaneTilt,
            onPress: () => {
                onClose();
                // Delay to allow ActionSheet to close
                setTimeout(() => setShareModalVisible(true), 350);
            },
        },
        {
            label: 'Copy URL',
            icon: Link,
            onPress: handleCopyLink,
        },
        {
            label: 'Edit Tags',
            icon: Tag,
            onPress: () => onEditTags?.(sift.id, sift.tags || []),
        },
        ...additionalOptions,
        {
            label: 'Archive Gem',
            icon: Trash,
            isDestructive: true,
            onPress: () => {
                Alert.alert(
                    "Archive Gem?",
                    "It will be moved to your archive.",
                    [
                        { text: "Cancel", style: "cancel" },
                        {
                            text: "Archive",
                            style: "destructive",
                            onPress: () => onArchive?.(sift.id)
                        }
                    ]
                );
            },
        },
        {
            label: 'Cancel',
            onPress: onClose,
            isCancel: true,
        }
    ];

    return (
        <>
            <ActionSheet
                visible={visible}
                onClose={onClose}
                title={sift.title}
                options={options}
            />

            <ShareSiftModal
                visible={shareModalVisible}
                onClose={() => setShareModalVisible(false)}
                siftId={sift.id}
                siftTitle={sift.title}
            />
        </>
    );
};
