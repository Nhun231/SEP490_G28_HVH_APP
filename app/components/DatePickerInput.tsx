import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Platform, Modal, Pressable, StyleSheet } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';

interface DatePickerInputProps {
    label: string;
    value?: Date;
    onChange: (date: Date) => void;
    placeholder?: string;
    minimumDate?: Date;
}

export default function DatePickerInput({
    label,
    value,
    onChange,
    placeholder = 'Chọn ngày',
    minimumDate,
}: DatePickerInputProps) {
    const [show, setShow] = useState(false);
    const normalizedMinimumDate = minimumDate
        ? new Date(minimumDate.getFullYear(), minimumDate.getMonth(), minimumDate.getDate())
        : undefined;

    const handleChange = (event: any, selectedDate?: Date) => {
        // On Android, the picker is automatically dismissed after selection or cancellation
        // On iOS, we need to handle it manually
        if (Platform.OS === 'android') {
            setShow(false);
        }

        // Only update the value if user didn't cancel
        if (event.type === 'set' && selectedDate) {
            const normalizedSelectedDate = new Date(
                selectedDate.getFullYear(),
                selectedDate.getMonth(),
                selectedDate.getDate()
            );

            if (normalizedMinimumDate && normalizedSelectedDate < normalizedMinimumDate) {
                return;
            }

            onChange(selectedDate);
            if (Platform.OS === 'ios') {
                setShow(false);
            }
        } else if (event.type === 'dismissed') {
            setShow(false);
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
                </Text>
            )}
            <TouchableOpacity
                onPress={() => setShow(true)}
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
                    onRequestClose={() => setShow(false)}
                >
                    <Pressable
                        className="flex-1 bg-black/50 justify-end"
                        onPress={() => setShow(false)}
                    >
                        <Pressable className="bg-white rounded-t-3xl" onPress={(e) => e.stopPropagation()}>
                            <View className="flex-row justify-between items-center px-4 py-3 border-b border-gray-200">
                                <TouchableOpacity onPress={() => setShow(false)}>
                                    <Text className="text-[#42A4F5] text-base font-semibold">Hủy</Text>
                                </TouchableOpacity>
                                <Text className="text-gray-800 font-semibold">Chọn ngày</Text>
                                <TouchableOpacity
                                    onPress={() => {
                                        handleChange({ type: 'set' }, value || new Date());
                                    }}
                                >
                                    <Text className="text-[#42A4F5] text-base font-semibold">Xong</Text>
                                </TouchableOpacity>
                            </View>
                            <DateTimePicker
                                value={value || new Date()}
                                mode="date"
                                display="spinner"
                                minimumDate={normalizedMinimumDate}
                                onChange={handleChange}
                                textColor="#000000"
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
