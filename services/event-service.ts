/**
 * Event Service - Handles API calls for event-related endpoints
 */

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.38:8080'

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

//Event Detail interfaces 
export interface EventSessionDetailsResponse {
    id: string;
    startDateTime: string;  
    endDateTime: string;
    expectedVolAmount: number;
    expectedSerAmount: number;
}

export interface EventDetailsResponse {
    id: string;
    name: string;
    imageUrls: string[];
    description: string;
    address: string;
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

    const url = `${API_BASE}/api/v1/event/new-feeds?${query.toString()}`

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
    const url = `${API_BASE}/api/v1/event/event-details/${eventId}`
    const response = await fetch(url)
    if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`API error ${response.status}: ${errorText}`)
    }
    const data: EventDetailsResponse = await response.json()
    return data
}
