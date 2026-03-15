import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Platform, Modal, Pressable, StyleSheet } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';

interface DatePickerInputProps {
    label: string;
    value?: Date;
    onChange: (date: Date) => void;
    onDismiss?: () => void;
    placeholder?: string;
    minimumDate?: Date;
    required?: boolean;
}

export default function DatePickerInput({
    label,
    value,
    onChange,
    onDismiss,
    placeholder = 'Chọn ngày',
    minimumDate,
    required = false,
}: DatePickerInputProps) {
    const [show, setShow] = useState(false);
    const [pendingDate, setPendingDate] = useState<Date | undefined>(undefined);
    const normalizedMinimumDate = minimumDate
        ? new Date(minimumDate.getFullYear(), minimumDate.getMonth(), minimumDate.getDate())
        : undefined;

    const getInitialPickerDate = () => value || normalizedMinimumDate || new Date();

    const openPicker = () => {
        setPendingDate(getInitialPickerDate());
        setShow(true);
    };

    const dismissPicker = () => {
        setShow(false);
        setPendingDate(undefined);
        onDismiss?.();
    };

    const commitDate = (date: Date) => {
        const normalizedSelectedDate = new Date(
            date.getFullYear(),
            date.getMonth(),
            date.getDate()
        );

        if (normalizedMinimumDate && normalizedSelectedDate < normalizedMinimumDate) {
            return;
        }

        onChange(normalizedSelectedDate);
        setShow(false);
        setPendingDate(undefined);
    };

    const handleChange = (event: any, selectedDate?: Date) => {
        if (Platform.OS === 'android') {
            setShow(false);
            if (event.type === 'set' && selectedDate) {
                commitDate(selectedDate);
            } else if (event.type === 'dismissed') {
                dismissPicker();
            }
            return;
        }

        if (event.type === 'set' && selectedDate) {
            setPendingDate(selectedDate);
        } else if (event.type === 'dismissed') {
            dismissPicker();
        }
    };

    const formatDate = (date: Date) => {
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    };

    return (
        <View className="mb-4">
            {label && (
                <Text className="text-gray-700 text-sm font-medium mb-2">
                    {label}
                    {required && <Text style={styles.required}> *</Text>}
                </Text>
            )}
            <TouchableOpacity
                onPress={openPicker}
                style={styles.inputBox}
            >
                <Ionicons name="calendar-outline" size={18} color="#9CA3AF" style={styles.icon} />
                <Text style={[styles.valueText, { color: value ? '#1F2937' : '#9CA3AF' }]}>
                    {value ? formatDate(value) : placeholder}
                </Text>
                <Ionicons name="chevron-down-outline" size={16} color="#9CA3AF" />
            </TouchableOpacity>

            {show && Platform.OS === 'ios' && (
                <Modal
                    transparent={true}
                    animationType="slide"
                    visible={show}
                    onRequestClose={dismissPicker}
                >
                    <Pressable
                        className="flex-1 bg-black/50 justify-end"
                        onPress={dismissPicker}
                    >
                        <Pressable className="bg-white rounded-t-3xl" onPress={(e) => e.stopPropagation()}>
                            <View className="flex-row justify-between items-center px-4 py-3 border-b border-gray-200">
                                <TouchableOpacity onPress={dismissPicker}>
                                    <Text className="text-[#42A4F5] text-base font-semibold">Hủy</Text>
                                </TouchableOpacity>
                                <Text className="text-gray-800 font-semibold">Chọn ngày</Text>
                                <TouchableOpacity
                                    onPress={() => {
                                        commitDate(pendingDate || getInitialPickerDate());
                                    }}
                                >
                                    <Text className="text-[#42A4F5] text-base font-semibold">Xong</Text>
                                </TouchableOpacity>
                            </View>
                            <DateTimePicker
                                value={pendingDate || getInitialPickerDate()}
                                mode="date"
                                display="spinner"
                                minimumDate={normalizedMinimumDate}
                                onChange={handleChange}
                                themeVariant="light"
                                style={styles.spinner}
                            />
                        </Pressable>
                    </Pressable>
                </Modal>
            )}

            {show && Platform.OS === 'android' && (
                <DateTimePicker
                    value={value || new Date()}
                    mode="date"
                    display="default"
                    minimumDate={normalizedMinimumDate}
                    onChange={handleChange}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    required: {
        color: '#EF4444',
    },
    inputBox: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 13,
        flexDirection: 'row',
        alignItems: 'center',
    },
    icon: {
        marginRight: 8,
    },
    valueText: {
        flex: 1,
        fontSize: 14,
    },
    spinner: {
        backgroundColor: '#FFFFFF',
        height: 200,
    },
});
