/**
 * host-event-service.ts
 * Host-facing APIs — all require HOST role authentication.
 * Endpoints: /api/v1/host/... and /api/v1/event/...
 */

import baseAxios from '@/lib/baseAxios'
import type {
    ActualParticipantsResponse,
    AnnounceVolunteersRequest,
    AnnounceVolunteersResponse,
    ApplicationActionResponse,
    EventCreateRequest,
    EventCreateResponse,
    EventDetailResponse,
    MyEventsParams,
    MyEventsResponse,
    RegisteredParticipantsResponse,
    EventUpdateRequest,
    EventUpdateResponse,
    VolunteerReviewRequest,
    VolunteerReviewResponse,
} from './event-types'

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://api.hvh.homes'

/**
 * Save event as draft (first creation or update).
 * POST /api/v1/event/draft
 */
export const saveDraftEvent = async (data: EventCreateRequest): Promise<EventCreateResponse> => {
    const endpoint = `${API_BASE}/api/v1/host/events/draft`
    console.log('[HostEventService] saveDraftEvent body:', JSON.stringify(data, null, 2))
    const response = await baseAxios.post<EventCreateResponse>(endpoint, data)
    return response.data
}

/**
 * Submit event for manager approval.
 * POST /api/v1/event/submit
 */
export const submitEvent = async (data: EventCreateRequest): Promise<EventCreateResponse> => {
    const endpoint = `${API_BASE}/api/v1/host/events/submit`
    console.log('[HostEventService] submitEvent body:', JSON.stringify(data, null, 2))
    const response = await baseAxios.post<EventCreateResponse>(endpoint, data)
    return response.data
}

/**
 * Fetch host's own events with pagination and optional name filter.
 * GET /api/v1/host/events/my-events
 */
export const getMyEvents = async (params: MyEventsParams = {}): Promise<MyEventsResponse> => {
    const query = new URLSearchParams()
    query.append('pageNumber', String(params.pageNumber ?? 0))
    query.append('pageSize', String(params.pageSize ?? 10))
    if (params.name) query.append('name', params.name)
    if (params.status) query.append('status', params.status)

    const endpoint = `${API_BASE}/api/v1/host/events/my-events?${query.toString()}`
    const response = await baseAxios.get<MyEventsResponse>(endpoint)
    console.log('[HostEventService] getMyEvents response:', JSON.stringify(response.data, null, 2))
    return response.data
}

/**
 * Fetch full event detail for the host.
 * GET /api/v1/host/events/event-details/{id}
 */
export const getEventDetailByHost = async (id: string): Promise<EventDetailResponse> => {
    const endpoint = `${API_BASE}/api/v1/host/events/event-details/${id}`
    const response = await baseAxios.get<EventDetailResponse>(endpoint)
    console.log('[HostEventService] getEventDetailByHost:', JSON.stringify(response.data, null, 2))
    return response.data
}

/**
 * Fetch registered (pending/approved) participants for an event session.
 * GET /api/v1/host/event-sessions/{sessionId}/registered-participants
 */
export const getRegisteredParticipants = async (
    sessionId: string,
    pageNumber: number = 0,
    pageSize: number = 10,
): Promise<RegisteredParticipantsResponse> => {
    const endpoint = `${API_BASE}/api/v1/host/event-sessions/${sessionId}/registered-participants`
    const response = await baseAxios.get<RegisteredParticipantsResponse>(endpoint, {
        params: { pageNumber, pageSize },
    })
    console.log('[HostEventService] getRegisteredParticipants:', JSON.stringify(response.data, null, 2))
    return response.data
}

/**
 * Fetch actual (checked-in) participants for an event session.
 * GET /api/v1/host/event-sessions/{sessionId}/actual-participants
 */
export const getActualParticipants = async (
    sessionId: string,
    pageNumber: number = 0,
    pageSize: number = 10,
): Promise<ActualParticipantsResponse> => {
    const endpoint = `${API_BASE}/api/v1/host/event-sessions/${sessionId}/actual-participants`
    const response = await baseAxios.get<ActualParticipantsResponse>(endpoint, {
        params: { pageNumber, pageSize },
    })
    console.log('[HostEventService] getActualParticipants:', JSON.stringify(response.data, null, 2))
    return response.data
}

/**
 * Approve a volunteer application.
 * PUT /api/v1/host/event-applications/{id}/approve
 */
export const approveVolunteerApplication = async (
    applicationId: string,
): Promise<ApplicationActionResponse> => {
    const endpoint = `${API_BASE}/api/v1/host/event-applications/${applicationId}/approve`
    const response = await baseAxios.put<ApplicationActionResponse>(endpoint)
    return response.data
}

/**
 * Reject a volunteer application with a reason.
 * PUT /api/v1/host/event-applications/{id}/reject
 */
export const rejectVolunteerApplication = async (
    applicationId: string,
    reason: string,
): Promise<ApplicationActionResponse> => {
    const endpoint = `${API_BASE}/api/v1/host/event-applications/${applicationId}/reject`
    const response = await baseAxios.put<ApplicationActionResponse>(endpoint, { rejectionReason: reason })
    return response.data
}

/**
 * Cancel an event (host only).
 * PUT /api/v1/host/events/{eventId}/cancel
 */
export const cancelEvent = async (eventId: string, reason: string): Promise<void> => {
    const endpoint = `${API_BASE}/api/v1/host/events/${eventId}/cancel`
    await baseAxios.put(endpoint, { reason })
}

/**
 * Delete an event (host only — only EDITING status is deletable).
 * DELETE /api/v1/host/events/{eventId}
 */
export const deleteEvent = async (eventId: string): Promise<void> => {
    const endpoint = `${API_BASE}/api/v1/host/events/${eventId}`
    await baseAxios.delete(endpoint)
}

/**
 * Update a recruiting event (host only).
 * PUT /api/v1/host/events/{eventId}/update
 */
export const updateEvent = async (eventId: string, body: EventUpdateRequest): Promise<EventUpdateResponse> => {
    const endpoint = `${API_BASE}/api/v1/host/events/${eventId}/update`
    const response = await baseAxios.put<EventUpdateResponse>(endpoint, body)
    return response.data
}

/**
 * Send a push notification to all volunteers registered for an event.
 * POST /api/v1/host/events/{eventId}/announce-volunteers
 */
export const announceVolunteers = async (
    eventId: string,
    body: AnnounceVolunteersRequest,
): Promise<AnnounceVolunteersResponse> => {
    const endpoint = `${API_BASE}/api/v1/host/events/${eventId}/announce-volunteers`
    const response = await baseAxios.post<AnnounceVolunteersResponse>(endpoint, body)
    return response.data
}

/**
 * Submit a host review for a volunteer.
 * POST /api/v1/host/volunteer-reviews
 */
export const reviewVolunteer = async (
    body: VolunteerReviewRequest,
): Promise<VolunteerReviewResponse> => {
    const endpoint = `${API_BASE}/api/v1/host/volunteer-reviews`
    const response = await baseAxios.post<VolunteerReviewResponse>(endpoint, body)
    return response.data
}
