/**
 * public-event-service.ts
 * Public APIs that do NOT require authentication.
 * Uses plain fetch() — no auth token injected.
 */

import baseAxios from '@/lib/baseAxios'
import type {
    ActivityDomain,
    ActivityDomainResponse,
    EventDetailsResponse,
    EventFeedParams,
    EventFeedResponse,
} from './event-types'

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://api.hvh.homes'

/**
 * Fetch event feed (public, no auth).
 * GET /api/v1/events/feeds
 */
export const getEventFeeds = async (params: EventFeedParams = {}): Promise<EventFeedResponse> => {
    const query = new URLSearchParams()
    query.append('pageNumber', String(params.pageNumber ?? 0))
    query.append('pageSize', String(params.pageSize ?? 10))
    query.append('refresh', String(params.refresh ?? false))
    if (params.name) query.append('name', params.name)
    if (params.address) query.append('address', params.address)
    if (params.startDate) query.append('startDate', params.startDate)
    if (params.endDate) query.append('endDate', params.endDate)
    if (params.activitySubDomainIds?.length) {
        params.activitySubDomainIds.forEach(id => query.append('activitySubDomainIds', String(id)))
    }

    const url = `${API_BASE}/api/v1/events/feeds?${query.toString()}`
    const response = await fetch(url)
    if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`API error ${response.status}: ${errorText}`)
    }
    return response.json() as Promise<EventFeedResponse>
}

/**
 * Fetch single event detail (public, no auth).
 * GET /api/v1/events/event-details/{eventId}
 */
export const getEventDetails = async (eventId: string): Promise<EventDetailsResponse> => {
    const url = `${API_BASE}/api/v1/events/event-details/${eventId}`
    const response = await fetch(url)
    if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`API error ${response.status}: ${errorText}`)
    }
    return response.json() as Promise<EventDetailsResponse>
}

/**
 * Fetch all activity domains across all pages (uses auth via baseAxios,
 * but domain data is effectively public reference data).
 * GET /api/v1/activity-domains
 */
export const getAllActivityDomains = async (): Promise<ActivityDomain[]> => {
    const endpoint = `${API_BASE}/api/v1/activity-domains`
    console.log('[PublicEventService] Fetching activity domains:', endpoint)

    const firstResponse = await baseAxios.get<ActivityDomainResponse>(endpoint, {
        params: { page: 0, size: 100 },
    })
    const firstData = firstResponse.data
    let allDomains = [...firstData.content]

    for (let page = 1; page < firstData.page.totalPages; page += 1) {
        const pageResponse = await baseAxios.get<ActivityDomainResponse>(endpoint, {
            params: { page, size: 100 },
        })
        allDomains = [...allDomains, ...pageResponse.data.content]
    }

    return allDomains
}
