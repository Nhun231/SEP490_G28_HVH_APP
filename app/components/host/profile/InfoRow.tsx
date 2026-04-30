import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export type InfoRowFieldType = 'text' | 'gender' | 'date';

export type InfoRowProps = {
    iconName: string;
    iconColor: string;
    iconBg: string;
    label: string;
    value: string;
    locked?: boolean;
    // Editing
    isEditing?: boolean;
    fieldType?: InfoRowFieldType;
    editText?: string;
    onEditTextChange?: (v: string) => void;
    editGender?: boolean;
    onGenderToggle?: (v: boolean) => void;
    onStartEdit?: () => void;
    onConfirm?: () => void;
    onCancel?: () => void;
    saving?: boolean;
};

const InfoRow: React.FC<InfoRowProps> = ({
    iconName, iconColor, iconBg, label, value,
    locked, isEditing, fieldType = 'text',
    editText = '', onEditTextChange,
    editGender, onGenderToggle,
    onStartEdit, onConfirm, onCancel, saving,
}) => (
    <View style={styles.infoRow}>
        {/* Left icon */}
        <View style={[styles.iconCircle, { backgroundColor: iconBg }]}>
            <Ionicons name={iconName as any} size={18} color={iconColor} />
        </View>

        {/* Content */}
        <View style={styles.infoText}>
            <Text style={styles.infoLabel}>{label}</Text>

            {isEditing ? (
                fieldType === 'gender' ? (
                    <View style={styles.genderToggle}>
                        <TouchableOpacity
                            style={[styles.genderPill, editGender === true && styles.genderPillActive]}
                            onPress={() => onGenderToggle?.(true)}
                        >
                            <Text style={[styles.genderPillText, editGender === true && styles.genderPillTextActive]}>Nam</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.genderPill, editGender === false && styles.genderPillActive]}
                            onPress={() => onGenderToggle?.(false)}
                        >
                            <Text style={[styles.genderPillText, editGender === false && styles.genderPillTextActive]}>Nữ</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <TextInput
                        style={styles.inlineInput}
                        value={editText}
                        onChangeText={onEditTextChange}
                        placeholder={fieldType === 'date' ? 'DD/MM/YYYY' : '...'}
                        placeholderTextColor="#CBD5E1"
                        keyboardType={fieldType === 'date' ? 'numbers-and-punctuation' : 'default'}
                        autoFocus
                        returnKeyType="done"
                        onSubmitEditing={onConfirm}
                        autoCorrect={false}
                        autoCapitalize="none"
                    />
                )
            ) : (
                <Text style={styles.infoValue} numberOfLines={2}>{value || '—'}</Text>
            )}
        </View>

        {/* Right action */}
        {locked ? (
            <Ionicons name="lock-closed-outline" size={18} color="#CBD5E1" />
        ) : isEditing ? (
            <View style={styles.editActions}>
                <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={onCancel}
                    disabled={saving}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 4 }}
                >
                    <Ionicons name="close-circle" size={22} color="#EF4444" />
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={onConfirm}
                    disabled={saving}
                    hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
                >
                    {saving
                        ? <ActivityIndicator size="small" color={'#42A4F5'} />
                        : <Ionicons name="checkmark-circle" size={22} color="#22C55E" />
                    }
                </TouchableOpacity>
            </View>
        ) : (
            <TouchableOpacity onPress={onStartEdit} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="pencil-outline" size={18} color="#94A3B8" />
            </TouchableOpacity>
        )}
    </View>
);

export default InfoRow;

const styles = StyleSheet.create({
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 12,
        minHeight: 58,
    },
    iconCircle: {
        width: 38,
        height: 38,
        borderRadius: 19,
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    infoText: {
        flex: 1
    },
    infoLabel: {
        fontSize: 11,
        color: '#94A3B8',
        fontWeight: '600',
        letterSpacing: 0.4,
        marginBottom: 3,
    },
    infoValue: {
        fontSize: 14,
        color: '#1E293B',
        fontWeight: '500',
    },

    // Inline edit
    inlineInput: {
        fontSize: 14,
        color: '#1E293B',
        fontWeight: '500',
        borderBottomWidth: 1.5,
        borderBottomColor: '#42A4F5',
        paddingVertical: 2,
        paddingHorizontal: 0,
        minWidth: 80,
    },
    editActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2
    },
    actionBtn: {
        padding: 2
    },

    // Gender inline toggle
    genderToggle: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 2
    },
    genderPill: {
        paddingHorizontal: 14,
        paddingVertical: 4,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        backgroundColor: '#F8FAFC',
    },
    genderPillActive: {
        backgroundColor: '#42A4F5',
        borderColor: '#42A4F5'
    },
    genderPillText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#64748B'
    },
    genderPillTextActive: {
        color: '#fff'
    },
});
