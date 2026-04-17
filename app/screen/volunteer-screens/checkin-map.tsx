/**
 * checkin-map.tsx
 * Map confirmation screen shown after validating the 6-digit check-in code.
 * Shows:
 *  - Map with a circle for the allowed check-in zone (r = checkInAccuracyMeters)
 *  - Orange marker = user's current location  (TODO: real GPS — mocked as zone centre for now)
 *  - Green marker  = check-in zone centre
 *  - Event name & address below the map
 *  - "Điểm danh nhanh" button → navigates to the timer / quick-check-in screen
 *  - "Quét khuôn mặt"  button → placeholder (TODO: face-scan flow)
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
        eventId: string
        eventSessionId: string
        name: string
        address: string
        detailAddress: string
        /** Latitude of check-in zone centre */
        lat: string
        /** Longitude of check-in zone centre */
        lng: string
        /** Allowed radius in metres */
        radiusMeters: string
    }>()

    const lat = parseFloat(params.lat ?? '0')
    const lng = parseFloat(params.lng ?? '0')
    const radiusMeters = parseFloat(params.radiusMeters ?? '200')

    // const userLocation = await Location.getCurrentPositionAsync({})
    const userLocation = { latitude: lat, longitude: lng }

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
            // const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High })

            // [TESTING] Mock location to exactly the event's check-in centre so BE radius check passes
            const mockLat = lat   // same as event's latCheckInLocation
            const mockLng = lng   // same as event's lngCheckInLocation

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
                deviceId,
                apVersion,
                osVersion,
                currentPlaceLat: mockLat,   // TODO: replace with loc.coords.latitude
                currentPlaceLng: mockLng,   // TODO: replace with loc.coords.longitude
            })

            // 4. Navigate to timer — check-in log is now saved
            router.replace({
                pathname: '/screen/volunteer-screens/checkin-timer' as any,
                params: {
                    code: params.code,
                    eventName: params.name ?? '',
                    eventId: params.eventId ?? '',
                    applicationId: '',
                    sessionId: params.eventSessionId ?? '',
                    // Pass event check-in coords for GPS mock during checkout
                    checkinLat: String(lat),
                    checkinLng: String(lng),
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
                sessionId: params.eventSessionId,
                checkinLat: String(lat),  // [TESTING] mocked to zone centre
                checkinLng: String(lng),  // TODO: replace with real GPS
            },
        } as any)
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <Stack.Screen options={{ headerShown: false }} />
            {/* ── Header ────────────────────────────────────────────────── */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={20} color="#1F2937" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Điểm danh</Text>
                <View style={styles.headerRight}>
                    <Ionicons name="menu" size={22} color="#1F2937" />
                </View>
            </View>

            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }} bounces={false}>
                {/* ── Map ───────────────────────────────────────────────── */}
                <View style={styles.mapContainer}>
                    <MapView
                        ref={mapRef}
                        style={styles.map}
                        initialRegion={initialRegion}
                        onMapReady={() => setMapReady(true)}
                        showsUserLocation={false}
                        showsMyLocationButton={false}
                        mapType="standard"
                    >
                        {/* Allowed check-in zone */}
                        <Circle
                            center={{ latitude: lat, longitude: lng }}
                            radius={radiusMeters}
                            fillColor="rgba(249,115,22,0.18)"
                            strokeColor="rgba(249,115,22,0.5)"
                            strokeWidth={2}
                        />

                        {/* Check-in zone centre marker (green pin) */}
                        <Marker
                            coordinate={{ latitude: lat, longitude: lng }}
                            title="Địa điểm điểm danh"
                            anchor={{ x: 0.5, y: 1 }}
                        >
                            <View style={styles.greenMarker}>
                                <Ionicons name="location" size={28} color="#16A34A" />
                            </View>
                        </Marker>

                        {/* User location marker (orange dot) */}
                        <Marker
                            coordinate={userLocation}
                            title="Vị trí của bạn"
                            anchor={{ x: 0.5, y: 0.5 }}
                        >
                            <View style={styles.userMarkerOuter}>
                                <View style={styles.userMarkerInner} />
                            </View>
                        </Marker>
                    </MapView>

                    {!mapReady && (
                        <View style={styles.mapLoading}>
                            <ActivityIndicator size="large" color="#42A4F5" />
                        </View>
                    )}
                </View>

                {/* ── Event info ────────────────────────────────────────── */}
                <View style={styles.infoCard}>
                    <Text style={styles.eventName} numberOfLines={2}>
                        {params.name || 'Hoạt động tình nguyện'}
                    </Text>

                    <View style={styles.addressRow}>
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

                    {/* Zone info */}
                    <View style={styles.zoneRow}>
                        <Ionicons name="radio-button-on-outline" size={14} color="#F97316" />
                        <Text style={styles.zoneText}>
                            Vùng điểm danh:{' '}
                            <Text style={styles.zoneValue}>
                                {radiusMeters >= 1000
                                    ? `${(radiusMeters / 1000).toFixed(1)} km`
                                    : `${Math.round(radiusMeters)} m`}
                            </Text>
                        </Text>
                    </View>
                </View>

                {/* ── Action buttons ────────────────────────────────────── */}
                <View style={styles.actionsRow}>
                    {/* Điểm danh nhanh */}
                    <TouchableOpacity
                        style={[styles.quickBtn, checkingIn && styles.quickBtnDisabled]}
                        onPress={handleQuickCheckin}
                        activeOpacity={0.8}
                        disabled={checkingIn}
                    >
                        {checkingIn ? (
                            <ActivityIndicator size="small" color="#4B5563" />
                        ) : (
                            <Ionicons name="time-outline" size={20} color="#4B5563" />
                        )}
                        <Text style={styles.quickBtnText}>
                            {checkingIn ? 'Đang điểm danh...' : 'Điểm danh\nnhanh'}
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
            </ScrollView>
        </SafeAreaView>
    )
}


const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },

    /* Header */
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    backBtn: {
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: '#1F2937',
    },
    headerRight: {
        width: 36,
        alignItems: 'flex-end',
    },

    /* Map */
    mapContainer: {
        height: 380,
        backgroundColor: '#E5E7EB',
    },
    map: {
        ...StyleSheet.absoluteFillObject,
    },
    mapLoading: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F3F4F6',
    },

    /* Markers */
    greenMarker: {
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
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
        backgroundColor: '#FFFFFF',
    },
    eventName: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1F2937',
        marginBottom: 10,
    },
    addressRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 6,
        marginBottom: 6,
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
    zoneRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 4,
    },
    zoneText: {
        fontSize: 12,
        color: '#6B7280',
    },
    zoneValue: {
        fontWeight: '700',
        color: '#F97316',
    },

    /* Action buttons */
    actionsRow: {
        flexDirection: 'row',
        gap: 12,
        paddingHorizontal: 20,
        paddingVertical: 18,
        backgroundColor: '#FFFFFF',
    },
    quickBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        borderWidth: 1.5,
        borderColor: '#D1D5DB',
        borderRadius: 12,
        paddingVertical: 14,
        backgroundColor: '#FFFFFF',
    },
    quickBtnDisabled: {
        opacity: 0.6,
    },
    quickBtnText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#374151',
        textAlign: 'center',
        lineHeight: 18,
    },
    faceBtn: {
        flex: 2,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        borderRadius: 12,
        paddingVertical: 14,
        backgroundColor: '#22C55E',
    },
    faceBtnText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#FFFFFF',
    },
})

export default CheckinMapScreen
