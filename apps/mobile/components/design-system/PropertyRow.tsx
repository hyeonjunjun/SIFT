import React from 'react';
import { View, Text } from 'react-native';
import { IconProps } from 'phosphor-react-native';

interface PropertyRowProps {
    icon?: React.ComponentType<IconProps>;
    label: string;
    value: string | React.ReactNode;
}

/**
 * The PropertyRow
 * A single line of metadata (Icon + Label + Value Pill).
 */
export const PropertyRow: React.FC<PropertyRowProps> = ({ icon: Icon, label, value }) => {
    return (
        <View className="flex-row items-center py-1.5 border-b border-border/10">
            <View className="flex-row items-center w-32 mr-2">
                {Icon && (
                    <View className="mr-2">
                        <Icon size={14} color="#9B9A97" weight="bold" />
                    </View>
                )}
                <Text className="text-ink-subtle text-sm font-sans truncate">{label}</Text>
            </View>

            <View className="flex-1 flex-row items-center">
                {typeof value === 'string' ? (
                    <View className="bg-canvas-subtle px-2 py-0.5 rounded border border-border">
                        <Text className="text-ink text-sm font-mono" numberOfLines={1}>
                            {value}
                        </Text>
                    </View>
                ) : (
                    value
                )}
            </View>
        </View>
    );
};
