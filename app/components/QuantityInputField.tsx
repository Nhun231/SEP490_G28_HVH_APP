import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface QuantityInputFieldProps {
    label: string;
    required?: boolean;
    icon: React.ComponentProps<typeof Ionicons>['name'];
    value: string;
    onChangeText: (text: string) => void;
    onBlur?: () => void;
    error?: string;
    wrapperStyle?: object;
}

export default function QuantityInputField({
    label,
    required = false,
    icon,
    value,
    onChangeText,
    onBlur,
    error,
    wrapperStyle,
}: QuantityInputFieldProps) {
    return (
        <View style={[styles.fieldWrapper, wrapperStyle]}>
            <Text style={styles.fieldLabel}>
                {label}
                {required && <Text style={styles.required}> *</Text>}
            </Text>
            <View style={[styles.inputRow, { borderColor: error ? '#EF4444' : '#D1D5DB' }]}>
                <Ionicons name={icon} size={17} color="#9CA3AF" style={styles.inputIcon} />
                <TextInput
                    style={styles.textInput}
                    placeholder="Nhập số lượng"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="numeric"
                    value={value}
                    onBlur={onBlur}
                    onChangeText={onChangeText}
                />
                <Text style={styles.unitText}>Người</Text>
            </View>
            {error && <Text style={styles.errorText}>{error}</Text>}
        </View>
    );
}

const styles = StyleSheet.create({
    fieldWrapper: {
        marginBottom: 12,
        marginTop: 12,
    },
    fieldLabel: {
        color: '#374151',
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 6,
    },
    required: {
        color: '#EF4444',
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 3,
    },
    inputIcon: {
        marginRight: 8,
    },
    textInput: {
        flex: 1,
        color: '#1F2937',
        fontSize: 14,
        paddingVertical: 10,
    },
    unitText: {
        color: '#6B7280',
        fontSize: 13,
        marginRight: 4,
    },
    errorText: {
        color: '#EF4444',
        fontSize: 11,
        marginTop: 2,
    },
});
