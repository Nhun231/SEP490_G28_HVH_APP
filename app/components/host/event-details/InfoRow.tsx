import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface InfoRowProps {
    icon: string;
    label?: string;
    value: string;
    valueColor?: string;
    bold?: boolean;
}

const InfoRow = ({ icon, label, value, valueColor, bold }: InfoRowProps) => (
    <View style={styles.infoRow}>
        <Ionicons name={icon as any} size={17} color="#42A4F5" style={{ marginTop: 1 }} />
        <View style={{ flex: 1, marginLeft: 10 }}>
            {label ? <Text style={styles.infoLabel}>{label}</Text> : null}
            <Text style={[styles.infoValue, valueColor ? { color: valueColor } : {}, bold ? { fontWeight: '700' } : {}]}>
                {value}
            </Text>
        </View>
    </View>
);

const styles = StyleSheet.create({
    infoRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 2,
    },
    infoLabel: {
        fontSize: 11,
        color: '#9CA3AF',
        marginBottom: 2,
    },
    infoValue: {
        fontSize: 14,
        color: '#1E293B',
        fontWeight: '500',
        lineHeight: 20,
    },
});

export default InfoRow;
