import baseAxios from '@/lib/baseAxios'
import type {
    HostProfileResponse,
    UpdateHostProfileRequest,
    UpdateHostProfileResponse,
    ChangePasswordRequest,
    ChangePasswordResponse,
    VolunteerProfileResponse,
    UpdateVolunteerProfileRequest,
    UpdateVolunteerProfileResponse,
    VolunteerPublicInfo,
    VolunteerReview,
    VolunteerReviewPage,
} from './profile-types'

export type { HostProfileResponse, UpdateHostProfileRequest, UpdateHostProfileResponse, ChangePasswordRequest, ChangePasswordResponse, VolunteerProfileResponse, UpdateVolunteerProfileRequest, UpdateVolunteerProfileResponse, VolunteerPublicInfo, VolunteerReview, VolunteerReviewPage }

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://api.hvh.homes'

/**
 * GET /api/v1/host/hosts/account-information
 */
export const getHostProfile = async (): Promise<HostProfileResponse> => {
    const response = await baseAxios.get<HostProfileResponse>(`${API_BASE}/api/v1/host/hosts/account-information`)
    return response.data
}

/**
 * PUT /api/v1/host/hosts/update-profile
 */
export const updateHostProfile = async (
    body: UpdateHostProfileRequest,
): Promise<UpdateHostProfileResponse> => {
    const response = await baseAxios.put<UpdateHostProfileResponse>(`${API_BASE}/api/v1/host/hosts/update-profile`, body)
    return response.data
}

/**
 * PUT /api/v1/auth/change-password
 */
export const changePassword = async (
    body: ChangePasswordRequest,
): Promise<ChangePasswordResponse> => {
    const response = await baseAxios.put<ChangePasswordResponse>(`${API_BASE}/api/v1/auth/change-password`, body)
    return response.data
}

/**
 * GET /api/v1/vol/volunteers/account-information
 */
export const getVolunteerProfile = async (): Promise<VolunteerProfileResponse> => {
    const response = await baseAxios.get<VolunteerProfileResponse>(`${API_BASE}/api/v1/vol/volunteers/account-information`)
    return response.data
}

/**
 * PUT /api/v1/vol/volunteers/update-profile
 */
export const updateVolunteerProfile = async (
    body: UpdateVolunteerProfileRequest,
): Promise<UpdateVolunteerProfileResponse> => {
    const response = await baseAxios.put<UpdateVolunteerProfileResponse>(`${API_BASE}/api/v1/vol/volunteers/update-profile`, body)
    return response.data
}

/**
 * GET /api/v1/volunteers/public-information/{volunteerId}
 * Public profile viewable by any authenticated user (host, admin, etc.)
 */
export const getVolunteerPublicInfo = async (volunteerId: string): Promise<VolunteerPublicInfo> => {
    const response = await baseAxios.get<VolunteerPublicInfo>(`${API_BASE}/api/v1/volunteers/public-information/${volunteerId}`)
    return response.data
}

/**
 * GET /api/v1/volunteer-reviews/{volunteerId}?pageNumber=0&pageSize=10
 * Returns paginated reviews written by hosts for a specific volunteer.
 */
export const getVolunteerReviews = async (
    volunteerId: string,
    pageNumber = 0,
    pageSize = 5,
): Promise<VolunteerReviewPage> => {
    const response = await baseAxios.get<VolunteerReviewPage>(
        `${API_BASE}/api/v1/volunteer-reviews/${volunteerId}`,
        { params: { pageNumber, pageSize } },
    )
    return response.data
}
