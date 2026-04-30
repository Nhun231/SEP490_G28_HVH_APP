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
