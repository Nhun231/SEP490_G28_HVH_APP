/**
 * event-types.ts
 * Shared TypeScript interfaces and type aliases for the event domain.
 * Imported by service files and UI components — no runtime logic here.
 */

// ── API Error ─────────────────────────────────────────────────────────────────

export interface ApiErrorMoreInfo {
    business?: string;
    auth?: string;
    [key: string]: string | undefined;
}

export interface ApiErrorResponse {
    code: number;
    message: string;
    moreInfo?: ApiErrorMoreInfo;
}

// ── Activity Domains ──────────────────────────────────────────────────────────

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

// ── Public Event Feed ─────────────────────────────────────────────────────────

export interface EventSimpleResponse {
    id: string;
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

// ── Shared Session / Detail ───────────────────────────────────────────────────

/** Shared: used by both public event-detail and host event management */
export interface EventSessionDetailsResponse {
    id: string;
    startDateTime: string;
    endDateTime: string;
    expectedVolAmount: number;
    expectedSerAmount: number;
    checkInCode?: string;
    approvedApplicationCount?: number;
}

/** Public event detail (volunteer-facing, no auth required) */
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
    autoApprove?: boolean;
}

// ── Vietnamese Label Maps ─────────────────────────────────────────────────────

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

// ── Host — Event Status & Basic Items ────────────────────────────────────────

export type MyEventStatus =
    | 'EDITING'
    | 'SUBMITTED'
    | 'APPROVED_BY_MNG'
    | 'REJECTED_BY_MNG'
    | 'REJECTED_BY_AD'
    | 'RECRUITING'
    | 'UPCOMING'
    | 'ONGOING'
    | 'ENDED'
    | 'COMPLETED'
    | 'CANCELLED';

export interface MyEventItem {
    id: string;
    name: string;
    imageUrl: string | null;
    address: string;
    startDate: string;
    recruitmentEndDate: string;
    createdAt: string;
    updatedAt: string;
}

export interface MyEventsResponse {
    content: MyEventItem[];
    page: {
        size: number;
        number: number;
        totalElements: number;
        totalPages: number;
    };
}

export interface MyEventsParams {
    pageNumber?: number;
    pageSize?: number;
    name?: string;
    status?: MyEventStatus;
    statuses?: MyEventStatus[];
}

// ── Host — Event Create / Update ──────────────────────────────────────────────

export type ImageUpdateAction = 'ADD' | 'REMOVE';
export type SessionUpdateAction = 'ADD' | 'EDIT' | 'REMOVE';

export interface UpdateImage {
    imageId?: string | null;
    updateAction: ImageUpdateAction;
    fileExtension?: string;
}

export interface EventSession {
    eventSessionId?: string | null;
    updateAction: SessionUpdateAction;
    startDateTime: string;
    endDateTime: string;
    expectedVolAmount: number;
    expectedSerAmount: number;
}

export interface EventCreateRequest {
    eventId?: string;
    name: string;
    updateImages: UpdateImage[];
    description: string;
    address: string;
    detailAddress: string;
    autoApprove: boolean;
    servingActivity: boolean;
    activitySubDomainId: number;
    servedTarget: string;
    servingPlaceType: string;
    recruitmentEndDate: string;
    eventSessions: EventSession[];
    checkInPlaceLat: number;
    checkInPlaceLng: number;
    checkInPlaceAccuracyMeters: number;
}

export interface EventCreateResponse {
    eventId: string;
    uploadUrls?: string[];
}

/** Full event detail as seen by the host (requires auth) */
export interface EventDetailResponse {
    id: string;
    name: string;
    status: MyEventStatus;
    imageUrls: string[];
    address: string;
    detailAddress: string;
    checkInCode: string | null;
    totalVolunteers: number;
    totalServed: number;
    servedTarget: string;
    servingPlaceType: string;
    description: string;
    recruitmentEndDate: string;
    eventSessions: EventSessionDetailsResponse[];
    latCheckInLocation: number;
    lngCheckInLocation: number;
    checkInAccuracyMeters: number;
    autoApprove: boolean;
    servingActivity: boolean;
    activitySubDomain: string;
    note?: string | null;
}

// ── Host — Participants ───────────────────────────────────────────────────────

export interface RegisteredParticipant {
    applicationId: string;
    volunteerId: string;
    email: string;
    phone: string;
    nickName: string | null;
    name: string;
    avatarUrl: string | null;
    address: string | null;
    creditScore: number;
    honorScore: number;
    createdAt: string;
}

export interface RegisteredParticipantsResponse {
    registeredParticipants: RegisteredParticipant[];
    nextCursor: string | null;
    hasMore: boolean;
}

export interface ActualParticipant {
    volunteerId: string;
    fullName: string;
    nickName: string | null;
    email: string | null;
    phone: string | null;
    bio: string | null;
    avatarUrl: string | null;
    address: string | null;
    creditScore: number;
    honorScore: number;
    avgRating: number;
    eventApplicationId: string;
    checkInTime: string | null;
    checkOutTime: string | null;
    status?: string | null;
    reviewed?: boolean | null;
}



export interface ActualParticipantsResponse {
    content: ActualParticipant[];
    page: {
        size: number;
        number: number;
        totalElements: number;
        totalPages: number;
    };
}

export interface ApplicationActionResponse {
    success: boolean;
    message?: string;
}

// ── Volunteer — Application Status ───────────────────────────────────────────

export type EventApplicationStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'COMPLETED';

export interface VolApplicationSession {
    id: string;
    startDateTime: string;
    endDateTime: string;
    expectedVolAmount: number;
    expectedSerAmount: number;
    approvedApplicationCount: number;
}

export interface VolApplicationItem {
    id: string;
    eventId: string;
    name: string;
    imageUrl: string | null;
    address: string | null;
    detailAddress: string | null;
    startDate: string;
    status: EventApplicationStatus;
    session: VolApplicationSession | null;
    rated?: boolean;
    claimed?: boolean;
    honorHour?: number | null;
}

export interface VolApplicationsResponse {
    content: VolApplicationItem[];
    totalPages: number;
    totalElements: number;
    number: number;
    size: number;
    last: boolean;
}

export interface VolApplicationsParams {
    pageNumber?: number;
    pageSize?: number;
    status?: EventApplicationStatus | null;
}

// ── Alias for backward compat (EventSessionDetailsResponse was also exported
//    as EventSessionResponse in some imports) ──────────────────────────────────
export type EventSessionResponse = EventSessionDetailsResponse;

export interface EventUpdateRequest {
    updateImages?: UpdateImage[];
    description?: string;
    autoApprove?: boolean;
    servingPlaceType?: string;
    address?: string;
    detailAddress?: string;
    recruitmentEndDate?: string;
    eventSessions?: EventSession[];
    checkInLocationLat?: number;
    checkInLocationLng?: number;
    checkInLocationAccuracyMeters?: number;
}

export interface EventUpdateResponse {
    eventId: string;
    uploadUrls?: Array<string>;
}

// ── Host — Announce Volunteers ────────────────────────────────────────────────

export interface AnnounceVolunteersRequest {
    title: string;
    body: string;
}

export interface AnnounceVolunteersResponse {
    success: boolean;
    message?: string;
}

// ── Host — Volunteer Review ───────────────────────────────────────────────────

export interface VolunteerReviewRequest {
    eventApplicationId: string;
    professionalAttitudeRating: number;
    responsibilityPunctualityRating: number;
    workEffectivenessRating: number;
    teamworkCommunicationRating: number;
    adaptabilityProblemSolvingRating: number;
    comment?: string;
}

export interface VolunteerReviewResponse {
    success: boolean;
    message?: string;
}

// ── Volunteer — Saved Events ──────────────────────────────────────────────────

export interface SavedEventsParams {
    pageNumber?: number;
    pageSize?: number;
    name?: string;
}

export interface SavedEventsResponse {
    content: EventSimpleResponse[];
    page: {
        size: number;
        number: number;
        totalElements: number;
        totalPages: number;
    };
}

// ── Volunteer — Claim Event Hours ────────────────────────────────────────────

export interface ClaimEventHourRequest {
    eventSessionId: string;
    honorHours: number;
    reason: string;
    detailReason: string;
    evidences: string;
}

export interface ClaimEventHourResponse {
    evidencesUploadUrls: string[];
}

// ── Volunteer — Event Moments ─────────────────────────────────────────────────

export interface EventMomentItem {
    volunteerId: string | null;
    volNickName: string | null;
    volName: string | null;
    avatarUrl: string | null;
    eventId: string;
    eventName: string;
    eventAddress: string | null;
    eventDetailAddress: string | null;
    eventMomentId: string;
    momentContent: string;
    momentPicturesUrls: string[];
    createdAt: string; // ISO-8601
}

export interface MomentFeedResponse {
    eventMoments: EventMomentItem[];
    nextCursor: string | null;
    hasMore: boolean;
}

export interface ShareMomentApiResponse {
    momentPicturesUploadUrls: string[];
}

export interface ShareMomentParams {
    pageNumber?: number;
    pageSize?: number;
    eventName?: string;
}

// ── Event Claims (Honor-hour requests) ────────────────────────────────────────

export interface ClaimItem {
    id: string;
    volunteerId: string;
    nickName: string | null;
    name: string;
    avatarUrl: string | null;
    creditScore: number;
    honorScore: number;
    honorHours: number;
    reason: string;
    createdAt: string; // ISO-8601
}

export interface ClaimPage {
    content: ClaimItem[];
    page: {
        size: number;
        number: number;
        totalElements: number;
        totalPages: number;
    };
}

export interface ClaimDetail {
    id: string;
    sessionId: string;
    volunteerId: string;
    email: string | null;
    phone: string | null;
    nickName: string | null;
    name: string;
    avatarUrl: string | null;
    address: string | null;
    creditScore: number;
    honorScore: number;
    honorHours: number;
    reason: string;
    detailReason: string;
    evidencesUrls: string[];
    createdAt: string;
}
