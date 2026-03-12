import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Platform, Modal, Pressable } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';

interface DatePickerInputProps {
    label: string;
    value?: Date;
    onChange: (date: Date) => void;
    required?: boolean;
    placeholder?: string;
}

export default function DatePickerInput({
    label,
    value,
    onChange,
    required = false,
    placeholder = 'Chọn ngày',
}: DatePickerInputProps) {
    const [show, setShow] = useState(false);

    const handleChange = (event: any, selectedDate?: Date) => {
        // On Android, the picker is automatically dismissed after selection or cancellation
        // On iOS, we need to handle it manually
        if (Platform.OS === 'android') {
            setShow(false);
        }

        // Only update the value if user didn't cancel
        if (event.type === 'set' && selectedDate) {
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
                    {required && <Text className="text-red-500">* </Text>}
                    {label}
                </Text>
            )}
            <TouchableOpacity
                onPress={() => setShow(true)}
                className="bg-[#E3F2FD] border-b border-gray-200 rounded-lg px-4 py-3 flex-row justify-between items-center"
            >
                <Text className={value ? 'text-gray-800' : 'text-gray-400'}>
                    {value ? formatDate(value) : placeholder}
                </Text>
                <Ionicons name="calendar-outline" size={20} color="#9CA3AF" />
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
                                    <Text className="text-[#42A5F5] text-base font-semibold">Hủy</Text>
                                </TouchableOpacity>
                                <Text className="text-gray-800 font-semibold">Chọn ngày</Text>
                                <TouchableOpacity
                                    onPress={() => {
                                        handleChange({ type: 'set' }, value || new Date());
                                    }}
                                >
                                    <Text className="text-[#42A5F5] text-base font-semibold">Xong</Text>
                                </TouchableOpacity>
                            </View>
                            <DateTimePicker
                                value={value || new Date()}
                                mode="date"
                                display="spinner"
                                onChange={(event, date) => {
                                    if (date) onChange(date);
                                }}
                                textColor="#000000"
                                style={{ backgroundColor: '#FFFFFF', height: 200 }}
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
                    onChange={handleChange}
                />
            )}
        </View>
    );
}
