import baseAxios from '@/lib/baseAxios'
import { supabase } from '@/lib/supabase'
import { Session } from '@supabase/supabase-js'
import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
import { Alert } from 'react-native'

// ==================== Types ====================

interface AuthContextValue {
    session: Session | null
    isLoggedIn: boolean
    isLoading: boolean
    logout: () => Promise<void>
}

// ==================== Context ====================

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export const useAuth = () => {
    const ctx = useContext(AuthContext)
    if (!ctx) throw new Error('useAuth must be used within AuthProvider')
    return ctx
}

// ==================== Provider ====================

const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [session, setSession] = useState<Session | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const isRefreshing = useRef(false)
    const alertShownRef = useRef(false)

    // ── 1. Boot: load session from Supabase (it reads from AsyncStorage internally) ──
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session)
            setIsLoading(false)
        })

        // Listen for auth state changes (sign-in, sign-out, token refresh)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session)
        })

        return () => subscription.unsubscribe()
    }, [])

    // ── 2. Request interceptor: inject access_token into every baseAxios request ──
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

    // ── 3. Response interceptor: handle 401 → try Supabase refresh → retry request ──
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

    // ── 4. Logout ──
    const logout = async () => {
        await supabase.auth.signOut()
        // Supabase clears its own AsyncStorage keys; clear any extra keys here if needed
        setSession(null)
    }

    return (
        <AuthContext.Provider value={{
            session,
            isLoggedIn: !!session,
            isLoading,
            logout,
        }}>
            {children}
        </AuthContext.Provider>
    )
}

export default AuthProvider
