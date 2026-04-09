import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, Animated, Keyboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface MasterTabConfig<T extends string> {
    key: T;
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
}

interface EventListHeaderProps<T extends string> {
    title: string;
    subtitle?: string;
    masterTabs: MasterTabConfig<T>[];
    masterTab: T;
    onMasterTabChange: (tab: T) => void;
    searchPlaceholder?: string;
    searchText: string;
    onSearchChange: (text: string) => void;
    onSearchClear: () => void;
    searchVisible: boolean;
    onSearchToggle: () => void;
    // back button
    onBack?: () => void;
    // right action button
    rightAction?: React.ReactNode;
}

const EventListHeader = <T extends string>({
    title,
    subtitle,
    masterTabs,
    masterTab,
    onMasterTabChange,
    searchPlaceholder = 'Tìm kiếm...',
    searchText,
    onSearchChange,
    onSearchClear,
    searchVisible,
    onSearchToggle,
    onBack,
    rightAction,
}: EventListHeaderProps<T>) => {
    const inputRef = useRef<TextInput>(null);
    const searchAnim = useRef(new Animated.Value(searchVisible ? 1 : 0)).current;

    useEffect(() => {
        if (searchVisible) {
            Animated.spring(searchAnim, {
                toValue: 1,
                useNativeDriver: false,
                bounciness: 6,
            }).start(() => {
                setTimeout(() => inputRef.current?.focus(), 50);
            });
        } else {
            Keyboard.dismiss();
            Animated.timing(searchAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: false,
            }).start();
        }
    }, [searchVisible]);

    const searchBarHeight = searchAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 52],
    });

    return (
        <>
            {/* Header */}
            <View style={styles.header}>
                {/* Back button – inline before title */}
                {onBack && (
                    <TouchableOpacity
                        style={styles.backBtn}
                        onPress={onBack}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
                    </TouchableOpacity>
                )}
                <View style={{ flex: 1 }}>
                    <Text style={styles.headerTitle}>{title}</Text>
                    {subtitle ? <Text style={styles.headerSub}>{subtitle}</Text> : null}
                </View>
                <TouchableOpacity
                    style={[styles.headerIconBtn, searchVisible && styles.headerIconBtnActive]}
                    onPress={onSearchToggle}
                    activeOpacity={0.7}
                >
                    <Ionicons
                        name={searchVisible ? 'close' : 'search-outline'}
                        size={22}
                        color="#FFFFFF"
                    />
                </TouchableOpacity>
                {rightAction}
            </View>

            {/* Animated Search Bar */}
            <Animated.View style={[styles.searchWrapper, { height: searchBarHeight }]}>
                {searchVisible && (
                    <View style={styles.searchBar}>
                        <Ionicons name="search-outline" size={18} color="#94A3B8" style={styles.searchIcon} />
                        <TextInput
                            ref={inputRef}
                            style={styles.searchInput}
                            placeholder={searchPlaceholder}
                            placeholderTextColor="#94A3B8"
                            value={searchText}
                            onChangeText={onSearchChange}
                            returnKeyType="search"
                            autoCorrect={false}
                            autoCapitalize="none"
                        />
                        {searchText.length > 0 && (
                            <TouchableOpacity
                                onPress={onSearchClear}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            >
                                <Ionicons name="close-circle" size={18} color="#CBD5E1" />
                            </TouchableOpacity>
                        )}
                    </View>
                )}
            </Animated.View>

            {/* Master Tabs */}
            <View style={styles.masterTabRow}>
                {masterTabs.map(tab => (
                    <TouchableOpacity
                        key={tab.key}
                        style={[styles.masterTab, masterTab === tab.key && styles.masterTabActive]}
                        onPress={() => onMasterTabChange(tab.key)}
                        activeOpacity={0.8}
                    >
                        <Ionicons
                            name={tab.icon}
                            size={15}
                            color={masterTab === tab.key ? '#42A4F5' : 'rgba(255,255,255,0.8)'}
                            style={{ marginRight: 5 }}
                        />
                        <Text style={[styles.masterTabText, masterTab === tab.key && styles.masterTabTextActive]}>
                            {tab.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        </>
    );
};

const styles = StyleSheet.create({
    header: {
        backgroundColor: '#42A4F5',
        paddingHorizontal: 20,
        paddingTop: 4,
        paddingBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    headerTitle: {
        color: '#FFFFFF',
        fontSize: 22,
        fontWeight: '800',
        letterSpacing: 0.2,
    },
    headerSub: {
        color: 'rgba(255,255,255,0.82)',
        fontSize: 13,
        marginTop: 2,
    },
    headerIconBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 10,
    },
    headerIconBtnActive: {
        backgroundColor: 'rgba(255,255,255,0.35)',
    },
    backBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
        flexShrink: 0,
    },
    searchWrapper: {
        overflow: 'hidden',
        paddingHorizontal: 16,
        backgroundColor: '#42A4F5',
    },
    searchBar: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.95)',
        borderRadius: 12,
        paddingHorizontal: 12,
        marginBottom: 10,
        height: 42,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        color: '#1E293B',
        paddingVertical: 0,
        height: '100%',
    },
    masterTabRow: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255,255,255,0.18)',
        marginHorizontal: 20,
        marginBottom: 12,
        borderRadius: 12,
        padding: 4,
        gap: 4,
    },
    masterTab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 10,
    },
    masterTabActive: {
        backgroundColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 4,
        elevation: 3,
    },
    masterTabText: {
        fontSize: 14,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.85)',
    },
    masterTabTextActive: {
        color: '#42A4F5',
    },
});

export default EventListHeader;
