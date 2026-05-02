import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ApproveRejectModal, { ModalAction } from './ApproveRejectModal';

export interface VolunteerApplication {
    id: string;
    name: string;
    nickName?: string | null;
    email?: string | null;
    phone?: string | null;
    checkInTime?: string | null;
    checkOutTime?: string | null;
    avatarUrl?: string | null;
    creditScore: number;
    honorScore: number;
    address: string;
    createdAt: string;
    status: 'PENDING' | 'APPROVED' | 'COMPLETED';
    /** Only present for COMPLETED applications: true = host already reviewed this volunteer */
    reviewed?: boolean;
}

interface VolunteerCardProps {
    item: VolunteerApplication;
    onApprove: (item: VolunteerApplication) => void;
    onReject: (item: VolunteerApplication, reason?: string) => void;
    onReview?: (item: VolunteerApplication) => void;
    eventStatus?: string;
    sessionStartTime?: string | null;
}

// get initials for avatar default
const getInitials = (name: string): string => {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
    return (parts[parts.length - 2][0] + parts[parts.length - 1][0]).toUpperCase();
};

// format relative time from ISO string to Vietnamese
const formatRelativeTime = (isoString: string): string => {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    if (diffSecs < 60) return 'Vừa xong';
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays === 1) return '1 ngày trước';
    return `${diffDays} ngày trước`;
};

// format ISO datetime to "X giờ Y phút" for check-in display
const formatCheckInTime = (isoString: string): string => {
    const d = new Date(isoString);
    const h = d.getHours();
    const m = d.getMinutes();
    return `${h} giờ ${m > 0 ? m + ' phút' : ''}`;
};

const VolunteerCard: React.FC<VolunteerCardProps> = ({ item, onApprove, onReject, onReview, eventStatus, sessionStartTime }) => {
    const [modalVisible, setModalVisible] = useState(false);
    const [pendingAction, setPendingAction] = useState<ModalAction>('approve');

    const totalHours = item.creditScore + item.honorScore;
    const displayName = item.nickName ? `${item.name} (${item.nickName})` : item.name;
    const initials = getInitials(item.name);
    const displayAddress = item.address || 'Chưa cập nhật';

    const handleApprovePress = () => {
        setPendingAction('approve');
        setModalVisible(true);
    };

    const handleRejectPress = () => {
        setPendingAction('reject');
        setModalVisible(true);
    };

    const handleConfirm = (rejectReason?: string) => {
        setModalVisible(false);
        if (pendingAction === 'approve') onApprove(item);
        else onReject(item, rejectReason);
    };

    return (
        <>
            <TouchableOpacity
                style={styles.card}
                activeOpacity={item.status === 'COMPLETED' && !item.reviewed && !!onReview ? 0.75 : 1}
                onPress={item.status === 'COMPLETED' && !item.reviewed && onReview ? () => onReview(item) : undefined}
            >
                {/* Review badge — only for COMPLETED not yet reviewed */}
                {item.status === 'COMPLETED' && !item.reviewed && !!onReview && (
                    <View style={styles.reviewBadge}>
                        <Ionicons name="star-outline" size={11} color="#42A4F5" />
                        <Text style={styles.reviewBadgeText}>Đánh giá</Text>
                    </View>
                )}
                {/* Reviewed indicator — already evaluated */}
                {item.status === 'COMPLETED' && item.reviewed && (
                    <View style={[styles.reviewBadge, styles.reviewedBadge]}>
                        <Ionicons name="checkmark-circle" size={11} color="#16A34A" />
                        <Text style={[styles.reviewBadgeText, styles.reviewedBadgeText]}>Đã đánh giá</Text>
                    </View>
                )}
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                    {/* Avatar */}
                    <View style={[styles.avatar, { backgroundColor: '#42A4F5' }]}>
                        {item.avatarUrl ? (
                            <Image source={{ uri: item.avatarUrl }} style={styles.avatarImage} />
                        ) : (
                            <Text style={styles.avatarText}>{initials}</Text>
                        )}
                    </View>

                    {/* Info */}
                    <View style={{ flex: 1 }}>
                        <Text style={styles.name}>{displayName}</Text>

                        <View style={styles.infoRow}>
                            <Ionicons name="time-outline" size={14} color="#64748B" />
                            <Text style={styles.infoLabel}>Số giờ tình nguyện: </Text>
                            <Text style={styles.infoHours}>{totalHours}h</Text>
                        </View>

                        <View style={styles.infoRow}>
                            <Ionicons name="location-outline" size={14} color="#64748B" />
                            <Text style={styles.infoText} numberOfLines={1}>Địa chỉ: {displayAddress}</Text>
                        </View>
                        {['APPROVED', 'COMPLETED'].includes(item.status) && item.email && (
                            <View style={styles.infoRow}>
                                <Ionicons name="mail-outline" size={14} color="#64748B" />
                                <Text style={styles.infoText} numberOfLines={1}>Email: {item.email}</Text>
                            </View>
                        )}

                        {['APPROVED', 'COMPLETED'].includes(item.status) && item.phone && (
                            <View style={styles.infoRow}>
                                <Ionicons name="call-outline" size={14} color="#64748B" />
                                <Text style={styles.infoText} numberOfLines={1}>SĐT: {item.phone}</Text>
                            </View>
                        )}

                        {/* Attendance badge — for ONGOING, ENDED, COMPLETED events */}
                        {['APPROVED', 'COMPLETED'].includes(item.status) && ['ONGOING', 'ENDED', 'COMPLETED'].includes(eventStatus ?? '') && (() => {
                            const checkedIn = !!item.checkInTime &&
                                (!sessionStartTime ||
                                    new Date(item.checkInTime) >= new Date(sessionStartTime));
                            return checkedIn ? (
                                <View style={[styles.attendanceBadge, styles.attendanceBadgePresent]}>
                                    <Ionicons name="checkmark-circle" size={14} color="#16A34A" />
                                    <Text style={[styles.attendanceBadgeText, { color: '#16A34A' }]}>
                                        {'Đã điểm danh (Lúc: ' + formatCheckInTime(item.checkInTime!) + ')'}
                                    </Text>
                                </View>
                            ) : (
                                <View style={[styles.attendanceBadge, styles.attendanceBadgeAbsent]}>
                                    <Ionicons name="close-circle" size={14} color="#DC2626" />
                                    <Text style={[styles.attendanceBadgeText, { color: '#DC2626' }]}>Vắng</Text>
                                </View>
                            );
                        })()}

                        {item.status === 'PENDING' && (
                            <Text style={styles.timeAgo}>
                                Đăng ký: {formatRelativeTime(item.createdAt)}
                            </Text>
                        )}
                    </View>
                </View>

                {/* Action buttons – only for PENDING */}
                {item.status === 'PENDING' && (
                    <View style={styles.btnRow}>
                        <TouchableOpacity
                            style={styles.rejectBtn}
                            onPress={handleRejectPress}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="close" size={16} color="#42A4F5" />
                            <Text style={styles.rejectBtnText}>Từ chối</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.approveBtn}
                            onPress={handleApprovePress}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                            <Text style={styles.approveBtnText}>Duyệt</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </TouchableOpacity>

            <ApproveRejectModal
                visible={modalVisible}
                action={pendingAction}
                volunteer={item}
                onCancel={() => setModalVisible(false)}
                onConfirm={handleConfirm}
            />
        </>
    );
};

export default VolunteerCard;

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.07,
        shadowRadius: 8,
        elevation: 3,
    },
    avatar: {
        width: 52,
        height: 52,
        borderRadius: 26,
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    avatarImage: {
        width: 52,
        height: 52,
        borderRadius: 26,
    },
    avatarText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    name: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1E293B',
        marginBottom: 5,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 3,
        gap: 4,
    },
    infoLabel: {
        fontSize: 13,
        color: '#64748B',
    },
    infoHours: {
        fontSize: 13,
        fontWeight: '700',
        color: '#42A4F5',
    },
    infoText: {
        fontSize: 13,
        color: '#64748B',
        flex: 1,
    },
    timeAgo: {
        fontSize: 12,
        color: '#94A3B8',
        marginTop: 4,
    },
    btnRow: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 14,
    },
    rejectBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 10,
        borderWidth: 1.5,
        borderColor: '#42A4F5',
        gap: 5,
        backgroundColor: '#EFF6FF',
    },
    rejectBtnText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#42A4F5',
    },
    approveBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 10,
        backgroundColor: '#42A4F5',
        gap: 5,
    },
    approveBtnText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    attendanceBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
        marginTop: 6,
        gap: 4,
    },
    attendanceBadgePresent: {
        backgroundColor: '#DCFCE7',
    },
    attendanceBadgeAbsent: {
        backgroundColor: '#FEE2E2',
    },
    attendanceBadgeText: {
        fontSize: 12,
        fontWeight: '700',
    },
    reviewBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-end',
        gap: 3,
        backgroundColor: '#EFF6FF',
        borderRadius: 20,
        paddingHorizontal: 8,
        paddingVertical: 3,
        marginBottom: 6,
    },
    reviewBadgeText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#42A4F5',
    },
    reviewedBadge: {
        backgroundColor: '#DCFCE7',
    },
    reviewedBadgeText: {
        color: '#16A34A',
    },
});
