import React from 'react';
import {
    Modal,
    View,
    Image,
    TouchableOpacity,
    StyleSheet,
    Dimensions,
    StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface SingleImageViewerProps {
    visible: boolean;
    imageUrl: string;
    onClose: () => void;
}

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const SingleImageViewer: React.FC<SingleImageViewerProps> = ({ visible, imageUrl, onClose }) => (
    <Modal
        visible={visible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={onClose}
    >
        <StatusBar hidden />
        <View style={styles.backdrop}>
            <Image
                source={{ uri: imageUrl }}
                style={styles.image}
                resizeMode="contain"
            />
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.8}>
                <Ionicons name="close" size={26} color="#FFF" />
            </TouchableOpacity>
        </View>
    </Modal>
);

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: '#000',
        alignItems: 'center',
        justifyContent: 'center',
    },
    image: {
        width: SCREEN_W,
        height: SCREEN_H,
    },
    closeBtn: {
        position: 'absolute',
        top: 48,
        right: 16,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.5)',
        alignItems: 'center',
        justifyContent: 'center',
    },
});

export default SingleImageViewer;
