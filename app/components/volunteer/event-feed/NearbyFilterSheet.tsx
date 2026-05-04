/**
 * NearbyFilterSheet.tsx
 * Bottom-sheet modal that lets the user pick a search radius and uses the
 * device's GPS location to filter events nearby — identical UI shell to
 * DomainFilterSheet (slide-up, same header/footer/colours).
 */

import React, { useState, useEffect } from 'react';
import {
    Modal,
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    Alert,
    Platform,
    TextInput,
    KeyboardAvoidingView,
    ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';

// ── Preset radius options ────────────────────────────────────────────────────

interface RadiusOption {
    label: string;
    value: number; // metres
}

const RADIUS_OPTIONS: RadiusOption[] = [
    { label: '500 m',  value: 500   },
    { label: '1 km',   value: 1000  },
    { label: '2 km',   value: 2000  },
    { label: '5 km',   value: 5000  },
    { label: '10 km',  value: 10000 },
    { label: '20 km',  value: 20000 },
    { label: '50 km',  value: 50000 },
];

// ── Types ────────────────────────────────────────────────────────────────────

export interface NearbyFilter {
    lat: number;
    lng: number;
    radiusMeters: number;
}

interface Props {
    visible: boolean;
    /** Pass the current active filter so the sheet re-opens with the same selection. */
    initial: NearbyFilter | null;
    onConfirm: (filter: NearbyFilter) => void;
    onClear: () => void;
    onClose: () => void;
}

// ── Component ────────────────────────────────────────────────────────────────

export default function NearbyFilterSheet({ visible, initial, onConfirm, onClear, onClose }: Props) {
    const [locating, setLocating] = useState(false);
    const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
        initial ? { lat: initial.lat, lng: initial.lng } : null
    );
    const [selectedRadius, setSelectedRadius] = useState<number>(
        initial?.radiusMeters ?? 5000
    );
    const [customRadius, setCustomRadius] = useState('');
    const [useCustom, setUseCustom] = useState(false);

    // Reset to initial values every time the sheet opens
    useEffect(() => {
        if (!visible) return;
        setCoords(initial ? { lat: initial.lat, lng: initial.lng } : null);
        setSelectedRadius(initial?.radiusMeters ?? 5000);
        setUseCustom(false);
        setCustomRadius('');
    }, [visible]);

    // ── Get current GPS location ─────────────────────────────────────────────

    const handleLocate = async () => {
        setLocating(true);
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Thiếu quyền', 'Cần cấp quyền vị trí để tìm sự kiện gần bạn.');
                return;
            }
            const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        } catch {
            Alert.alert('Lỗi', 'Không thể lấy vị trí. Vui lòng thử lại.');
        } finally {
            setLocating(false);
        }
    };

    // ── Effective radius ─────────────────────────────────────────────────────

    const effectiveRadius = (): number => {
        if (useCustom) {
            const v = parseInt(customRadius, 10);
            return isNaN(v) || v <= 0 ? selectedRadius : v * 1000; // input is km → m
        }
        return selectedRadius;
    };

    // ── Confirm ──────────────────────────────────────────────────────────────

    const handleConfirm = () => {
        if (!coords) {
            Alert.alert('Chưa có vị trí', 'Vui lòng bấm "Lấy vị trí" trước.');
            return;
        }
        onConfirm({ lat: coords.lat, lng: coords.lng, radiusMeters: effectiveRadius() });
    };

    // ── Render ───────────────────────────────────────────────────────────────

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <KeyboardAvoidingView
                style={styles.kavWrapper}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <View style={styles.overlay}>
                <View style={styles.sheet}>

                    {/* ── Header ─────────────────────────────────────────── */}
                    <View style={styles.header}>
                        <Text style={styles.headerTitle}>Tìm sự kiện gần tôi</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <Ionicons name="close" size={22} color="#6B7280" />
                        </TouchableOpacity>
                    </View>

                    {/* ── Body ───────────────────────────────────────────── */}
                    <ScrollView
                        style={styles.bodyScroll}
                        contentContainerStyle={styles.body}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                    >

                        {/* Location row */}
                        <View style={styles.section}>
                            <Text style={styles.sectionLabel}>Vị trí của bạn</Text>
                            <TouchableOpacity
                                style={[styles.locateBtn, locating && styles.locateBtnDisabled]}
                                onPress={handleLocate}
                                disabled={locating}
                                activeOpacity={0.8}
                            >
                                {locating ? (
                                    <ActivityIndicator size="small" color="#42A4F5" />
                                ) : (
                                    <Ionicons
                                        name={coords ? 'location' : 'location-outline'}
                                        size={18}
                                        color={coords ? '#42A4F5' : '#6B7280'}
                                    />
                                )}
                                <Text style={[styles.locateBtnText, coords && styles.locateBtnTextActive]}>
                                    {locating
                                        ? 'Đang lấy vị trí...'
                                        : coords
                                            ? `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`
                                            : 'Lấy vị trí hiện tại'}
                                </Text>
                                {coords && !locating && (
                                    <Ionicons name="refresh-outline" size={15} color="#42A4F5" style={{ marginLeft: 4 }} />
                                )}
                            </TouchableOpacity>
                        </View>

                        {/* Radius presets */}
                        <View style={styles.section}>
                            <Text style={styles.sectionLabel}>Bán kính tìm kiếm</Text>
                            <View style={styles.presetGrid}>
                                {RADIUS_OPTIONS.map(opt => {
                                    const isActive = !useCustom && selectedRadius === opt.value;
                                    return (
                                        <TouchableOpacity
                                            key={opt.value}
                                            style={[styles.presetChip, isActive && styles.presetChipActive]}
                                            onPress={() => { setSelectedRadius(opt.value); setUseCustom(false); }}
                                            activeOpacity={0.7}
                                        >
                                            <Text style={[styles.presetChipText, isActive && styles.presetChipTextActive]}>
                                                {opt.label}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </View>

                        {/* Custom radius */}
                        <View style={styles.section}>
                            <TouchableOpacity
                                style={styles.customToggle}
                                onPress={() => setUseCustom(p => !p)}
                                activeOpacity={0.7}
                            >
                                <View style={[styles.checkbox, useCustom && styles.checkboxActive]}>
                                    {useCustom && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                                </View>
                                <Text style={styles.customToggleLabel}>Nhập bán kính tuỳ chỉnh (km)</Text>
                            </TouchableOpacity>
                            {useCustom && (
                                <View style={styles.customInputRow}>
                                    <TextInput
                                        style={styles.customInput}
                                        placeholder="Ví dụ: 15"
                                        placeholderTextColor="#9CA3AF"
                                        keyboardType="numeric"
                                        value={customRadius}
                                        onChangeText={setCustomRadius}
                                        maxLength={4}
                                    />
                                    <Text style={styles.customInputUnit}>km</Text>
                                </View>
                            )}
                        </View>

                        {/* Info box */}
                        <View style={styles.infoBox}>
                            <Ionicons name="information-circle-outline" size={15} color="#42A4F5" />
                            <Text style={styles.infoText}>
                                Chỉ hiển thị sự kiện có địa điểm trong vòng bán kính đã chọn tính từ vị trí của bạn.
                            </Text>
                        </View>
                    </ScrollView>

                    {/* ── Footer ─────────────────────────────────────────── */}
                    <View style={styles.footer}>
                        <TouchableOpacity style={styles.clearBtn} onPress={onClear}>
                            <Text style={styles.clearBtnText}>Xóa bộ lọc</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.confirmBtn, !coords && styles.confirmBtnDisabled]}
                            onPress={handleConfirm}
                            disabled={!coords}
                        >
                            <Text style={styles.confirmBtnText}>Áp dụng</Text>
                        </TouchableOpacity>
                    </View>
                </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    kavWrapper: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'flex-end',
    },
    sheet: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingBottom: Platform.OS === 'ios' ? 34 : 20,
        maxHeight: '90%',
    },
    bodyScroll: {
        flexGrow: 0,
    },

    /* Header — identical to DomainFilterSheet */
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

    /* Body */
    body: {
        paddingHorizontal: 20,
        paddingTop: 16,
        gap: 20,
    },
    section: {
        gap: 10,
    },
    sectionLabel: {
        fontSize: 13,
        fontWeight: '700',
        color: '#374151',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },

    /* Location button */
    locateBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: '#F3F4F6',
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 14,
        borderWidth: 1.5,
        borderColor: '#E5E7EB',
    },
    locateBtnDisabled: { opacity: 0.6 },
    locateBtnText: {
        flex: 1,
        fontSize: 14,
        color: '#6B7280',
    },
    locateBtnTextActive: {
        color: '#42A4F5',
        fontWeight: '600',
    },

    /* Preset radius chips grid */
    presetGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    presetChip: {
        paddingVertical: 9,
        paddingHorizontal: 16,
        borderRadius: 20,
        borderWidth: 1.5,
        borderColor: '#D1D5DB',
        backgroundColor: '#FFFFFF',
    },
    presetChipActive: {
        backgroundColor: '#EBF5FF',
        borderColor: '#42A4F5',
    },
    presetChipText: {
        fontSize: 13,
        color: '#374151',
        fontWeight: '500',
    },
    presetChipTextActive: {
        color: '#42A4F5',
        fontWeight: '700',
    },

    /* Custom radius */
    customToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    checkbox: {
        width: 22,
        height: 22,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: '#D1D5DB',
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkboxActive: {
        backgroundColor: '#42A4F5',
        borderColor: '#42A4F5',
    },
    customToggleLabel: {
        fontSize: 14,
        color: '#374151',
    },
    customInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 4,
    },
    customInput: {
        flex: 1,
        height: 44,
        backgroundColor: '#F3F4F6',
        borderRadius: 10,
        paddingHorizontal: 14,
        fontSize: 16,
        color: '#1F2937',
        borderWidth: 1.5,
        borderColor: '#42A4F5',
    },
    customInputUnit: {
        fontSize: 15,
        color: '#6B7280',
        fontWeight: '600',
        width: 30,
    },

    /* Info box */
    infoBox: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
        backgroundColor: '#EBF5FF',
        borderRadius: 10,
        padding: 12,
        borderWidth: 1,
        borderColor: '#BBDEFB',
    },
    infoText: {
        flex: 1,
        fontSize: 12,
        color: '#42A4F5',
        lineHeight: 18,
    },

    /* Footer — identical to DomainFilterSheet */
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
        flex: 1,
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
    confirmBtnDisabled: {
        backgroundColor: '#93C5FD',
        shadowOpacity: 0,
        elevation: 0,
    },
    confirmBtnText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#FFFFFF',
    },
});
