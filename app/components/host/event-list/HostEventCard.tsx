import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MyEventStatus } from '@/services/event-types';
import { resolveSupabaseUrl } from '@/services/api-helpers';

export type EventStatus = MyEventStatus;

export interface HostEvent {
    id: string;
    name: string;
    imageUrl: string | null;
    status: EventStatus;
    startDate: string;
    address: string;
    recruitmentEndDate: string;
    createdAt: string;
}

const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=800&h=400&fit=crop';

const STATUS_CONFIG: Record<EventStatus, { label: string; color: string; bgColor: string; icon: string }> = {
    EDITING: { label: 'Đang soạn thảo', color: '#6B7280', bgColor: '#F3F4F6', icon: 'create-outline' },
    SUBMITTED: { label: 'Chờ phê duyệt', color: '#3B82F6', bgColor: '#DBEAFE', icon: 'time-outline' },
    APPROVED_BY_MNG: { label: 'Quản lý duyệt', color: '#10B981', bgColor: '#D1FAE5', icon: 'checkmark-circle-outline' },
    REJECTED_BY_MNG: { label: 'Quản lý từ chối', color: '#EF4444', bgColor: '#FEE2E2', icon: 'close-circle-outline' },
    REJECTED_BY_AD: { label: 'Admin từ chối', color: '#DC2626', bgColor: '#FEE2E2', icon: 'close-circle-outline' },
    RECRUITING: { label: 'Đang tuyển tình nguyện viên', color: '#7C3AED', bgColor: '#EDE9FE', icon: 'people-outline' },
    UPCOMING: { label: 'Sắp diễn ra', color: '#D97706', bgColor: '#FEF3C7', icon: 'alarm-outline' },
    ONGOING: { label: 'Đang diễn ra', color: '#059669', bgColor: '#D1FAE5', icon: 'play-circle-outline' },
    ENDED: { label: 'Đã kết thúc', color: '#6B7280', bgColor: '#F3F4F6', icon: 'flag-outline' },
    COMPLETED: { label: 'Hoàn thành', color: '#0EA5E9', bgColor: '#E0F2FE', icon: 'ribbon-outline' },
    CANCELLED: { label: 'Đã hủy', color: '#9CA3AF', bgColor: '#F9FAFB', icon: 'ban-outline' },
};

const formatDate = (dateStr: string): string => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
};

interface HostEventCardProps {
    item: HostEvent;
    onPress: (id: string) => void;
}

const HostEventCard = ({ item, onPress }: HostEventCardProps) => {
    const cfg = STATUS_CONFIG[item.status] ?? {
        label: item.status,
        color: '#6B7280',
        bgColor: '#F3F4F6',
        icon: 'help-circle-outline',
    };

    return (
        <TouchableOpacity style={styles.card} onPress={() => onPress(item.id)} activeOpacity={0.75}>
            <Image
                source={{ uri: resolveSupabaseUrl(item.imageUrl) || DEFAULT_IMAGE }}
                style={styles.cardImage}
                resizeMode="cover"
            />
            <View style={styles.cardBody}>
                <Text style={styles.cardTitle} numberOfLines={2}>{item.name}</Text>
                <View style={styles.metaRow}>
                    <Ionicons name="calendar-outline" size={13} color="#9CA3AF" />
                    <Text style={styles.metaText}>Ngày diễn ra: {formatDate(item.startDate)}</Text>
                </View>
                <View style={styles.metaRow}>
                    <Ionicons name="location-outline" size={13} color="#9CA3AF" />
                    <Text style={styles.metaText} numberOfLines={1}>Khu vực: {item.address}</Text>
                </View>
                <View style={styles.metaRow}>
                    <Ionicons name="time-outline" size={13} color="#9CA3AF" />
                    <Text style={styles.metaText}>Hạn đăng ký: {formatDate(item.recruitmentEndDate)}</Text>
                </View>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        marginBottom: 14,
        flexDirection: 'row',
        overflow: 'hidden',
        shadowColor: '#94A3B8',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.13,
        shadowRadius: 8,
        elevation: 3,
    },
    cardImage: {
        width: 110,
        height: 'auto',
        minHeight: 130,
        backgroundColor: '#E2E8F0',
    },
    cardBody: {
        flex: 1,
        padding: 13,
        justifyContent: 'center',
        gap: 2,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        paddingHorizontal: 9,
        paddingVertical: 4,
        borderRadius: 20,
        marginBottom: 5,
    },
    statusText: {
        fontSize: 11,
        fontWeight: '700',
    },
    cardTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1E293B',
        marginBottom: 7,
        lineHeight: 21,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        marginBottom: 3,
    },
    metaText: {
        fontSize: 12,
        color: '#94A3B8',
        flex: 1,
    },
});

export default HostEventCard;
