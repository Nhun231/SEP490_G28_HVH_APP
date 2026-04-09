import React from 'react';
import { View, StyleSheet } from 'react-native';

const SkeletonCard = () => (
    <View style={styles.card}>
        <View style={styles.image} />
        <View style={styles.body}>
            <View style={[styles.line, { width: '70%' }]} />
            <View style={[styles.line, { width: '45%', marginTop: 6 }]} />
            <View style={[styles.line, { width: '55%', marginTop: 6 }]} />
        </View>
    </View>
);

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        marginBottom: 12,
        flexDirection: 'row',
        overflow: 'hidden',
        height: 100,
    },
    image: {
        width: 100,
        backgroundColor: '#E2E8F0',
    },
    body: {
        flex: 1,
        padding: 14,
        justifyContent: 'center',
    },
    line: {
        height: 14,
        borderRadius: 7,
        backgroundColor: '#E2E8F0',
    },
});

export default SkeletonCard;
