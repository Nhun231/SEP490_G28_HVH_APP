import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

export interface EventCardData {
    id: string;
    name: string;
    orgName: string;
    imageUrl: string;
    address: string;
    startDate: string;       // ISO date e.g. "2025-03-15"
    recruitmentEndDate: string;
}

interface EventCardProps {
    event: EventCardData;
    onPress?: () => void;
}

/** Format ISO date "2025-03-15" → "15/03/2025" */
function formatDate(iso: string): string {
    if (!iso) return '';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
}

/** Check if recruitment is still open */
function isRecruiting(endDate: string): boolean {
    if (!endDate) return false;
    return new Date(endDate) >= new Date();
}

/** Get the full image URL from Supabase relative path */
function getFullImageUrl(path: string | null | undefined): string {
    if (!path) {
        return 'https://placehold.co/400x300/e2e8f0/64748b.png?text=No+Image';
    }

    // Already a full URL — use as-is
    if (path.startsWith('http')) {
        return path;
    }

    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://kbmxlrqkzgjbtkmlbaei.supabase.co';

    // Supabase signed URL already contains /storage/v1
    if (path.startsWith('/storage/v1')) {
        return `${supabaseUrl}${path}`;
    }

    // Supabase signed URL relative path: /object/sign/...
    if (path.startsWith('/object/')) {
        return `${supabaseUrl}/storage/v1${path}`;
    }

    // Fallback: treat as a relative storage path inside the bucket
    const supabaseBucket = 'hvh-bucket';
    return `${supabaseUrl}/storage/v1/object/public/${supabaseBucket}/${path}`;
}

export default function EventCard({ event, onPress }: EventCardProps) {
    const recruiting = isRecruiting(event.recruitmentEndDate);
    const imageUri = getFullImageUrl(event.imageUrl);

    return (
        <TouchableOpacity
            style={styles.card}
            onPress={onPress}
            activeOpacity={0.7}
        >
            {/* Left: Image with status badge */}
            <View style={styles.imageContainer}>
                <Image
                    source={imageUri}
                    style={styles.image}
                    contentFit="cover"
                    transition={200}
                    placeholder={{ uri: 'https://placehold.co/400x300/e2e8f0/64748b.png?text=Loading' }}
                />
                <View style={[styles.badge, !recruiting && styles.badgeClosed]}>
                    <Text style={styles.badgeText}>
                        {recruiting ? 'Đang tuyển' : 'Hết hạn'}
                    </Text>
                </View>
            </View>

            {/* Right: Event info */}
            <View style={styles.infoContainer}>
                <Text style={styles.eventName} numberOfLines={2}>
                    {event.name}
                </Text>

                <View style={styles.orgRow}>
                    <View style={styles.orangeDot} />
                    <Text style={styles.orgName} numberOfLines={1}>
                        {event.orgName}
                    </Text>
                </View>

                <View style={styles.locationRow}>
                    <Ionicons name="location-outline" size={14} color="#9CA3AF" />
                    <Text style={styles.locationText} numberOfLines={1}>
                        {event.address}
                    </Text>
                </View>

                <View style={styles.locationRow}>
                    <Ionicons name="calendar-outline" size={13} color="#9CA3AF" />
                    <Text style={styles.locationText}>
                        {formatDate(event.startDate)}
                    </Text>
                </View>
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    card: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        marginHorizontal: 12,
        marginBottom: 12,
        borderRadius: 12,
        overflow: 'hidden',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
    },
    imageContainer: {
        width: 140,
        height: 130,
        position: 'relative',
    },
    image: {
        width: '100%',
        height: '100%',
    },
    badge: {
        position: 'absolute',
        top: 8,
        left: 8,
        backgroundColor: '#42A4F5',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    badgeClosed: {
        backgroundColor: '#9CA3AF',
    },
    badgeText: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: '700',
    },
    infoContainer: {
        flex: 1,
        paddingVertical: 10,
        paddingHorizontal: 12,
        justifyContent: 'center',
    },
    eventName: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1F2937',
        marginBottom: 6,
        lineHeight: 20,
    },
    orgRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 5,
    },
    orangeDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#F59E0B',
        marginRight: 6,
    },
    orgName: {
        fontSize: 13,
        color: '#4B5563',
        flex: 1,
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 2,
    },
    locationText: {
        fontSize: 12,
        color: '#9CA3AF',
        marginLeft: 4,
        flex: 1,
    },
});
