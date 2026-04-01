import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MyEventStatus } from '@/services/event-service';

export type EventStatus = MyEventStatus;

export interface ChipFilter {
    key: EventStatus;
    label: string;
}

interface StatusChipProps {
    chip: ChipFilter;
    isActive: boolean;
    count: number;
    onPress: () => void;
}

const StatusChip = ({ chip, isActive, count, onPress }: StatusChipProps) => (
    <TouchableOpacity
        style={[styles.chip, isActive && styles.chipActive]}
        onPress={onPress}
        activeOpacity={0.7}
    >
        <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{chip.label}</Text>
        {count > 0 && (
            <View style={[styles.chipBadge, isActive && styles.chipBadgeActive]}>
                <Text style={[styles.chipBadgeText, isActive && styles.chipBadgeTextActive]}>{count}</Text>
            </View>
        )}
    </TouchableOpacity>
);

const styles = StyleSheet.create({
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 20,
        backgroundColor: '#FFFFFF',
        borderWidth: 1.5,
        borderColor: '#E2E8F0',
        gap: 5,
    },
    chipActive: {
        backgroundColor: '#42A4F5',
        borderColor: '#42A4F5',
    },
    chipText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#64748B',
    },
    chipTextActive: {
        color: '#FFFFFF',
    },
    chipBadge: {
        backgroundColor: '#E2E8F0',
        borderRadius: 10,
        paddingHorizontal: 6,
        paddingVertical: 1,
        minWidth: 20,
        alignItems: 'center',
    },
    chipBadgeActive: {
        backgroundColor: 'rgba(255,255,255,0.3)',
    },
    chipBadgeText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#64748B',
    },
    chipBadgeTextActive: {
        color: '#FFFFFF',
    },
});

export default StatusChip;
