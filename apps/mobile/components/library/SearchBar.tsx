import React from 'react';
import { View, TextInput, TouchableOpacity } from 'react-native';
import { Search, X } from 'lucide-react-native';
import { Theme } from '../../lib/theme';

interface SearchBarProps {
    value: string;
    onChangeText: (text: string) => void;
    onClear: () => void;
    placeholder?: string;
}

export function SearchBar({ value, onChangeText, onClear, placeholder = "Search library..." }: SearchBarProps) {
    return (
        <View
            className="flex-row items-center bg-white h-[50px] rounded-full px-4 border border-border/50 shadow-sm"
            style={Theme.shadows.card}
        >
            <Search size={20} color={Theme.colors.text.tertiary} />

            <TextInput
                className="flex-1 text-ink font-sans text-[17px] ml-3"
                placeholder={placeholder}
                placeholderTextColor={Theme.colors.text.tertiary}
                value={value}
                onChangeText={onChangeText}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
            />

            {value.length > 0 && (
                <TouchableOpacity
                    onPress={onClear}
                    className="bg-gray-200 p-1 rounded-full"
                >
                    <X size={14} color={Theme.colors.text.secondary} />
                </TouchableOpacity>
            )}
        </View>
    );
}
