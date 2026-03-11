import { StyleSheet, Text, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

const HostPersonal = () => {
    return (
        <SafeAreaView style={styles.container}>
            <View>
                <Text>Cá nhân (Host)</Text>
            </View>
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    container: { flex: 1 },
})

export default HostPersonal
