/**
 * vol-event-service.ts
 * Volunteer-facing APIs — all require VOL role authentication.
 * Endpoints: /api/v1/vol/...
 */

import baseAxios from '@/lib/baseAxios'
import { Platform } from 'react-native'
import * as Application from 'expo-application'
import type {
    VolApplicationsParams,
    VolApplicationsResponse,
    RateEventRequest,
    SavedEventsParams,
    SavedEventsResponse,
} from './event-types'

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://api.hvh.homes'

/**
 * Save (or unsave) an event for the current volunteer.
 * POST /api/v1/vol/events/save-event
 * Calling again on a saved event will unsave it (toggle).
 */
export const saveEventForVolunteer = async (eventId: string): Promise<void> => {
    const endpoint = `${API_BASE}/api/v1/vol/events/save-event`
    await baseAxios.post(endpoint, { eventId })
}

/**
 * Apply for a volunteer event session.
 * POST /api/v1/vol/event-sessions/{sessionId}/apply
 */
export const applyEventSession = async (sessionId: string): Promise<void> => {
    const endpoint = `${API_BASE}/api/v1/vol/event-sessions/${sessionId}/apply`
    await baseAxios.post(endpoint)
}

/**
 * Fetch the current volunteer's event applications, filtered by status.
 * GET /api/v1/vol/event-applications
 */
export const getVolApplications = async (
    params: VolApplicationsParams = {}
): Promise<VolApplicationsResponse> => {
    const query = new URLSearchParams()
    query.append('pageNumber', String(params.pageNumber ?? 0))
    query.append('pageSize', String(params.pageSize ?? 10))
    // Empty string means "no filter" on the backend
    query.append('status', params.status ?? '')

    const url = `${API_BASE}/api/v1/vol/event-applications?${query.toString()}`
    const response = await baseAxios.get<VolApplicationsResponse>(url)
    return response.data
}

/**
 * Cancel the current volunteer's own event application.
 * PUT /api/v1/vol/event-applications/{id}/cancel
 * Only PENDING or APPROVED applications before the session date can be cancelled.
 */
export const cancelVolApplication = async (applicationId: string): Promise<void> => {
    const url = `${API_BASE}/api/v1/vol/event-applications/${applicationId}/cancel`
    await baseAxios.put(url)
}

/**
 * Submit a 5-dimension rating for a completed event application.
 * POST /api/v1/vol/event-ratings
 * Requires VOL role. Only allowed within 7 days after the event end date.
 */
export const rateEvent = async (request: RateEventRequest): Promise<void> => {
    const url = `${API_BASE}/api/v1/vol/event-ratings`
    await baseAxios.post(url, request)
}

/**
 * Register the volunteer's face biometric data.
 * POST /api/v1/vol/volunteers/register-face-id
 * Requires VOL role. Can only be called once — already-registered accounts will get a 409 error.
 */
export const registerVolunteerFace = async (photo: {
    uri: string
    fileName: string
    mimeType: string
}): Promise<void> => {
    const url = `${API_BASE}/api/v1/vol/volunteers/register-face-id`

    let deviceId: string
    if (Platform.OS === 'android') {
        deviceId = (await Application.getAndroidId()) ?? Application.applicationId ?? 'unknown-android'
    } else {
        deviceId = (await Application.getIosIdForVendorAsync()) ?? Application.applicationId ?? 'unknown-ios'
    }

    const formData = new FormData()
    formData.append('deviceId', deviceId)
    formData.append('file', {
        uri: photo.uri,
        name: photo.fileName,
        type: photo.mimeType,
    } as any)
    await baseAxios.post(url, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    })
}

/**
 * Fetch the current volunteer's saved events, with optional name search.
 * GET /api/v1/vol/events/saved-events
 * Requires VOL role.
 */
export const getSavedEvents = async (
    params: SavedEventsParams = {}
): Promise<SavedEventsResponse> => {
    const query = new URLSearchParams()
    query.append('pageNumber', String(params.pageNumber ?? 0))
    query.append('pageSize', String(params.pageSize ?? 10))
    if (params.name) query.append('name', params.name)

    const url = `${API_BASE}/api/v1/vol/events/saved-events?${query.toString()}`
    const response = await baseAxios.get<SavedEventsResponse>(url)
    return response.data
}

/**
 * Submit a claim for additional volunteer hours on a completed event session.
 * POST /api/v1/vol/event-claims
 */
export const claimEventHour = async (
    request: import('./event-types').ClaimEventHourRequest
): Promise<import('./event-types').ClaimEventHourResponse> => {
    const url = `${API_BASE}/api/v1/vol/event-claims`
    const response = await baseAxios.post<import('./event-types').ClaimEventHourResponse>(url, request)
    return response.data
}
