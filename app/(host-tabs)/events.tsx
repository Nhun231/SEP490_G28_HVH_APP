import { StyleSheet, Text, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

const HostEvents = () => {
    return (
        <SafeAreaView style={styles.container}>
            <View>
                <Text>Quản lý sự kiện (Host)</Text>
            </View>
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    container: { flex: 1 },
})

export default HostEvents
