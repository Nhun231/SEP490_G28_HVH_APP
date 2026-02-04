import { StyleSheet, Text, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

const Benefit = () => {
    return (
        <SafeAreaView style={styles.container}>
            <View>
                <Text>Benefit Screen</Text>
            </View>
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
})

export default Benefit