/**
 * profile-types.ts
 * Shared profile interfaces for host account information.
 */

/** Response of GET /api/v1/host/hosts/account-information */
export interface HostProfileResponse {
    id: string;
    cid: string | null;
    email: string;
    phone: string | null;
    fullName: string;
    gender: boolean | null;
    dob: string | null;
    avatarUrl: string | null;
    address: string | null;
    detailAddress: string | null;
}

/**
 * PUT /api/v1/host/hosts/update-profile
 */
export interface UpdateHostProfileRequest {
    fullName: string;
    gender: boolean;
    dob: string;
    avatarExtension: string | null;
    address: string;
    detailAddress: string;
}

/** Response of PUT /api/v1/host/hosts/update-profile */
export interface UpdateHostProfileResponse extends HostProfileResponse {
    avatarUploadUrl?: string | null;
}

/** PUT /api/v1/auth/change-password */
export interface ChangePasswordRequest {
    oldPassword: string;
    newPassword: string;
}

/** Response of PUT /api/v1/auth/change-password */
export interface ChangePasswordResponse {
    message?: string;
}

/** Response of GET /api/v1/vol/volunteers/account-information */
export interface VolunteerProfileResponse {
    id: string;
    vid: string;
    cid: string | null;
    email: string;
    phone: string | null;
    nickname: string | null;
    fullName: string;
    bio: string | null;
    gender: boolean | null;
    dob: string | null;
    avatarUrl: string | null;
    address: string | null;
    detailAddress: string | null;
    employStatus: string | null;
    workAddress: string | null;
    educationLevel: string | null;
    sid: string | null;
    creditScore: number;
    honorScore: number;
    avgRating: number;
    activityCount: number;
}

/** PUT /api/v1/vol/volunteers/update-profile */
export interface UpdateVolunteerProfileRequest {
    nickName: string;
    fullName: string;
    bio: string;
    gender: boolean;
    dob: string;
    avatarExtension: string | null;
    address: string;
    detailAddress: string;
    employStatus: string;
    workAddress: string;
    educationLevel: string;
    sid: string;
}

/** Response of PUT /api/v1/vol/volunteers/update-profile */
export interface UpdateVolunteerProfileResponse extends VolunteerProfileResponse {
    avatarUploadUrl?: string | null;
}

/** Response of GET /api/v1/volunteers/public-information/{volunteerId} */
export interface VolunteerPublicInfo {
    vid: string;
    fullName: string;
    nickname: string | null;
    bio: string | null;
    dob: string | null;
    avatarUrl: string | null;
    creditScore: number;
    avgRating: number | null;
    activityCount: number;
    certificatesUrls: string[];
}

/** One review record from GET /api/v1/volunteer-reviews/{volunteerId} */
export interface VolunteerReview {
    id: string;
    eventName: string;
    sessionStartDateTime: string;   // ISO-8601
    sessionEndDateTime: string;     // ISO-8601
    professionalAttitudeRating: number;
    responsibilityPunctualityRating: number;
    workEffectivenessRating: number;
    teamworkCommunicationRating: number;
    adaptabilityProblemSolvingRating: number;
    avgRating: number;
    comment: string | null;
}

/** Paginated response of GET /api/v1/volunteer-reviews/{volunteerId} */
export interface VolunteerReviewPage {
    content: VolunteerReview[];
    page: {
        size: number;
        number: number;
        totalElements: number;
        totalPages: number;
    };
}
