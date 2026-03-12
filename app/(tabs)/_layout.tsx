import { Ionicons } from '@expo/vector-icons'
import { Tabs } from "expo-router"
import React from 'react'

const TabLayout = () => {
    return (
        <Tabs
            initialRouteName="home"
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: '#42A4F5', // primary color from theme
                tabBarInactiveTintColor: '#9CA3AF',
                tabBarStyle: {
                    backgroundColor: '#FFFFFF',
                    borderTopWidth: 1,
                    borderTopColor: '#E5E7EB',
                    height: 60,
                    paddingBottom: 8,
                    paddingTop: 8,
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
                    title: 'Home',
                    tabBarIcon: ({ color }) => (
                        <Ionicons name="home" size={20} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="benefit"
                options={{
                    title: 'Benefit',
                    tabBarIcon: ({ color }) => (
                        <Ionicons name="gift" size={20} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="checkin"
                options={{
                    title: 'Checkin',
                    tabBarIcon: ({ color }) => (
                        <Ionicons name="checkmark-circle" size={20} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="personal"
                options={{
                    title: 'Personal',
                    tabBarIcon: ({ color }) => (
                        <Ionicons name="person" size={20} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="event"
                options={{
                    title: 'Event',
                    tabBarIcon: ({ color }) => (
                        <Ionicons name="calendar" size={20} color={color} />
                    ),
                }}
            />
        </Tabs>
    )
}

export default TabLayout