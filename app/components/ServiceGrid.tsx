import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface ServiceOption {
    key: string;
    label: string;
    icon: string;
    iconColor: string;
    bgColor: string;
    onPress: () => void;
}

interface ServiceGridProps {
    options: ServiceOption[];
}

const ServiceGrid = ({ options }: ServiceGridProps) => (
    <View style={styles.serviceGrid}>
        {options.map(opt => (
            <TouchableOpacity
                key={opt.key}
                style={styles.serviceItem}
                onPress={opt.onPress}
                activeOpacity={0.7}
            >
                <View style={[styles.serviceIconWrapper, { backgroundColor: opt.bgColor }]}>
                    <Ionicons name={opt.icon as any} size={22} color={opt.iconColor} />
                </View>
                <Text style={styles.serviceLabel}>{opt.label}</Text>
            </TouchableOpacity>
        ))}
    </View>
);

const styles = StyleSheet.create({
    serviceGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    serviceItem: {
        width: '22%',
        alignItems: 'center',
        gap: 7,
    },
    serviceIconWrapper: {
        width: 52,
        height: 52,
        borderRadius: 26,
        alignItems: 'center',
        justifyContent: 'center',
    },
    serviceLabel: {
        fontSize: 11.5,
        fontWeight: '600',
        color: '#374151',
        textAlign: 'center',
        lineHeight: 15,
    },
});

export default ServiceGrid;
