import { EventSessionDetailsResponse } from '@/services/event-types'
import { Ionicons } from '@expo/vector-icons'
import React from 'react'
import { StyleSheet, Text, View } from 'react-native'

// ─── helpers ─────────────────────────────────────────────────────────

function extractDate(iso: string): string {
    if (!iso) return '—'
    const d = new Date(iso)
    const dd = String(d.getDate()).padStart(2, '0')
    const mo = String(d.getMonth() + 1).padStart(2, '0')
    const yy = d.getFullYear()
    return `${dd}/${mo}/${yy}`
}

function extractTime(iso: string): string {
    if (!iso) return '—'
    const d = new Date(iso)
    const hh = String(d.getHours()).padStart(2, '0')
    const mm = String(d.getMinutes()).padStart(2, '0')
    return `${hh}:${mm}`
}

// ─── props ────────────────────────────────────────────────────────────

interface Props {
    session: EventSessionDetailsResponse
    index: number
}

// ─── component ───────────────────────────────────────────────────────

export default function EventSessionCard({ session, index }: Props) {
    return (
        <View style={styles.card}>
            {/* Day label */}
            <Text style={styles.dayLabel}>Ngày {index + 1}</Text>

            {/* Date row */}
            <View style={styles.row}>
                <Ionicons name="calendar-outline" size={16} color="#6B7280" style={styles.rowIcon} />
                <Text style={styles.rowLabel}>Ngày tổ chức</Text>
                <Text style={styles.rowValue}>{extractDate(session.startDateTime)}</Text>
            </View>

            {/* Start / End time — side by side */}
            <View style={styles.timeRow}>
                <View style={styles.timeBlock}>
                    <Ionicons name="time-outline" size={16} color="#6B7280" style={styles.rowIcon} />
                    <View>
                        <Text style={styles.timeLabel}>Giờ bắt đầu</Text>
                        <Text style={styles.timeValue}>{extractTime(session.startDateTime)}</Text>
                    </View>
                </View>

                <View style={styles.timeDivider} />

                <View style={[styles.timeBlock, { justifyContent: 'flex-end' }]}>
                    <View style={{ alignItems: 'flex-end' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                            <Ionicons name="time-outline" size={16} color="#6B7280" style={{ marginRight: 6 }} />
                            <Text style={[styles.timeLabel, { marginBottom: 0 }]}>Giờ kết thúc</Text>
                        </View>
                        <Text style={styles.timeValue}>{extractTime(session.endDateTime)}</Text>
                    </View>
                </View>
            </View>

            {/* Volunteer count */}
            <View style={styles.row}>
                <Ionicons name="people-outline" size={16} color="#6B7280" style={styles.rowIcon} />
                <Text style={styles.rowLabel}>Số lượng TNV cần tuyển</Text>
                <Text style={styles.countValue}>{session.expectedVolAmount} Người</Text>
            </View>

            {/* Served count */}
            <View style={styles.row}>
                <Ionicons name="heart-outline" size={16} color="#6B7280" style={styles.rowIcon} />
                <Text style={styles.rowLabel}>Số lượng đối tượng phục vụ</Text>
                <Text style={styles.countValue}>{session.expectedSerAmount} Người</Text>
            </View>

            {/* Approved application count per session */}
            <View style={styles.row}>
                <Ionicons name="checkmark-circle-outline" size={16} color="#6B7280" style={styles.rowIcon} />
                <Text style={styles.rowLabel}>Số TNV đã được duyệt</Text>
                <Text style={[styles.countValue, { color: '#10B981' }]}>{session.approvedApplicationCount} Người</Text>
            </View>

        </View>
    )
}

// ─── styles ──────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 2,
    },
    dayLabel: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1F2937',
        marginBottom: 12,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
    },
    rowIcon: {
        marginRight: 8,
    },
    rowLabel: {
        flex: 1,
        fontSize: 13,
        color: '#6B7280',
    },
    rowValue: {
        fontSize: 13,
        fontWeight: '600',
        color: '#1F2937',
    },
    countValue: {
        fontSize: 13,
        fontWeight: '600',
        color: '#42A4F5',
    },
    timeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
    },
    timeBlock: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    timeLabel: {
        fontSize: 12,
        color: '#6B7280',
        marginBottom: 2,
    },
    timeValue: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1F2937',
    },
    timeDivider: {
        width: 1,
        height: 36,
        backgroundColor: '#E5E7EB',
        marginHorizontal: 12,
    },
})
