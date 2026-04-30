import React, { useState, useEffect, useMemo } from 'react';
import {
    Modal,
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    TextInput,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import wardData from '@/assets/wards/phuong_xa_moi_ha_noi.json';

// Extract the sorted list of ward names from the JSON asset
const ALL_WARDS: string[] = (wardData as { danh_sach_phuong_xa_moi: { stt: number; ten_moi: string }[] })
    .danh_sach_phuong_xa_moi
    .map(w => w.ten_moi);

interface Props {
    visible: boolean;
    initialSelected: string[];
    onConfirm: (selected: string[]) => void;
    onClose: () => void;
}

export default function AreaFilterSheet({ visible, initialSelected, onConfirm, onClose }: Props) {
    const [selected, setSelected] = useState<string[]>(initialSelected);
    const [searchQuery, setSearchQuery] = useState('');

    // Sync local state when sheet opens/closes
    useEffect(() => {
        if (visible) {
            setSelected(initialSelected);
            setSearchQuery('');
        }
    }, [visible]);

    const filteredWards = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return ALL_WARDS;
        return ALL_WARDS.filter(w => w.toLowerCase().includes(q));
    }, [searchQuery]);

    const toggle = (ward: string) => {
        setSelected(prev =>
            prev.includes(ward)
                ? prev.filter(d => d !== ward)
                : [...prev, ward]
        );
    };

    const handleClear = () => setSelected([]);

    const handleConfirm = () => {
        onConfirm(selected);
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={styles.overlay}>
                <View style={styles.sheet}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.headerTitle}>Chọn phường/xã</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <Ionicons name="close" size={22} color="#6B7280" />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.subTitle}>
                        {selected.length > 0
                            ? `Đã chọn ${selected.length} phường/xã`
                            : 'Chọn một hoặc nhiều phường/xã tại Hà Nội'}
                    </Text>

                    {/* Search box */}
                    <View style={styles.searchRow}>
                        <Ionicons name="search" size={16} color="#9CA3AF" style={styles.searchIcon} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Tìm phường/xã..."
                            placeholderTextColor="#9CA3AF"
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            returnKeyType="search"
                            autoCorrect={false}
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                                <Ionicons name="close-circle" size={16} color="#9CA3AF" />
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Ward chips */}
                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.chipsContainer}
                        keyboardShouldPersistTaps="handled"
                    >
                        {filteredWards.length === 0 ? (
                            <Text style={styles.emptyText}>Không tìm thấy phường/xã phù hợp</Text>
                        ) : (
                            filteredWards.map(ward => {
                                const isActive = selected.includes(ward);
                                return (
                                    <TouchableOpacity
                                        key={ward}
                                        style={[styles.chip, isActive && styles.chipActive]}
                                        onPress={() => toggle(ward)}
                                        activeOpacity={0.7}
                                    >
                                        {isActive && (
                                            <Ionicons
                                                name="checkmark"
                                                size={13}
                                                color="#FFFFFF"
                                                style={{ marginRight: 4 }}
                                            />
                                        )}
                                        <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                                            {ward}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })
                        )}
                    </ScrollView>

                    {/* Footer */}
                    <View style={styles.footer}>
                        <TouchableOpacity style={styles.clearBtn} onPress={handleClear}>
                            <Text style={styles.clearBtnText}>Xóa lựa chọn</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
                            <Text style={styles.confirmBtnText}>
                                {selected.length > 0 ? `Xác nhận (${selected.length})` : 'Xác nhận'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'flex-end',
    },
    sheet: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '88%',
        paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    },

    /* Header */
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1F2937',
    },
    closeBtn: {
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
    },
    subTitle: {
        fontSize: 13,
        color: '#6B7280',
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: 6,
    },

    /* Search */
    searchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 16,
        marginBottom: 8,
        backgroundColor: '#F3F4F6',
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 7,
    },
    searchIcon: {
        marginRight: 6,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        color: '#1F2937',
        padding: 0,
    },

    /* Chips */
    chipsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: 16,
        paddingBottom: 8,
        gap: 8,
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1.5,
        borderColor: '#D1D5DB',
        backgroundColor: '#FFFFFF',
    },
    chipActive: {
        backgroundColor: '#42A4F5',
        borderColor: '#42A4F5',
    },
    chipText: {
        fontSize: 13,
        color: '#374151',
        fontWeight: '500',
    },
    chipTextActive: {
        color: '#FFFFFF',
        fontWeight: '600',
    },
    emptyText: {
        fontSize: 14,
        color: '#9CA3AF',
        padding: 16,
    },

    /* Footer */
    footer: {
        flexDirection: 'row',
        gap: 12,
        paddingHorizontal: 20,
        paddingTop: 14,
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
    },
    clearBtn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: '#D1D5DB',
        alignItems: 'center',
    },
    clearBtnText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#6B7280',
    },
    confirmBtn: {
        flex: 2,
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: '#42A4F5',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#42A4F5',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    confirmBtnText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#FFFFFF',
    },
});
