import React from 'react';
import { View, ScrollView, TouchableOpacity, SafeAreaView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Typography } from '../../components/design-system/Typography';
import { Theme } from '../../lib/theme';
import { ChefHat, Sparkles, Shirt, Zap, HeartPulse, MoreHorizontal } from 'lucide-react-native';

const CATEGORIES = [
    { id: 'Food', label: 'Food', icon: ChefHat, color: '#FF9500' },
    { id: 'Skincare', label: 'Skincare', icon: Sparkles, color: '#FF2D55' },
    { id: 'Aesthetics', label: 'Aesthetics', icon: Shirt, color: '#5856D6' },
    { id: 'Intel', label: 'Intel', icon: Zap, color: '#FFCC00' },
    { id: 'Wellness', label: 'Wellness', icon: HeartPulse, color: '#34C759' },
    { id: 'Random', label: 'Other', icon: MoreHorizontal, color: '#8E8E93' },
];

export default function LibraryIndex() {
    const router = useRouter();

    return (
        <SafeAreaView className="flex-1 bg-canvas">
            <ScrollView contentContainerClassName="p-5">
                <View className="mb-8">
                    <Typography variant="h1" className="text-[34px] font-bold tracking-tight text-ink mb-2">
                        Library
                    </Typography>
                    <Typography variant="body" className="text-ink-secondary/70">
                        Your personal knowledge graph, organized by vertical.
                    </Typography>
                </View>

                <View className="flex-row flex-wrap justify-between">
                    {CATEGORIES.map((cat) => (
                        <TouchableOpacity
                            key={cat.id}
                            onPress={() => router.push(`/library/${cat.id}`)}
                            className="bg-white rounded-2xl p-5 mb-5 border border-border/50"
                            style={[styles.card, { width: '47%' }]}
                        >
                            <View
                                className="w-12 h-12 rounded-full items-center justify-center mb-4"
                                style={{ backgroundColor: cat.color + '15' }}
                            >
                                <cat.icon size={24} color={cat.color} strokeWidth={2.5} />
                            </View>
                            <Typography variant="h3" className="text-ink font-bold mb-1">
                                {cat.label}
                            </Typography>
                            <Typography variant="caption" className="text-ink-secondary font-medium uppercase tracking-wider">
                                Explore
                            </Typography>
                        </TouchableOpacity>
                    ))}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    card: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    }
});
