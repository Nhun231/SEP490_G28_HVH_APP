import baseAxios from '@/lib/baseAxios'
import type {
    HostProfileResponse,
    UpdateHostProfileRequest,
    UpdateHostProfileResponse,
    ChangePasswordRequest,
    ChangePasswordResponse,
} from './profile-types'

export type { HostProfileResponse, UpdateHostProfileRequest, UpdateHostProfileResponse, ChangePasswordRequest, ChangePasswordResponse }

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
