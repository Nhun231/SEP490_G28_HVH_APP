import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Modal, TextInput, Alert, ActivityIndicator, Platform, StyleSheet } from 'react-native';
import MapView, { Marker, Circle } from 'react-native-maps';
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
        
        // Use Apple Maps reverse geocoding
        // try {
        //     const result = await Location.reverseGeocodeAsync({
        //         latitude,
        //         longitude,
        //     });

        //     if (result.length > 0) {
        //         const addr = result[0];
                
        //         // Log full geocoding result
        //         console.log('=== APPLE MAPS GEOCODING RESULT ===');
        //         console.log('Full object:', JSON.stringify(addr, null, 2));
        //         console.log('streetNumber:', addr.streetNumber);
        //         console.log('street:', addr.street);
        //         console.log('name:', addr.name);
        //         console.log('subregion:', addr.subregion);
        //         console.log('district:', addr.district);
        //         console.log('city:', addr.city);
        //         console.log('region:', addr.region);
        //         console.log('postalCode:', addr.postalCode);
        //         console.log('country:', addr.country);
        //         console.log('isoCountryCode:', addr.isoCountryCode);
        //         console.log('timezone:', addr.timezone);
        //         console.log('===================================');
                
        //         // Build full address from all available fields
        //         const addressParts = [];
                
        //         if (addr.streetNumber) addressParts.push(addr.streetNumber);
        //         if (addr.street) addressParts.push(addr.street);
        //         if (addr.name && addr.name !== addr.street) addressParts.push(addr.name);
        //         if (addr.subregion) addressParts.push(addr.subregion);
        //         if (addr.district && addr.district !== addr.subregion) addressParts.push(addr.district);
        //         if (addr.city) addressParts.push(addr.city);
        //         if (addr.region && addr.region !== addr.city) addressParts.push(addr.region);
                
        //         const address = addressParts.filter(part => part).join(', ').trim();
                
        //         setSelectedLocation({
        //             latitude,
        //             longitude,
        //             address: address || 'Địa chỉ không xác định',
        //         });
        //     }
        // } catch (error) {
        //     console.error('Apple Maps Geocoding error:', error);
        //     setSelectedLocation({
        //         latitude,
        //         longitude,
        //         address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
        //     });
        // }
        
        // GOOGLE GEOCODING API - Commented out for testing Apple Maps
        try {
            const GOOGLE_API_KEY = 'AIzaSyAyAwvegpdwoKWZiuNo__1wTUc9RK89yg4';
            const response = await fetch(
                `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_API_KEY}&language=vi`
            );
            const data = await response.json();
            
            console.log('=== GOOGLE GEOCODING RESULT ===');
            console.log('Status:', data.status);
            console.log('Full response:', JSON.stringify(data, null, 2));
            console.log('================================');
            
            if (data.status === 'OK' && data.results && data.results.length > 0) {
                const address = data.results[0].formatted_address;
                
                setSelectedLocation({
                    latitude,
                    longitude,
                    address: address || 'Địa chỉ không xác định',
                });
            } else {
                // Fallback to coordinates
                setSelectedLocation({
                    latitude,
                    longitude,
                    address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
                });
            }
        } catch (error) {
            console.error('Google Geocoding error:', error);
            setSelectedLocation({
                latitude,
                longitude,
                address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
            });
        }
    };

    const handleConfirm = () => {
        if (selectedLocation) {
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
            // Use Apple Maps geocoding for search
            const results = await Location.geocodeAsync(searchQuery);
            if (results.length > 0) {
                const { latitude, longitude } = results[0];
                setSelectedLocation({
                    latitude,
                    longitude,
                    address: searchQuery,
                });
                
                // Animate map to searched location
                mapRef.current?.animateToRegion({
                    latitude,
                    longitude,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                }, 1000);
            } else {
                Alert.alert('Không tìm thấy', 'Không tìm thấy địa điểm này');
            }
        } catch (error) {
            Alert.alert('Lỗi', 'Không thể tìm kiếm địa điểm');
        }
        
        /* GOOGLE GEOCODING API - Commented out
        try {
            const GOOGLE_API_KEY = 'AIzaSyAyAwvegpdwoKWZiuNo__1wTUc9RK89yg4';
            const response = await fetch(
                `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(searchQuery)}&key=${GOOGLE_API_KEY}&language=vi`
            );
            const data = await response.json();
            
            if (data.status === 'OK' && data.results && data.results.length > 0) {
                const result = data.results[0];
                const { lat, lng } = result.geometry.location;
                const address = result.formatted_address;
                
                setSelectedLocation({
                    latitude: lat,
                    longitude: lng,
                    address: address,
                });
                
                // Animate map to searched location
                mapRef.current?.animateToRegion({
                    latitude: lat,
                    longitude: lng,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                }, 1000);
            } else {
                Alert.alert('Không tìm thấy', 'Không tìm thấy địa điểm này');
            }
        } catch (error) {
            Alert.alert('Lỗi', 'Không thể tìm kiếm địa điểm');
        }
        */
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
