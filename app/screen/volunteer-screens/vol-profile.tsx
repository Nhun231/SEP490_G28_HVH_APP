import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    Image, ActivityIndicator, RefreshControl, TextInput, Alert,
    KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { getVolunteerProfile, updateVolunteerProfile } from '@/services/profile-service';
import type { VolunteerProfileResponse } from '@/services/profile-types';
import { resolveSupabaseUrl } from '@/services/api-helpers';
import { uploadImageToSupabase, getFileExtension, getMimeType } from '@/services/upload-service';
import InfoRow from '@/app/components/host/profile/InfoRow';
import BottomSheetPicker, { OptionItem } from '@/app/components/host/create-event/BottomSheetPicker';
import educationData from '@/assets/education_levels/education_levels.json';
import employData from '@/assets/employ_status/employ_status.json';
import wardData from '@/assets/wards/phuong_xa_moi_ha_noi.json';

const EDUCATION_OPTIONS: OptionItem[] = educationData.education_levels.map(e => ({ id: e.id, label: e.label, value: e.value }));
const EMPLOY_OPTIONS: OptionItem[] = employData.employ_status.map(e => ({ id: e.id, label: e.label, value: e.value }));
const WARD_OPTIONS: OptionItem[] = wardData.danh_sach_phuong_xa_moi.map((w, i) => ({ id: i + 1, label: w.ten_moi, value: w.ten_moi }));

function formatDate(iso: string | null | undefined): string {
    if (!iso) return '—';
    const [y, m, d] = iso.split('T')[0].split('-');
    return `${d}/${m}/${y}`;
}
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
function optionLabel(options: OptionItem[], value: string | null | undefined): string {
    if (!value) return '—';
    return options.find(o => o.value === value)?.label ?? value;
}

type EditForm = {
    nickName: string; fullName: string; bio: string;
    gender: boolean; dob: string; address: string;
    detailAddress: string; employStatus: string;
    workAddress: string; educationLevel: string; sid: string;
};

const SectionHeader = ({ title }: { title: string }) => (
    <View style={styles.sectionHeader}>
        <Text style={styles.sectionHeaderText}>{title}</Text>
    </View>
);

const StatCard = ({ value, label, icon, color }: { value: string | number; label: string; icon: string; color: string }) => (
    <View style={styles.statCard}>
        <Ionicons name={icon as any} size={20} color={color} style={{ marginBottom: 4 }} />
        <Text style={[styles.statValue, { color }]}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
    </View>
);

const ERow = ({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) => (
    <View style={styles.eRow}>
        <Text style={styles.eLabel}>{label}{required ? <Text style={{ color: '#EF4444' }}> *</Text> : ''}</Text>
        {children}
    </View>
);

export default function VolProfileScreen() {
    const router = useRouter();
    const [profile, setProfile] = useState<VolunteerProfileResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [avatarUploading, setAvatarUploading] = useState(false);
    const [localAvatarUri, setLocalAvatarUri] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [showEmployPicker, setShowEmployPicker] = useState(false);
    const [showEducationPicker, setShowEducationPicker] = useState(false);
    const [showWardPicker, setShowWardPicker] = useState(false);
    const [editForm, setEditForm] = useState<EditForm>({
        nickName: '', fullName: '', bio: '', gender: true, dob: '',
        address: '', detailAddress: '', employStatus: '',
        workAddress: '', educationLevel: '', sid: '',
    });

    const fetchProfile = useCallback(async () => {
        try { const data = await getVolunteerProfile(); setProfile(data); }
        catch { /* silent */ }
        finally { setLoading(false); setRefreshing(false); }
    }, []);

    useEffect(() => { fetchProfile(); }, [fetchProfile]);
    const handleRefresh = () => { setRefreshing(true); fetchProfile(); };

    const startEditing = () => {
        if (!profile) return;
        setEditForm({
            nickName: profile.nickname ?? '',
            fullName: profile.fullName ?? '',
            bio: profile.bio ?? '',
            gender: profile.gender ?? true,
            dob: profile.dob ? formatDate(profile.dob) : '',
            address: profile.address ?? '',
            detailAddress: profile.detailAddress ?? '',
            employStatus: profile.employStatus ?? '',
            workAddress: profile.workAddress ?? '',
            educationLevel: profile.educationLevel ?? '',
            sid: profile.sid ?? '',
        });
        setIsEditing(true);
    };

    const upd = (key: keyof EditForm) => (val: string | boolean) =>
        setEditForm(f => ({ ...f, [key]: val }));

    const handleSave = async () => {
        let dob = '';
        if (editForm.dob.trim()) {
            dob = parseDateToISO(editForm.dob.trim());
            if (!dob) { Alert.alert('Lỗi', 'Ngày sinh phải theo dạng DD/MM/YYYY.'); return; }
        }
        setSaving(true);
        try {
            await updateVolunteerProfile({
                nickName: editForm.nickName,
                fullName: editForm.fullName,
                bio: editForm.bio,
                gender: editForm.gender,
                dob,
                avatarExtension: null,
                address: editForm.address,
                detailAddress: editForm.detailAddress,
                employStatus: editForm.employStatus,
                workAddress: editForm.workAddress,
                educationLevel: editForm.educationLevel,
                sid: editForm.sid,
            });
            await fetchProfile();
            setIsEditing(false);
            Alert.alert('Thành công', 'Thông tin cá nhân đã được cập nhật.');
        } catch (e: any) {
            Alert.alert('Lỗi', e?.response?.data?.message ?? e?.message ?? 'Không thể cập nhật.');
        } finally { setSaving(false); }
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
            quality: 0.85
        });
        if (result.canceled || !result.assets[0]) return;
        const asset = result.assets[0];
        setLocalAvatarUri(asset.uri);
        setAvatarUploading(true);
        try {
            const ext = getFileExtension(asset.uri, asset.mimeType);
            const updateRes = await updateVolunteerProfile({
                nickName: profile?.nickname ?? '',
                fullName: profile?.fullName ?? '',
                bio: profile?.bio ?? '',
                gender: profile?.gender ?? true,
                dob: profile?.dob ?? '',
                avatarExtension: ext,
                address: profile?.address ?? '',
                detailAddress: profile?.detailAddress ?? '',
                employStatus: profile?.employStatus ?? '',
                workAddress: profile?.workAddress ?? '',
                educationLevel: profile?.educationLevel ?? '',
                sid: profile?.sid ?? '',
            });
            const uploadPath = updateRes.avatarUploadUrl;
            if (!uploadPath) throw new Error('Không nhận được URL upload từ server.');
            await uploadImageToSupabase(resolveSupabaseUrl(uploadPath)!, {
                uri: asset.uri,
                mimeType: getMimeType(ext)
            });
            await fetchProfile();
            Alert.alert('Thành công', 'Ảnh đại diện đã được cập nhật.');
        } catch (e: any) {
            setLocalAvatarUri(null);
            Alert.alert('Lỗi', e?.message ?? 'Không thể cập nhật ảnh.');
        } finally { setAvatarUploading(false); }
    };

    const avatarUri = localAvatarUri ?? resolveSupabaseUrl(profile?.avatarUrl) ?? null;

    if (loading) return (
        <SafeAreaView style={[styles.safeArea, { justifyContent: 'center', alignItems: 'center' }]} edges={['top']}>
            <ActivityIndicator size="large" color={'#42A4F5'} />
        </SafeAreaView>
    );

    const selEmployId = EMPLOY_OPTIONS.find(o => o.value === editForm.employStatus)?.id;
    const selEduId = EDUCATION_OPTIONS.find(o => o.value === editForm.educationLevel)?.id;

    return (
        <SafeAreaView style={styles.safeArea} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
                    <Ionicons name="arrow-back" size={22} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Thông tin cá nhân</Text>
                {!isEditing
                    ? <TouchableOpacity style={styles.editBtn} onPress={startEditing} activeOpacity={0.8}>
                        <Ionicons name="create-outline" size={15} color={'#42A4F5'} />
                        <Text style={styles.editBtnText}>Sửa</Text>
                    </TouchableOpacity>
                    : <View style={{ width: 56 }} />
                }
            </View>

            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled"
                    refreshControl={!isEditing ? <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#42A4F5']} tintColor={'#42A4F5'} /> : undefined}>

                    {/* AVATAR */}
                    <View style={styles.avatarSection}>
                        <TouchableOpacity style={styles.avatarWrapper} onPress={handlePickAvatar} activeOpacity={0.85} disabled={avatarUploading}>
                            {avatarUri
                                ? <Image source={{ uri: avatarUri }} style={styles.avatar} />
                                : <View style={[styles.avatar, styles.avatarPlaceholder]}><Ionicons name="person" size={48} color={'#42A4F5'} /></View>
                            }
                            <View style={styles.cameraBadge}>
                                {avatarUploading ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="camera" size={14} color="#fff" />}
                            </View>
                        </TouchableOpacity>
                        <Text style={styles.profileName}>{isEditing ? (editForm.fullName || 'Tình nguyện viên') : (profile?.fullName ?? 'Tình nguyện viên')}</Text>
                        {(isEditing ? editForm.nickName : profile?.nickname)
                            ? <Text style={styles.profileNickname}>"{isEditing ? editForm.nickName : profile?.nickname}"</Text>
                            : null}
                    </View>

                    {/* STATS */}
                    <View style={styles.statsRow}>
                        <StatCard value={profile?.creditScore ?? 0} label="Giờ uy tín" icon="time" color="#06B6D4" />
                        <View style={styles.statDivider} />
                        <StatCard value={profile?.honorScore ?? 0} label="Giờ vinh dự" icon="shield-checkmark" color="#22C55E" />
                        <View style={styles.statDivider} />
                        <StatCard value={profile?.avgRating?.toFixed(1) ?? '—'} label="Đánh giá" icon="star" color="#F59E0B" />
                        <View style={styles.statDivider} />
                        <StatCard value={profile?.activityCount ?? 0} label="Hoạt động" icon="checkmark-circle" color='#42A4F5' />
                    </View>

                    {/* IDENTITY & SYSTEM */}
                    <SectionHeader title="ĐỊNH DANH & HỆ THỐNG" />
                    <View style={styles.card}>
                        <InfoRow iconName="id-card-outline" iconColor="#94A3B8" iconBg="#F1F5F9" label="MÃ TÌNH NGUYỆN VIÊN (VID)" value={profile?.vid ?? '—'} locked />
                        <View style={styles.divider} />
                        <InfoRow iconName="finger-print-outline" iconColor="#94A3B8" iconBg="#F1F5F9" label="SỐ CCCD (CID)" value={profile?.cid ?? '—'} locked />
                        <View style={styles.divider} />
                        <InfoRow iconName="mail-outline" iconColor="#94A3B8" iconBg="#F1F5F9" label="EMAIL ĐĂNG NHẬP" value={profile?.email ?? '—'} locked />
                    </View>

                    {/* PERSONAL */}
                    <SectionHeader title="CÁ NHÂN" />
                    <View style={styles.card}>
                        {isEditing ? (<>
                            <ERow label="HỌ VÀ TÊN" required>
                                <TextInput style={styles.ei} value={editForm.fullName} onChangeText={upd('fullName')} placeholder="Nhập họ và tên" />
                            </ERow>
                            <View style={styles.divider} />
                            <ERow label="BIỆT DANH">
                                <TextInput style={styles.ei} value={editForm.nickName} onChangeText={upd('nickName')} placeholder="Nhập biệt danh" />
                            </ERow>
                            <View style={styles.divider} />
                            <ERow label="GIỚI TÍNH">
                                <View style={styles.genderRow}>
                                    <TouchableOpacity style={[styles.gBtn, editForm.gender === true && styles.gBtnOn]} onPress={() => upd('gender')(true)}>
                                        <Text style={[styles.gBtnTxt, editForm.gender === true && styles.gBtnTxtOn]}>Nam</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={[styles.gBtn, editForm.gender === false && styles.gBtnOn]} onPress={() => upd('gender')(false)}>
                                        <Text style={[styles.gBtnTxt, editForm.gender === false && styles.gBtnTxtOn]}>Nữ</Text>
                                    </TouchableOpacity>
                                </View>
                            </ERow>
                            <View style={styles.divider} />
                            <ERow label="NGÀY SINH">
                                <TextInput style={styles.ei} value={editForm.dob} onChangeText={upd('dob')} placeholder="DD/MM/YYYY" />
                            </ERow>
                            <View style={styles.divider} />
                            <ERow label="GIỚI THIỆU BẢN THÂN">
                                <TextInput style={[styles.ei, { minHeight: 64, textAlignVertical: 'top' }]} value={editForm.bio} onChangeText={upd('bio')} placeholder="Viết vài dòng về bản thân..." multiline />
                            </ERow>
                            <View style={styles.divider} />
                            <ERow label="MÃ SINH VIÊN (SID)">
                                <TextInput style={styles.ei} value={editForm.sid} onChangeText={upd('sid')} placeholder="Nhập mã sinh viên" />
                            </ERow>
                        </>) : (<>
                            <InfoRow iconName="person-outline" iconColor="#94A3B8" iconBg="#F1F5F9" label="HỌ VÀ TÊN" value={profile?.fullName ?? '—'} locked />
                            <View style={styles.divider} />
                            <InfoRow iconName="happy-outline" iconColor="#94A3B8" iconBg="#F1F5F9" label="BIỆT DANH" value={profile?.nickname ?? '—'} locked />
                            <View style={styles.divider} />
                            <InfoRow iconName="person-outline" iconColor="#94A3B8" iconBg="#F1F5F9" label="GIỚI TÍNH" value={formatGender(profile?.gender)} locked />
                            <View style={styles.divider} />
                            <InfoRow iconName="calendar-outline" iconColor="#94A3B8" iconBg="#F1F5F9" label="NGÀY SINH" value={formatDate(profile?.dob)} locked />
                            <View style={styles.divider} />
                            <InfoRow iconName="document-text-outline" iconColor="#94A3B8" iconBg="#F1F5F9" label="GIỚI THIỆU BẢN THÂN" value={profile?.bio ?? '—'} locked />
                            <View style={styles.divider} />
                            <InfoRow iconName="school-outline" iconColor="#94A3B8" iconBg="#F1F5F9" label="MÃ SINH VIÊN (SID)" value={profile?.sid ?? '—'} locked />
                        </>)}
                    </View>

                    {/* CONTACT INFO */}
                    <SectionHeader title="LIÊN HỆ" />
                    <View style={styles.card}>
                        <InfoRow iconName="call-outline" iconColor="#94A3B8" iconBg="#F1F5F9" label="SỐ ĐIỆN THOẠI" value={profile?.phone ?? '—'} locked />
                        {isEditing ? (<>
                            <View style={styles.divider} />
                            <ERow label="KHU VỰC">
                                <TouchableOpacity style={styles.pickerBtn} onPress={() => setShowWardPicker(true)}>
                                    <Text style={[styles.pickerBtnTxt, !editForm.address && { color: '#9CA3AF' }]}>
                                        {editForm.address || 'Chọn phường/xã...'}
                                    </Text>
                                    <Ionicons name="chevron-down" size={16} color="#94A3B8" />
                                </TouchableOpacity>
                            </ERow>
                            <View style={styles.divider} />
                            <ERow label="ĐỊA CHỈ CHI TIẾT">
                                <TextInput style={styles.ei} value={editForm.detailAddress} onChangeText={upd('detailAddress')} placeholder="Nhập địa chỉ chi tiết" />
                            </ERow>
                        </>) : (<>
                            <View style={styles.divider} />
                            <InfoRow iconName="location-outline" iconColor="#94A3B8" iconBg="#F1F5F9" label="KHU VỰC" value={profile?.address ?? '—'} locked />
                            <View style={styles.divider} />
                            <InfoRow iconName="location-outline" iconColor="#94A3B8" iconBg="#F1F5F9" label="ĐỊA CHỈ CHI TIẾT" value={profile?.detailAddress ?? '—'} locked />
                        </>)}
                    </View>

                    {/* EMPLOYMENT & EDUCATION */}
                    <SectionHeader title="CÔNG VIỆC & HỌC VẤN" />
                    <View style={styles.card}>
                        {isEditing ? (<>
                            <ERow label="TÌNH TRẠNG VIỆC LÀM">
                                <TouchableOpacity style={styles.pickerBtn} onPress={() => setShowEmployPicker(true)}>
                                    <Text style={[styles.pickerBtnTxt, !editForm.employStatus && { color: '#9CA3AF' }]}>
                                        {optionLabel(EMPLOY_OPTIONS, editForm.employStatus) === '—' ? 'Chọn tình trạng...' : optionLabel(EMPLOY_OPTIONS, editForm.employStatus)}
                                    </Text>
                                    <Ionicons name="chevron-down" size={16} color="#94A3B8" />
                                </TouchableOpacity>
                            </ERow>
                            <View style={styles.divider} />
                            <ERow label="NƠI LÀM VIỆC">
                                <TextInput style={styles.ei} value={editForm.workAddress} onChangeText={upd('workAddress')} placeholder="Nhập nơi làm việc" />
                            </ERow>
                            <View style={styles.divider} />
                            <ERow label="TRÌNH ĐỘ HỌC VẤN">
                                <TouchableOpacity style={styles.pickerBtn} onPress={() => setShowEducationPicker(true)}>
                                    <Text style={[styles.pickerBtnTxt, !editForm.educationLevel && { color: '#9CA3AF' }]}>
                                        {optionLabel(EDUCATION_OPTIONS, editForm.educationLevel) === '—' ? 'Chọn trình độ...' : optionLabel(EDUCATION_OPTIONS, editForm.educationLevel)}
                                    </Text>
                                    <Ionicons name="chevron-down" size={16} color="#94A3B8" />
                                </TouchableOpacity>
                            </ERow>
                        </>) : (<>
                            <InfoRow iconName="briefcase-outline" iconColor="#94A3B8" iconBg="#F1F5F9" label="TÌNH TRẠNG VIỆC LÀM" value={optionLabel(EMPLOY_OPTIONS, profile?.employStatus)} locked />
                            <View style={styles.divider} />
                            <InfoRow iconName="business-outline" iconColor="#94A3B8" iconBg="#F1F5F9" label="NƠI LÀM VIỆC" value={profile?.workAddress ?? '—'} locked />
                            <View style={styles.divider} />
                            <InfoRow iconName="school-outline" iconColor="#94A3B8" iconBg="#F1F5F9" label="TRÌNH ĐỘ HỌC VẤN" value={optionLabel(EDUCATION_OPTIONS, profile?.educationLevel)} locked />
                        </>)}
                    </View>

                    {/* Bottom action buttons when editing */}
                    {isEditing && (
                        <View style={styles.actionRow}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsEditing(false)} disabled={saving}>
                                <Text style={styles.cancelTxt}>Hủy</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.7 }]} onPress={handleSave} disabled={saving}>
                                {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveTxt}>Cập nhật</Text>}
                            </TouchableOpacity>
                        </View>
                    )}

                    <View style={{ height: 32 }} />
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Pickers */}
            <BottomSheetPicker visible={showEmployPicker} onClose={() => setShowEmployPicker(false)}
                title="Tình trạng việc làm" options={EMPLOY_OPTIONS} selectedId={selEmployId}
                onSelect={item => { upd('employStatus')(item.value ?? ''); setShowEmployPicker(false); }} />
            <BottomSheetPicker visible={showEducationPicker} onClose={() => setShowEducationPicker(false)}
                title="Trình độ học vấn" options={EDUCATION_OPTIONS} selectedId={selEduId}
                onSelect={item => { upd('educationLevel')(item.value ?? ''); setShowEducationPicker(false); }} />
            <BottomSheetPicker visible={showWardPicker} onClose={() => setShowWardPicker(false)}
                title="Chọn phường / xã" options={WARD_OPTIONS} selectedId={WARD_OPTIONS.find(w => w.value === editForm.address)?.id}
                onSelect={item => { upd('address')(item.value ?? ''); setShowWardPicker(false); }} />
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
        paddingVertical: 12
    },
    backBtn: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center'
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#fff'
    },
    editBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#fff',
        borderRadius: 20,
        paddingHorizontal: 12,
        paddingVertical: 6
    },
    editBtnText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#42A4F5'
    },

    scroll: {
        flex: 1,
        backgroundColor: '#F3F4F6'
    },
    scrollContent: {
        paddingBottom: 24
    },

    avatarSection: {
        backgroundColor: '#fff',
        alignItems: 'center',
        paddingVertical: 28,
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
        borderColor: '#fff'
    },
    profileName: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1E293B'
    },
    profileNickname: {
        fontSize: 13,
        color: '#64748B',
        fontStyle: 'italic',
        marginTop: 4
    },

    statsRow: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        marginBottom: 4,
        paddingVertical: 16
    },
    statCard: {
        flex: 1,
        alignItems: 'center'
    },
    statValue: {
        fontSize: 18,
        fontWeight: '800',
        marginBottom: 2
    },
    statLabel: {
        fontSize: 11,
        color: '#94A3B8',
        fontWeight: '500'
    },
    statDivider: {
        width: 1,
        backgroundColor: '#E2E8F0',
        marginVertical: 4
    },

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
    divider: {
        height: 1,
        backgroundColor: '#F1F5F9',
        marginLeft: 16
    },

    // Edit row
    eRow: {
        paddingHorizontal: 16,
        paddingVertical: 12
    },
    eLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: '#94A3B8',
        letterSpacing: 0.5,
        marginBottom: 6
    },
    ei: {
        fontSize: 14,
        color: '#1E293B',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 9,
        backgroundColor: '#F8FAFC'
    },

    // Gender toggle
    genderRow: {
        flexDirection: 'row',
        gap: 8
    },
    gBtn: {
        flex: 1,
        paddingVertical: 9,
        borderRadius: 10,
        borderWidth: 1.5,
        borderColor: '#E2E8F0',
        alignItems: 'center',
        backgroundColor: '#F8FAFC'
    },
    gBtnOn: {
        borderColor: '#42A4F5',
        backgroundColor: '#E3F2FD'
    },
    gBtnTxt: {
        fontSize: 14,
        color: '#94A3B8',
        fontWeight: '600'
    },
    gBtnTxtOn: {
        color: '#42A4F5'
    },

    // Picker button
    pickerBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
        backgroundColor: '#F8FAFC'
    },
    pickerBtnTxt: {
        fontSize: 14,
        color: '#1E293B',
        flex: 1
    },

    // Bottom actions
    actionRow: {
        flexDirection: 'row',
        gap: 12,
        marginHorizontal: 16,
        marginTop: 20,
        marginBottom: 4
    },
    cancelBtn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: '#E2E8F0',
        alignItems: 'center'
    },
    cancelTxt: {
        fontSize: 15,
        fontWeight: '600',
        color: '#64748B'
    },
    saveBtn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: '#42A4F5',
        alignItems: 'center'
    },
    saveTxt: {
        fontSize: 15,
        fontWeight: '700',
        color: '#fff'
    },
});
