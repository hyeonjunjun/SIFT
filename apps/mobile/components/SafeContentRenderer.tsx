import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Markdown from 'react-native-markdown-display';
import { COLORS } from '../lib/theme';

interface SafeContentRendererProps {
    content: string;
}

const SafeContentRenderer: React.FC<SafeContentRendererProps> = ({ content }) => {
    // Guard Clause: If content is null/undefined, don't crash
    if (!content) return <Text style={styles.placeholder}>No summary available.</Text>;

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

    // 2. SCENARIO A: It is Plain Text / Markdown (Most Sifts)
    if (!isJson) {
        return (
            <View style={styles.markdownContainer}>
                <Markdown style={markdownStyles as any}>
                    {content}
                </Markdown>
            </View>
        );
    }

    // 3. SCENARIO B: It is JSON
    return (
        <View style={styles.container}>
            {parsedData.summary && (
                <Text style={styles.bodyText}>{parsedData.summary}</Text>
            )}

            {parsedData.Inputs && (
                <View style={styles.section}>
                    <Text style={styles.header}>Ingredients</Text>
                    {typeof parsedData.Inputs === 'object' && !Array.isArray(parsedData.Inputs) ? (
                        Object.entries(parsedData.Inputs).map(([key, value]) => (
                            <View key={key} style={styles.groupContainer}>
                                <Text style={styles.subHeader}>{key}</Text>
                                {Array.isArray(value) && value.map((item: any, i: number) => (
                                    <View key={i} style={styles.row}>
                                        <Text style={styles.bullet}>•</Text>
                                        <Text style={styles.listItem}>{String(item)}</Text>
                                    </View>
                                ))}
                            </View>
                        ))
                    ) : (
                        Array.isArray(parsedData.Inputs) && parsedData.Inputs.map((value: any, index: number) => (
                            <View key={index} style={styles.row}>
                                <Text style={styles.bullet}>•</Text>
                                <Text style={styles.listItem}>
                                    {String(value)}
                                </Text>
                            </View>
                        ))
                    )}
                </View>
            )}

            {parsedData.Actions && Array.isArray(parsedData.Actions) && (
                <View style={styles.section}>
                    <Text style={styles.header}>Steps</Text>
                    {parsedData.Actions.map((step: any, index: number) => (
                        <View key={index} style={styles.stepRow}>
                            <Text style={styles.stepNum}>{index + 1}.</Text>
                            <Text style={styles.listItem}>{String(step)}</Text>
                        </View>
                    ))}
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { marginTop: 8 },
    markdownContainer: { flex: 1 },
    bodyText: { fontSize: 17, lineHeight: 24, color: COLORS.ink, marginBottom: 16, fontFamily: 'System' },
    placeholder: { color: COLORS.stone, fontStyle: 'italic', padding: 20 },
    section: { marginTop: 16, marginBottom: 8 },
    groupContainer: { marginBottom: 16 },
    header: { fontSize: 20, fontWeight: '700', marginBottom: 12, color: COLORS.ink, fontFamily: 'System' },
    subHeader: { fontSize: 13, fontWeight: '600', marginBottom: 8, color: COLORS.stone, textTransform: 'uppercase', letterSpacing: 0.5, fontFamily: 'System' },
    row: { flexDirection: 'row', marginBottom: 8, paddingRight: 16 },
    stepRow: { flexDirection: 'row', marginBottom: 16, paddingRight: 16 },
    bullet: { marginRight: 8, fontSize: 18, color: COLORS.stone, lineHeight: 22 },
    stepNum: { marginRight: 12, fontWeight: '700', color: COLORS.stone, fontSize: 16 },
    listItem: { fontSize: 17, lineHeight: 24, color: COLORS.ink, flex: 1, fontFamily: 'System' },
});

const markdownStyles = {
    body: { fontSize: 17, lineHeight: 26, color: COLORS.ink, fontFamily: 'System' },
    heading1: { fontSize: 24, fontWeight: '700', marginTop: 24, marginBottom: 12, lineHeight: 30, color: COLORS.ink },
    heading2: { fontSize: 20, fontWeight: '600', marginTop: 20, marginBottom: 10, color: COLORS.ink },
    heading3: { fontSize: 17, fontWeight: '600', marginTop: 16, marginBottom: 8, color: COLORS.ink },
    list_item: { marginBottom: 8 },
    bullet_list: { marginBottom: 12 },
    ordered_list: { marginBottom: 12 },
    paragraph: { marginBottom: 16 },
    link: { color: COLORS.accent, textDecorationLine: 'underline' },
    blockquote: {
        backgroundColor: '#F2F2F7',
        borderLeftWidth: 4,
        borderLeftColor: COLORS.stone,
        paddingHorizontal: 16,
        paddingVertical: 8,
        marginVertical: 12,
        borderRadius: 4,
    }
};

export default SafeContentRenderer;
