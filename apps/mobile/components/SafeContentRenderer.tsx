import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Markdown from 'react-native-markdown-display';
import { COLORS } from '../lib/theme';
import { useTheme } from '../context/ThemeContext';

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
        body: { fontSize: 17, lineHeight: 26, color: colors.ink, fontFamily: 'System' },
        heading1: { fontSize: 24, fontWeight: '700', marginTop: 24, marginBottom: 12, lineHeight: 30, color: colors.ink },
        heading2: { fontSize: 20, fontWeight: '600', marginTop: 20, marginBottom: 10, color: colors.ink },
        heading3: { fontSize: 17, fontWeight: '600', marginTop: 16, marginBottom: 8, color: colors.ink },
        list_item: { marginBottom: 8 },
        bullet_list: { marginBottom: 12 },
        ordered_list: { marginBottom: 12 },
        paragraph: { marginBottom: 16 },
        link: { color: colors.accent, textDecorationLine: 'underline' },
        blockquote: {
            backgroundColor: isDark ? '#1C1C1E' : '#F2F2F7',
            borderLeftWidth: 4,
            borderLeftColor: colors.stone,
            paddingHorizontal: 16,
            paddingVertical: 8,
            marginVertical: 12,
            borderRadius: 4,
        }
    };

    const dynamicStyles = StyleSheet.create({
        container: { marginTop: 8 },
        markdownContainer: { flex: 1 },
        bodyText: { fontSize: 17, lineHeight: 24, color: colors.ink, marginBottom: 16, fontFamily: 'System' },
        placeholder: { color: colors.stone, fontStyle: 'italic', padding: 20 },
        section: { marginTop: 16, marginBottom: 8 },
        groupContainer: { marginBottom: 16 },
        header: { fontSize: 20, fontWeight: '700', marginBottom: 12, color: colors.ink, fontFamily: 'System' },
        subHeader: { fontSize: 13, fontWeight: '600', marginBottom: 8, color: colors.stone, textTransform: 'uppercase', letterSpacing: 0.5, fontFamily: 'System' },
        row: { flexDirection: 'row', marginBottom: 8, paddingRight: 16 },
        stepRow: { flexDirection: 'row', marginBottom: 16, paddingRight: 16 },
        bullet: { marginRight: 8, fontSize: 18, color: colors.stone, lineHeight: 22 },
        stepNum: { marginRight: 12, fontWeight: '700', color: colors.stone, fontSize: 16 },
        listItem: { fontSize: 17, lineHeight: 24, color: colors.ink, flex: 1, fontFamily: 'System' },
    });

    // 2. SCENARIO A: It is Plain Text / Markdown (Most Sifts)
    if (!isJson) {
        return (
            <View style={dynamicStyles.markdownContainer}>
                <Markdown style={markdownStyles as any}>
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
