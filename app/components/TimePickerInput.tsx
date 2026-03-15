import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Platform, Modal, Pressable, StyleSheet } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';

interface TimePickerInputProps {
    label: string;
    value?: Date;
    onChange: (time: Date) => void;
    onDismiss?: () => void;
    placeholder?: string;
    minHour?: number;
    maxHour?: number;
    onInvalidSelection?: (message: string) => void;
    required?: boolean;
}

export default function TimePickerInput({
    label,
    value,
    onChange,
    onDismiss,
    placeholder = 'Chọn thời gian',
    minHour,
    maxHour,
    onInvalidSelection,
    required = false,
}: TimePickerInputProps) {
    const [show, setShow] = useState(false);

    const isWithinAllowedRange = (time: Date) => {
        const minutes = time.getHours() * 60 + time.getMinutes();
        const minMinutes = typeof minHour === 'number' ? minHour * 60 : 0;
        const maxMinutes = typeof maxHour === 'number' ? maxHour * 60 : 24 * 60 - 1;
        return minutes >= minMinutes && minutes <= maxMinutes;
    };

    const handleChange = (event: any, selectedTime?: Date) => {
        // On Android, the picker is automatically dismissed after selection or cancellation
        // On iOS, we need to handle it manually
        if (Platform.OS === 'android') {
            setShow(false);
        }
        
        // Only update the value if user didn't cancel
        if (event.type === 'set' && selectedTime) {
            if (!isWithinAllowedRange(selectedTime)) {
                onInvalidSelection?.(`Giờ chỉ được chọn trong khoảng ${String(minHour ?? 0).padStart(2, '0')}:00 đến ${String(maxHour ?? 23).padStart(2, '0')}:00`);
                return;
            }
            onChange(selectedTime);
            if (Platform.OS === 'ios') {
                setShow(false);
            }
        } else if (event.type === 'dismissed') {
            setShow(false);
            onDismiss?.();
        }
    };

    const formatTime = (date: Date) => {
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
    };

    return (
        <View className="mb-4">
            <Text className="text-gray-700 text-sm font-medium mb-2">
                {label}
                {required && <Text style={styles.required}> *</Text>}
            </Text>
            <TouchableOpacity
                onPress={() => setShow(true)}
                style={styles.inputBox}
            >
                <Ionicons name="time-outline" size={18} color="#9CA3AF" style={styles.icon} />
                <Text style={[styles.valueText, { color: value ? '#1F2937' : '#9CA3AF' }]}>
                    {value ? formatTime(value) : placeholder}
                </Text>
                <Ionicons name="chevron-down-outline" size={16} color="#9CA3AF" />
            </TouchableOpacity>

            {show && Platform.OS === 'ios' && (
                <Modal
                    transparent={true}
                    animationType="slide"
                    visible={show}
                    onRequestClose={() => {
                        setShow(false);
                        onDismiss?.();
                    }}
                >
                    <Pressable 
                        className="flex-1 bg-black/50 justify-end"
                        onPress={() => {
                            setShow(false);
                            onDismiss?.();
                        }}
                    >
                        <Pressable className="bg-white rounded-t-3xl" onPress={(e) => e.stopPropagation()}>
                            <View className="flex-row justify-between items-center px-4 py-3 border-b border-gray-200">
                                <TouchableOpacity onPress={() => {
                                    setShow(false);
                                    onDismiss?.();
                                }}>
                                    <Text className="text-[#42A4F5] text-base font-semibold">Hủy</Text>
                                </TouchableOpacity>
                                <Text className="text-gray-800 font-semibold">Chọn thời gian</Text>
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
                                mode="time"
                                is24Hour={true}
                                display="spinner"
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
                    mode="time"
                    is24Hour={true}
                    display="default"
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
