import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState, useRef } from 'react';
import {
    TextInput,
    TouchableOpacity,
    View,
    Text,
    Alert,
    ActionSheetIOS,
    Platform,
    Image,
    KeyboardAvoidingView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, MoreHorizontal, Pencil, Check, X } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { Theme } from '../../lib/theme';
import { WebView } from 'react-native-webview';

export default function PageDetail() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState<any>(null);
    const [content, setContent] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const webviewRef = useRef<WebView>(null);

    useEffect(() => {
        if (!id) return;
        fetchPage();
    }, [id]);

    const fetchPage = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('pages')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;

            setPage(data);
            const fullDoc = data.content || `# ${data.title}\n\n> ${data.summary}`;
            setContent(fullDoc);

        } catch (error) {
            console.error('Error fetching page:', error);
            Alert.alert('Error', 'Could not load page.');
            router.back();
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = async () => {
        await Clipboard.setStringAsync(content);
        Alert.alert('Copied!', 'Full text copied to clipboard.');
    };

    const handleDelete = () => {
        Alert.alert(
            "Delete Page",
            "This will move the page to the Archive.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Archive",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const { error } = await supabase
                                .from('pages')
                                .update({ is_archived: true }) // Soft delete
                                .eq('id', id);

                            if (error) throw error;
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                            router.back();
                        } catch (e) {
                            console.error(e);
                            Alert.alert('Error', 'Failed to archive page');
                        }
                    }
                }
            ]
        );
    };


    const handlePin = async () => {
        try {
            const newStatus = !page?.is_pinned;
            setPage((prev: any) => ({ ...prev, is_pinned: newStatus }));

            const { error } = await supabase
                .from('pages')
                .update({ is_pinned: newStatus })
                .eq('id', id);

            if (error) throw error;
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (e) {
            console.error(e);
            Alert.alert('Error', 'Failed to pin page');
        }
    };

    const showActionSheet = () => {
        const pinAction = page?.is_pinned ? 'Unpin Page' : 'Pin to Top';

        if (Platform.OS === 'ios') {
            ActionSheetIOS.showActionSheetWithOptions(
                {
                    options: ['Cancel', pinAction, 'Copy All', 'Delete Page'],
                    destructiveButtonIndex: 3,
                    cancelButtonIndex: 0,
                    userInterfaceStyle: 'light',
                },
                (buttonIndex) => {
                    if (buttonIndex === 1) handlePin();
                    if (buttonIndex === 2) handleCopy();
                    if (buttonIndex === 3) handleDelete();
                }
            );
        } else {
            Alert.alert(
                "Page Actions",
                undefined,
                [
                    { text: pinAction, onPress: handlePin },
                    { text: "Copy All", onPress: handleCopy },
                    { text: "Delete", onPress: handleDelete, style: "destructive" },
                    { text: "Cancel", style: "cancel" }
                ],
                { cancelable: true }
            );
        }
    };

    const handleSave = async () => {
        setIsEditing(false);
    };

    const handleMessage = (event: any) => {
        try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === 'update') {
                // Update local content state?
                // Ideally needed for persistence.
            }
        } catch (e) { }
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    if (loading) {
        return (
            <View className="flex-1 justify-center items-center bg-[#F7F7F5]">
                {/* <ActivityIndicator size="large" color="#37352F" /> */}
            </View>
        );
    }

    return (
        <View className="flex-1 bg-[#F7F7F5]">
            <Stack.Screen options={{ headerShown: false }} />

            {/* Header */}
            <SafeAreaView edges={['top']} className="absolute top-0 left-0 right-0 z-10 bg-[#F7F7F5]/95 border-b border-gray-200/50">
                <View className="flex-row items-center justify-between px-4 py-3 h-14">
                    {isEditing ? (
                        <TouchableOpacity onPress={() => setIsEditing(false)} className="p-2 -ml-2 rounded-full">
                            <X size={24} color="#37352F" />
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2 rounded-full">
                            <ArrowLeft size={24} color="#37352F" />
                        </TouchableOpacity>
                    )}

                    <View className="flex-1 items-center justify-center mx-4">
                        <Text className="text-[#37352F] font-semibold text-base" numberOfLines={1}>
                            {isEditing ? 'Editing' : (page?.title || 'Untitled')}
                        </Text>
                    </View>

                    {isEditing ? (
                        <TouchableOpacity onPress={handleSave} className="p-2 -mr-2 rounded-full">
                            <Check size={24} color="#37352F" />
                        </TouchableOpacity>
                    ) : (
                        <View className="flex-row">
                            <TouchableOpacity onPress={() => setIsEditing(true)} className="p-2 rounded-full mr-1">
                                <Pencil size={24} color="#37352F" />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={showActionSheet} className="p-2 -mr-2 rounded-full">
                                <MoreHorizontal size={24} color="#37352F" />
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </SafeAreaView>

            <View className="flex-1 pt-[110px]">
                {/* Cover Image - Sticky Top? Or just part of scroll? 
                    Since WebView handles scroll, we can't easily put native image above it without complex sync.
                    Simplest: Inject Image into WebView content or just give up on sticky.
                    Let's just use the WebView for everything in View Mode.
                */}

                {isEditing ? (
                    <TextInput
                        className="flex-1 px-5 pt-4 text-base font-sans text-ink leading-7"
                        multiline
                        textAlignVertical="top"
                        value={content}
                        onChangeText={setContent}
                        placeholder="Start writing..."
                        style={{ textAlignVertical: 'top' }}
                        selectionColor={Theme.colors.text.primary}
                        autoFocus
                    />
                ) : (
                    <WebView
                        ref={webviewRef}
                        originWhitelist={['*']}
                        source={{
                            html: generateHtml(content, page?.metadata?.image_url)
                        }}
                        style={{ flex: 1, backgroundColor: 'transparent' }}
                        onMessage={handleMessage}
                        javaScriptEnabled={true}
                        domStorageEnabled={true}
                    />
                )}
            </View>
        </View>
    );
}

// Helper to generate full HTML including the image and logic
function generateHtml(contentMarkdown: string, imageUrl?: string) {
    const showdown = require('showdown'); // Require here to avoid top-level issues if any
    const converter = new showdown.Converter({
        simpleLineBreaks: true,
        strikethrough: true,
        tables: true
    });

    // Support ==highlight==
    const processed = contentMarkdown.replace(/==([^=]+)==/g, '<mark style="background-color: #FFEBA8;">$1</mark>');
    const htmlContent = converter.makeHtml(processed);

    const imageHtml = imageUrl ? `<img src="${imageUrl}" style="width:100%; height: 200px; object-fit: cover; border-radius: 8px; margin-bottom: 20px;" />` : '';

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
            <style>
                * {
                    -webkit-touch-callout: none; /* Disable iOS native menu globally */
                }
                body {
                    font-family: -apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                    color: #37352F;
                    line-height: 1.6;
                    padding: 20px;
                    margin: 0;
                    padding-bottom: 300px;
                    background-color: #F7F7F5;
                    -webkit-tap-highlight-color: transparent;
                }
                h1 { font-size: 32px; font-weight: 800; margin-top: 10px; margin-bottom: 10px; line-height: 1.2; letter-spacing: -0.02em; }
                h2 { font-size: 24px; font-weight: 700; margin-top: 24px; margin-bottom: 10px; letter-spacing: -0.01em; }
                h3 { font-size: 20px; font-weight: 600; margin-top: 20px; margin-bottom: 8px; }
                p { font-size: 17px; margin-bottom: 16px; font-weight: 400; }
                li { font-size: 17px; margin-bottom: 8px; }
                blockquote { border-left: 4px solid #E5E5E5; padding-left: 16px; color: #666; font-style: italic; margin: 16px 0; }
                mark { border-radius: 4px; padding: 2px 0; }
                img { max-width: 100%; border-radius: 8px; margin: 16px 0; }

                /* Floating Menu */
                #floating-menu {
                    position: absolute;
                    z-index: 1000;
                    background: #202020;
                    border-radius: 8px;
                    padding: 6px;
                    display: none;
                    flex-direction: row;
                    gap: 6px;
                    align-items: center;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
                    animation: fadeIn 0.15s ease-out;
                    flex-wrap: nowrap;
                    white-space: nowrap;
                    pointer-events: auto;
                }
                
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(4px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                .menu-btn {
                    color: white;
                    font-size: 14px;
                    font-weight: 600;
                    padding: 4px 10px;
                    border-radius: 4px;
                    cursor: pointer;
                    background: transparent;
                    border: none;
                }
                .menu-btn:active { background: rgba(255,255,255,0.2); }
                
                .color-btn {
                    width: 20px;
                    height: 20px;
                    border-radius: 50%;
                    border: 1px solid rgba(255,255,255,0.2);
                    cursor: pointer;
                }

                .divider {
                    width: 1px;
                    height: 16px;
                    background: rgba(255,255,255,0.2);
                    margin: 0 4px;
                }
                
                /* Selection Color */
                ::selection { background: rgba(255, 235, 168, 0.4); } 
            </style>
        </head>
        <body>
            ${imageHtml}
            <div id="content">${htmlContent}</div>
            
            <!-- Floating Menu UI -->
            <div id="floating-menu">
                <button class="menu-btn" onclick="execCmd('bold')">B</button>
                <div class="divider"></div>
                <div class="color-btn" style="background: #FFEBA8" onclick="highlight('#FFEBA8')"></div>
                <div class="color-btn" style="background: #D9F5D2" onclick="highlight('#D9F5D2')"></div>
                <div class="color-btn" style="background: #D1EFFF" onclick="highlight('#D1EFFF')"></div>
                <div class="color-btn" style="background: #FDD5DF" onclick="highlight('#FDD5DF')"></div>
            </div>
            
            <script>
                const menu = document.getElementById('floating-menu');
                let isSelecting = false;

                document.addEventListener('selectionchange', () => {
                   updateMenuPosition();
                });
                
                // Hide menu on scroll
                window.addEventListener('scroll', () => {
                     menu.style.display = 'none';
                });
                
                // Keep menu visible when clicking INSIDE it
                menu.addEventListener('mousedown', (e) => {
                    e.preventDefault(); 
                    e.stopPropagation();
                });

                function updateMenuPosition() {
                    const selection = window.getSelection();
                    
                    if (!selection.rangeCount || selection.isCollapsed) {
                        menu.style.display = 'none';
                        return;
                    }
                    
                    const range = selection.getRangeAt(0);
                    const rect = range.getBoundingClientRect();
                    
                    // Show menu
                    menu.style.display = 'flex';
                    
                    // Calculate center position
                    // rect.top is viewport relative
                    const menuHeight = menu.offsetHeight || 40;
                    const menuWidth = menu.offsetWidth || 150;
                    
                    let top = rect.top + window.scrollY - menuHeight - 10;
                    let left = rect.left + window.scrollX + (rect.width / 2) - (menuWidth / 2);
                    
                    // Boundary checks
                    if (left < 10) left = 10;
                    if (left + menuWidth > window.innerWidth - 10) left = window.innerWidth - menuWidth - 10;
                    
                    menu.style.top = top + 'px';
                    menu.style.left = left + 'px';
                }

                window.execCmd = (cmd) => {
                    document.execCommand(cmd, false, null);
                    // notifyRN();
                };

                window.highlight = (color) => {
                    const selection = window.getSelection();
                    if (!selection.rangeCount) return;
                    
                    const range = selection.getRangeAt(0);
                    if (range.collapsed) return;

                    const span = document.createElement('mark');
                    span.style.backgroundColor = color;
                    
                    try {
                        range.surroundContents(span);
                        selection.removeAllRanges(); 
                        menu.style.display = 'none';
                    } catch (e) {
                         console.log(e);
                    }
                };

                function notifyRN() {
                    const updatedHtml = document.getElementById('content').innerHTML;
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                        type: 'update',
                        html: updatedHtml
                    }));
                }
            </script>
        </body>
        </html>
    `;
}
