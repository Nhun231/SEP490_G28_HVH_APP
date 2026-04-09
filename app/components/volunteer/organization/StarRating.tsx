import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface StarRatingProps {
    rating: number;
    totalRatings?: number;
}

export default function StarRating({ rating, totalRatings }: StarRatingProps) {
    const full = Math.floor(rating);
    const fraction = rating - full;
    const hasHalf = fraction >= 0.25 && fraction < 0.75;
    const fullCount = fraction >= 0.75 ? full + 1 : full;

    return (
        <View style={styles.row}>
            {[1, 2, 3, 4, 5].map(i => {
                let name: 'star' | 'star-half' | 'star-outline' = 'star-outline';
                if (i <= fullCount) name = 'star';
                else if (i === fullCount + 1 && hasHalf) name = 'star-half';
                return <Ionicons key={i} name={name} size={14} color="#FFB800" />;
            })}
            <Text style={styles.value}>{rating.toFixed(1)}</Text>
            {totalRatings != null && (
                <Text style={styles.total}> · Tổng số đánh giá: {totalRatings.toLocaleString('vi-VN')}</Text>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: 2, flexWrap: 'wrap' },
    value: { fontSize: 13, fontWeight: '700', color: '#92400E', marginLeft: 4 },
    total: { fontSize: 11, color: '#6B7280' },
});
