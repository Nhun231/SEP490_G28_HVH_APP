import React from 'react';
import {
    Modal,
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    FlatList,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EventSessionDetailsResponse } from '@/services/event-types';


function extractDate(iso: string): string {
    if (!iso) return '—';
    const d = new Date(iso);
    const dd = String(d.getDate()).padStart(2, '0');
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const yy = d.getFullYear();
    const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    const dayLabel = days[d.getDay()];
    return `${dayLabel}, ${dd}/${mo}/${yy}`;
}

function extractTime(iso: string): string {
    if (!iso) return '—';
    const d = new Date(iso);
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
}


interface Props {
    visible: boolean;
    sessions: EventSessionDetailsResponse[];
    onSelect: (session: EventSessionDetailsResponse) => void;
    onClose: () => void;
}


export default function SessionPickerSheet({ visible, sessions, onSelect, onClose }: Props) {
    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.sheet}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.headerTitle}>Chọn buổi tham gia</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <Ionicons name="close" size={22} color="#6B7280" />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.subTitle}>
                        Hoạt động có {sessions.length} buổi. Vui lòng chọn buổi bạn muốn tham gia.
                    </Text>

                    <FlatList
                        data={sessions}
                        keyExtractor={(item, i) => item.id || String(i)}
                        contentContainerStyle={styles.listContent}
                        renderItem={({ item, index }) => {
                            const date = extractDate(item.startDateTime);
                            const start = extractTime(item.startDateTime);
                            const end = extractTime(item.endDateTime);
                            return (
                                <TouchableOpacity
                                    style={styles.sessionItem}
                                    onPress={() => onSelect(item)}
                                    activeOpacity={0.75}
                                >
                                    <View style={styles.sessionIndexBadge}>
                                        <Text style={styles.sessionIndexText}>{index + 1}</Text>
                                    </View>

                                    <View style={styles.sessionInfo}>
                                        <Text style={styles.sessionDate}>{date}</Text>
                                        <View style={styles.sessionTimeRow}>
                                            <Ionicons name="time-outline" size={13} color="#6B7280" />
                                            <Text style={styles.sessionTime}>{start} – {end}</Text>
                                        </View>
                                        <View style={styles.sessionVolRow}>
                                            <Ionicons name="people-outline" size={13} color="#42A4F5" />
                                            <Text style={styles.sessionVol}>{item.expectedVolAmount} tình nguyện viên cần tuyển</Text>
                                        </View>
                                    </View>

                                    <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                                </TouchableOpacity>
                            );
                        }}
                        ItemSeparatorComponent={() => <View style={styles.separator} />}
                    />
                </View>
            </View>
        </Modal>
    );
}


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
        maxHeight: '75%',
        paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    },
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
    subTitle: {
        fontSize: 13,
        color: '#6B7280',
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: 4,
        lineHeight: 19,
    },
    listContent: {
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 8,
    },
    sessionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        padding: 14,
        gap: 12,
    },
    sessionIndexBadge: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#E3F2FD',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    sessionIndexText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#42A4F5',
    },
    sessionInfo: {
        flex: 1,
        gap: 4,
    },
    sessionDate: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1F2937',
    },
    sessionTimeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    sessionTime: {
        fontSize: 13,
        color: '#4B5563',
    },
    sessionVolRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    sessionVol: {
        fontSize: 12,
        color: '#42A4F5',
        fontWeight: '500',
    },
    separator: {
        height: 10,
    },
});
