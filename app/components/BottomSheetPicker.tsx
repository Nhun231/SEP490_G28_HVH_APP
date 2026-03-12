import React from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface OptionItem {
    id: number;
    label: string;
}

interface BottomSheetPickerProps {
    visible: boolean;
    onClose: () => void;
    title: string;
    options: OptionItem[];
    selectedId?: number;
    onSelect: (item: OptionItem) => void;
}

export default function BottomSheetPicker({
    visible,
    onClose,
    title,
    options,
    selectedId,
    onSelect,
}: BottomSheetPickerProps) {
    return (
        <Modal
            transparent={true}
            animationType="slide"
            visible={visible}
            onRequestClose={onClose}
        >
            <Pressable
                className="flex-1 bg-black/50 justify-end"
                onPress={onClose}
            >
                <Pressable
                    className="bg-white rounded-t-3xl max-h-[70%]"
                    onPress={(e) => e.stopPropagation()}
                >
                    <View className="flex-row justify-between items-center px-4 py-4 border-b border-gray-200">
                        <Text className="text-lg font-bold text-gray-800">{title}</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={24} color="#666" />
                        </TouchableOpacity>
                    </View>

                    <FlatList
                        data={options}
                        keyExtractor={(item) => item.id.toString()}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                onPress={() => onSelect(item)}
                                className="px-4 py-4 border-b border-gray-100 flex-row justify-between items-center"
                            >
                                <Text className="text-gray-800 text-base flex-1">
                                    {item.label}
                                </Text>
                                {selectedId === item.id && (
                                    <Ionicons name="checkmark" size={24} color="#42A5F5" />
                                )}
                            </TouchableOpacity>
                        )}
                    />
                </Pressable>
            </Pressable>
        </Modal>
    );
}
