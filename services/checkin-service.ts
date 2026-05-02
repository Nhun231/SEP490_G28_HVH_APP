import baseAxios from '@/lib/baseAxios'
import { File as FSFile } from 'expo-file-system/next'
import { getEventDetails } from '@/services/public-event-service'
import type { EventDetailsResponse } from '@/services/event-types'

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://api.hvh.homes'


export interface CheckEventByCodeResponse {
    eventId: string
    eventSessionId: string
    applicationId: string
}

export interface CheckinEventDetails {
    eventId: string
    eventSessionId: string
    name: string
    address: string
    detailAddress: string | null
    latCheckInLocation: number
    lngCheckInLocation: number
    checkInAccuracyMeters: number
    sessionEndTime: string | null
}

export interface QuickCheckInRequest {
    eventSessionId: string
    applicationId: string
    deviceId: string
    apVersion: string
    osVersion: string
    currentPlaceLat: number
    currentPlaceLng: number
}

export interface CheckOutEventRequest {
    eventSessionId: string
    deviceId: string
    apVersion: string
    osVersion: string
    currentPlaceLat: number
    currentPlaceLng: number
}


export const getCheckinEventDetails = async (
    codeResponse: CheckEventByCodeResponse
): Promise<CheckinEventDetails> => {
    const details: EventDetailsResponse = await getEventDetails(codeResponse.eventId)
    const matchingSession = details.eventSessions?.find(
        s => s.id === codeResponse.eventSessionId
    ) ?? null
    return {
        eventId: codeResponse.eventId,
        eventSessionId: codeResponse.eventSessionId,
        name: details.name,
        address: details.address,
        detailAddress: details.detailAddress ?? null,
        latCheckInLocation: details.latCheckInLocation,
        lngCheckInLocation: details.lngCheckInLocation,
        checkInAccuracyMeters: details.checkInAccuracyMeters,
        sessionEndTime: matchingSession?.endDateTime ?? null,
    }
}


export const checkEventByCode = async (code: string): Promise<CheckEventByCodeResponse> => {
    const endpoint = `${API_BASE}/api/v1/vol/event-applications/check-event-check-in-code`
    const response = await baseAxios.post<CheckEventByCodeResponse>(endpoint, { checkInCode: code })
    return response.data
}

export const quickCheckIn = async (data: QuickCheckInRequest): Promise<void> => {
    const endpoint = `${API_BASE}/api/v1/vol/event-applications/quick-check-in`
    await baseAxios.post(endpoint, data)
}

export const checkOutEvent = async (data: CheckOutEventRequest): Promise<void> => {
    const endpoint = `${API_BASE}/api/v1/vol/event-applications/check-out`
    await baseAxios.post(endpoint, data)
}


export interface ActiveCheckinResponse {
    /** ISO-8601 timestamp when the volunteer checked in */
    checkInTime: string
    eventSessionId: string
    applicationId: string
    eventId: string
    eventName: string
    sessionEndTime: string | null
    /** Event check-in centre latitude (for checkout mock/GPS) */
    latCheckInLocation: number
    /** Event check-in centre longitude (for checkout mock/GPS) */
    lngCheckInLocation: number
}

/**
 * Returns the volunteer's currently active check-in session, or null if not checked in.
 * GET /api/v1/vol/event-applications/active-check-in
 */
export const getActiveCheckin = async (): Promise<ActiveCheckinResponse | null> => {
    try {
        const endpoint = `${API_BASE}/api/v1/vol/event-applications/active-check-in`
        const response = await baseAxios.get<ActiveCheckinResponse>(endpoint)
        return response.data ?? null
    } catch {
        return null
    }
}


export interface FaceCheckInRequest {
    uri: string
    eventSessionId: string
    deviceId: string
    apVersion: string
    osVersion: string
    currentPlaceLat: number
    currentPlaceLng: number
}

/** Encode an ASCII string to Uint8Array. */
function encodeText(str: string): Uint8Array {
    const arr = new Uint8Array(str.length)
    for (let i = 0; i < str.length; i++) arr[i] = str.charCodeAt(i)
    return arr
}

/** Concatenate multiple Uint8Arrays into one. */
function concat(...parts: Uint8Array[]): Uint8Array {
    const total = parts.reduce((n, p) => n + p.length, 0)
    const out = new Uint8Array(total)
    let offset = 0
    for (const p of parts) { out.set(p, offset); offset += p.length }
    return out
}

/**
 * POST /api/v1/vol/event-applications/face-check-in
 * Manually constructs multipart body so the 'request' part has Content-Type: application/json,
 * which React Native's FormData polyfill cannot set on non-file parts.
 */
export const faceCheckIn = async (data: FaceCheckInRequest): Promise<void> => {
    const endpoint = `${API_BASE}/api/v1/vol/event-applications/face-check-in`

    const filename = data.uri.split('/').pop() ?? 'face_checkin.mp4'
    const ext      = filename.split('.').pop()  ?? 'mp4'
    const mimeType = ext === 'mov' ? 'video/quicktime' : 'video/mp4'

    const requestJson = JSON.stringify({
        eventSessionId:  data.eventSessionId,
        deviceId:        data.deviceId,
        apVersion:       data.apVersion,
        osVersion:       data.osVersion,
        currentPlaceLat: data.currentPlaceLat,
        currentPlaceLng: data.currentPlaceLng,
    })

    const fileBytes = new Uint8Array(await new FSFile(data.uri).arrayBuffer())

    const boundary = 'HVHBoundary' + Date.now()
    const CRLF     = '\r\n'

    const body = concat(
        encodeText(`--${boundary}${CRLF}`),
        encodeText(`Content-Disposition: form-data; name="request"${CRLF}`),
        encodeText(`Content-Type: application/json${CRLF}`),
        encodeText(CRLF),
        encodeText(requestJson),
        encodeText(CRLF),
        encodeText(`--${boundary}${CRLF}`),
        encodeText(`Content-Disposition: form-data; name="file"; filename="${filename}"${CRLF}`),
        encodeText(`Content-Type: ${mimeType}${CRLF}`),
        encodeText(CRLF),
        fileBytes,
        encodeText(CRLF),
        encodeText(`--${boundary}--${CRLF}`),
    )

    await baseAxios.post(endpoint, body.buffer, {
        headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
        transformRequest: [(d: unknown) => d],
    })
}
