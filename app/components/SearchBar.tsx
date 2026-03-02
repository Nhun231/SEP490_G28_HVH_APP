import React from 'react';
import { View, TextInput, TouchableOpacity, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
interface SearchBarProps {
    placeholder?: string;
    onSearch: (text: string) => void;
}

export default function SearchBar({ placeholder = "Tìm hoạt động tình nguyện", onSearch }: SearchBarProps) {
    const [searchText, setSearchText] = React.useState('');

    const handleSearch = () => {
        onSearch(searchText);
    };

    return (
        <View className="flex-row items-center px-4 py-3 bg-[#E3F2FD]">
            <View className="flex-1 flex-row items-center bg-gray-100 rounded-lg px-4 py-3">
                <Ionicons name="search" size={20} color="#9CA3AF" style={{ marginRight: 8 }} />
                <TextInput
                    className="flex-1 text-gray-700"
                    placeholder={placeholder}
                    placeholderTextColor="#9CA3AF"
                    value={searchText}
                    onChangeText={setSearchText}
                    onSubmitEditing={handleSearch}
                />
            </View>
            <TouchableOpacity
                className="ml-2 bg-[#42A5F5] px-6 py-3 rounded-lg"
                onPress={handleSearch}
            >
                <Text className="text-white font-semibold">Tìm</Text>
            </TouchableOpacity>
        </View>
    );
}
