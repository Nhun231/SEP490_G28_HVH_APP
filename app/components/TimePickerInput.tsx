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
    required?: boolean;
}

export default function TimePickerInput({
    label,
    value,
    onChange,
    onDismiss,
    placeholder = 'Chọn thời gian',
    required = false,
}: TimePickerInputProps) {
    const [show, setShow] = useState(false);
    const [pendingTime, setPendingTime] = useState<Date | undefined>(undefined);

    // get time value when modal open
    const getInitialPickerTime = () => value || new Date();

    const openPicker = () => {
        setPendingTime(getInitialPickerTime());
        setShow(true);
    };

    // close time picker modal without changes
    const dismissPicker = () => {
        setShow(false);
        setPendingTime(undefined);
        onDismiss?.();
    };

    // commit selected time and close modal
    const commitTime = (date: Date) => {
        onChange(date);
        setShow(false);
        setPendingTime(undefined);
    };

    // handle time change from picker
    const handleChange = (event: any, selectedTime?: Date) => {
        if (Platform.OS === 'android') {
            setShow(false);
            if (event.type === 'set' && selectedTime) {
                onChange(selectedTime);
            } else if (event.type === 'dismissed') {
                onDismiss?.();
            }
            return;
        }
        if (event.type === 'set' && selectedTime) {
            setPendingTime(selectedTime);
        } else if (event.type === 'dismissed') {
            dismissPicker();
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
                onPress={openPicker}
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
                                <Text className="text-gray-800 font-semibold">Chọn thời gian</Text>
                                <TouchableOpacity
                                    onPress={() => {
                                        commitTime(pendingTime || getInitialPickerTime());
                                    }}
                                >
                                    <Text className="text-[#42A4F5] text-base font-semibold">Xong</Text>
                                </TouchableOpacity>
                            </View>
                            <DateTimePicker
                                value={pendingTime || getInitialPickerTime()}
                                mode="time"
                                is24Hour={true}
                                display="spinner"
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
