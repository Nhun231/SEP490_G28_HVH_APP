/**
 * Checkin Service — Handles check-in / check-out API calls for volunteers.
 */

import baseAxios from '@/lib/baseAxios'
import { getEventDetails } from '@/services/public-event-service'
import type { EventDetailsResponse } from '@/services/event-types'

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://api.hvh.homes'

// ── Types ────────────────────────────────────────────────────────────────────

/** Matches the actual BE response from POST /vol/event-applications/check-event-check-in-code */
export interface CheckEventByCodeResponse {
    eventId: string
    eventSessionId: string
}

/** Enriched event data for the check-in map screen */
export interface CheckinEventDetails {
    eventId: string
    eventSessionId: string
    name: string
    address: string
    detailAddress: string | null
    /** Latitude of the check-in zone center */
    latCheckInLocation: number
    /** Longitude of the check-in zone center */
    lngCheckInLocation: number
    /** Allowed radius in meters */
    checkInAccuracyMeters: number
}

/** Matches BE QuickCheckInEventRequest — same fields as checkout */
export interface QuickCheckInRequest {
    /** UUID of the event session */
    eventSessionId: string
    /** Device identifier (IDFV on iOS, AndroidId on Android) */
    deviceId: string
    /** App version string e.g. "1.0.0" */
    apVersion: string
    /** OS name + version e.g. "iOS 17.4" */
    osVersion: string
    /** Current GPS latitude */
    currentPlaceLat: number
    /** Current GPS longitude */
    currentPlaceLng: number
}

export interface CheckOutEventRequest {
    /** UUID of the event session */
    eventSessionId: string
    /** Device identifier */
    deviceId: string
    /** App version string */
    apVersion: string
    /** OS version string */
    osVersion: string
    /** Current GPS latitude */
    currentPlaceLat: number
    /** Current GPS longitude */
    currentPlaceLng: number
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * After checkEventByCode returns { eventId, eventSessionId }, call this to
 * fetch the full event details needed for the check-in map screen.
 */
export const getCheckinEventDetails = async (
    codeResponse: CheckEventByCodeResponse
): Promise<CheckinEventDetails> => {
    const details: EventDetailsResponse = await getEventDetails(codeResponse.eventId)
    return {
        eventId: codeResponse.eventId,
        eventSessionId: codeResponse.eventSessionId,
        name: details.name,
        address: details.address,
        detailAddress: details.detailAddress ?? null,
        latCheckInLocation: details.latCheckInLocation,
        lngCheckInLocation: details.lngCheckInLocation,
        checkInAccuracyMeters: details.checkInAccuracyMeters,
    }
}

// ── API functions ─────────────────────────────────────────────────────────────

/**
 * Verify a check-in code and return the matching event/application details.
 * POST /api/v1/vol/event-applications/check-event-check-in-code
 * Body: { checkInCode: string }
 */
export const checkEventByCode = async (code: string): Promise<CheckEventByCodeResponse> => {
    const endpoint = `${API_BASE}/api/v1/vol/event-applications/check-event-check-in-code`
    const response = await baseAxios.post<CheckEventByCodeResponse>(endpoint, { checkInCode: code })
    return response.data
}

/**
 * Execute check-in (or check-out) for the volunteer.
 * POST /api/v1/vol/event-applications/quick-check-in
 */
export const quickCheckIn = async (data: QuickCheckInRequest): Promise<void> => {
    const endpoint = `${API_BASE}/api/v1/vol/event-applications/quick-check-in`
    await baseAxios.post(endpoint, data)
}

/**
 * Check-out the volunteer from an event session.
 * POST /api/v1/vol/event-applications/check-out
 * Requires: sessionId, device info, and current GPS position (must be within the event's check-in radius).
 */
export const checkOutEvent = async (data: CheckOutEventRequest): Promise<void> => {
    const endpoint = `${API_BASE}/api/v1/vol/event-applications/check-out`
    await baseAxios.post(endpoint, data)
}

// ─── Face Check-In ────────────────────────────────────────────────────────────

export interface FaceCheckInRequest {
    /** Local URI of the recorded video file */
    uri: string
    eventSessionId: string
    deviceId: string
    apVersion: string
    osVersion: string
    currentPlaceLat: number
    currentPlaceLng: number
}

/**
 * Upload a short face video for biometric check-in.
 * POST /api/v1/vol/event-applications/face-check-in
 * Sends multipart/form-data:
 *   - request (JSON): { eventSessionId, deviceId, apVersion, osVersion, currentPlaceLat, currentPlaceLng }
 *   - file: the recorded video blob
 */
export const faceCheckIn = async (data: FaceCheckInRequest): Promise<void> => {
    const endpoint = `${API_BASE}/api/v1/vol/event-applications/face-check-in`

    const form = new FormData()

    // JSON request part
    const requestBlob = {
        type: 'application/json',
        name: 'request.json',
        // React Native FormData accepts plain objects when 'uri' is not present
        uri: undefined as any,
    }
    form.append('request', JSON.stringify({
        eventSessionId: data.eventSessionId,
        deviceId: data.deviceId,
        apVersion: data.apVersion,
        osVersion: data.osVersion,
        currentPlaceLat: data.currentPlaceLat,
        currentPlaceLng: data.currentPlaceLng,
    }) as any)

    // Video file part — React Native requires { uri, name, type }
    const filename = data.uri.split('/').pop() ?? 'face_checkin.mp4'
    const ext = filename.split('.').pop() ?? 'mp4'
    const mimeType = ext === 'mov' ? 'video/quicktime' : 'video/mp4'
    form.append('file', {
        uri: data.uri,
        name: filename,
        type: mimeType,
    } as any)

    await baseAxios.post(endpoint, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
    })
}
