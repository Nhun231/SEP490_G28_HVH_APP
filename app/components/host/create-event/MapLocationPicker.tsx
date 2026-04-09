import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Modal, TextInput, Alert, ActivityIndicator, Platform, StyleSheet, ScrollView, Keyboard } from 'react-native';
import MapView, { Marker, Circle, Polygon, PROVIDER_GOOGLE } from 'react-native-maps';
import { HANOI_MAIN_RING } from '../../../data/hanoi-boundary';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Nominatim (OpenStreetMap) endpoints
const NOMINATIM_SEARCH_URL = 'https://nominatim.openstreetmap.org/search';
const NOMINATIM_REVERSE_URL = 'https://nominatim.openstreetmap.org/reverse';
const NOMINATIM_HEADERS = { 'User-Agent': 'SEP490-HVH-App/1.0', 'Accept-Language': 'vi' };

// reverse geocode with Nominatim (using new address after merger)
async function nominatimReverseGeocode(latitude: number, longitude: number): Promise<string> {
    try {
        const res = await fetch(
            `${NOMINATIM_REVERSE_URL}?format=json&lat=${latitude}&lon=${longitude}`,
            { headers: NOMINATIM_HEADERS }
        );
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const data = await res.json();
        const addr = data.address as Record<string, string> | undefined;
        if (addr) {
            const parts = [
                addr.road || addr.pedestrian || addr.footway || addr.path,
                addr.suburb || addr.quarter || addr.neighbourhood,
                addr.city_district || addr.district || addr.county,
                addr.city || addr.town || addr.state,
            ].filter(Boolean) as string[];
            if (parts.length > 0) return parts.join(', ');
        }
        return (data.display_name as string) || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
    } catch {
        return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
    }
}

const HANOI_BOUNDS = {
    minLatitude: 20.53,
    maxLatitude: 21.40,
    minLongitude: 105.28,
    maxLongitude: 106.02,
};

interface PlaceSuggestion {
    placeId: string;
    mainText: string;
    secondaryText: string;
    latitude: number;
    longitude: number;
}

export interface LocationData {
    latitude: number;
    longitude: number;
    address?: string;
}

interface MapLocationPickerProps {
    visible: boolean;
    onClose: () => void;
    onSelectLocation: (location: LocationData) => void;
    initialLocation?: LocationData;
    radius?: number;
}

export default function MapLocationPicker({
    visible,
    onClose,
    onSelectLocation,
    initialLocation,
    radius = 300,
}: MapLocationPickerProps) {
    const insets = useSafeAreaInsets();
    const mapRef = useRef<MapView>(null);
    const [selectedLocation, setSelectedLocation] = useState<LocationData | undefined>(initialLocation);
    // Default to Hanoi center while loading current location
    const [currentLocation, setCurrentLocation] = useState<Location.LocationObject | null>({
        coords: {
            latitude: 21.0285,
            longitude: 105.8542,
            altitude: null,
            accuracy: null,
            altitudeAccuracy: null,
            heading: null,
            speed: null,
        },
        timestamp: Date.now(),
    } as Location.LocationObject);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoadingLocation, setIsLoadingLocation] = useState(false);
    const [isGeocodingAddress, setIsGeocodingAddress] = useState(false);

    // Autocomplete states
    const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
    const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);
    // Height of [header + search bar] to position the overlay correctly
    const [overlayTop, setOverlayTop] = useState(0);

    // Ray-casting to check point in polygon (Hanoi boundary)
    const isWithinHanoiBounds = (latitude: number, longitude: number): boolean => {
        const ring = HANOI_MAIN_RING;
        const n = ring.length;
        let inside = false;
        for (let i = 0, j = n - 1; i < n; j = i++) {
            const xi = ring[i].longitude, yi = ring[i].latitude;
            const xj = ring[j].longitude, yj = ring[j].latitude;
            const intersect =
                yi > latitude !== yj > latitude &&
                longitude < ((xj - xi) * (latitude - yi)) / (yj - yi) + xi;
            if (intersect) inside = !inside;
        }
        return inside;
    };

    // Clamps the given coordinates to be within Hanoi bounds 
    const clampToHanoiBounds = (latitude: number, longitude: number) => ({
        latitude: Math.min(Math.max(latitude, HANOI_BOUNDS.minLatitude), HANOI_BOUNDS.maxLatitude),
        longitude: Math.min(Math.max(longitude, HANOI_BOUNDS.minLongitude), HANOI_BOUNDS.maxLongitude),
    });

    useEffect(() => {
        if (visible) {
            setSelectedLocation(initialLocation);
            setSearchQuery('');
            setSuggestions([]);
            setShowSuggestions(false);
        }
    }, [visible, initialLocation]);

    // use expo location for GPS to focus map
    useEffect(() => {
        if (!visible) return;
        setIsLoadingLocation(true);
        (async () => {
            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') {
                    setIsLoadingLocation(false);
                    return;
                }
                const location = await Location.getCurrentPositionAsync({});
                setCurrentLocation(location);
                const targetLatitude = initialLocation?.latitude ?? location.coords.latitude;
                const targetLongitude = initialLocation?.longitude ?? location.coords.longitude;
                mapRef.current?.animateToRegion({
                    latitude: clampToHanoiBounds(targetLatitude, targetLongitude).latitude,
                    longitude: clampToHanoiBounds(targetLatitude, targetLongitude).longitude,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                }, 1000);
            } catch (error) {
                console.error('Error getting location:', error);
            } finally {
                setIsLoadingLocation(false);
            }
        })();
    }, [visible, initialLocation]);

    // use nominatim for suggestions list 
    useEffect(() => {
        const trimmed = searchQuery.trim();
        if (trimmed.length < 2) {
            setSuggestions([]);
            setShowSuggestions(false);
            return;
        }

        const timer = setTimeout(async () => {
            setIsLoadingSuggestions(true);
            try {
                const url =
                    `${NOMINATIM_SEARCH_URL}` +
                    `?q=${encodeURIComponent(`${trimmed}, Hà Nội`)}` +
                    `&format=json&limit=5&countrycodes=vn&accept-language=vi&addressdetails=1&bounded=1` +
                    `&viewbox=${HANOI_BOUNDS.minLongitude},${HANOI_BOUNDS.maxLatitude},${HANOI_BOUNDS.maxLongitude},${HANOI_BOUNDS.minLatitude}`;

                const res = await fetch(url, { headers: NOMINATIM_HEADERS });

                const text = await res.text();
                const json: any[] = JSON.parse(text);

                if (json && json.length > 0) {
                    const items: PlaceSuggestion[] = json.map((place) => {
                        const parts = (place.display_name as string).split(', ');
                        const mainText = parts[0] || place.display_name;
                        const secondaryText = parts.slice(1, 4).join(', ');
                        return {
                            placeId: String(place.place_id),
                            mainText,
                            secondaryText,
                            latitude: parseFloat(place.lat),
                            longitude: parseFloat(place.lon),
                        };
                    }).filter((item) => isWithinHanoiBounds(item.latitude, item.longitude));
                    setSuggestions(items);
                    setShowSuggestions(true);
                } else {
                    setSuggestions([]);
                    setShowSuggestions(false);
                }
            } catch {
                setSuggestions([]);
                setShowSuggestions(false);
            } finally {
                setIsLoadingSuggestions(false);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    const handleSelectSuggestion = (suggestion: PlaceSuggestion) => {
        if (!isWithinHanoiBounds(suggestion.latitude, suggestion.longitude)) {
            Alert.alert('Thông báo', 'Vị trí đã chọn nằm ngoài khu vực Hà Nội');
            return;
        }

        Keyboard.dismiss();
        setSuggestions([]);
        setShowSuggestions(false);
        const address = [suggestion.mainText, suggestion.secondaryText]
            .filter(Boolean).join(', ');
        setSearchQuery(suggestion.mainText);
        const selected: LocationData = {
            latitude: suggestion.latitude,
            longitude: suggestion.longitude,
            address,
        };
        setSelectedLocation(selected);
        mapRef.current?.animateToRegion({
            latitude: suggestion.latitude,
            longitude: suggestion.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
        }, 800);
    };

    const handleMapPress = (event: any) => {
        const { latitude, longitude } = event.nativeEvent.coordinate;

        if (!isWithinHanoiBounds(latitude, longitude)) {
            Alert.alert('Thông báo', 'Chỉ được chọn vị trí trong khu vực Hà Nội');
            return;
        }

        Keyboard.dismiss();
        setSuggestions([]);
        setShowSuggestions(false);

        // display spinner in address field while geocoding
        setIsGeocodingAddress(true);
        setSelectedLocation({ latitude, longitude, address: '' });
        nominatimReverseGeocode(latitude, longitude).then(address => {
            setSelectedLocation({ latitude, longitude, address });
            setIsGeocodingAddress(false);
        });
    };

    const handleConfirm = () => {
        if (selectedLocation) {
            onSelectLocation(selectedLocation);
            onClose();
        }
    };

    const handleSearch = async () => {
        if (!searchQuery) return;
        Keyboard.dismiss();
        setSuggestions([]);
        setShowSuggestions(false);

        try {
            // using nominatim for search
            const url =
                `${NOMINATIM_SEARCH_URL}` +
                `?q=${encodeURIComponent(`${searchQuery.trim()}, Hà Nội`)}` +
                `&format=json&limit=1&countrycodes=vn&accept-language=vi&bounded=1` +
                `&viewbox=${HANOI_BOUNDS.minLongitude},${HANOI_BOUNDS.maxLatitude},${HANOI_BOUNDS.maxLongitude},${HANOI_BOUNDS.minLatitude}`;

            const res = await fetch(url, { headers: NOMINATIM_HEADERS });
            const json: any[] = await res.json();
            const matched = (json || []).find((p: any) =>
                isWithinHanoiBounds(parseFloat(p.lat), parseFloat(p.lon))
            );

            if (!matched) {
                Alert.alert('Thông báo', 'Không tìm thấy địa điểm trong khu vực Hà Nội');
                return;
            }

            const latitude = parseFloat(matched.lat);
            const longitude = parseFloat(matched.lon);
            const address = await nominatimReverseGeocode(latitude, longitude);
            setSelectedLocation({ latitude, longitude, address });
            mapRef.current?.animateToRegion({ latitude, longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 }, 1000);
        } catch {
            Alert.alert('Lỗi', 'Không thể tìm kiếm địa điểm');
        }
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            onRequestClose={onClose}
        >
            <View className="flex-1">
                {/* Header */}
                <View
                    className="bg-white px-4 py-3 border-b border-gray-200 flex-row items-center"
                    style={{ paddingTop: Math.max(insets.top + 8, 20) }}
                >
                    <TouchableOpacity onPress={onClose} className="mr-3">
                        <Ionicons name="arrow-back" size={24} color="#000" />
                    </TouchableOpacity>
                    <Text className="text-lg font-bold flex-1">Chọn địa điểm</Text>
                    <TouchableOpacity
                        onPress={handleConfirm}
                        disabled={!selectedLocation || isGeocodingAddress}
                        className={selectedLocation && !isGeocodingAddress ? '' : 'opacity-50'}
                    >
                        <Text className="text-[#42A4F5] font-semibold text-base">Xong</Text>
                    </TouchableOpacity>
                </View>

                {/* Search Bar */}
                <View
                    style={styles.searchContainer}
                    onLayout={(e) => {
                        // overlayTop = header height + search bar height
                        setOverlayTop(e.nativeEvent.layout.y + e.nativeEvent.layout.height);
                    }}
                >
                    <View style={styles.searchRow}>
                        <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Tìm kiếm địa điểm..."
                            placeholderTextColor="#9CA3AF"
                            value={searchQuery}
                            onChangeText={(text) => {
                                setSearchQuery(text);
                                if (!text.trim()) {
                                    setSuggestions([]);
                                    setShowSuggestions(false);
                                }
                            }}
                            onSubmitEditing={handleSearch}
                            returnKeyType="search"
                            blurOnSubmit={true}
                        />
                        {isLoadingSuggestions && (
                            <ActivityIndicator size="small" color="#42A4F5" style={styles.searchLoader} />
                        )}
                        {searchQuery.length > 0 && !isLoadingSuggestions && (
                            <TouchableOpacity
                                onPress={() => {
                                    setSearchQuery('');
                                    setSuggestions([]);
                                    setShowSuggestions(false);
                                }}
                                style={styles.clearBtn}
                            >
                                <Ionicons name="close-circle" size={18} color="#9CA3AF" />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {/* Map */}
                {currentLocation && (
                    <View style={styles.mapContainer}>
                        <MapView
                            ref={mapRef}
                            style={styles.map}
                            provider={PROVIDER_GOOGLE}
                            onMapReady={() => { }}
                            initialRegion={{
                                latitude: clampToHanoiBounds(selectedLocation?.latitude || currentLocation.coords.latitude, selectedLocation?.longitude || currentLocation.coords.longitude).latitude,
                                longitude: clampToHanoiBounds(selectedLocation?.latitude || currentLocation.coords.latitude, selectedLocation?.longitude || currentLocation.coords.longitude).longitude,
                                latitudeDelta: 0.18,
                                longitudeDelta: 0.18,
                            }}
                            onRegionChangeComplete={(region) => {
                                if (isWithinHanoiBounds(region.latitude, region.longitude)) return;
                                const clamped = clampToHanoiBounds(region.latitude, region.longitude);
                                mapRef.current?.animateToRegion({
                                    latitude: clamped.latitude,
                                    longitude: clamped.longitude,
                                    latitudeDelta: region.latitudeDelta,
                                    longitudeDelta: region.longitudeDelta,
                                }, 250);
                            }}
                            onPress={handleMapPress}
                            showsUserLocation={true}
                            showsMyLocationButton={true}
                        >
                            {/* left half of the world darkening mask */}
                            <Polygon
                                coordinates={[
                                    { latitude: 85, longitude: -179.9 },
                                    { latitude: 85, longitude: 0 },
                                    { latitude: -85, longitude: 0 },
                                    { latitude: -85, longitude: -179.9 },
                                ]}
                                fillColor="rgba(206, 199, 199, 0.52)"
                                strokeWidth={0}
                            />

                            {/* right half of the world darkening mask and Hanoi boundary */}
                            <Polygon
                                coordinates={[
                                    { latitude: 85, longitude: 0 },
                                    { latitude: 85, longitude: 179.9 },
                                    { latitude: -85, longitude: 179.9 },
                                    { latitude: -85, longitude: 0 },
                                ]}
                                holes={[HANOI_MAIN_RING]}
                                fillColor="rgba(206, 199, 199, 0.52)"
                                strokeColor='#42A4F5'
                                strokeWidth={3.5}
                            />

                            {selectedLocation && (
                                <>
                                    <Marker
                                        coordinate={{
                                            latitude: selectedLocation.latitude,
                                            longitude: selectedLocation.longitude,
                                        }}
                                        title="Địa điểm đã chọn"
                                    />
                                    <Circle
                                        center={{
                                            latitude: selectedLocation.latitude,
                                            longitude: selectedLocation.longitude,
                                        }}
                                        radius={radius}
                                        strokeColor="rgba(66, 164, 245, 0.5)"
                                        fillColor="rgba(66, 164, 245, 0.2)"
                                    />
                                </>
                            )}
                        </MapView>

                        {/* Loading Indicator */}
                        {isLoadingLocation && (
                            <View className="absolute top-2 left-0 right-0 items-center">
                                <View className="bg-white rounded-full px-4 py-2 flex-row items-center shadow-md">
                                    <ActivityIndicator size="small" color="#42A4F5" />
                                    <Text className="ml-2 text-gray-700 text-sm">Đang lấy vị trí...</Text>
                                </View>
                            </View>
                        )}

                    </View>
                )}

                {/* Selected Location Info */}
                {selectedLocation && (
                    <View className="bg-white px-4 py-3 border-t border-gray-200">
                        <Text className="text-gray-600 text-xs">Địa điểm đã chọn:</Text>
                        {isGeocodingAddress ? (
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
                                <ActivityIndicator size="small" color="#42A4F5" />
                                <Text style={{ marginLeft: 8, fontSize: 13, color: '#94A3B8' }}>Đang xác định địa chỉ...</Text>
                            </View>
                        ) : (
                            <>
                                <Text className="text-gray-800 font-medium mt-1">
                                    {selectedLocation.address}
                                </Text>
                                <Text className="text-gray-400 text-xs mt-1">
                                    {selectedLocation.latitude.toFixed(6)}, {selectedLocation.longitude.toFixed(6)}
                                </Text>
                            </>
                        )}
                    </View>
                )}

                {/* Suggestions Overlay */}
                {showSuggestions && suggestions.length > 0 && overlayTop > 0 && (
                    <View style={[styles.suggestionsBox, { top: overlayTop }]}>
                        <ScrollView
                            keyboardShouldPersistTaps="handled"
                            bounces={false}
                        >
                            {(suggestions as PlaceSuggestion[]).map((item, index) => (
                                <TouchableOpacity
                                    key={item.placeId}
                                    style={[
                                        styles.suggestionItem,
                                        index < suggestions.length - 1 && styles.suggestionItemBorder,
                                    ]}
                                    onPress={() => handleSelectSuggestion(item)}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons
                                        name="location-outline"
                                        size={16}
                                        color="#42A4F5"
                                        style={styles.suggestionIcon}
                                    />
                                    <View style={styles.suggestionTextWrapper}>
                                        <Text style={styles.suggestionMainText} numberOfLines={1}>
                                            {item.mainText}
                                        </Text>
                                        {item.secondaryText ? (
                                            <Text style={styles.suggestionSubText} numberOfLines={1}>
                                                {item.secondaryText}
                                            </Text>
                                        ) : null}
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                )}
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    // Search bar
    searchContainer: {
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
        zIndex: 10,
    },
    searchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        margin: 12,
        borderRadius: 10,
        paddingHorizontal: 10,
    },
    searchIcon: {
        marginRight: 6,
    },
    searchInput: {
        flex: 1,
        paddingVertical: 10,
        fontSize: 14,
        color: '#1F2937',
    },
    searchLoader: {
        marginLeft: 6,
    },
    clearBtn: {
        padding: 4,
        marginLeft: 4,
    },

    // Suggestions dropdown (absolute overlay above MapView)
    suggestionsBox: {
        position: 'absolute',
        left: 0,
        right: 0,
        backgroundColor: '#FFFFFF',
        maxHeight: 260,
        shadowColor: '#000',
        shadowOpacity: 0.12,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
        elevation: 20,
        zIndex: 9999,
        borderBottomLeftRadius: 12,
        borderBottomRightRadius: 12,
        borderWidth: 1,
        borderTopWidth: 0,
        borderColor: '#E5E7EB',
    },
    suggestionsList: {
        flex: 1,
    },
    suggestionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    suggestionItemBorder: {
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    suggestionIcon: {
        marginRight: 10,
        flexShrink: 0,
    },
    suggestionText: {
        flex: 1,
        fontSize: 13,
        color: '#374151',
        lineHeight: 18,
    },
    suggestionTextWrapper: {
        flex: 1,
    },
    suggestionMainText: {
        fontSize: 13,
        color: '#1F2937',
        fontWeight: '600',
    },
    suggestionSubText: {
        fontSize: 11,
        color: '#6B7280',
        marginTop: 1,
    },

    // Map
    mapContainer: {
        flex: 1,
        position: 'relative',
    },
    map: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
});
