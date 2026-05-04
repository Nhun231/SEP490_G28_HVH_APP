import React from 'react';
import { View, Text, Dimensions, ScrollView, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { EventSimpleResponse } from '@/services/event-types';

const { width } = Dimensions.get('window');

// Fallback solid colours when an event has no imageUrl
const PLACEHOLDER_COLORS = ['#64B5F6', '#42A4F5', '#1E88E5', '#1565C0'];

/** Resolves relative Supabase storage paths to full URLs — identical to EventCard. */
function getFullImageUrl(path: string | null | undefined): string | null {
    if (!path) return null;
    if (path.startsWith('http')) return path;

    const supabaseUrl =
        process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://kbmxlrqkzgjbtkmlbaei.supabase.co';

    if (path.startsWith('/storage/v1')) return `${supabaseUrl}${path}`;
    if (path.startsWith('/object/')) return `${supabaseUrl}/storage/v1${path}`;

    return `${supabaseUrl}/storage/v1/object/public/hvh-bucket/${path}`;
}

interface BannerProps {
    /** Up to 4 real EventSimpleResponse items fetched by the parent. */
    events?: EventSimpleResponse[];
}

export default function Banner({ events = [] }: BannerProps) {
    const [activeIndex, setActiveIndex] = React.useState(0);

    const onScroll = (event: any) => {
        const slideIndex = Math.round(event.nativeEvent.contentOffset.x / width);
        setActiveIndex(slideIndex);
    };

    if (events.length === 0) return null;

    return (
        <View style={styles.wrapper}>
            <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={onScroll}
                scrollEventThrottle={16}
            >
                {events.map((item, i) => {
                    const imageUri = getFullImageUrl(item.imageUrl);
                    return (
                        <View key={item.id} style={[styles.slide, { width: width - 32 }]}>
                            {imageUri ? (
                                <Image
                                    source={imageUri}
                                    style={styles.image}
                                    contentFit="cover"
                                    transition={200}
                                />
                            ) : (
                                <View style={[styles.image, { backgroundColor: PLACEHOLDER_COLORS[i % 4] }]} />
                            )}
                            <View style={styles.overlay}>
                                <Text style={styles.name} numberOfLines={2}>
                                    {item.name}
                                </Text>
                                <Text style={styles.date}>
                                    {item.startDate
                                        ? new Date(item.startDate).toLocaleDateString('vi-VN', {
                                              day: '2-digit',
                                              month: '2-digit',
                                              year: 'numeric',
                                          })
                                        : ''}
                                    {item.orgName ? `  •  ${item.orgName}` : ''}
                                </Text>
                            </View>
                        </View>
                    );
                })}
            </ScrollView>

            {/* Pagination dots */}
            <View style={styles.dots}>
                {events.map((_, index) => (
                    <View
                        key={index}
                        style={[
                            styles.dot,
                            index === activeIndex ? styles.dotActive : styles.dotInactive,
                        ]}
                    />
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: { paddingHorizontal: 16, paddingVertical: 16 },
    slide: { borderRadius: 16, overflow: 'hidden' },
    image: { width: '100%', height: 192 },
    overlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(0,0,0,0.40)',
        padding: 16,
    },
    name: { color: '#FFFFFF', fontSize: 18, fontWeight: '700', lineHeight: 24 },
    date: { color: '#FFFFFF', fontSize: 12, marginTop: 4, opacity: 0.9 },
    dots: { flexDirection: 'row', justifyContent: 'center', marginTop: 12 },
    dot: { height: 8, borderRadius: 4, marginHorizontal: 4 },
    dotActive: { width: 24, backgroundColor: '#42A5F5' },
    dotInactive: { width: 8, backgroundColor: '#90CAF9' },
});
