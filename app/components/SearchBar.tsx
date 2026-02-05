import React from 'react';
import { View, TextInput, TouchableOpacity, Text } from 'react-native';

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
        <View className="flex-row items-center px-4 py-3 bg-white">
            <View className="flex-1 flex-row items-center bg-gray-100 rounded-lg px-4 py-3">
                <Text className="text-gray-400 mr-2">🔍</Text>
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
                className="ml-2 bg-cyan-500 px-6 py-3 rounded-lg"
                onPress={handleSearch}
            >
                <Text className="text-white font-semibold">Tìm</Text>
            </TouchableOpacity>
        </View>
    );
}
