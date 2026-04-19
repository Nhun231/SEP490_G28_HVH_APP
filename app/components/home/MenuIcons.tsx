import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { router } from 'expo-router';

export default function MenuIcons() {
    const handleFindEvent = () => {
        router.push('/screen/volunteer-screens/event-feed' as any);
    };

    return (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="px-4 py-4"
            contentContainerStyle={{ paddingRight: 16 }}
        >
            {/* BUTTON 1: SEARCH EVENT */}
            <TouchableOpacity onPress={handleFindEvent} activeOpacity={0.85}> 
                <View style={styles.buttonContainer}>
                    <LinearGradient
                        colors={['#64B5F6', '#42A5F5']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.gradientBase}
                    >
                        <Text style={[styles.labelBase]}>Tìm hoạt động</Text>
                    </LinearGradient>
                    <View style={[styles.iconWrapper, { top: -30 }]} pointerEvents="none">
                        <Image source={require('../../../assets/images/heart.png')} style={[styles.imageStyle]} />
                    </View>
                </View>
            </TouchableOpacity>

            {/* BUTTON 2: SEARCH ORGANIZATION */}
            {/* Change logic onPress later */}
            <TouchableOpacity onPress={() => {}} activeOpacity={0.85}>
                <View style={styles.buttonContainer}>
                    <LinearGradient
                        colors={['#66BB6A', '#43A047']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={[styles.gradientBase, { width: 130 }]}
                    >
                        <Text style={[styles.labelBase, { paddingLeft: 5 }]}>Tìm tổ chức</Text>
                    </LinearGradient>
                    <View style={[styles.iconWrapper, { width: 210, height: 95, right: -75 }]} pointerEvents="none">
                        <Image source={require('../../../assets/images/speaker.png')} style={[styles.imageStyle, { width: 210, height: 95 }]} />
                    </View>
                </View>
            </TouchableOpacity>

            {/* BUTTON 3: CERTIFICATE */}
            {/* Change logic onPress later */}
            <TouchableOpacity onPress={() => {}} activeOpacity={0.85}>
                <View style={styles.buttonContainer}>
                    <LinearGradient
                        colors={['#FFA726', '#FB8C00']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.gradientBase}
                    >
                        <Text style={[styles.labelBase, { paddingLeft: 8 }]}>Chứng nhận</Text>
                    </LinearGradient>
                    <View style={[styles.iconWrapper]}>
                        <Image source={require('../../../assets/images/certificate.png')} style={[styles.imageStyle]} />
                    </View>
                </View>
            </TouchableOpacity>

            {/* BUTTON 4: CERTIFICATE */}
            {/* Change logic onPress later */}
            <TouchableOpacity onPress={() => {}} activeOpacity={0.85}>
                <View style={styles.buttonContainer}>
                    <LinearGradient
                        colors={['#FFD54F', '#FFB300']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={[styles.gradientBase, { width: 150 }]}
                    >
                        <Text style={styles.labelBase}>Đăng ký tổ chức</Text>
                    </LinearGradient>
                    <View style={[styles.iconWrapper, { top: -30, right: -90 }]} pointerEvents="none">
                        <Image source={require('../../../assets/images/flag.png')} style={[styles.imageStyle]} />
                    </View>
                </View>
            </TouchableOpacity>

            {/* BUTTON 5: VOLUNTEER MOMENTS */}
            {/* Change logic onPress later */}
            <TouchableOpacity onPress={() => {}} activeOpacity={0.85}>
                <View style={[styles.buttonContainer, { marginRight: 0 }]}>
                    <LinearGradient
                        colors={['#F06292', '#E91E63']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={[styles.gradientBase]}
                    >
                        <Text style={styles.labelBase}>Khoảnh khắc tình nguyện</Text>
                    </LinearGradient>
                    <View style={[styles.iconWrapper, { width: 150, height: 95, top: -30, right: -50 }]} pointerEvents="none">
                        <Image source={require('../../../assets/images/camera.png')} style={[styles.imageStyle, { width: 150, height: 95 }]} />
                    </View>
                </View>
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    buttonContainer: {
        marginRight: 16,
        position: 'relative',
        marginTop: 5,
    },
    gradientBase: {
        width: 140,
        height: 95,
        borderRadius: 28,
        paddingLeft: 15,
        paddingBottom: 15,
        paddingTop: 16,
        justifyContent: 'flex-end',
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
    },
    labelBase: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
        lineHeight: 20,
        textShadowColor: 'rgba(0, 0, 0, 0.2)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
    },
    iconWrapper: {
        position: 'absolute',
        top: -22,
        right: -85,
        width: 240,
        height: 100,
        zIndex: 10,
    },
    imageStyle: {
        width: 240,
        height: 100,
        resizeMode: 'contain',
    }
});