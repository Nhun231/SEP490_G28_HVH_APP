import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React, { useEffect, useState } from 'react';
import { Dimensions, FlatList, Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { resolveStorageUrl } from '@/services/api-helpers';

const { width: SCREEN_W } = Dimensions.get('window');

export interface CertViewerProps {
    urls: string[];
    startIndex: number;
    visible: boolean;
    onClose: () => void;
}

export default function CertViewer({ urls, startIndex, visible, onClose }: CertViewerProps) {
    const [current, setCurrent] = useState(startIndex);
    useEffect(() => {
        if (visible) setCurrent(startIndex);
    }, [visible, startIndex]);

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.95)' }}>
                <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
                    <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                        <Ionicons name="close" size={26} color="#FFFFFF" />
                    </TouchableOpacity>
                    <Text style={styles.counter}>{current + 1} / {urls.length}</Text>
                    <FlatList
                        data={urls}
                        horizontal
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        initialScrollIndex={startIndex}
                        getItemLayout={(_, i) => ({ length: SCREEN_W, offset: SCREEN_W * i, index: i })}
                        onMomentumScrollEnd={e =>
                            setCurrent(Math.round(e.nativeEvent.contentOffset.x / SCREEN_W))
                        }
                        keyExtractor={(_, i) => String(i)}
                        renderItem={({ item }) => (
                            <View style={{ width: SCREEN_W, justifyContent: 'center', alignItems: 'center' }}>
                                <Image
                                    source={{ uri: resolveStorageUrl(item) ?? item }}
                                    style={{ width: SCREEN_W, height: SCREEN_W * 1.4 }}
                                    contentFit="contain"
                                />
                            </View>
                        )}
                    />
                </SafeAreaView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    closeBtn: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 52 : 16,
        right: 16,
        zIndex: 100,
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderRadius: 20,
        padding: 8,
    },
    counter: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 56 : 20,
        alignSelf: 'center',
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
        zIndex: 99,
    },
});
