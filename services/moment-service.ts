/**
 * moment-service.ts
 */

import baseAxios from '@/lib/baseAxios'
import type { MomentFeedResponse, ShareMomentApiResponse, ShareMomentParams } from './event-types'

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://api.hvh.homes'

/**
 * Submit a new moment for a session.
 * `momentPictures` must be a space-separated list of file extensions, e.g. "jpg png jpg".
 * The BE caps the list at 5 entries; the service enforces the same limit here.
 * Returns a list of Supabase signed upload URLs — one per picture, in order.
 */
export const shareMoment = async (payload: {
    eventSessionId: string
    momentContent: string
    momentPictures: string // space-separated extensions e.g. "jpg jpg png"
}): Promise<ShareMomentApiResponse> => {
    const url = `${API_BASE}/api/v1/vol/event-moments`
    const response = await baseAxios.post<ShareMomentApiResponse>(url, payload)
    return response.data
}

/**
 * Fetch the public moments feed (all events, no auth required).
 * GET /api/v1/event-moments/feed
 * `eventName` is an optional partial-name search filter.
 */
export const getEventMomentsFeed = async (
    params: ShareMomentParams = {}
): Promise<MomentFeedResponse> => {
    const query = new URLSearchParams()
    query.append('pageNumber', String(params.pageNumber ?? 0))
    query.append('pageSize', String(params.pageSize ?? 10))
    if (params.eventName) query.append('eventName', params.eventName)

    const url = `${API_BASE}/api/v1/event-moments/feed?${query.toString()}`
    const response = await baseAxios.get<MomentFeedResponse>(url)
    return response.data
}

/**
 * Fetch the current volunteer's own moments (auth: VOL).
 * GET /api/v1/vol/event-moments/my-moments
 *
 * NOTE: BE returns a Spring Page<EventMomentFeedDetailsResponse>:
 *   { content: [...], last: boolean, totalElements, totalPages, ... }
 * This is mapped to the MomentFeedResponse shape used by the feed screen.
 */
export const getMyMomentsFeed = async (
    params: ShareMomentParams = {}
): Promise<MomentFeedResponse> => {
    const query = new URLSearchParams()
    query.append('pageNumber', String(params.pageNumber ?? 0))
    query.append('pageSize', String(params.pageSize ?? 10))
    if (params.eventName) query.append('eventName', params.eventName)

    const url = `${API_BASE}/api/v1/vol/event-moments/my-moments?${query.toString()}`
    const response = await baseAxios.get<{
        content: MomentFeedResponse['eventMoments']
        last: boolean
        totalElements: number
        totalPages: number
    }>(url)

    const page = response.data
    return {
        eventMoments: page.content ?? [],
        hasMore: !page.last,
        nextCursor: null,
    }
}
