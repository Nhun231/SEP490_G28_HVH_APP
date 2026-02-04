import React, { useState } from 'react'
import { Alert, StyleSheet, TextInput, View } from 'react-native'
import Button from '../components/Button'
import { signInWithEmail as signInAPI, signUpWithEmail as signUpAPI } from '../services/login-service'


export default function Auth() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)

    async function signInWithEmail() {
        setLoading(true)
        try {
            await signInAPI({ email, password })
        } catch (error) {
            Alert.alert((error as Error).message)
        }
        setLoading(false)
    }

    async function signUpWithEmail() {
        setLoading(true)
        try {
            const { session } = await signUpAPI({ email, password })
            if (!session) Alert.alert('Please check your inbox for email verification!')
        } catch (error) {
            Alert.alert((error as Error).message)
        }
        setLoading(false)
    }

    return (
        <View style={styles.container}>
            <View style={[styles.verticallySpaced, styles.mt20]}>
                <TextInput
                    style={styles.input}
                    onChangeText={(text) => setEmail(text)}
                    value={email}
                    placeholder="email@address.com"
                    placeholderTextColor="#999"
                    autoCapitalize="none"
                    keyboardType="email-address"
                    autoComplete="email"
                />
            </View>
            <View style={styles.verticallySpaced}>
                <TextInput
                    style={styles.input}
                    onChangeText={(text) => setPassword(text)}
                    value={password}
                    secureTextEntry={true}
                    placeholder="Password"
                    placeholderTextColor="#999"
                    autoCapitalize="none"
                    autoComplete="password"
                />
            </View>
            <View style={[styles.verticallySpaced, styles.mt20]}>
                <Button
                    text="Sign in"
                    onPress={signInWithEmail}
                    variant="primary"
                    size="large"
                    fullWidth
                    loading={loading}
                />
            </View>
            <View style={styles.verticallySpaced}>
                <Button
                    text="Sign up"
                    onPress={signUpWithEmail}
                    variant="outline"
                    size="large"
                    fullWidth
                    loading={loading}
                />
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        marginTop: 40,
        padding: 12,
    },
    verticallySpaced: {
        paddingTop: 4,
        paddingBottom: 4,
        alignSelf: 'stretch',
    },
    mt20: {
        marginTop: 20,
    },
    input: {
        height: 50,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        paddingHorizontal: 16,
        fontSize: 16,
        backgroundColor: '#fff',
    },

})