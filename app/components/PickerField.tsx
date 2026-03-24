import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { OptionItem } from './BottomSheetPicker';

interface PickerFieldProps {
    label: string;
    required?: boolean;
    icon: React.ComponentProps<typeof Ionicons>['name'];
    value?: OptionItem;
    placeholder: string;
    onPress: () => void;
    error?: string;
    disabled?: boolean;
}

export default function PickerField({
    label,
    required = false,
    icon,
    value,
    placeholder,
    onPress,
    error,
    disabled = false,
}: PickerFieldProps) {
    return (
        <View style={styles.fieldWrapper}>
            <Text style={styles.fieldLabel}>
                {label}
                {required && <Text style={styles.required}> *</Text>}
            </Text>
            <TouchableOpacity
                onPress={onPress}
                disabled={disabled}
                style={[
                    styles.pickerRow,
                    { borderColor: error ? '#EF4444' : '#D1D5DB' },
                    disabled && styles.disabled,
                ]}
            >
                <Ionicons name={icon} size={17} color="#9CA3AF" style={styles.inputIcon} />
                <Text
                    style={[styles.pickerText, { color: value ? '#1F2937' : '#9CA3AF' }]}
                    numberOfLines={1}
                >
                    {value?.label || placeholder}
                </Text>
                <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
            </TouchableOpacity>
            {error && <Text style={styles.errorText}>{error}</Text>}
        </View>
    );
}

const styles = StyleSheet.create({
    fieldWrapper: {
        marginBottom: 16,
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
    pickerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 13,
    },
    inputIcon: {
        marginRight: 8,
    },
    pickerText: {
        flex: 1,
        fontSize: 14,
    },
    disabled: {
        opacity: 0.5,
    },
    errorText: {
        color: '#EF4444',
        fontSize: 11,
        marginTop: 2,
    },
});
