/**
 * Checkin Service — Handles check-in / check-out API calls for volunteers.
 */

import baseAxios from '@/lib/baseAxios'

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://api.hvh.homes'

// ── Types ────────────────────────────────────────────────────────────────────

export interface CheckEventByCodeResponse {
    eventId: string
    eventName: string
    /** The volunteer's application ID for this event (used in quick-check-in) */
    applicationId: string
    /** The session ID the volunteer applied to */
    sessionId?: string
}

export interface QuickCheckInRequest {
    /** The 6-digit check-in code */
    code: string
    /** The volunteer's event application ID */
    applicationId: string
}

// ── API functions ─────────────────────────────────────────────────────────────

/**
 * Verify a check-in code and return the matching event/application details.
 * GET /api/v1/vol/event-applications/check-event-check-in-code?code=XXXXXX
 */
export const checkEventByCode = async (code: string): Promise<CheckEventByCodeResponse> => {
    const endpoint = `${API_BASE}/api/v1/vol/event-applications/check-event-check-in-code`
    const response = await baseAxios.get<CheckEventByCodeResponse>(endpoint, {
        params: { code },
    })
    console.log('[CheckinService] checkEventByCode response:', JSON.stringify(response.data, null, 2))
    return response.data
}

/**
 * Execute check-in (or check-out) for the volunteer.
 * POST /api/v1/vol/event-applications/quick-check-in
 */
export const quickCheckIn = async (data: QuickCheckInRequest): Promise<void> => {
    const endpoint = `${API_BASE}/api/v1/vol/event-applications/quick-check-in`
    console.log('[CheckinService] quickCheckIn request:', JSON.stringify(data, null, 2))
    await baseAxios.post(endpoint, data)
}
