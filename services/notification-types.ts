/**
 * notification-types.ts
 * Shared type definitions for the notification system.
 */

export interface NotificationItem {
    notificationId: string
    title: string
    body: string
    data: Record<string, string> | null
    createdAt: string
}

export interface NotificationPage {
    content: NotificationItem[]
    last: boolean
    totalElements: number
}
