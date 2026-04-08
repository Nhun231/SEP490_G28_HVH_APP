import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { MyEventStatus } from '@/services/event-service';

export type EventStatus = MyEventStatus;

export interface ChipFilter {
    key: EventStatus;
    label: string;
}

interface StatusChipProps {
    chip: ChipFilter;
    isActive: boolean;
    onPress: () => void;
}

const StatusChip = ({ chip, isActive, onPress }: StatusChipProps) => (
    <TouchableOpacity
        style={[styles.chip, isActive && styles.chipActive]}
        onPress={onPress}
        activeOpacity={0.7}
    >
        <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{chip.label}</Text>
    </TouchableOpacity>
);

const styles = StyleSheet.create({
    chip: {
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 20,
        backgroundColor: '#FFFFFF',
        borderWidth: 1.5,
        borderColor: '#E2E8F0',
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
});

export default StatusChip;
