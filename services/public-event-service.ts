/**
 * public-event-service.ts
 * Public APIs that do NOT require authentication.
 * Uses plain fetch() — no auth token injected.
 */

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
    if (params.lat != null) query.append('lat', String(params.lat))
    if (params.lng != null) query.append('lng', String(params.lng))
    if (params.radiusMeters != null) query.append('radiusMeters', String(params.radiusMeters))

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
 * Fetch all activity domains across all pages (public, no auth).
 * GET /api/v1/activity-domains
 * Backend params: pageNumber (0-based), pageSize
 */
export const getAllActivityDomains = async (): Promise<ActivityDomain[]> => {
    const fetchPage = async (pageNumber: number): Promise<ActivityDomainResponse> => {
        const url = `${API_BASE}/api/v1/activity-domains?pageNumber=${pageNumber}&pageSize=100`
        const response = await fetch(url)
        if (!response.ok) {
            const errorText = await response.text()
            throw new Error(`API error ${response.status}: ${errorText}`)
        }
        return response.json() as Promise<ActivityDomainResponse>
    }

    const firstData = await fetchPage(0)
    let allDomains = [...firstData.content]

    for (let page = 1; page < firstData.page.totalPages; page += 1) {
        const pageData = await fetchPage(page)
        allDomains = [...allDomains, ...pageData.content]
    }

    return allDomains
}
