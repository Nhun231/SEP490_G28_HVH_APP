import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type StarRowProps = {
    value: number;
    onChange: (v: number) => void;
};

const StarRow: React.FC<StarRowProps> = ({ value, onChange }) => (
    <View style={styles.row}>
        {[1, 2, 3, 4, 5].map(star => (
            <TouchableOpacity
                key={star}
                onPress={() => onChange(star)}
                activeOpacity={0.7}
                hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
            >
                <Ionicons
                    name={star <= value ? 'star' : 'star-outline'}
                    size={34}
                    color={star <= value ? '#F59E0B' : '#CBD5E1'}
                />
            </TouchableOpacity>
        ))}
    </View>
);

export default StarRow;

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        gap: 6,
        justifyContent: 'center',
        marginVertical: 8,
    },
});
