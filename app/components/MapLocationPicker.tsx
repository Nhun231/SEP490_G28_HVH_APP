import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Modal, TextInput, Alert, ActivityIndicator, Platform, StyleSheet, ScrollView, Keyboard } from 'react-native';
import MapView, { Marker, Circle, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Nominatim (OpenStreetMap) for search autocomplete 
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';

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

    // Autocomplete states
    const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
    const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);
    // Height of [header + search bar] to position the overlay correctly
    const [overlayTop, setOverlayTop] = useState(0);

    useEffect(() => {
        if (visible) {
            setSelectedLocation(initialLocation);
            setSearchQuery('');
            setSuggestions([]);
            setShowSuggestions(false);
            console.log(`[MapLocationPicker] Modal opened`, {
                platform: Platform.OS,
                mapProvider: 'google',
                initialLocation,
                radius,
            });
        }
    }, [visible, initialLocation]);

    useEffect(() => {
        if (!visible) return;

        setIsLoadingLocation(true);
        (async () => {
            try {
                let { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') {
                    console.log('Location permission not granted');
                    setIsLoadingLocation(false);
                    return;
                }

                let location = await Location.getCurrentPositionAsync({});
                setCurrentLocation(location);
                let reverseAddress: Location.LocationGeocodedAddress | undefined;
                try {
                    const reversed = await Location.reverseGeocodeAsync({
                        latitude: location.coords.latitude,
                        longitude: location.coords.longitude,
                    });
                    reverseAddress = reversed[0];
                } catch (reverseError) {
                    console.warn(`[MapLocationPicker] Reverse geocode current location failed`, reverseError);
                }

                const street = [reverseAddress?.streetNumber, reverseAddress?.street]
                    .filter(Boolean)
                    .join(' ') || 'N/A';
                const city = reverseAddress?.city || reverseAddress?.subregion || reverseAddress?.district || 'N/A';

                console.log(
                    `[MapLocationPicker] Current location details\n` +
                    `platform: ${Platform.OS}\n` +
                    `provider: google\n` +
                    `latitude: ${location.coords.latitude}\n` +
                    `longitude: ${location.coords.longitude}\n` +
                    `street: ${street}\n` +
                    `city: ${city}\n` +
                    `district: ${reverseAddress?.district || 'N/A'}\n` +
                    `region: ${reverseAddress?.region || 'N/A'}\n` +
                    `country: ${reverseAddress?.country || 'N/A'}`
                );

                // Reopen behavior:
                // - If user already selected a check-in location, keep focusing that location.
                // - Otherwise, focus current GPS location.
                const targetLatitude = initialLocation?.latitude ?? location.coords.latitude;
                const targetLongitude = initialLocation?.longitude ?? location.coords.longitude;

                mapRef.current?.animateToRegion({
                    latitude: targetLatitude,
                    longitude: targetLongitude,
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

    // Debounced Nominatim autocomplete 
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
                // Manual URL string (avoids iOS URLSearchParams issues with hyphenated keys)
                const url =
                    `${NOMINATIM_URL}` +
                    `?q=${encodeURIComponent(trimmed)}` +
                    `&format=json` +
                    `&limit=5` +
                    `&countrycodes=vn` +
                    `&accept-language=vi` +
                    `&addressdetails=1`;

                const res = await fetch(url, {
                    headers: { 'User-Agent': 'SEP490-HVH-App/1.0' },
                });

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
                    });
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

    const handleMapPress = async (event: any) => {
        const { latitude, longitude } = event.nativeEvent.coordinate;
        Keyboard.dismiss();
        setSuggestions([]);
        setShowSuggestions(false);
        console.log(`[MapLocationPicker] Map pressed`, {
            platform: Platform.OS,
            latitude,
            longitude,
            mapProvider: 'google',
        });

        try {
            const result = await Location.reverseGeocodeAsync({ latitude, longitude });
            console.log(`[MapLocationPicker] Reverse geocoding raw response`, result);
            if (result.length > 0) {
                const addr = result[0];
                const addressParts = [
                    addr.name !== addr.district ? addr.name : null,
                    addr.district,
                    addr.subregion !== addr.district ? addr.subregion : null,
                    addr.region,
                ];
                const selected = {
                    latitude,
                    longitude,
                    address: addressParts.filter(Boolean).join(', ') || 'Địa chỉ không xác định',
                };
                console.log(`[MapLocationPicker] Selected place from reverse geocoding: ${JSON.stringify(selected)}`);
                setSelectedLocation(selected);
                return;
            }
        } catch (error) {
            console.error('Reverse Geocoding error:', error);
        }

        setSelectedLocation({ latitude, longitude, address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}` });
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
            const results = await Location.geocodeAsync(searchQuery);

            if (results.length > 0) {
                const { latitude, longitude } = results[0];

                let resolvedAddress = searchQuery;
                try {
                    const reversed = await Location.reverseGeocodeAsync({ latitude, longitude });

                    if (reversed.length > 0) {
                        const addr = reversed[0];
                        const addressParts = [
                            addr.name !== addr.district ? addr.name : null,
                            addr.district,
                            addr.subregion !== addr.district ? addr.subregion : null,
                            addr.region,
                        ];
                        resolvedAddress = addressParts.filter(Boolean).join(', ') || searchQuery;
                    }
                } catch (reverseError) {
                    console.warn(`[MapLocationPicker] Search reverse geocoding failed`, reverseError);
                }

                setSelectedLocation({ latitude, longitude, address: resolvedAddress });
                mapRef.current?.animateToRegion({ latitude, longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 }, 1000);
            } else {
                Alert.alert('Không tìm thấy', 'Không tìm thấy địa điểm này');
            }
        } catch (error) {
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
                        disabled={!selectedLocation}
                        className={selectedLocation ? '' : 'opacity-50'}
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
                            onMapReady={() => {
                                console.log(`[MapLocationPicker] Map ready`, {
                                    platform: Platform.OS,
                                    mapProvider: 'google',
                                    isGoogleProviderApplied: true,
                                });
                            }}
                            initialRegion={{
                                latitude: selectedLocation?.latitude || currentLocation.coords.latitude,
                                longitude: selectedLocation?.longitude || currentLocation.coords.longitude,
                                latitudeDelta: 0.01,
                                longitudeDelta: 0.01,
                            }}
                            onPress={handleMapPress}
                            showsUserLocation={true}
                            showsMyLocationButton={true}
                        >
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
                        <Text className="text-gray-800 font-medium mt-1">
                            {selectedLocation.address}
                        </Text>
                        <Text className="text-gray-400 text-xs mt-1">
                            {selectedLocation.latitude.toFixed(6)}, {selectedLocation.longitude.toFixed(6)}
                        </Text>
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
