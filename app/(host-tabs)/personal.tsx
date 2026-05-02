import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, ActivityIndicator, Alert, RefreshControl, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/context/AuthContext';
import { resolveSupabaseUrl } from '@/services/api-helpers';
import { uploadImageToSupabase, getFileExtension, getMimeType } from '@/services/upload-service';
import { getHostProfile, updateHostProfile } from '@/services/profile-service';
import type { HostProfileResponse } from '@/services/profile-types';
import InfoRow from '@/app/components/host/profile/InfoRow';
import ChangePasswordModal from '@/app/components/host/profile/ChangePasswordModal';
import BottomSheetPicker, { OptionItem } from '@/app/components/host/create-event/BottomSheetPicker';
import wardData from '@/assets/wards/phuong_xa_moi_ha_noi.json';

// Pre-compute ward option list (module-level, computed once)
const WARD_OPTIONS: OptionItem[] = wardData.danh_sach_phuong_xa_moi.map(w => ({
    id: w.stt,
    label: w.ten_moi,
    value: w.ten_moi,
}));

type EditField = 'fullName' | 'gender' | 'dob' | 'address' | 'detailAddress';

function formatDate(iso: string | null | undefined): string {
    if (!iso) return '—';
    const [y, m, d] = iso.split('T')[0].split('-');
    return `${d}/${m}/${y}`;
}

/** DD/MM/YYYY → YYYY-MM-DD. Returns '' on invalid. */
function parseDateToISO(display: string): string {
    const parts = display.split('/');
    if (parts.length !== 3) return '';
    const [d, m, y] = parts;
    const iso = `${y}-${m}-${d}`;
    return isNaN(Date.parse(iso)) ? '' : iso;
}

function formatGender(raw: boolean | null | undefined): string {
    if (raw === true) return 'Nam';
    if (raw === false) return 'Nữ';
    return '—';
}

const SectionHeader: React.FC<{ title: string }> = ({ title }) => (
    <View style={styles.sectionHeader}>
        <Text style={styles.sectionHeaderText}>{title}</Text>
    </View>
);

export default function HostPersonal() {
    const { logout } = useAuth();
    const router = useRouter();

    const [profile, setProfile] = useState<HostProfileResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [avatarUploading, setAvatarUploading] = useState(false);
    const [localAvatarUri, setLocalAvatarUri] = useState<string | null>(null);

    // Editing state — only one field editable at a time
    const [editingField, setEditingField] = useState<EditField | null>(null);
    const [editText, setEditText] = useState('');
    const [editGender, setEditGender] = useState<boolean>(true);
    const [saving, setSaving] = useState(false);
    const [showChangePassword, setShowChangePassword] = useState(false);
    const [wardPickerVisible, setWardPickerVisible] = useState(false);

    const fetchProfile = useCallback(async () => {
        try {
            const data = await getHostProfile();
            setProfile(data);
        } catch {
            // silently ignore — UI shows "—" placeholders
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { fetchProfile(); }, [fetchProfile]);

    const handleRefresh = () => { setRefreshing(true); fetchProfile(); };

    const startEdit = (field: EditField) => {
        if (!profile) return;
        setEditingField(field);
        if (field === 'gender') {
            setEditGender(profile.gender ?? true);
        } else if (field === 'dob') {
            setEditText(profile.dob ? formatDate(profile.dob) : '');
        } else {
            setEditText((profile as any)[field] ?? '');
        }
    };

    const cancelEdit = () => setEditingField(null);

    const confirmEdit = async () => {
        if (!profile || !editingField) return;
        setSaving(true);
        try {
            let newDob = profile.dob ?? '';
            let newGender = profile.gender ?? true;
            let newFullName = profile.fullName ?? '';
            let newAddress = profile.address ?? '';
            let newDetailAddress = profile.detailAddress ?? '';

            if (editingField === 'fullName') {
                newFullName = editText.trim();
            } else if (editingField === 'gender') {
                newGender = editGender;
            } else if (editingField === 'dob') {
                const trimmed = editText.trim();
                if (trimmed !== '') {
                    const iso = parseDateToISO(trimmed);
                    if (!iso) {
                        Alert.alert('Định dạng không hợp lệ', 'Vui lòng nhập ngày theo dạng DD/MM/YYYY.');
                        setSaving(false);
                        return;
                    }
                    newDob = iso;
                } else {
                    newDob = '';
                }
            } else if (editingField === 'address') {
                newAddress = editText.trim();
            } else if (editingField === 'detailAddress') {
                newDetailAddress = editText.trim();
            }

            await updateHostProfile({
                fullName: newFullName,
                gender: newGender,
                dob: newDob,
                avatarExtension: null,
                address: newAddress,
                detailAddress: newDetailAddress,
            });

            await fetchProfile();
            setEditingField(null);
        } catch (e: any) {
            Alert.alert('Lỗi', e?.message ?? 'Không thể cập nhật. Vui lòng thử lại.');
        } finally {
            setSaving(false);
        }
    };

    /** Save a selected ward directly — no inline text edit involved. */
    const saveWard = async (ward: string) => {
        if (!profile) return;
        setWardPickerVisible(false);
        setSaving(true);
        try {
            await updateHostProfile({
                fullName: profile.fullName ?? '',
                gender: profile.gender ?? true,
                dob: profile.dob ?? '',
                avatarExtension: null,
                address: ward,
                detailAddress: profile.detailAddress ?? '',
            });
            await fetchProfile();
        } catch (e: any) {
            Alert.alert('Lỗi', e?.message ?? 'Không thể cập nhật. Vui lòng thử lại.');
        } finally {
            setSaving(false);
        }
    };

    const handlePickAvatar = async () => {
        // On iOS the system picker handles permissions internally;
        // calling requestMediaLibraryPermissionsAsync() before launchImageLibraryAsync()
        // causes a duplicate permission/photo-selection flow on iOS 14+.
        if (Platform.OS === 'android') {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Quyền truy cập', 'Vui lòng cấp quyền truy cập thư viện ảnh.');
                return;
            }
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.85,
        });
        if (result.canceled || !result.assets[0]) return;

        const asset = result.assets[0];
        setLocalAvatarUri(asset.uri);
        setAvatarUploading(true);
        try {
            const ext = getFileExtension(asset.uri, asset.mimeType);

            const updateRes = await updateHostProfile({
                fullName: profile?.fullName ?? '',
                gender: profile?.gender ?? true,
                dob: profile?.dob ?? '',
                avatarExtension: ext,
                address: profile?.address ?? '',
                detailAddress: profile?.detailAddress ?? '',
            });

            const uploadPath = updateRes.avatarUploadUrl;
            if (!uploadPath) throw new Error('Không nhận được URL upload từ server.');

            const signedUrl = resolveSupabaseUrl(uploadPath)!;

            await uploadImageToSupabase(signedUrl, { uri: asset.uri, mimeType: getMimeType(ext) });
            await fetchProfile();
            Alert.alert('Thành công', 'Ảnh đại diện đã được cập nhật.');
        } catch (e: any) {
            setLocalAvatarUri(null);
            Alert.alert('Lỗi', e?.message ?? 'Không thể cập nhật ảnh đại diện. Vui lòng thử lại.');
        } finally {
            setAvatarUploading(false);
        }
    };

    const handleLogout = () => Alert.alert(
        'Đăng xuất', 'Bạn có chắc muốn đăng xuất không?',
        [
            { text: 'Hủy', style: 'cancel' },
            {
                text: 'Đăng xuất', style: 'destructive',
                onPress: async () => { await logout(); router.replace('/screen/common/login' as any); },
            },
        ],
    );

    const avatarUri = localAvatarUri ?? resolveSupabaseUrl(profile?.avatarUrl) ?? null;

    if (loading) {
        return (
            <SafeAreaView style={[styles.safeArea, { justifyContent: 'center', alignItems: 'center' }]} edges={['top']}>
                <ActivityIndicator size="large" color={'#42A4F5'} />
            </SafeAreaView>
        );
    }

    // Shared edit props builder
    const editProps = (field: EditField) => ({
        isEditing: editingField === field,
        onStartEdit: () => startEdit(field),
        onConfirm: confirmEdit,
        onCancel: cancelEdit,
        saving,
    });

    return (
        <SafeAreaView style={styles.safeArea} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
                    <Ionicons name="arrow-back" size={22} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Thông tin cá nhân</Text>
                <View style={{ width: 38 }} />
            </View>

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#42A4F5']} tintColor={'#42A4F5'} />}
            >
                {/* Avatar + Name */}
                <View style={styles.avatarSection}>
                    <TouchableOpacity style={styles.avatarWrapper} onPress={handlePickAvatar} activeOpacity={0.85} disabled={avatarUploading}>
                        {avatarUri
                            ? <Image source={{ uri: avatarUri }} style={styles.avatar} />
                            : <View style={[styles.avatar, styles.avatarPlaceholder]}><Ionicons name="person" size={48} color={'#42A4F5'} /></View>
                        }
                        <View style={styles.cameraBadge}>
                            {avatarUploading
                                ? <ActivityIndicator size="small" color="#fff" />
                                : <Ionicons name="camera" size={14} color="#fff" />
                            }
                        </View>
                    </TouchableOpacity>
                    <Text style={styles.profileName}>{profile?.fullName ?? 'Host'}</Text>
                </View>

                <SectionHeader title="ĐỊNH DANH" />
                <View style={styles.card}>
                    <InfoRow iconName="finger-print-outline" iconColor="#94A3B8" iconBg="#F1F5F9"
                        label="SỐ CCCD (CID)" value={profile?.cid ?? '—'} locked />
                    <View style={styles.divider} />
                    <InfoRow iconName="mail-outline" iconColor="#94A3B8" iconBg="#F1F5F9"
                        label="EMAIL ĐĂNG NHẬP" value={profile?.email ?? '—'} locked />
                </View>

                <SectionHeader title="CÁ NHÂN" />
                <View style={styles.card}>
                    <InfoRow
                        iconName="person-outline" iconColor={'#42A4F5'} iconBg="#E3F2FD"
                        label="HỌ VÀ TÊN" value={profile?.fullName ?? '—'}
                        fieldType="text"
                        editText={editText} onEditTextChange={setEditText}
                        {...editProps('fullName')}
                    />
                    <View style={styles.divider} />
                    <InfoRow
                        iconName="person-outline" iconColor={'#42A4F5'} iconBg="#E3F2FD"
                        label="GIỚI TÍNH" value={formatGender(profile?.gender)}
                        fieldType="gender"
                        editGender={editGender} onGenderToggle={setEditGender}
                        {...editProps('gender')}
                    />
                    <View style={styles.divider} />
                    <InfoRow
                        iconName="calendar-outline" iconColor={'#42A4F5'} iconBg="#E3F2FD"
                        label="NGÀY SINH" value={formatDate(profile?.dob)}
                        fieldType="date"
                        editText={editText} onEditTextChange={setEditText}
                        {...editProps('dob')}
                    />
                </View>

                <SectionHeader title="LIÊN HỆ" />
                <View style={styles.card}>
                    <InfoRow iconName="call-outline" iconColor="#94A3B8" iconBg="#F1F5F9"
                        label="SỐ ĐIỆN THOẠI" value={profile?.phone ?? '—'} locked />
                    <View style={styles.divider} />
                    <InfoRow
                        iconName="location-outline" iconColor={'#42A4F5'} iconBg="#E3F2FD"
                        label="KHU VỰC" value={profile?.address ?? '—'}
                        isEditing={false}
                        onStartEdit={() => setWardPickerVisible(true)}
                        saving={saving}
                    />
                    <View style={styles.divider} />
                    <InfoRow
                        iconName="location-outline" iconColor={'#42A4F5'} iconBg="#E3F2FD"
                        label="ĐỊA CHỈ CHI TIẾT" value={profile?.detailAddress ?? '—'}
                        fieldType="text"
                        editText={editText} onEditTextChange={setEditText}
                        {...editProps('detailAddress')}
                    />
                </View>

                <SectionHeader title="TÀI KHOẢN" />
                <View style={styles.card}>
                    <TouchableOpacity style={styles.menuRow} onPress={() => setShowChangePassword(true)} activeOpacity={0.7}>
                        <View style={styles.menuIconCircle}>
                            <Ionicons name="lock-closed-outline" size={18} color={'#42A4F5'} />
                        </View>
                        <Text style={styles.menuRowText}>Đổi mật khẩu</Text>
                        <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
                    </TouchableOpacity>
                    <View style={styles.divider} />
                    <TouchableOpacity style={styles.logoutRow} onPress={handleLogout} activeOpacity={0.7}>
                        <Ionicons name="log-out-outline" size={20} color="#EF4444" />
                        <Text style={styles.logoutText}>Đăng xuất</Text>
                    </TouchableOpacity>
                </View>

                <View style={{ height: 32 }} />
            </ScrollView>

            <ChangePasswordModal
                visible={showChangePassword}
                onClose={() => setShowChangePassword(false)}
            />

            <BottomSheetPicker
                visible={wardPickerVisible}
                onClose={() => setWardPickerVisible(false)}
                title="Chọn khu vực"
                options={WARD_OPTIONS}
                selectedId={WARD_OPTIONS.find(w => w.value === profile?.address)?.id}
                onSelect={item => saveWard(item.value ?? item.label)}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#42A4F5'
    },

    header: {
        backgroundColor: '#42A4F5',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    backBtn: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#fff'
    },

    scroll: {
        flex: 1,
        backgroundColor: '#F3F4F6'
    },
    scrollContent: {
        paddingBottom: 24
    },

    // Avatar
    avatarSection: {
        backgroundColor: '#fff',
        alignItems: 'center',
        paddingVertical: 24,
        marginBottom: 4
    },
    avatarWrapper: {
        position: 'relative',
        marginBottom: 12
    },
    avatar: {
        width: 96,
        height: 96,
        borderRadius: 48,
        borderWidth: 3,
        borderColor: '#E3F2FD'
    },
    avatarPlaceholder: {
        backgroundColor: '#E3F2FD',
        alignItems: 'center',
        justifyContent: 'center'
    },
    cameraBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#42A4F5',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#fff',
    },
    profileName: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1E293B'
    },

    // Section
    sectionHeader: {
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 6
    },
    sectionHeaderText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#94A3B8',
        letterSpacing: 0.8
    },
    card: {
        backgroundColor: '#fff',
        marginBottom: 4
    },
    // Row divider
    divider: {
        height: 1,
        backgroundColor: '#F1F5F9',
        marginLeft: 66
    },

    // Logout
    logoutRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 16
    },
    logoutText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#EF4444'
    },

    // Menu row (e.g. change password)
    menuRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
        gap: 12,
    },
    menuIconCircle: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: '#E3F2FD',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    menuRowText: {
        flex: 1,
        fontSize: 14,
        fontWeight: '500',
        color: '#1E293B',
    },
});
