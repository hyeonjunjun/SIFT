import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Markdown from 'react-native-markdown-display';
import { COLORS } from '../lib/theme';
import { useTheme } from '../context/ThemeContext';
import { Typography } from './design-system/Typography';

interface SafeContentRendererProps {
    content: string;
}

const SafeContentRenderer: React.FC<SafeContentRendererProps> = ({ content }) => {
    const { colors, isDark } = useTheme();

    // Guard Clause: If content is null/undefined, don't crash
    if (!content) return <Text style={{ color: colors.stone, fontStyle: 'italic', padding: 20 }}>No summary available.</Text>;

    let parsedData: any;
    let isJson = false;

    // 1. Try to parse it as JSON (for legacy or specific scrapers)
    try {
        parsedData = JSON.parse(content);
        if (typeof parsedData === 'object' && parsedData !== null) {
            isJson = true;
        }
    } catch (e) {
        isJson = false;
    }

    const markdownStyles = {
        body: { fontSize: 18, lineHeight: 30, color: colors.ink, fontFamily: 'Lora_400Regular' },
        heading1: { fontSize: 28, fontFamily: 'PlayfairDisplay_700Bold', marginTop: 32, marginBottom: 16, lineHeight: 34, color: colors.ink },
        heading2: { fontSize: 24, fontFamily: 'PlayfairDisplay_600SemiBold', marginTop: 24, marginBottom: 12, color: colors.ink },
        heading3: { fontSize: 20, fontFamily: 'Lora_600SemiBold', marginTop: 20, marginBottom: 10, color: colors.ink },
        list_item: { marginBottom: 12 },
        bullet_list: { marginBottom: 16 },
        ordered_list: { marginBottom: 16 },
        paragraph: { marginBottom: 20 },
        link: { color: colors.accent, textDecorationLine: 'underline' },
        blockquote: {
            backgroundColor: isDark ? '#1C1C1E' : '#F2F2F7',
            borderLeftWidth: 4,
            borderLeftColor: colors.stone,
            paddingHorizontal: 16,
            paddingVertical: 12,
            marginVertical: 16,
            borderRadius: 4,
        },
        // We can try to style the bullet point if the library supports it via text props, 
        // but typically react-native-markdown-display handles bullets internally.
        // We focus on the typographic hierarchy here to address the "Raw HTML" feel.
    };

    const dynamicStyles = StyleSheet.create({
        container: { marginTop: 8 },
        markdownContainer: { flex: 1 },
        bodyText: { fontSize: 18, lineHeight: 30, color: colors.ink, marginBottom: 16, fontFamily: 'Lora_400Regular' },
        placeholder: { color: colors.stone, fontStyle: 'italic', padding: 20 },
        section: { marginTop: 16, marginBottom: 8 },
        groupContainer: { marginBottom: 16 },
        header: { fontSize: 22, fontWeight: '700', marginBottom: 12, color: colors.ink, fontFamily: 'PlayfairDisplay_600SemiBold' },
        subHeader: { fontSize: 14, fontWeight: '600', marginBottom: 8, color: colors.stone, textTransform: 'uppercase', letterSpacing: 1, fontFamily: 'Inter_500Medium' },
        row: { flexDirection: 'row', marginBottom: 8, paddingRight: 16 },
        stepRow: { flexDirection: 'row', marginBottom: 16, paddingRight: 16 },
        bullet: { marginRight: 8, fontSize: 18, color: colors.stone, lineHeight: 30 },
        stepNum: { marginRight: 12, fontWeight: '700', color: colors.stone, fontSize: 18, fontFamily: 'Lora_600SemiBold' },
        listItem: { fontSize: 18, lineHeight: 30, color: colors.ink, flex: 1, fontFamily: 'Lora_400Regular' },
    });

    // 2. SCENARIO A: It is Plain Text / Markdown (Most Sifts)
    if (!isJson) {
        return (
            <View style={dynamicStyles.markdownContainer}>
                <Markdown
                    style={markdownStyles as any}
                    rules={{
                        // Custom renderer for ordered list items could go here if we want the circle number
                        // For now we'll stick to clean typographic updates
                    }}
                >
                    {content}
                </Markdown>
            </View>
        );
    }

    // 3. SCENARIO B: It is JSON
    return (
        <View style={dynamicStyles.container}>
            {parsedData.summary && (
                <Text style={dynamicStyles.bodyText}>{parsedData.summary}</Text>
            )}

            {parsedData.smart_data?.price && parsedData.smart_data.price !== '$0.00' && (
                <View style={[dynamicStyles.section, { backgroundColor: colors.subtle, padding: 12, borderRadius: 8, marginBottom: 16 }]}>
                    <Text style={[dynamicStyles.subHeader, { marginBottom: 4 }]}>IDENTIFIED PRICE</Text>
                    <Typography variant="h2" color="ink">{parsedData.smart_data.price}</Typography>
                </View>
            )}

            {parsedData.Inputs && (
                <View style={dynamicStyles.section}>
                    <Text style={dynamicStyles.header}>Ingredients</Text>
                    {typeof parsedData.Inputs === 'object' && !Array.isArray(parsedData.Inputs) ? (
                        Object.entries(parsedData.Inputs).map(([key, value]) => (
                            <View key={key} style={dynamicStyles.groupContainer}>
                                <Text style={dynamicStyles.subHeader}>{key}</Text>
                                {Array.isArray(value) && value.map((item: any, i: number) => (
                                    <View key={i} style={dynamicStyles.row}>
                                        <Text style={dynamicStyles.bullet}>•</Text>
                                        <Text style={dynamicStyles.listItem}>{String(item)}</Text>
                                    </View>
                                ))}
                            </View>
                        ))
                    ) : (
                        Array.isArray(parsedData.Inputs) && parsedData.Inputs.map((value: any, index: number) => (
                            <View key={index} style={dynamicStyles.row}>
                                <Text style={dynamicStyles.bullet}>•</Text>
                                <Text style={dynamicStyles.listItem}>
                                    {String(value)}
                                </Text>
                            </View>
                        ))
                    )}
                </View>
            )}

            {parsedData.Actions && Array.isArray(parsedData.Actions) && (
                <View style={dynamicStyles.section}>
                    <Text style={dynamicStyles.header}>Steps</Text>
                    {parsedData.Actions.map((step: any, index: number) => (
                        <View key={index} style={dynamicStyles.stepRow}>
                            <Text style={dynamicStyles.stepNum}>{index + 1}.</Text>
                            <Text style={dynamicStyles.listItem}>{String(step)}</Text>
                        </View>
                    ))}
                </View>
            )}
        </View>
    );
};

export default SafeContentRenderer;
