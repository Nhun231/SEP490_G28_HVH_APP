import baseAxios from '@/lib/baseAxios'
import { supabase } from '@/lib/supabase'
import { registerFcmToken, unregisterFcmToken } from '@/services/notification-service'
import { Session } from '@supabase/supabase-js'
import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
import { Alert } from 'react-native'

// ==================== Types ====================

export type UserRole = 'VOL' | 'HOST' | 'ORG_MANAGER' | 'SYS_ADMIN' | null

interface AuthContextValue {
    session: Session | null
    isLoggedIn: boolean
    isLoading: boolean
    role: UserRole
    isPasswordRecovery: boolean
    clearPasswordRecovery: () => void
    logout: () => Promise<void>
}

// ==================== Context ====================

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export const useAuth = () => {
    const context = useContext(AuthContext)
    if (!context) throw new Error('useAuth must be used within AuthProvider')
    return context
}

// ==================== Provider ====================

const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [session, setSession] = useState<Session | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isPasswordRecovery, setIsPasswordRecovery] = useState(false)
    const isRefreshing = useRef(false)
    const alertShownRef = useRef(false)
    const fcmTokenRef = useRef<string | null>(null) // stored for unregister on logout

    // Load session from Supabase (it reads from AsyncStorage internally)
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session)
            setIsLoading(false)
        })

        // Listen for auth state changes (sign-in, sign-out, token refresh, password recovery)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            setSession(session)
            if (event === 'PASSWORD_RECOVERY') {
                setIsPasswordRecovery(true)
            }
            // Register FCM token after login so auth header is available
            if (event === 'SIGNED_IN') {
                registerFcmToken()
                    .then(token => { fcmTokenRef.current = token })
                    .catch(err =>
                        console.warn('[Notification] Post-login FCM token registration failed:', err)
                    )
            }
        })

        return () => subscription.unsubscribe()
    }, [])

    // Request interceptor: inject AT into every baseAxios request
    useEffect(() => {
        const requestInterceptor = baseAxios.interceptors.request.use(async (config) => {
            // Always read the latest session from Supabase (handles refresh automatically)
            const { data: { session } } = await supabase.auth.getSession()
            const token = session?.access_token
            if (token) {
                config.headers.Authorization = `Bearer ${token}`
            }
            return config
        })

        return () => baseAxios.interceptors.request.eject(requestInterceptor)
    }, [])

    // Response interceptor: handle 401 → try Supabase refresh → retry request
    useEffect(() => {
        const responseInterceptor = baseAxios.interceptors.response.use(
            (response) => response,
            async (error) => {
                const originalRequest = error.config

                if (originalRequest._retry || error.response?.status !== 401) {
                    return Promise.reject(error)
                }

                if (isRefreshing.current) return Promise.reject(error)

                isRefreshing.current = true
                originalRequest._retry = true

                try {
                    // Ask Supabase to refresh the session using its stored refresh token
                    const { data, error: refreshError } = await supabase.auth.refreshSession()

                    if (refreshError || !data.session) {
                        throw refreshError ?? new Error('Session refresh failed')
                    }

                    isRefreshing.current = false
                    setSession(data.session)

                    // Retry the original request with the new token
                    originalRequest.headers.Authorization = `Bearer ${data.session.access_token}`
                    return baseAxios(originalRequest)
                } catch (refreshErr) {
                    isRefreshing.current = false

                    // Show session-expired alert once
                    if (!alertShownRef.current) {
                        alertShownRef.current = true
                        Alert.alert(
                            'Phiên đã hết hạn',
                            'Vui lòng đăng nhập lại.',
                            [{
                                text: 'OK',
                                onPress: async () => {
                                    alertShownRef.current = false
                                    await supabase.auth.signOut()
                                    setSession(null)
                                },
                            }]
                        )
                    }
                    return Promise.reject(refreshErr)
                }
            }
        )

        return () => baseAxios.interceptors.response.eject(responseInterceptor)
    }, [])

    // Clear password recovery flag after new password is set
    const clearPasswordRecovery = () => setIsPasswordRecovery(false)

    // Logout: unregister FCM token first, then sign out
    const logout = async () => {
        // Step 5: tell BE to stop sending notifications to this device
        if (fcmTokenRef.current) {
            await unregisterFcmToken(fcmTokenRef.current)
            fcmTokenRef.current = null
        }
        await supabase.auth.signOut()
        setSession(null)
    }

    return (
        <AuthContext.Provider value={{
            session,
            isLoggedIn: !!session,
            isLoading,
            role: (session?.user.app_metadata?.role as UserRole) ?? null,
            isPasswordRecovery,
            clearPasswordRecovery,
            logout,
        }}>
            {children}
        </AuthContext.Provider>
    )
}

export default AuthProvider
