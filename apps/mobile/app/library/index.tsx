import React, { useState } from 'react';
import { View, TextInput, ScrollView, Image, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Typography } from '../../components/design-system/Typography';
import { Theme } from '../../lib/theme';
import { MagnifyingGlass, Sliders, ArrowUpRight } from 'phosphor-react-native';

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = (width - (Theme.spacing.l * 2) - 15) / 2; // Adjusted for 20px padding and 15px gap

// Dummy Data (In a real app, this would come from Supabase)
const SIFTED_ITEMS = [
    { id: '1', title: 'Aesop Room Spray', image: 'https://images.unsplash.com/photo-1585239923880-9dd98402a550?q=80&w=400', tag: 'Home' },
    { id: '2', title: 'Eames Chair', image: 'https://images.unsplash.com/photo-1592078615290-033ee584e267?q=80&w=400', tag: 'Furniture' },
    { id: '3', title: 'Minimalist Setup', image: 'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?q=80&w=400', tag: 'Tech' },
    { id: '4', title: 'Ceramic Vase', image: 'https://images.unsplash.com/photo-1612196808214-b7e239e5f6b7?q=80&w=400', tag: 'Decor' },
];

export default function LibraryScreen() {
    const [search, setSearch] = useState('');

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* 1. HEADER */}
            <View style={styles.header}>
                <Typography variant="h1">Library</Typography>
                <TouchableOpacity style={styles.filterButton}>
                    <Sliders size={20} color={Theme.colors.text.primary} />
                </TouchableOpacity>
            </View>

            {/* 2. SEARCH BAR */}
            <View style={styles.searchContainer}>
                <MagnifyingGlass size={18} color={Theme.colors.text.tertiary} style={styles.searchIcon} />
                <TextInput
                    style={styles.input}
                    placeholder="Search your curation..."
                    placeholderTextColor={Theme.colors.text.tertiary}
                    value={search}
                    onChangeText={setSearch}
                />
            </View>

            {/* 3. MASONRY GRID */}
            <ScrollView contentContainerStyle={styles.gridContainer} showsVerticalScrollIndicator={false}>
                <View style={styles.column}>
                    {SIFTED_ITEMS.filter((_, i) => i % 2 === 0).map((item) => (
                        <Card key={item.id} item={item} />
                    ))}
                </View>
                <View style={styles.column}>
                    {SIFTED_ITEMS.filter((_, i) => i % 2 !== 0).map((item) => (
                        <Card key={item.id} item={item} />
                    ))}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

// Reusable Card Component
const Card = ({ item }: { item: typeof SIFTED_ITEMS[0] }) => (
    <TouchableOpacity style={styles.card} activeOpacity={0.9}>
        <Image source={{ uri: item.image }} style={styles.cardImage} />
        <View style={styles.cardInfo}>
            <Typography variant="h2" style={styles.cardTitle}>{item.title}</Typography>
            <Typography variant="caption" style={styles.cardTag}>{item.tag}</Typography>
        </View>
        <View style={styles.iconBadge}>
            <ArrowUpRight size={14} color="#FFF" weight="bold" />
        </View>
    </TouchableOpacity>
);

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Theme.colors.background
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: Theme.spacing.l,
        marginTop: 10,
        marginBottom: 20,
    },
    filterButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: Theme.colors.border,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFF',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: Theme.spacing.l,
        marginBottom: 25,
        paddingHorizontal: 15,
        height: 48,
        backgroundColor: '#FFF',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: Theme.colors.border,
    },
    searchIcon: {
        marginRight: 10
    },
    input: {
        flex: 1,
        fontSize: 15,
        color: Theme.colors.text.primary,
        fontFamily: 'System',
    },
    gridContainer: {
        flexDirection: 'row',
        paddingHorizontal: Theme.spacing.l,
        paddingBottom: 140 // Spacing for navigation bar
    },
    column: {
        width: COLUMN_WIDTH,
        gap: 15
    },
    card: {
        borderRadius: 16,
        backgroundColor: '#FFF',
        overflow: 'hidden',
        marginBottom: 15,
        ...Theme.shadows.card,
        borderWidth: 1,
        borderColor: Theme.colors.border,
    },
    cardImage: {
        width: '100%',
        height: 180,
        resizeMode: 'cover'
    },
    cardInfo: {
        padding: 12
    },
    cardTitle: {
        fontSize: 14,
        marginBottom: 4
    },
    cardTag: {
        color: Theme.colors.text.tertiary,
    },
    iconBadge: {
        position: 'absolute',
        top: 10,
        right: 10,
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: 'rgba(0,0,0,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
    },
});
