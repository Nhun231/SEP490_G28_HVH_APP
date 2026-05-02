/**
 * checkin-map.tsx
 * Map confirmation screen shown after validating the 6-digit check-in code.
 */

import React, { useEffect, useRef, useState } from 'react'
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    ScrollView,
    Alert,
    Platform,
} from 'react-native'
import MapView, { Circle, Marker, Region } from 'react-native-maps'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons, MaterialIcons } from '@expo/vector-icons'
import { router, useLocalSearchParams, Stack } from 'expo-router'
import * as Location from 'expo-location'
import * as Device from 'expo-device'
import * as Application from 'expo-application'
import { quickCheckIn as quickCheckInApi } from '@/services/checkin-service'
import { getApiErrorMessage } from '@/services/api-helpers'


/** Convert meters radius to an approximate lat/lng delta for initial zoom */
function radiusToLatDelta(radiusMeters: number): number {
    // 1 degree lat ≈ 111 320 m → add generous padding × 8 for comfortable view
    return (radiusMeters / 111320) * 8
}


const CheckinMapScreen = () => {
    const params = useLocalSearchParams<{
        code: string
        applicationId: string
        eventId: string
        eventSessionId: string
        name: string
        address: string
        detailAddress: string
        lat: string
        lng: string
        radiusMeters: string
        sessionEndTime: string
    }>()

    const lat = parseFloat(params.lat ?? '0')
    const lng = parseFloat(params.lng ?? '0')
    const radiusMeters = parseFloat(params.radiusMeters ?? '200')

    const mapRef = useRef<MapView>(null)
    const [mapReady, setMapReady] = useState(false)
    const [checkingIn, setCheckingIn] = useState(false)

    const initialRegion: Region = {
        latitude: lat,
        longitude: lng,
        latitudeDelta: radiusToLatDelta(radiusMeters),
        longitudeDelta: radiusToLatDelta(radiusMeters),
    }

    // Animate to include both points when map is ready
    useEffect(() => {
        if (mapReady) {
            mapRef.current?.animateToRegion(initialRegion, 600)
        }
    }, [mapReady])

    const handleQuickCheckin = async () => {
        setCheckingIn(true)
        try {
            // 1. Request & get GPS location
            const { status } = await Location.requestForegroundPermissionsAsync()
            if (status !== 'granted') {
                Alert.alert('Thiếu quyền', 'Cần cấp quyền vị trí để điểm danh.')
                return
            }
            const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High })

            // 2. Gather device metadata (Android vs iOS)
            let deviceId: string
            if (Platform.OS === 'android') {
                deviceId =
                    (await Application.getAndroidId()) ??
                    Application.applicationId ??
                    'unknown-android'
            } else {
                deviceId =
                    (await Application.getIosIdForVendorAsync()) ??
                    Application.applicationId ??
                    'unknown-ios'
            }
            const apVersion = Application.nativeApplicationVersion ?? '1.0.0'
            const osVersion = `${Device.osName ?? 'OS'} ${Device.osVersion ?? ''}`

            // 3. Call quickCheckIn API to create the CheckInLog on the BE
            await quickCheckInApi({
                eventSessionId: params.eventSessionId,
                applicationId: params.applicationId,
                deviceId,
                apVersion,
                osVersion,
                currentPlaceLat: loc.coords.latitude,
                currentPlaceLng: loc.coords.longitude,
            })

            // 4. Navigate to timer — check-in log is now saved
            router.replace({
                pathname: '/screen/volunteer-screens/checkin-timer' as any,
                params: {
                    code: params.code,
                    applicationId: params.applicationId ?? '',
                    eventName: params.name ?? '',
                    eventId: params.eventId ?? '',
                    sessionId: params.eventSessionId ?? '',
                    sessionEndTime: params.sessionEndTime ?? '',
                    // Pass event check-in coords for GPS mock during checkout
                    checkinLat: String(lat),
                    checkinLng: String(lng),
                    // Capture the exact check-in moment so the timer survives screen re-entries
                    checkinTime: new Date().toISOString(),
                },
            })
        } catch (err: unknown) {
            const msg = getApiErrorMessage(err) || 'Điểm danh thất bại. Vui lòng thử lại.'
            Alert.alert('Lỗi điểm danh', msg)
        } finally {
            setCheckingIn(false)
        }
    }

    const handleFaceScan = () => {
        router.push({
            pathname: '/screen/volunteer-screens/face-checkin-guide',
            params: {
                applicationId: params.applicationId ?? '',
                sessionId: params.eventSessionId,
                sessionEndTime: params.sessionEndTime ?? '',
                checkinLat: String(lat),
                checkinLng: String(lng),
            },
        } as any)
    }

    const radiusLabel = radiusMeters >= 1000
        ? `${(radiusMeters / 1000).toFixed(1)} km`
        : `${Math.round(radiusMeters)} m`

    return (
        <SafeAreaView style={styles.safeArea} edges={['top']}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* ── Header ─────────────────────────────────────────────────── */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Xác nhận điểm danh</Text>
                <View style={{ width: 36 }} />
            </View>

            {/* ── Instruction line ────────────────────────────────────────── */}
            <View style={styles.instructionBanner}>
                <Ionicons name="location-outline" size={15} color="#42A4F5" />
                <Text style={styles.instructionText}>
                    Xác nhận vị trí của bạn trong vùng điểm danh và chọn phương thức
                </Text>
            </View>

            <ScrollView style={styles.scroll} contentContainerStyle={{ flexGrow: 1 }} bounces={false}>

                {/* ── Map ────────────────────────────────────────────────── */}
                <View style={styles.mapContainer}>
                    <MapView
                        ref={mapRef}
                        style={styles.map}
                        initialRegion={initialRegion}
                        onMapReady={() => setMapReady(true)}
                        showsUserLocation={true}
                        showsMyLocationButton={false}
                        mapType="standard"
                    >
                        {/* Allowed check-in zone */}
                        <Circle
                            center={{ latitude: lat, longitude: lng }}
                            radius={radiusMeters}
                            fillColor="rgba(66,164,245,0.15)"
                            strokeColor="rgba(66,164,245,0.55)"
                            strokeWidth={2}
                        />

                        {/* Check-in zone centre marker (blue pin) */}
                        <Marker
                            coordinate={{ latitude: lat, longitude: lng }}
                            title="Địa điểm điểm danh"
                            anchor={{ x: 0.5, y: 1 }}
                        >
                            <View style={styles.blueMarker}>
                                <Ionicons name="location" size={30} color="#42A4F5" />
                            </View>
                        </Marker>


                    </MapView>

                    {!mapReady && (
                        <View style={styles.mapLoading}>
                            <ActivityIndicator size="large" color="#42A4F5" />
                        </View>
                    )}
                </View>

                {/* ── Event info card ─────────────────────────────────────── */}
                <View style={styles.infoCard}>
                    {/* Event name */}
                    <View style={styles.eventRow}>
                        <View style={styles.eventIconWrap}>
                            <Ionicons name="calendar" size={20} color="#42A4F5" />
                        </View>
                        <Text style={styles.eventName} numberOfLines={2}>
                            {params.name || 'Hoạt động tình nguyện'}
                        </Text>
                    </View>

                    {/* Address */}
                    <View style={styles.infoRow}>
                        <Ionicons name="location-outline" size={14} color="#6B7280" />
                        <View style={styles.addressTexts}>
                            <Text style={styles.addressMain} numberOfLines={1}>
                                {params.address || 'Việt Nam'}
                            </Text>
                            {params.detailAddress ? (
                                <Text style={styles.addressDetail} numberOfLines={2}>
                                    {params.detailAddress}
                                </Text>
                            ) : null}
                        </View>
                    </View>

                    {/* Zone radius chip */}
                    <View style={styles.zoneChip}>
                        <Ionicons name="radio-button-on-outline" size={13} color="#42A4F5" />
                        <Text style={styles.zoneText}>
                            Vùng điểm danh:{' '}
                            <Text style={styles.zoneValue}>{radiusLabel}</Text>
                        </Text>
                    </View>
                </View>

                {/* ── Legend ─────────────────────────────────────────────── */}
                <View style={styles.legendCard}>
                    <View style={styles.legendItem}>
                        <View style={styles.legendDotBlue} />
                        <Text style={styles.legendText}>Trung tâm điểm danh</Text>
                    </View>
                    <View style={styles.legendItem}>
                        <View style={styles.legendDotOrange} />
                        <Text style={styles.legendText}>Vị trí của bạn</Text>
                    </View>
                </View>

                {/* ── Action buttons ──────────────────────────────────────── */}
                <View style={styles.actionsContainer}>
                    {/* Điểm danh nhanh */}
                    <TouchableOpacity
                        style={[styles.quickBtn, checkingIn && styles.btnDisabled]}
                        onPress={handleQuickCheckin}
                        activeOpacity={0.8}
                        disabled={checkingIn}
                    >
                        {checkingIn ? (
                            <ActivityIndicator size="small" color="#42A4F5" />
                        ) : (
                            <Ionicons name="time-outline" size={20} color="#42A4F5" />
                        )}
                        <Text style={styles.quickBtnText}>
                            {checkingIn ? 'Đang điểm danh...' : 'Điểm danh nhanh'}
                        </Text>
                    </TouchableOpacity>

                    {/* Quét khuôn mặt */}
                    <TouchableOpacity
                        style={styles.faceBtn}
                        onPress={handleFaceScan}
                        activeOpacity={0.8}
                    >
                        <MaterialIcons name="face" size={20} color="#FFFFFF" />
                        <Text style={styles.faceBtnText}>Quét khuôn mặt</Text>
                    </TouchableOpacity>
                </View>

                <View style={{ height: 24 }} />
            </ScrollView>
        </SafeAreaView>
    )
}


const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#42A4F5',
    },

    /* Header */
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#42A4F5',
    },
    backBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.25)',
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: '#FFFFFF',
    },

    /* Instruction line */
    instructionBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginHorizontal: 16,
        marginTop: 12,
        marginBottom: 4,
        backgroundColor: '#FFFFFF',
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#E3F2FD',
    },
    instructionText: {
        fontSize: 13,
        color: '#42A4F5',
        fontWeight: '500',
        flex: 1,
    },

    /* Scroll */
    scroll: {
        flex: 1,
        backgroundColor: '#F0F6FF',
    },

    /* Map */
    mapContainer: {
        height: 340,
        marginHorizontal: 16,
        borderRadius: 16,
        overflow: 'hidden',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
        backgroundColor: '#E3F2FD',
    },
    map: {
        ...StyleSheet.absoluteFillObject,
    },
    mapLoading: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#E3F2FD',
    },

    /* Markers */
    blueMarker: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    userMarkerOuter: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(249,115,22,0.28)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    userMarkerInner: {
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: '#F97316',
        borderWidth: 2.5,
        borderColor: '#FFFFFF',
    },

    /* Event info card */
    infoCard: {
        marginHorizontal: 16,
        marginTop: 14,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.07,
        shadowRadius: 4,
        borderWidth: 1,
        borderColor: '#E3F2FD',
        gap: 10,
    },
    eventRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
    },
    eventIconWrap: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: '#E3F2FD',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        marginTop: 1,
    },
    eventName: {
        flex: 1,
        fontSize: 15,
        fontWeight: '700',
        color: '#1F2937',
        lineHeight: 22,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 6,
    },
    addressTexts: { flex: 1 },
    addressMain: {
        fontSize: 13,
        color: '#6B7280',
        lineHeight: 18,
    },
    addressDetail: {
        fontSize: 13,
        color: '#374151',
        lineHeight: 18,
        marginTop: 2,
    },
    zoneChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        alignSelf: 'flex-start',
        backgroundColor: '#E3F2FD',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 20,
    },
    zoneText: {
        fontSize: 12,
        color: '#42A4F5',
        fontWeight: '500',
    },
    zoneValue: {
        fontWeight: '700',
        color: '#42A4F5',
    },

    /* Legend */
    legendCard: {
        flexDirection: 'row',
        gap: 20,
        marginHorizontal: 16,
        marginTop: 10,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderWidth: 1,
        borderColor: '#E3F2FD',
        elevation: 1,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    legendDotBlue: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#42A4F5',
    },
    legendDotOrange: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#F97316',
    },
    legendText: {
        fontSize: 12,
        color: '#4B5563',
        fontWeight: '500',
    },

    /* Action buttons */
    actionsContainer: {
        flexDirection: 'row',
        gap: 12,
        marginHorizontal: 16,
        marginTop: 14,
    },
    quickBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        borderWidth: 1.5,
        borderColor: '#42A4F5',
        borderRadius: 14,
        paddingVertical: 16,
        backgroundColor: '#FFFFFF',
        elevation: 2,
        shadowColor: '#42A4F5',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
    },
    btnDisabled: {
        opacity: 0.6,
    },
    quickBtnText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#42A4F5',
        textAlign: 'center',
    },
    faceBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        borderRadius: 14,
        paddingVertical: 16,
        backgroundColor: '#42A4F5',
        elevation: 4,
        shadowColor: '#42A4F5',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.35,
        shadowRadius: 6,
    },
    faceBtnText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#FFFFFF',
    },
})

export default CheckinMapScreen
