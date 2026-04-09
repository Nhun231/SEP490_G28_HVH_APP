import React, { useState, useEffect } from 'react';
import {
    Modal,
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// ─── Hanoi districts ────────────────────────────────────────────────
const HANOI_DISTRICTS = [
    // 12 nội thành quận
    'Quận Ba Đình',
    'Quận Hoàn Kiếm',
    'Quận Tây Hồ',
    'Quận Long Biên',
    'Quận Cầu Giấy',
    'Quận Đống Đa',
    'Quận Hai Bà Trưng',
    'Quận Hoàng Mai',
    'Quận Thanh Xuân',
    'Quận Nam Từ Liêm',
    'Quận Bắc Từ Liêm',
    'Quận Hà Đông',
    // 18 huyện / thị xã
    'Huyện Sóc Sơn',
    'Huyện Đông Anh',
    'Huyện Gia Lâm',
    'Huyện Thanh Trì',
    'Huyện Thường Tín',
    'Huyện Phú Xuyên',
    'Huyện Ứng Hòa',
    'Huyện Mỹ Đức',
    'Huyện Chương Mỹ',
    'Huyện Thanh Oai',
    'Huyện Hoài Đức',
    'Huyện Quốc Oai',
    'Huyện Thạch Thất',
    'Huyện Phúc Thọ',
    'Huyện Đan Phượng',
    'Huyện Mê Linh',
    'Huyện Ba Vì',
    'Thị xã Sơn Tây',
];

// ─── props ────────────────────────────────────────────────────────────
interface Props {
    visible: boolean;
    initialSelected: string[];
    onConfirm: (selected: string[]) => void;
    onClose: () => void;
}

// ─── component ───────────────────────────────────────────────────────
export default function AreaFilterSheet({ visible, initialSelected, onConfirm, onClose }: Props) {
    const [selected, setSelected] = useState<string[]>(initialSelected);

    // Sync local state when sheet opens
    useEffect(() => {
        if (visible) setSelected(initialSelected);
    }, [visible]);

    const toggle = (district: string) => {
        setSelected(prev =>
            prev.includes(district)
                ? prev.filter(d => d !== district)
                : [...prev, district]
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
                        <Text style={styles.headerTitle}>Chọn khu vực</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <Ionicons name="close" size={22} color="#6B7280" />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.subTitle}>
                        {selected.length > 0
                            ? `Đã chọn ${selected.length} khu vực`
                            : 'Chọn một hoặc nhiều quận/huyện tại Hà Nội'}
                    </Text>

                    {/* District chips */}
                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.chipsContainer}
                    >
                        {HANOI_DISTRICTS.map(district => {
                            const isActive = selected.includes(district);
                            return (
                                <TouchableOpacity
                                    key={district}
                                    style={[styles.chip, isActive && styles.chipActive]}
                                    onPress={() => toggle(district)}
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
                                        {district}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>

                    {/* Footer */}
                    <View style={styles.footer}>
                        <TouchableOpacity style={styles.clearBtn} onPress={handleClear}>
                            <Text style={styles.clearBtnText}>Xóa lựa chọn</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
                            <Text style={styles.confirmBtnText}>Xác nhận</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

// ─── styles ──────────────────────────────────────────────────────────
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
        maxHeight: '85%',
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
        paddingBottom: 10,
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
