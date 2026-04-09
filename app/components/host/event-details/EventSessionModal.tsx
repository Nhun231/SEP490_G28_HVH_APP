import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { EventSessionResponse } from '@/services/event-service';

function parseIsoDateTime(iso: string): { date: string; time: string } {
    const [datePart, timePart] = iso.split('T');
    const [y, m, d] = datePart.split('-');
    return { date: `${d}/${m}/${y}`, time: timePart?.slice(0, 5) ?? '' };
}

export interface EventSessionModalProps {
    visible: boolean;
    onClose: () => void;
    eventName: string;
    sessions: EventSessionResponse[];
}

const EventSessionModal: React.FC<EventSessionModalProps> = ({
    visible,
    onClose,
    eventName,
    sessions,
}) => {
    const router = useRouter();

    const handleSelectSession = (sessionId: string) => {
        onClose();
        router.push({
            pathname: '/screen/host-sceens/event-applications',
            params: { eventName, sessionId },
        });
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.overlay}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.card}>
                        <Text style={styles.title}>Chọn buổi tình nguyện</Text>
                        <Text style={styles.description}>
                            Chọn một buổi để xem danh sách tình nguyện viên đã đăng ký tham gia.
                        </Text>

                        {/* Session list */}
                        {sessions.map((session, idx) => {
                            const start = parseIsoDateTime(session.startDateTime);
                            const end = parseIsoDateTime(session.endDateTime);

                            return (
                                <TouchableOpacity
                                    key={session.id}
                                    style={styles.sessionCard}
                                    activeOpacity={0.85}
                                    onPress={() => handleSelectSession(session.id)}
                                >
                                    {/* Index badge */}
                                    <View style={styles.indexBadge}>
                                        <Text style={styles.indexText}>{idx + 1}</Text>
                                    </View>

                                    {/* Info */}
                                    <View style={styles.info}>
                                        <View style={styles.row}>
                                            <Ionicons name="calendar-outline" size={14} color="#42A4F5" />
                                            <Text style={styles.dateText}>{start.date}</Text>
                                        </View>
                                        <View style={styles.row}>
                                            <Ionicons name="time-outline" size={14} color="#64748B" />
                                            <Text style={styles.timeText}>
                                                {start.time} – {end.time}
                                            </Text>
                                        </View>
                                        <View style={styles.statsRow}>
                                            <View style={styles.statItem}>
                                                <Ionicons name="people-outline" size={13} color="#7C3AED" />
                                                <Text style={styles.statText}>
                                                    {session.expectedVolAmount} TNV
                                                </Text>
                                            </View>
                                            <View style={styles.statItem}>
                                                <Ionicons name="heart-outline" size={13} color="#EC4899" />
                                                <Text style={styles.statText}>
                                                    {session.expectedSerAmount} phục vụ
                                                </Text>
                                            </View>
                                        </View>
                                    </View>

                                    <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
                                </TouchableOpacity>
                            );
                        })}

                        {/* Close button */}
                        <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.8}>
                            <Text style={styles.closeBtnText}>Đóng</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </Modal>
    );
};

export default EventSessionModal;

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingHorizontal: 24,
        paddingVertical: 24,
    },

    /* Main card */
    card: {
        width: '100%',
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.18,
        shadowRadius: 20,
        elevation: 12,
    },

    /* Icon */
    iconCircle: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#EFF6FF',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },

    /* Title & description */
    title: {
        fontSize: 20,
        fontWeight: '800',
        color: '#1E293B',
        marginBottom: 8,
        textAlign: 'center',
    },
    description: {
        fontSize: 14,
        color: '#64748B',
        textAlign: 'center',
        lineHeight: 21,
        marginBottom: 20,
    },

    /* Session card */
    sessionCard: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        borderRadius: 14,
        padding: 14,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        gap: 12,
    },
    indexBadge: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#42A4F5',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    indexText: {
        fontSize: 14,
        fontWeight: '800',
        color: '#FFFFFF',
    },
    info: {
        flex: 1,
        gap: 4,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    dateText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1E293B',
    },
    timeText: {
        fontSize: 13,
        color: '#64748B',
    },
    statsRow: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 2,
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    statText: {
        fontSize: 12,
        color: '#64748B',
        fontWeight: '500',
    },

    /* Close button */
    closeBtn: {
        width: '100%',
        paddingVertical: 13,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: '#E2E8F0',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFFFFF',
        marginTop: 4,
    },
    closeBtnText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#64748B',
    },
});