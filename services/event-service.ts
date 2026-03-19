/**
 * Event Service - Handles API calls for event-related endpoints
 */

import baseAxios from '@/lib/baseAxios'

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.38:8080'

export interface ActivitySubDomain {
    id: number;
    name: string;
    active: boolean;
}

export interface ActivityDomain {
    name: string;
    specialSessionMaxTime: number;
    active: boolean;
    activitySubDomainList: ActivitySubDomain[];
}

export interface ActivityDomainResponse {
    content: ActivityDomain[];
    page: {
        size: number;
        number: number;
        totalElements: number;
        totalPages: number;
    };
}

export interface EventSimpleResponse {
    orgName: string;
    name: string;
    imageUrl: string;
    address: string;
    startDate: string;       // ISO date e.g. "2025-03-15"
    recruitmentEndDate: string;
}

export interface EventFeedResponse {
    events: EventSimpleResponse[];
    nextCursor: string | null;
    hasMore: boolean;
}

export interface EventFeedParams {
    pageNumber?: number;
    pageSize?: number;
    refresh?: boolean;
    name?: string;
    address?: string;
    startDate?: string;
    endDate?: string;
    activitySubDomainIds?: number[];
}

/**
 * Fetch event new-feeds (public endpoint — uses plain fetch, no auth token)
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

    const url = `${API_BASE}/api/v1/event/new-feeds?${query.toString()}`
    console.log('[EventService] Fetching:', url)

    const response = await fetch(url)

    if (!response.ok) {
        const errorText = await response.text()
        console.error('[EventService] Error:', response.status, errorText)
        throw new Error(`API error ${response.status}: ${errorText}`)
    }

    const data: EventFeedResponse = await response.json()
    console.log('[EventService] Success - events count:', data?.events?.length)
    return data
}

/**
 * Fetch all activity domains across all pages.
 */
export const getAllActivityDomains = async (): Promise<ActivityDomain[]> => {
    const endpoint = `${API_BASE}/api/v1/activity-domain/activity-domains`
    console.log('[EventService] Fetching activity domains:', endpoint)
    console.log('[EventService] Axios baseURL:', baseAxios.defaults.baseURL)

    const firstResponse = await baseAxios.get<ActivityDomainResponse>(
        endpoint,
        {
            params: { page: 0, size: 100 },
        }
    )

    const firstData = firstResponse.data
    let allDomains = [...firstData.content]

    for (let page = 1; page < firstData.page.totalPages; page += 1) {
        const pageResponse = await baseAxios.get<ActivityDomainResponse>(
            endpoint,
            {
                params: { page, size: 100 },
            }
        )
        allDomains = [...allDomains, ...pageResponse.data.content]
    }

    return allDomains
}
