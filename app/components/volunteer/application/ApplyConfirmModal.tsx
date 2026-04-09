import React, { useState, useEffect } from 'react';
import {
    Modal,
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EventSessionDetailsResponse } from '@/services/event-service';

// ─── helpers ─────────────────────────────────────────────────────────

function extractDate(iso: string): string {
    if (!iso) return '—';
    const d = new Date(iso);
    const dd = String(d.getDate()).padStart(2, '0');
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const yy = d.getFullYear();
    return `${dd}/${mo}/${yy}`;
}

function extractTime(iso: string): string {
    if (!iso) return '—';
    const d = new Date(iso);
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
}

// ─── props ────────────────────────────────────────────────────────────

interface Props {
    visible: boolean;
    session: EventSessionDetailsResponse | null;
    eventName: string;
    eventAddress: string;
    onClose: () => void;
    onConfirm: () => void;
    applying: boolean;
}

// ─── component ───────────────────────────────────────────────────────

export default function ApplyConfirmModal({
    visible,
    session,
    eventName,
    eventAddress,
    onClose,
    onConfirm,
    applying,
}: Props) {
    const [termsChecked, setTermsChecked] = useState(false);

    // Reset checkbox whenever modal opens
    useEffect(() => {
        if (visible) setTermsChecked(false);
    }, [visible]);

    if (!session) return null;

    const date = extractDate(session.startDateTime);
    const startTime = extractTime(session.startDateTime);
    const endTime = extractTime(session.endDateTime);

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.sheet}>
                    {/* ── Header ── */}
                    <View style={styles.header}>
                        <Text style={styles.headerTitle}>Xác nhận đăng ký</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn} disabled={applying}>
                            <Ionicons name="close" size={22} color="#6B7280" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                        {/* ── Sub-title ── */}
                        <Text style={styles.subTitle}>
                            Bạn có chắc chắn muốn tham gia hoạt động này?
                        </Text>

                        {/* ── Event summary card ── */}
                        <View style={styles.summaryCard}>
                            <View style={styles.summaryRow}>
                                <Ionicons name="megaphone-outline" size={16} color="#42A4F5" style={styles.summaryIcon} />
                                <Text style={styles.summaryLabel}>Hoạt động</Text>
                                <Text style={styles.summaryValue} numberOfLines={2}>{eventName}</Text>
                            </View>

                            <View style={styles.summaryDivider} />

                            <View style={styles.summaryRow}>
                                <Ionicons name="calendar-outline" size={16} color="#42A4F5" style={styles.summaryIcon} />
                                <Text style={styles.summaryLabel}>Ngày</Text>
                                <Text style={styles.summaryValue}>{date}</Text>
                            </View>

                            <View style={styles.summaryDivider} />

                            <View style={styles.summaryRow}>
                                <Ionicons name="time-outline" size={16} color="#42A4F5" style={styles.summaryIcon} />
                                <Text style={styles.summaryLabel}>Thời gian</Text>
                                <Text style={styles.summaryValue}>{startTime} – {endTime}</Text>
                            </View>

                            <View style={styles.summaryDivider} />

                            <View style={styles.summaryRow}>
                                <Ionicons name="location-outline" size={16} color="#42A4F5" style={styles.summaryIcon} />
                                <Text style={styles.summaryLabel}>Địa điểm</Text>
                                <Text style={styles.summaryValue} numberOfLines={3}>{eventAddress}</Text>
                            </View>
                        </View>

                        {/* ── Important note ── */}
                        <View style={styles.noteBox}>
                            <View style={styles.noteHeader}>
                                <Ionicons name="warning-outline" size={18} color="#D97706" />
                                <Text style={styles.noteTitle}>Lưu ý quan trọng</Text>
                            </View>
                            <View style={styles.noteBullets}>
                                <Text style={styles.noteBullet}>
                                    {'• '}Vui lòng tham gia đúng giờ. Đến trễ hơn 15 phút kể từ giờ bắt đầu sẽ bị tính là vắng mặt.
                                </Text>
                                <Text style={styles.noteBullet}>
                                    {'• '}Nếu không thể tham gia, hãy huỷ đăng ký trước ít nhất 24 giờ để nhường chỗ cho tình nguyện viên khác.
                                </Text>
                                <Text style={styles.noteBullet}>
                                    {'• '}Mang theo CMND/CCCD hoặc thẻ sinh viên để xác nhận danh tính khi check-in.
                                </Text>
                                <Text style={styles.noteBullet}>
                                    {'• '}Tuân thủ hướng dẫn của ban tổ chức trong suốt quá trình hoạt động.
                                </Text>
                            </View>
                        </View>

                        {/* ── Checkbox ── */}
                        <TouchableOpacity
                            style={styles.checkboxRow}
                            onPress={() => setTermsChecked(v => !v)}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.checkbox, termsChecked && styles.checkboxChecked]}>
                                {termsChecked && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                            </View>
                            <Text style={styles.checkboxLabel}>
                                Tôi đã đọc và hiểu rõ các lưu ý trên, và cam kết thực hiện đầy đủ.
                            </Text>
                        </TouchableOpacity>
                    </ScrollView>

                    {/* ── Footer buttons ── */}
                    <View style={styles.footer}>
                        <TouchableOpacity
                            style={styles.cancelBtn}
                            onPress={onClose}
                            disabled={applying}
                        >
                            <Text style={styles.cancelBtnText}>Hủy bỏ</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.confirmBtn,
                                (!termsChecked || applying) && styles.confirmBtnDisabled,
                            ]}
                            onPress={onConfirm}
                            disabled={!termsChecked || applying}
                        >
                            {applying ? (
                                <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                                <Text style={styles.confirmBtnText}>Xác nhận đăng ký</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

// ─── styles ──────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'flex-end',
    },
    sheet: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '90%',
        paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    },

    /* Header */
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1F2937',
    },
    closeBtn: {
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
    },

    scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 8,
    },

    /* Sub-title */
    subTitle: {
        fontSize: 14,
        color: '#4B5563',
        marginBottom: 16,
        lineHeight: 20,
    },

    /* Summary card */
    summaryCard: {
        backgroundColor: '#F0F8FF',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#BBDEFB',
        paddingHorizontal: 14,
        marginBottom: 16,
    },
    summaryRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingVertical: 12,
    },
    summaryIcon: {
        marginRight: 10,
        marginTop: 1,
    },
    summaryLabel: {
        fontSize: 13,
        color: '#6B7280',
        width: 70,
    },
    summaryValue: {
        flex: 1,
        fontSize: 13,
        fontWeight: '600',
        color: '#1F2937',
        lineHeight: 18,
    },
    summaryDivider: {
        height: 1,
        backgroundColor: '#E0F0FF',
        marginHorizontal: -14,
    },

    /* Note box */
    noteBox: {
        backgroundColor: '#FFFBEB',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#FDE68A',
        padding: 14,
        marginBottom: 16,
    },
    noteHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 10,
    },
    noteTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#92400E',
    },
    noteBullets: {
        gap: 6,
    },
    noteBullet: {
        fontSize: 13,
        color: '#78350F',
        lineHeight: 19,
    },

    /* Checkbox */
    checkboxRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
        marginBottom: 8,
    },
    checkbox: {
        width: 22,
        height: 22,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: '#D1D5DB',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 1,
        flexShrink: 0,
    },
    checkboxChecked: {
        backgroundColor: '#42A4F5',
        borderColor: '#42A4F5',
    },
    checkboxLabel: {
        flex: 1,
        fontSize: 13,
        color: '#374151',
        lineHeight: 19,
    },

    /* Footer */
    footer: {
        flexDirection: 'row',
        gap: 12,
        paddingHorizontal: 20,
        paddingTop: 14,
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
    },
    cancelBtn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: '#D1D5DB',
        alignItems: 'center',
    },
    cancelBtnText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#6B7280',
    },
    confirmBtn: {
        flex: 2,
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: '#42A4F5',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#42A4F5',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    confirmBtnDisabled: {
        backgroundColor: '#9CA3AF',
    },
    confirmBtnText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#FFFFFF',
    },
});
