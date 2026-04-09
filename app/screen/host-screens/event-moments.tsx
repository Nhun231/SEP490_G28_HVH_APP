import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    FlatList,
    Image,
    Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';

// ─── Theme ────────────────────────────────────────────────────────────────────

const TEAL = '#42A4F5';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MomentItem {
    id: string;
    userId: string;
    userName: string;
    avatarUrl?: string;
    caption: string;
    imageUrl: string;
    time: string; // e.g. "10:30"
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_MOMENTS: MomentItem[] = [
    {
        id: '1',
        userId: 'u1',
        userName: 'Nguyễn Văn An',
        imageUrl: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=400',
        caption: 'Hoàn thành tốt công việc dọn dẹp bãi biển! 🌊',
        time: '10:30',
    },
    {
        id: '2',
        userId: 'u2',
        userName: 'Trần Thị Bình',
        imageUrl: 'https://images.unsplash.com/photo-1559223607-a43c990c692c?w=400',
        caption: 'Đoàn kết là sức mạnh! Cùng nhau vì mới 💪',
        time: '11:15',
    },
    {
        id: '3',
        userId: 'u3',
        userName: 'Lê Minh Châu',
        imageUrl: 'https://images.unsplash.com/photo-1593113598332-cd288d649433?w=400',
        caption: 'Teamwork makes the dream work! 🙌',
        time: '09:45',
    },
    {
        id: '4',
        userId: 'u4',
        userName: 'Phạm Đức Duy',
        imageUrl: 'https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?w=400',
        caption: 'Những khoảnh khắc đáng nhớ cùng mọi người',
        time: '10:00',
    },
    {
        id: '5',
        userId: 'u5',
        userName: 'Hoàng Thị Lan',
        imageUrl: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=400',
        caption: 'Một ngày làm việc ý nghĩa! Hẹn gặp lại ở...',
        time: '11:45',
    },
    {
        id: '6',
        userId: 'u6',
        userName: 'Ngô Văn Phong',
        imageUrl: 'https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?w=400',
        caption: 'Cùng nhau làm cho biển sạch hơn 🌊✨',
        time: '08:30',
    },
    {
        id: '7',
        userId: 'u7',
        userName: 'Vũ Thu Hà',
        imageUrl: 'https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?w=400',
        caption: 'Năng lượng tích cực từ cả đội! 🔥',
        time: '09:00',
    },
    {
        id: '8',
        userId: 'u8',
        userName: 'Đặng Minh Tú',
        imageUrl: 'https://images.unsplash.com/photo-1559223607-a43c990c692c?w=400',
        caption: 'Mỗi hành động nhỏ đều tạo nên thay đổi lớn 🌍',
        time: '10:15',
    },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 16 * 2 - 10) / 2; // 2 columns with 10px gap

// ─── Moment Card ──────────────────────────────────────────────────────────────

interface MomentCardProps {
    item: MomentItem;
    onPress: (item: MomentItem) => void;
}

const MomentCard = ({ item, onPress }: MomentCardProps) => (
    <TouchableOpacity
        style={styles.momentCard}
        onPress={() => onPress(item)}
        activeOpacity={0.85}
    >
        <Image
            source={{ uri: item.imageUrl }}
            style={styles.momentImage}
            resizeMode="cover"
        />
        <View style={styles.momentInfo}>
            <Text style={styles.momentUserName} numberOfLines={1}>{item.userName}</Text>
            <Text style={styles.momentCaption} numberOfLines={2}>{item.caption}</Text>
            <Text style={styles.momentTime}>{item.time}</Text>
        </View>
    </TouchableOpacity>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────

const EventMomentsScreen = () => {
    const router = useRouter();
    const moments = MOCK_MOMENTS;

    const handleMomentPress = (item: MomentItem) => {
        router.push({
            pathname: '/screen/event-moment-detail',
            params: { momentId: item.id },
        });
    };

    return (
        <>
            <Stack.Screen options={{ headerShown: false }} />
            <SafeAreaView style={styles.container} edges={['top']}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.backBtn}
                        onPress={() => router.back()}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="arrow-back" size={22} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>
                        Khoảnh khắc ({moments.length})
                    </Text>
                    <View style={{ width: 38 }} />
                </View>

                <FlatList
                    data={moments}
                    keyExtractor={(item) => item.id}
                    numColumns={2}
                    columnWrapperStyle={styles.columnWrapper}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    renderItem={({ item }) => (
                        <MomentCard item={item} onPress={handleMomentPress} />
                    )}
                    ListFooterComponent={<View style={{ height: 32 }} />}
                />
            </SafeAreaView>
        </>
    );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: TEAL },

    // Header
    header: {
        backgroundColor: TEAL,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingBottom: 12,
        marginTop: -8,
        gap: 12,
    },
    backBtn: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        flex: 1,
        color: '#fff',
        fontSize: 17,
        fontWeight: '700',
    },

    // List
    listContent: {
        backgroundColor: '#F8FAFC',
        paddingHorizontal: 16,
        paddingTop: 14,
    },
    columnWrapper: {
        gap: 10,
        marginBottom: 10,
    },

    // Moment card
    momentCard: {
        width: CARD_WIDTH,
        backgroundColor: '#fff',
        borderRadius: 14,
        overflow: 'hidden',
        shadowColor: '#94A3B8',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
        elevation: 2,
    },
    momentImage: {
        width: '100%',
        height: CARD_WIDTH * 0.9,
        backgroundColor: '#E2E8F0',
    },
    momentInfo: {
        padding: 10,
        gap: 3,
    },
    momentUserName: {
        fontSize: 13,
        fontWeight: '700',
        color: '#1E293B',
    },
    momentCaption: {
        fontSize: 12,
        color: '#475569',
        lineHeight: 17,
    },
    momentTime: {
        fontSize: 11,
        color: '#94A3B8',
        marginTop: 2,
    },
});

export default EventMomentsScreen;
