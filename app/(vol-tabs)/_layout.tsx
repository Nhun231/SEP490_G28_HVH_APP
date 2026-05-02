import { Ionicons } from '@expo/vector-icons'
import { Tabs } from "expo-router"
import React from 'react'
import { Platform } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

const TAB_BAR_BASE_HEIGHT = 40
const TAB_CONTENT_PADDING = 2

const TabLayout = () => {
    const insets = useSafeAreaInsets()
    // On Android gesture nav, bottom inset is the nav-bar height.
    // On iOS, it's the home-indicator height.
    const bottomInset = insets.bottom

    return (
        <Tabs
            initialRouteName="home"
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: '#42A4F5',
                tabBarInactiveTintColor: '#9CA3AF',
                tabBarStyle: {
                    backgroundColor: '#FFFFFF',
                    borderTopWidth: 1,
                    borderTopColor: '#E5E7EB',
                    height: TAB_BAR_BASE_HEIGHT + bottomInset,
                    paddingBottom: TAB_CONTENT_PADDING + bottomInset,
                    paddingTop: TAB_CONTENT_PADDING,
                },
                tabBarLabelStyle: {
                    fontSize: 10,
                    fontWeight: '600',
                },
                tabBarIconStyle: {
                    marginTop: -6,
                },
            }}
        >
            <Tabs.Screen
                name="home"
                options={{
                    title: 'Trang chủ',
                    tabBarIcon: ({ color }) => (
                        <Ionicons name="home" size={20} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="organization"
                options={{
                    title: 'Tổ chức',
                    tabBarIcon: ({ color }) => (
                        <Ionicons name="business-outline" size={20} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="checkin"
                options={{
                    title: 'Điểm danh',
                    tabBarIcon: ({ color }) => (
                        <Ionicons name="checkmark-circle" size={20} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="personal"
                options={{
                    title: 'Cá nhân',
                    tabBarIcon: ({ color }) => (
                        <Ionicons name="person" size={20} color={color} />
                    ),
                }}
            />
        </Tabs>
    )
}

export default TabLayout
