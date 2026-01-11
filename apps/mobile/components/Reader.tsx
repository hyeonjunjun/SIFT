import React, { useRef, useEffect, useState } from 'react';
import { WebView } from 'react-native-webview';
import showdown from 'showdown';
import { Theme } from '../lib/theme';
import { View, ActivityIndicator } from 'react-native';

interface ReaderProps {
    content: string; // Markdown
    onHighlight?: (newContent: string) => void;
    highlightColor?: string; // Hex
}

export const Reader = ({ content, onHighlight, highlightColor = '#FFEBA8' }: ReaderProps) => {
    const webviewRef = useRef<WebView>(null);
    const [html, setHtml] = useState('');

    useEffect(() => {
        // Convert Markdown to HTML
        const converter = new showdown.Converter({
            simpleLineBreaks: true,
            strikethrough: true,
            tables: true
        });
        // Enable highlighting syntax (replace ==text== with <mark>) before conversion if needed, 
        // or ensure Showdown supports it. Showdown doesn't support == by default.
        // We'll pre-process specific logic if we want to save as ==. 
        // For now, let's treat the incoming content as source.

        let processed = content
            .replace(/==([^=]+)==/g, '<mark style="background-color: #FFEBA8;">$1</mark>')
        // Support different colors if we used multiple marker syntax? 
        // V1: just standard yellow. We can enhance regex later.

        const htmlContent = converter.makeHtml(processed);

        // Template
        const fullHtml = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
                <style>
                    body {
                        font-family: -apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                        color: ${Theme.colors.text.primary};
                        line-height: 1.6;
                        padding: 20px;
                        margin: 0;
                        padding-bottom: 100px;
                        background-color: #F7F7F5;
                    }
                    h1 { font-size: 32px; font-weight: 800; margin-top: 10px; margin-bottom: 10px; line-height: 1.2; letter-spacing: -0.02em; }
                    h2 { font-size: 24px; font-weight: 700; margin-top: 24px; margin-bottom: 10px; letter-spacing: -0.01em; }
                    h3 { font-size: 20px; font-weight: 600; margin-top: 20px; margin-bottom: 8px; }
                    p { font-size: 17px; margin-bottom: 16px; font-weight: 400; }
                    li { font-size: 17px; margin-bottom: 8px; }
                    blockquote { border-left: 4px solid #E5E5E5; padding-left: 16px; color: #666; font-style: italic; margin: 16px 0; }
                    mark { border-radius: 4px; padding: 2px 0; }
                    img { max-width: 100%; border-radius: 8px; margin: 16px 0; }
                    
                    /* Hide scrollbar */
                    ::-webkit-scrollbar { display: none; }
                </style>
            </head>
            <body>
                <div id="content">${htmlContent}</div>
                
                <script>
                    // Listen for messages from RN
                    document.addEventListener('selectionchange', () => {
                        // Optional: Debounce and send selection state if we want floating menu logic
                    });

                    // Highlight function called by RN
                    window.highlightSelection = (color) => {
                        const selection = window.getSelection();
                        if (!selection.rangeCount) return;
                        
                        const range = selection.getRangeAt(0);
                        if (range.collapsed) return;

                        const span = document.createElement('mark');
                        span.style.backgroundColor = color;
                        
                        try {
                            range.surroundContents(span);
                            // Clear selection
                            selection.removeAllRanges();
                            
                            // Send updated HTML back to RN
                            const updatedHtml = document.getElementById('content').innerHTML;
                            // We need to convert this HTML back to Markdown if we want to save it as MD, 
                            // OR we strictly save Highlight Metadata?
                            // Simpler for v1: Send HTML back and we might just save 'content' as HTML-ish Markdown?
                            // Showdown can export MD? No, generic tool doesn't.
                            // Strategy: We will strictly wrap with <mark> tags which Markdown accepts as valid HTML.
                            // So we just need to send the text back? 
                            // Actually, converting HTML back to Markdown reliably is hard.
                            // Alternate Strategy: We keep the highlight VISUAL only in valid session? No, user wants to assume it saves.
                            
                            // Best V1 Strategy: We save the *HTML* representation if possible, or...
                            // We use a turndown service? 
                            // Let's rely on 'ReactNative' injecting the tag, and then we scrape the content.
                            
                            window.ReactNativeWebView.postMessage(JSON.stringify({
                                type: 'highlight',
                                html: updatedHtml
                            }));
                            
                        } catch (e) {
                            console.error(e);
                        }
                    };
                </script>
            </body>
            </html>
        `;
        setHtml(fullHtml);
    }, [content]);

    return (
        <WebView
            ref={webviewRef}
            originWhitelist={['*']}
            source={{ html }}
            style={{ flex: 1, backgroundColor: 'transparent' }}
            scrollEnabled={false} // Let the parent scroll? No, WebView internal scroll.
        // On second thought, putting WebView in ScrollView is bad.
        // But we need the Header image to scroll away.
        // Standard pattern: The WebView IS the scroll view. Header is absolute or handled via content offset.
        // For this design, let's keep Header static (sticky) or absolute top.
        />
    );
};
