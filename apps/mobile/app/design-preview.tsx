import React from 'react';
import { View, Text } from 'react-native';
import { PageContainer } from '../components/design-system/PageContainer';
import { Block } from '../components/design-system/Block';
import { Callout } from '../components/design-system/Callout';
import { PropertyRow } from '../components/design-system/PropertyRow';
import { NotionToast } from '../components/design-system/NotionToast';
import { Clock, Tag, User } from 'phosphor-react-native';

export default function DesignPreview() {
    return (
        <>
            <PageContainer showGhostBlocks={true}>
                {/* Title Block */}
                <Block>
                    <Text className="text-4xl font-sans font-bold text-ink mb-4">The Context Design System</Text>
                </Block>

                {/* Metadata */}
                <Block>
                    <PropertyRow icon={User} label="Creator" value="Antigravity" />
                    <PropertyRow icon={Clock} label="Created At" value="Oct 24, 2023" />
                    <PropertyRow icon={Tag} label="Tags" value="#Design #System #Notion" />
                </Block>

                <View className="h-6" />

                {/* The Gist */}
                <Callout icon="💡">
                    <Text className="text-ink text-base">
                        The "Context Design System" is a modular, content-first design language inspired by Notion’s philosophy of "Unified Primitives."
                    </Text>
                </Callout>

                <View className="h-6" />

                {/* Body Content */}
                <Block>
                    <Text className="text-ink text-lg leading-7">
                        Instead of building "Screens", we build **Blocks**. This page demonstrates the core primitives including the PageContainer, Block, Callout, and PropertyRow.
                    </Text>
                </Block>

                <Block>
                    <Text className="text-ink text-lg leading-7 mt-4">
                        Below, you can see the "Ghost Blocks" effect, which encourages you to continue writing...
                    </Text>
                </Block>

            </PageContainer>

            {/* Simulation of a toast notification */}
            <NotionToast visible={true} message="Page Saved" />
        </>
    );
}
