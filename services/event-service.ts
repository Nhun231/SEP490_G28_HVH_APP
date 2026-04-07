/**
 * Event Service - Handles API calls for event-related endpoints
 */

import baseAxios from '@/lib/baseAxios'
import { AxiosError } from 'axios'

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://api.hvh.okne.site'

// ── API Error Response Types ──

export interface ApiErrorMoreInfo {
    business?: string;
    auth?: string;
    [key: string]: string | undefined; // For validation field errors like "otp", "email", etc.
}

export interface ApiErrorResponse {
    code: number;
    message: string;
    moreInfo?: ApiErrorMoreInfo;
}

const isRecord = (value: unknown): value is Record<string, unknown> => {
    return typeof value === 'object' && value !== null;
};

const normalizeApiErrorResponse = (data: unknown): ApiErrorResponse | null => {
    if (!isRecord(data)) return null;

    const moreInfoRaw = data.moreInfo;
    const moreInfo = isRecord(moreInfoRaw)
        ? Object.entries(moreInfoRaw).reduce<ApiErrorMoreInfo>((acc, [key, value]) => {
            if (typeof value === 'string') {
                acc[key] = value;
            }
            return acc;
        }, {})
        : undefined;

    return {
        code: typeof data.code === 'number' ? data.code : -1,
        message: typeof data.message === 'string' ? data.message : '',
        moreInfo,
    };
};

/**
 * Extract user-friendly error messages from API error response.
 * Returns an array of error messages from moreInfo (excluding keys).
 */
export const extractApiErrorMessages = (error: unknown): string[] => {
    if (error instanceof AxiosError && error.response?.data) {
        const apiError = normalizeApiErrorResponse(error.response.data);
        if (!apiError) return [];
        const messages: string[] = [];

        if (apiError.moreInfo) {
            const fieldLevelMessages: string[] = [];
            Object.entries(apiError.moreInfo).forEach(([key, value]) => {
                if (value && typeof value === 'string' && key !== 'business' && key !== 'auth') {
                    fieldLevelMessages.push(value);
                }
            });

            // If there are field-level validation messages, show only those.
            if (fieldLevelMessages.length > 0) {
                messages.push(...fieldLevelMessages);
            } else {
                if (apiError.moreInfo.business) {
                    messages.push(apiError.moreInfo.business);
                }
                if (apiError.moreInfo.auth) {
                    messages.push(apiError.moreInfo.auth);
                }
            }
        }

        // If no messages found in moreInfo, use the main message
        if (messages.length === 0 && apiError.message) {
            messages.push(apiError.message);
        }

        return messages;
    }

    // Fallback for non-Axios errors
    if (error instanceof Error) {
        return [error.message];
    }

    return ['Đã xảy ra lỗi không xác định'];
};

/**
 * Return API error payload as pretty raw text for debugging/demo logs.
 */
export const getApiErrorRawText = (error: unknown): string | undefined => {
    if (!(error instanceof AxiosError)) return undefined;
    const data = error.response?.data;
    if (data === undefined) return undefined;

    if (typeof data === 'string') {
        return data;
    }

    if (isRecord(data)) {
        return JSON.stringify(data, null, 4);
    }

    try {
        return JSON.stringify(data, null, 4);
    } catch {
        return String(data);
    }
};

/**
 * Extract a single combined error message from API error response.
 * Joins all messages with newlines.
 */
export const getApiErrorMessage = (error: unknown): string => {
    return extractApiErrorMessages(error).join('\n');
};

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
//  Feed interfaces
export interface EventSimpleResponse {
    id: string;               // matches BE UUID field
    orgName: string;
    name: string;
    imageUrl: string;
    address: string;
    startDate: string;
    recruitmentEndDate: string;
}

export interface EventFeedResponse {
    events: EventSimpleResponse[];
    nextCursor: string | null;
    hasMore: boolean;
}

// ── My Events Types ──

export type MyEventStatus =
    | 'EDITING'
    | 'SUBMITTED'
    | 'APPROVED_BY_MNG'
    | 'REJECTED_BY_MNG'
    | 'REJECTED_BY_AD'
    | 'RECRUITING'
    | 'UPCOMING'
    | 'ONGOING'
    | 'ENDED'       // Event sessions finished, pending completion review
    | 'COMPLETED'
    | 'CANCELLED';

export interface MyEventItem {
    id: string;
    name: string;
    imageUrl: string | null;
    address: string;
    startDate: string;          // ISO date e.g. "2026-04-10"
    recruitmentEndDate: string; // ISO date e.g. "2026-03-25"
    createdAt: string;          // ISO datetime with timezone
    updatedAt: string;          // ISO datetime with timezone
}

export interface MyEventsResponse {
    content: MyEventItem[];
    // Spring Page<T> serializes pagination at the top level (not nested under 'page')
    totalPages: number;
    totalElements: number;
    number: number;     // current page index (0-based)
    size: number;
    last: boolean;
}

export interface MyEventsParams {
    pageNumber?: number;
    pageSize?: number;
    name?: string;
    /** Single status filter (legacy) */
    status?: MyEventStatus;
    /** Multiple status filter — when provided, appends each as a separate `status` query param */
    statuses?: MyEventStatus[];
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

// ── Event Create/Update Types ──

export type ImageUpdateAction = 'ADD' | 'REMOVE';
export type SessionUpdateAction = 'ADD' | 'EDIT' | 'REMOVE';

export interface UpdateImage {
    imageId?: string | null;
    updateAction: ImageUpdateAction;
    fileExtension?: string; // Required if updateAction is ADD (e.g., '.jpg', '.jpeg', '.png')
}

export interface EventSession {
    eventSessionId?: string | null;
    updateAction: SessionUpdateAction;
    startDateTime: string; // ISO 8601 format with timezone (e.g., "2026-04-01T05:30:00+07:00")
    endDateTime: string;   // ISO 8601 format with timezone
}

// ── Event Detail interfaces ──
export interface EventSessionDetailsResponse {
    id: string;
    startDateTime: string;
    endDateTime: string;
    expectedVolAmount: number;
    expectedSerAmount: number;
    // approvedApplicationCount: number; // TODO: enable when BE adds to response
}

export interface EventCreateRequest {
    eventId?: string;              // Optional for first creation, UUID if updating
    name: string;
    updateImages: UpdateImage[];
    description: string;
    address: string;
    autoApprove: boolean;
    activitySubDomainId: number;
    servedTarget: string;          // e.g., "WOMEN", "CHILDREN", etc.
    servingPlaceType: string;      // e.g., "SCHOOL", "HOSPITAL", etc.
    recruitmentEndDate: string;    // Format: "YYYY-MM-DD"
    eventSessions: EventSession[];
    checkInPlaceLat: number;
    checkInPlaceLng: number;
    checkInPlaceAccuracyMeters: number;
}

export interface EventCreateResponse {
    eventId: string;
    imageUploadUrls?: Array<{
        imageId: string;
        uploadUrl: string;
    }>;
}

/**
 * Fetch event new-feeds (public endpoint — uses plain fetch, no auth token)
 */
export interface EventDetailsResponse {
    id: string;
    name: string;
    imageUrls: string[];
    description: string;
    address: string;
    detailAddress?: string | null;
    activitySubDomain: string;
    servedTarget: string;
    servingPlaceType: string;
    startDate: string;
    recruitmentEndDate: string;
    latCheckInLocation: number;
    lngCheckInLocation: number;
    checkInAccuracyMeters: number;
    hostPhone: string;
    orgName: string;
    eventSessions: EventSessionDetailsResponse[];
}

//  Vietnamese label maps for enums
export const SERVED_TARGET_LABELS: Record<string, string> = {
    WOMEN: 'Phụ nữ',
    CHILDREN: 'Trẻ em',
    ADOLESCENTS: 'Thanh thiếu niên',
    ADULTS: 'Trung niên',
    ELDERLY: 'Người cao tuổi',
    PEOPLE_WITH_DISABILITIES: 'Người tàn tật',
    VULNERABLE_GROUPS: 'Người yếu thế',
    UNSPECIFIED: 'Tất cả lứa tuổi',
};

export const SERVING_PLACE_LABELS: Record<string, string> = {
    SCHOOL: 'Trường học',
    REMOTE_AREA: 'Vùng sâu vùng xa',
    PARK_OR_SQUARE: 'Nơi công cộng',
    HOSPITAL: 'Bệnh viện',
    TRANSPORT_STATION: 'Trạm giao thông',
    MUSEUM: 'Bảo tàng',
    NURSING_HOME: 'Viện dưỡng lão',
    TOURIST_AREA: 'Khu du lịch',
    WATER_BODY: 'Sông ngòi',
    SPORTS_AREA: 'Khu thể thao',
    CEMETERY: 'Nghĩa trang',
    OTHER: 'Khác',
};

// Fetch event feeds
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

    const data: EventFeedResponse = await response.json()
    return data
}

// Fetch single event detail (public — no auth required)
export const getEventDetails = async (eventId: string): Promise<EventDetailsResponse> => {
    const url = `${API_BASE}/api/v1/events/event-details/${eventId}`
    const response = await fetch(url)
    if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`API error ${response.status}: ${errorText}`)
    }
    const data: EventDetailsResponse = await response.json()
    return data
}
/**
 * 
 * Save favourite events
 */
export const saveEventForVolunteer = async (eventId: string): Promise<void> => {
    const endpoint = `${API_BASE}/api/v1//vol/events/save-event`
    await baseAxios.post(endpoint, { eventId })
}

/**
 * Fetch all activity domains across all pages.
 */
export const getAllActivityDomains = async (): Promise<ActivityDomain[]> => {
    const endpoint = `${API_BASE}/api/v1/activity-domain/activity-domains`
    console.log('[EventService] Fetching activity domains:', endpoint)

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

/**
 * Save event as draft
 * POST /api/v1/event/draft
 */
export const saveDraftEvent = async (data: EventCreateRequest): Promise<EventCreateResponse> => {
    const endpoint = `${API_BASE}/api/v1/event/draft`
    console.log('[EventService] Request body:', JSON.stringify(data, null, 2))

    const response = await baseAxios.post<EventCreateResponse>(endpoint, data)
    return response.data
}

/**
 * Submit event for approval
 * POST /api/v1/event/submit
 */
export const submitEvent = async (data: EventCreateRequest): Promise<EventCreateResponse> => {
    const endpoint = `${API_BASE}/api/v1/event/submit`
    console.log('[EventService] Request body:', JSON.stringify(data, null, 2))

    const response = await baseAxios.post<EventCreateResponse>(endpoint, data)
    return response.data
}

/**
 * Apply for a volunteer event session
 * POST /api/v1//vol/event-sessions/{sessionId}/apply
 */
export const applyEventSession = async (sessionId: string): Promise<void> => {
    const endpoint = `${API_BASE}/api/v1/vol/event-sessions/${sessionId}/apply`
    await baseAxios.post(endpoint)
}

/**
 * Fetch host's events with pagination and filters
 * GET /api/v1/host/event/my-events
 */
export const getMyEvents = async (params: MyEventsParams = {}): Promise<MyEventsResponse> => {
    const endpoint = `${API_BASE}/api/v1/host/event/my-events`

    // Build URLSearchParams to support multiple `status` values
    const query = new URLSearchParams()
    query.append('pageNumber', String(params.pageNumber ?? 0))
    query.append('pageSize', String(params.pageSize ?? 10))
    if (params.name) query.append('name', params.name)

    if (params.statuses && params.statuses.length > 0) {
        // Append each status separately so server receives: ?status=X&status=Y
        params.statuses.forEach(s => query.append('status', s))
    } else if (params.status) {
        query.append('status', params.status)
    }

    const url = `${endpoint}?${query.toString()}`
    console.log('[EventService] Fetching my events:', url)

    const response = await baseAxios.get<MyEventsResponse>(url)

    console.log('[EventService] My events fetched:', response.data.content.length, 'events')
    return response.data
}

// ── Volunteer Application Status Types ──

export type EventApplicationStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface VolApplicationSession {
    id: string;                    // session UUID
    startDateTime: string;         // ISO OffsetDateTime e.g. "2026-04-10T08:00:00+07:00"
    endDateTime: string;           // ISO OffsetDateTime
    expectedVolAmount: number;
    expectedSerAmount: number;
    approvedApplicationCount: number;
}

export interface VolApplicationItem {
    id: string;                    // application UUID
    eventId: string;               // event UUID — used for navigation to event-detail
    name: string;                  // event name
    imageUrl: string | null;
    address: string | null;        // district/city level address
    detailAddress: string | null;  // street-level detail address
    startDate: string;             // ISO date e.g. "2026-04-10"
    status: EventApplicationStatus;
    session: VolApplicationSession | null; // the session the volunteer applied to
}

export interface VolApplicationsResponse {
    content: VolApplicationItem[];
    // Spring Page<T> serializes pagination at the top level (not nested under 'page')
    totalPages: number;
    totalElements: number;
    number: number;     // current page index (0-based)
    size: number;
    last: boolean;
}

export interface VolApplicationsParams {
    pageNumber?: number;
    pageSize?: number;
    /** Filter by application status. When null/undefined, backend returns PENDING by default. */
    status?: EventApplicationStatus | null;
}

/**
 * Fetch the current volunteer's event applications, filtered by status.
 * GET /api/v1/vol/event-applications
 * Requires VOL role (auth token sent via baseAxios).
 */
export const getVolApplications = async (
    params: VolApplicationsParams = {}
): Promise<VolApplicationsResponse> => {
    const query = new URLSearchParams()
    query.append('pageNumber', String(params.pageNumber ?? 0))
    query.append('pageSize', String(params.pageSize ?? 10))
    // Always send the 'status' param — the controller requires it (@RequestParam with no required=false).
    // The service handles null/blank as "no filter" and returns all statuses.
    query.append('status', params.status ?? '')

    const url = `${API_BASE}/api/v1/vol/event-applications?${query.toString()}`
    console.log('[EventService] Fetching vol applications:', url)

    const response = await baseAxios.get<VolApplicationsResponse>(url)
    console.log('[EventService] Vol applications fetched:', response.data.content.length)
    return response.data
}

/**
 * Cancel a volunteer's own event application.
 * PUT /api/v1/vol/event-applications/{id}/cancel
 * Requires VOL role. Only PENDING or APPROVED applications before the session date can be cancelled.
 */
export const cancelVolApplication = async (applicationId: string): Promise<void> => {
    const url = `${API_BASE}/api/v1/vol/event-applications/${applicationId}/cancel`
    console.log('[EventService] Cancelling application:', applicationId)
    await baseAxios.put(url)
}
