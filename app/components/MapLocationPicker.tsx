import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Modal, TextInput, Alert, ActivityIndicator, Platform, StyleSheet } from 'react-native';
import MapView, { Marker, Circle, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';

interface LocationData {
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
    const logTag = '[MapLocationPicker]';
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

    useEffect(() => {
        if (visible) {
            setSelectedLocation(initialLocation);
            setSearchQuery('');
            console.log(`${logTag} Modal opened`, {
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
                    console.warn(`${logTag} Reverse geocode current location failed`, reverseError);
                }

                const street = [reverseAddress?.streetNumber, reverseAddress?.street]
                    .filter(Boolean)
                    .join(' ') || 'N/A';
                const city = reverseAddress?.city || reverseAddress?.subregion || reverseAddress?.district || 'N/A';

                console.log(
                    `${logTag} Current location details\n` +
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
                console.log(`${logTag} Current GPS raw`, location);
                if (reverseAddress) {
                    console.log(`${logTag} Current reverse geocode raw`, reverseAddress);
                }
                
                // Animate map to user's location
                mapRef.current?.animateToRegion({
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                }, 1000);
            } catch (error) {
                console.error('Error getting location:', error);
            } finally {
                setIsLoadingLocation(false);
            }
        })();
    }, [visible]);

    const handleMapPress = async (event: any) => {
        const { latitude, longitude } = event.nativeEvent.coordinate;
        console.log(`${logTag} Map pressed`, {
            platform: Platform.OS,
            latitude,
            longitude,
            mapProvider: 'google',
        });

        try {
            const result = await Location.reverseGeocodeAsync({ latitude, longitude });
            console.log(`${logTag} Reverse geocoding raw response`, result);
            if (result.length > 0) {
                const addr = result[0];
                const addressParts = [
                    addr.streetNumber,
                    addr.street,
                    addr.name !== addr.street ? addr.name : null,
                    addr.subregion,
                    addr.district !== addr.subregion ? addr.district : null,
                    addr.city,
                    addr.region !== addr.city ? addr.region : null,
                ];
                const selected = {
                    latitude,
                    longitude,
                    address: addressParts.filter(Boolean).join(', ') || 'Địa chỉ không xác định',
                };
                console.log(`${logTag} Selected place from reverse geocoding`, {
                    selected,
                    firstResult: addr,
                });
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
            console.log(`${logTag} Confirm selected location`, {
                selectedLocation,
                currentLocation,
            });
            onSelectLocation(selectedLocation);
            onClose();
        }
    };

    const handleMyLocation = () => {
        if (currentLocation) {
            mapRef.current?.animateToRegion({
                latitude: currentLocation.coords.latitude,
                longitude: currentLocation.coords.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
            }, 1000);
        }
    };

    const handleSearch = async () => {
        if (!searchQuery) return;

        try {
            const results = await Location.geocodeAsync(searchQuery);
            console.log(`${logTag} Search geocoding raw response`, results);

            if (results.length > 0) {
                const { latitude, longitude } = results[0];

                let resolvedAddress = searchQuery;
                try {
                    const reversed = await Location.reverseGeocodeAsync({ latitude, longitude });
                    console.log(`${logTag} Search reverse geocoding raw response`, reversed);

                    if (reversed.length > 0) {
                        const addr = reversed[0];
                        const addressParts = [
                            addr.streetNumber,
                            addr.street,
                            addr.name !== addr.street ? addr.name : null,
                            addr.subregion,
                            addr.district !== addr.subregion ? addr.district : null,
                            addr.city,
                            addr.region !== addr.city ? addr.region : null,
                        ];
                        resolvedAddress = addressParts.filter(Boolean).join(', ') || searchQuery;
                    }
                } catch (reverseError) {
                    console.warn(`${logTag} Search reverse geocoding failed`, reverseError);
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
                <View className="bg-white px-4 py-3 border-b border-gray-200 flex-row items-center">
                    <TouchableOpacity onPress={onClose} className="mr-3">
                        <Ionicons name="arrow-back" size={24} color="#000" />
                    </TouchableOpacity>
                    <Text className="text-lg font-bold flex-1">Chọn địa điểm</Text>
                    <TouchableOpacity
                        onPress={handleConfirm}
                        disabled={!selectedLocation}
                        className={selectedLocation ? '' : 'opacity-50'}
                    >
                        <Text className="text-[#42A5F5] font-semibold text-base">Xong</Text>
                    </TouchableOpacity>
                </View>

                    {/* Search Bar */}
                    <View className="bg-white px-4 py-3 border-b border-gray-200">
                        <View className="flex-row items-center bg-gray-100 rounded-lg px-3">
                            <Ionicons name="search" size={20} color="#666" />
                            <TextInput
                                className="flex-1 py-2 px-2 text-gray-800"
                                placeholder="Tìm kiếm địa điểm..."
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                onSubmitEditing={handleSearch}
                            />
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
                                    console.log(`${logTag} Map ready`, {
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
                                            strokeColor="rgba(66, 165, 245, 0.5)"
                                            fillColor="rgba(66, 165, 245, 0.2)"
                                        />
                                    </>
                                )}
                            </MapView>
                            
                            {/* Loading Indicator */}
                            {isLoadingLocation && (
                                <View className="absolute top-2 left-0 right-0 items-center">
                                    <View className="bg-white rounded-full px-4 py-2 flex-row items-center shadow-md">
                                        <ActivityIndicator size="small" color="#14B8A6" />
                                        <Text className="ml-2 text-gray-700 text-sm">Đang lấy vị trí...</Text>
                                    </View>
                                </View>
                            )}
                            
                            {/* My Location Button */}
                            {!isLoadingLocation && currentLocation && (
                                <TouchableOpacity
                                    onPress={handleMyLocation}
                                    className="absolute bottom-4 right-4 bg-white rounded-full p-3 shadow-lg"
                                    style={{ elevation: 5 }}
                                >
                                    <Ionicons name="locate" size={24} color="#14B8A6" />
                                </TouchableOpacity>
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
                </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
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
