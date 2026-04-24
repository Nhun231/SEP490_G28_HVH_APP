import React, { useState, useEffect } from 'react';
import {
    Modal,
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ActivityDomain } from '@/services/event-types';
import { getAllActivityDomains } from '@/services/public-event-service';

// Collapse duplicate domain names into one entry, merging their subdomains
function mergeByName(domains: ActivityDomain[]): ActivityDomain[] {
    const map = new Map<string, ActivityDomain>();
    for (const d of domains) {
        if (map.has(d.name)) {
            const existing = map.get(d.name)!;
            const existingIds = new Set(existing.activitySubDomainList.map(s => s.id));
            const newSubs = d.activitySubDomainList.filter(s => !existingIds.has(s.id));
            existing.activitySubDomainList = [...existing.activitySubDomainList, ...newSubs];
        } else {
            map.set(d.name, { ...d, activitySubDomainList: [...d.activitySubDomainList] });
        }
    }
    return Array.from(map.values());
}

interface Props {
    visible: boolean;
    initialSelectedIds: number[];
    onConfirm: (selectedIds: number[]) => void;
    onClose: () => void;
}

export default function DomainFilterSheet({ visible, initialSelectedIds, onConfirm, onClose }: Props) {
    const [domains, setDomains] = useState<ActivityDomain[]>([]);
    const [loadingDomains, setLoadingDomains] = useState(false);
    const [activeDomainIndex, setActiveDomainIndex] = useState(0);
    const [selectedIds, setSelectedIds] = useState<number[]>(initialSelectedIds);

    useEffect(() => {
        if (!visible) return;
        let cancelled = false;
        const load = async () => {
            setLoadingDomains(true);
            try {
                const data = await getAllActivityDomains();
                if (!cancelled) setDomains(mergeByName(data));
            } catch (e) {
                console.error('Failed to load activity domains', e);
            } finally {
                if (!cancelled) setLoadingDomains(false);
            }
        };
        // Reset UI state first, then load
        setSelectedIds(initialSelectedIds);
        setActiveDomainIndex(0);
        load();
        return () => { cancelled = true; };
    }, [visible]);

    const toggleSubdomain = (id: number) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const handleClear = () => setSelectedIds([]);

    const handleConfirm = () => onConfirm(selectedIds);

    const activeDomain = domains[activeDomainIndex] ?? null;

    // How many subdomains of this domain are selected
    const countForDomain = (domain: ActivityDomain) =>
        domain.activitySubDomainList.filter(s => selectedIds.includes(s.id)).length;

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={styles.overlay}>
                <View style={styles.sheet}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.headerTitle}>Chọn lĩnh vực</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <Ionicons name="close" size={22} color="#6B7280" />
                        </TouchableOpacity>
                    </View>

                    {loadingDomains ? (
                        <View style={styles.loadingBox}>
                            <ActivityIndicator size="large" color="#42A4F5" />
                            <Text style={styles.loadingText}>Đang tải lĩnh vực...</Text>
                        </View>
                    ) : (
                        <View style={styles.body}>
                            {/* ── Left panel: domain list ── */}
                            <View style={styles.domainListWrapper}>
                                <ScrollView
                                    style={styles.domainList}
                                    showsVerticalScrollIndicator={false}
                                >
                                    {domains.map((domain, idx) => {
                                        const isActive = idx === activeDomainIndex;
                                        const count = countForDomain(domain);
                                        return (
                                            <TouchableOpacity
                                                key={domain.name}
                                                style={[styles.domainItem, isActive && styles.domainItemActive]}
                                                onPress={() => setActiveDomainIndex(idx)}
                                                activeOpacity={0.7}
                                            >
                                                {isActive && (
                                                    <View style={styles.domainActiveLine} />
                                                )}
                                                <Text
                                                    style={[
                                                        styles.domainText,
                                                        isActive && styles.domainTextActive,
                                                    ]}
                                                    numberOfLines={3}
                                                >
                                                    {domain.name}
                                                </Text>
                                                {count > 0 && (
                                                    <View style={styles.domainBadge}>
                                                        <Text style={styles.domainBadgeText}>{count}</Text>
                                                    </View>
                                                )}
                                            </TouchableOpacity>
                                        );
                                    })}
                                </ScrollView>
                            </View>

                            {/* ── Right panel: subdomain chips ── */}
                            <View style={styles.subdomainPanelWrapper}>
                                <ScrollView
                                    style={styles.subdomainPanel}
                                    showsVerticalScrollIndicator={false}
                                    contentContainerStyle={styles.subdomainContent}
                                >
                                    {activeDomain ? (
                                        activeDomain.activitySubDomainList.length === 0 ? (
                                            <Text style={styles.emptySubText}>Không có lĩnh vực con</Text>
                                        ) : (
                                            activeDomain.activitySubDomainList.map(sub => {
                                                const isSelected = selectedIds.includes(sub.id);
                                                return (
                                                    <TouchableOpacity
                                                        key={sub.id}
                                                        style={[styles.subChip, isSelected && styles.subChipActive]}
                                                        onPress={() => toggleSubdomain(sub.id)}
                                                        activeOpacity={0.7}
                                                    >
                                                        <Text style={[styles.subChipText, isSelected && styles.subChipTextActive]}>
                                                            {sub.name}
                                                        </Text>
                                                    </TouchableOpacity>
                                                );
                                            })
                                        )
                                    ) : null}
                                </ScrollView>
                            </View>
                        </View>
                    )}

                    {/* Footer */}
                    <View style={styles.footer}>
                        <TouchableOpacity style={styles.clearBtn} onPress={handleClear}>
                            <Text style={styles.clearBtnText}>Xóa lựa chọn</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
                            <Text style={styles.confirmBtnText}>
                                {selectedIds.length > 0
                                    ? `Xác nhận (${selectedIds.length})`
                                    : 'Xác nhận'}
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
        height: '82%',
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

    /* Loading */
    loadingBox: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
    },
    loadingText: {
        fontSize: 14,
        color: '#6B7280',
    },

    /* Two-panel body */
    body: {
        flex: 1,
        flexDirection: 'row',
    },

    /* Left: domain list wrapper (controls 1/3 width) */
    domainListWrapper: {
        flex: 1,
        borderRightWidth: 1,
        borderRightColor: '#E5E7EB',
    },
    domainList: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    domainItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 12,
        position: 'relative',
    },
    domainItemActive: {
        backgroundColor: '#FFFFFF',
    },
    domainActiveLine: {
        position: 'absolute',
        left: 0,
        top: 8,
        bottom: 8,
        width: 3,
        backgroundColor: '#42A4F5',
        borderRadius: 2,
    },
    domainText: {
        flex: 1,
        fontSize: 13,
        color: '#6B7280',
        lineHeight: 18,
    },
    domainTextActive: {
        color: '#42A4F5',
        fontWeight: '700',
    },
    domainBadge: {
        minWidth: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: '#42A4F5',
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 4,
        paddingHorizontal: 4,
    },
    domainBadgeText: {
        fontSize: 10,
        color: '#FFFFFF',
        fontWeight: '700',
    },

    /* Vertical divider */
    divider: {
        width: 1,
        backgroundColor: '#E5E7EB',
    },

    /* Right: subdomain chips wrapper (controls 2/3 width) */
    subdomainPanelWrapper: {
        flex: 2,
        backgroundColor: '#FFFFFF',
    },
    subdomainPanel: {
        flex: 1,
    },
    subdomainContent: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        padding: 14,
        gap: 8,
    },
    subChip: {
        width: '31%',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 7,
        paddingHorizontal: 4,
        borderRadius: 16,
        borderWidth: 1.5,
        borderColor: '#D1D5DB',
        backgroundColor: '#FFFFFF',
    },
    subChipActive: {
        backgroundColor: '#EBF5FF',
        borderColor: '#42A4F5',
    },
    subChipText: {
        fontSize: 12,
        textAlign: 'center',
        color: '#374151',
    },
    subChipTextActive: {
        color: '#42A4F5',
        fontWeight: '600',
    },
    emptySubText: {
        fontSize: 13,
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
    confirmBtnText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#FFFFFF',
    },
});
