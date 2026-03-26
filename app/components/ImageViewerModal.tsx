import React, { useState, useRef } from 'react';
import {
    Modal,
    View,
    Text,
    TouchableOpacity,
    FlatList,
    Dimensions,
    StyleSheet,
    StatusBar,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

interface ImageViewerModalProps {
    visible: boolean;
    images: string[];
    initialIndex?: number;
    onClose: () => void;
}

export default function ImageViewerModal({
    visible,
    images,
    initialIndex = 0,
    onClose,
}: ImageViewerModalProps) {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const flatListRef = useRef<FlatList>(null);

    const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
        if (viewableItems.length > 0) {
            setCurrentIndex(viewableItems[0].index ?? 0);
        }
    }).current;

    const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
            statusBarTranslucent
        >
            <View style={styles.overlay}>
                <StatusBar hidden />

                {/* ─── Header ─── */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                        <Ionicons name="close" size={28} color="#FFF" />
                    </TouchableOpacity>
                    <Text style={styles.counter}>
                        {currentIndex + 1} / {images.length}
                    </Text>
                    <View style={{ width: 40 }} />
                </View>

                {/* ─── Image carousel ─── */}
                <FlatList
                    ref={flatListRef}
                    data={images}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    initialScrollIndex={initialIndex}
                    getItemLayout={(_, index) => ({
                        length: SCREEN_W,
                        offset: SCREEN_W * index,
                        index,
                    })}
                    onViewableItemsChanged={onViewableItemsChanged}
                    viewabilityConfig={viewabilityConfig}
                    keyExtractor={(_, i) => i.toString()}
                    renderItem={({ item }) => (
                        <View style={styles.imageWrapper}>
                            <Image
                                source={item}
                                style={styles.fullImage}
                                contentFit="contain"
                                transition={200}
                            />
                        </View>
                    )}
                />
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: '#000',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 48,
        paddingHorizontal: 16,
        paddingBottom: 12,
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
    },
    closeBtn: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.4)',
        borderRadius: 20,
    },
    counter: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '600',
    },
    imageWrapper: {
        width: SCREEN_W,
        height: SCREEN_H,
        justifyContent: 'center',
        alignItems: 'center',
    },
    fullImage: {
        width: SCREEN_W,
        height: SCREEN_H * 0.75,
    },
});
