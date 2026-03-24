import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface DocumentUpload {
    uri: string | null;
    fileName: string | null;
    mimeType: string | null;
}

interface DocumentUploadBoxProps {
    label: string;
    document: DocumentUpload;
    onPress: () => void;
    onRemove: () => void;
    subtitle?: string;
    uploadProgress?: number;
    disabled?: boolean;
    required?: boolean;
}

export default function DocumentUploadBox({
    label,
    document,
    onPress,
    onRemove,
    subtitle,
    uploadProgress,
    disabled = false,
    required = false,
}: DocumentUploadBoxProps) {
    const safeUploadProgress = uploadProgress ?? 0;

    return (
        <View style={styles.uploadContainer}>
            <Text style={styles.uploadLabel}>
                {label}
                {required && <Text style={styles.required}> *</Text>}
            </Text>
            {subtitle && <Text style={styles.uploadSubtitle}>{subtitle}</Text>}

            {/* Show preview if image is selected */}
            {document.uri ? (
                <View style={styles.previewContainer}>
                    <Image
                        source={{ uri: document.uri as string }}
                        style={styles.previewImage}
                        resizeMode="contain"
                    />
                    <View style={styles.previewOverlay}>
                        <View style={styles.previewButtons}>
                            {/* Update button */}
                            <TouchableOpacity
                                style={styles.previewActionButton}
                                onPress={onPress}
                                disabled={disabled}
                            >
                                <Ionicons name="camera-outline" size={20} color="#FFFFFF" />
                                <Text style={styles.previewActionText}>Thay đổi</Text>
                            </TouchableOpacity>
                            {/* Remove button */}
                            <TouchableOpacity
                                style={[styles.previewActionButton, styles.removeButton]}
                                onPress={onRemove}
                                disabled={disabled}
                            >
                                <Ionicons name="trash-outline" size={20} color="#FFFFFF" />
                                <Text style={styles.previewActionText}>Xóa</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            ) : (
                /* Show upload button if no image */
                <TouchableOpacity
                    style={styles.uploadButton}
                    onPress={onPress}
                    activeOpacity={0.7}
                    disabled={disabled}
                >
                    <Ionicons name="cloud-upload-outline" size={24} color="#42A4F5" />
                    <View style={styles.uploadTextContainer}>
                        <Text style={styles.uploadButtonText}>Tải lên tệp</Text>
                        <Text style={styles.uploadButtonSubtext}>PNG, JPG (tối đa 5MB)</Text>
                    </View>
                </TouchableOpacity>
            )}

            {/* Upload progress */}
            {disabled && safeUploadProgress > 0 && (
                <View style={styles.progressContainer}>
                    <View style={styles.progressBar}>
                        <View style={[styles.progressFill, { width: `${safeUploadProgress}%` }]} />
                    </View>
                    <Text style={styles.progressText}>{safeUploadProgress}%</Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    required: {
        color: '#EF4444',
    },
    uploadContainer: {
        marginBottom: 20,
    },
    uploadLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: '#1F2937',
        marginBottom: 4,
    },
    uploadSubtitle: {
        fontSize: 12,
        color: '#6B7280',
        marginBottom: 8,
    },
    uploadButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        borderWidth: 2,
        borderStyle: 'dashed',
        borderColor: '#D1D5DB',
        paddingVertical: 20,
        paddingHorizontal: 16,
    },
    uploadTextContainer: {
        marginLeft: 12,
        flex: 1,
    },
    uploadButtonText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#42A4F5',
    },
    uploadButtonSubtext: {
        fontSize: 12,
        color: '#9CA3AF',
        marginTop: 2,
    },
    progressContainer: {
        marginTop: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    progressBar: {
        flex: 1,
        height: 8,
        backgroundColor: '#E5E7EB',
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#42A4F5',
        borderRadius: 4,
    },
    progressText: {
        fontSize: 12,
        color: '#6B7280',
        fontWeight: '600',
        minWidth: 40,
        textAlign: 'right',
    },
    // Preview styles
    previewContainer: {
        position: 'relative',
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    previewImage: {
        width: 80,
        height: 120,
        backgroundColor: '#F3F4F6',
    },
    previewOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    previewButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    previewActionButton: {
        backgroundColor: '#42A4F5',
        borderRadius: 8,
        paddingVertical: 10,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    removeButton: {
        backgroundColor: '#EF4444',
    },
    previewActionText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    fileNameBadge: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        paddingVertical: 8,
        paddingHorizontal: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        borderBottomLeftRadius: 12,
        borderBottomRightRadius: 12,
    },
    fileNameText: {
        fontSize: 12,
        color: '#059669',
        fontWeight: '500',
        flex: 1,
    },
});
