/**
 * vol-event-service.ts
 * Volunteer-facing APIs — all require VOL role authentication.
 * Endpoints: /api/v1/vol/...
 */

import baseAxios from '@/lib/baseAxios'
import type {
    VolApplicationsParams,
    VolApplicationsResponse,
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
    console.log('[VolEventService] Fetching vol applications:', url)

    const response = await baseAxios.get<VolApplicationsResponse>(url)
    console.log('[VolEventService] Vol applications fetched:', response.data.content.length)
    return response.data
}

/**
 * Cancel the current volunteer's own event application.
 * PUT /api/v1/vol/event-applications/{id}/cancel
 * Only PENDING or APPROVED applications before the session date can be cancelled.
 */
export const cancelVolApplication = async (applicationId: string): Promise<void> => {
    const url = `${API_BASE}/api/v1/vol/event-applications/${applicationId}/cancel`
    console.log('[VolEventService] Cancelling application:', applicationId)
    await baseAxios.put(url)
}
