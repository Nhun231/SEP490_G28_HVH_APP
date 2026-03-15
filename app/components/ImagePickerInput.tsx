import React from 'react';
import { View, Text, TouchableOpacity, Image, Alert, StyleSheet } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';

interface ImagePickerInputProps {
    label: string;
    value?: string;
    onChange: (uri: string) => void;
    hint?: string;
}

export default function ImagePickerInput({
    label,
    value,
    onChange,
    hint,
}: ImagePickerInputProps) {
    const pickImage = async () => {
        // Request permission
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        
        if (status !== 'granted') {
            Alert.alert(
                'Cần quyền truy cập',
                'Vui lòng cấp quyền truy cập thư viện ảnh để chọn hình'
            );
            return;
        }

        // Pick image
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [16, 9],
            quality: 0.8,
        });

        if (!result.canceled && result.assets[0]) {
            onChange(result.assets[0].uri);
        }
    };

    return (
        <View className="mb-4">
            <Text className="text-gray-700 text-sm font-medium mb-1">
                {label}
            </Text>
            {hint && (
                <Text className="text-gray-500 text-xs mb-2">{hint}</Text>
            )}

            {value ? (
                <View>
                    {/* Preview Image */}
                    <View style={styles.previewWrapper}>
                        <Image
                            source={{ uri: value }}
                            style={styles.previewImage}
                            resizeMode="cover"
                        />
                    </View>

                    {/* Change Image Button */}
                    <TouchableOpacity
                        onPress={pickImage}
                        style={styles.uploadButton}
                    >
                        <Ionicons name="cloud-upload-outline" size={22} color="#42A5F5" />
                        <View style={styles.uploadTextWrapper}>
                            <Text style={styles.uploadLabel}>Đổi ảnh khác</Text>
                            <Text style={styles.uploadHint}>PNG, JPG (tối đa 5MB)</Text>
                        </View>
                    </TouchableOpacity>
                </View>
            ) : (
                <TouchableOpacity
                    onPress={pickImage}
                    style={styles.uploadButtonLarge}
                >
                    <Ionicons name="cloud-upload-outline" size={24} color="#42A5F5" />
                    <View style={styles.uploadTextWrapperLarge}>
                        <Text style={styles.uploadLabel}>Tải lên tệp</Text>
                        <Text style={styles.uploadHint}>PNG, JPG (tối đa 5MB)</Text>
                    </View>
                </TouchableOpacity>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    previewWrapper: {
        borderRadius: 10,
        overflow: 'hidden',
        marginBottom: 10,
    },
    previewImage: {
        width: '100%',
        height: 180,
    },
    uploadButton: {
        borderWidth: 1.5,
        borderColor: '#D1D5DB',
        borderStyle: 'dashed',
        borderRadius: 10,
        paddingVertical: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFFFFF',
    },
    uploadButtonLarge: {
        borderWidth: 1.5,
        borderColor: '#D1D5DB',
        borderStyle: 'dashed',
        borderRadius: 10,
        paddingVertical: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFFFFF',
    },
    uploadTextWrapper: {
        marginLeft: 10,
    },
    uploadTextWrapperLarge: {
        marginLeft: 12,
    },
    uploadLabel: {
        color: '#42A4F5',
        fontWeight: '600',
        fontSize: 14,
    },
    uploadHint: {
        color: '#9CA3AF',
        fontSize: 12,
    },
});
