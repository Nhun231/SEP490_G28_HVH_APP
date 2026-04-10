import axios from 'axios'
import baseAxios from '@/lib/baseAxios'
import { uploadImageToSupabase } from './upload-service'

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || ''

/**
 * Supabase signed upload URL API returns a relative path like
 * "/object/upload/sign/...?token=..."
 * This helper ensures we always have a full absolute URL.
 */
const resolveSupabaseUrl = (url: string): string => {
    if (url.startsWith('http://') || url.startsWith('https://')) return url
    // Supabase returns a relative path like /object/upload/sign/...
    // The real storage endpoint requires /storage/v1 prefix
    return SUPABASE_URL + '/storage/v1' + url
}



// ==================== Request/Response Types ====================

export interface SendOtpParams {
    email: string
}

export interface RegisterVolunteerParams {
    otp: string
    email: string
    phone: string
    cid: string
    fullName: string
    cidFrontFileExtension: string
    cidBackFileExtension: string
    cidHoldingFileExtension: string
}

export interface RegisterVolunteerResponse {
    cidFrontUploadUrl: string
    cidBackUploadUrl: string
    cidHoldingUploadUr: string
}

export interface DocumentFile {
    uri: string
    fileName: string
    mimeType?: string
}

export interface UploadProgressCallback {
    (fileType: 'front' | 'back' | 'holding', progress: number): void
}

// ==================== API Service Functions ====================

/**
 * Request OTP to be sent to the user's email
 * @param email - User's email address
 * @throws Error if the request fails
 */
const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://api.hvh.okne.site'

// A plain axios instance with NO auth interceptors — for public (unauthenticated) endpoints
const publicAxios = axios.create({
    baseURL: API_BASE,
    headers: { 'Content-Type': 'application/json' },
})

export const sendOtp = async ({ email }: SendOtpParams): Promise<void> => {
    try {
        await publicAxios.post(
            `/api/v1/email-otp/verify-register-vol-acc`,
            null,
            { params: { email } }
        )
    } catch (error) {
        console.log('[sendOtp] error:', error)
        if (axios.isAxiosError(error)) {
            const data = error.response?.data
            const msg =
                data?.moreInfo?.business ||
                data?.moreInfo?.auth ||
                data?.message ||
                `Không thể gửi OTP đến ${email}`
            throw new Error(msg)
        }
        throw new Error(`Không thể gửi OTP đến ${email}`)
    }
}

export const registerVolunteerAccount = async (
    params: RegisterVolunteerParams
): Promise<RegisterVolunteerResponse> => {
    try {
        const response = await publicAxios.post<RegisterVolunteerResponse>(
            `/api/v1/volunteers/register-vol-acc`,
            params
        )
        return response.data
    } catch (error) {
        if (axios.isAxiosError(error)) {
            const data = error.response?.data
            const msg =
                data?.moreInfo?.business ||
                data?.moreInfo?.auth ||
                data?.message ||
                'Đăng ký thất bại'
            throw new Error(msg)
        }
        throw new Error('Đăng ký thất bại')
    }
}

export const completeRegistration = async (
    registrationData: RegisterVolunteerParams,
    documents: {
        front: DocumentFile
        back: DocumentFile
        holding: DocumentFile
    },
    onProgress?: UploadProgressCallback
): Promise<void> => {
    try {
        console.log("Submit registration and get upload URLs")
        // Step 1: Submit registration and get upload URLs
        const uploadUrls = await registerVolunteerAccount(registrationData)

        // Step 2: Upload images to Supabase using signed URLs
        // resolveSupabaseUrl handles the case where BE returns a relative path
        const uploadPromises = [
            // Upload front ID card
            uploadImageToSupabase(
                resolveSupabaseUrl(uploadUrls.cidFrontUploadUrl),
                {
                    uri: documents.front.uri,
                    mimeType: documents.front.mimeType || 'image/jpeg',
                },
                {
                    onProgress: (progress) => {
                        onProgress?.('front', progress.percentage)
                    },
                }
            ),
            // Upload back ID card
            uploadImageToSupabase(
                resolveSupabaseUrl(uploadUrls.cidBackUploadUrl),
                {
                    uri: documents.back.uri,
                    mimeType: documents.back.mimeType || 'image/jpeg',
                },
                {
                    onProgress: (progress) => {
                        onProgress?.('back', progress.percentage)
                    },
                }
            ),
            // Upload selfie with ID card
            uploadImageToSupabase(
                resolveSupabaseUrl(uploadUrls.cidHoldingUploadUr),
                {
                    uri: documents.holding.uri,
                    mimeType: documents.holding.mimeType || 'image/jpeg',
                },
                {
                    onProgress: (progress) => {
                        onProgress?.('holding', progress.percentage)
                    },
                }
            ),
        ]

        // Wait for all uploads to complete
        await Promise.all(uploadPromises)
    } catch (error) {
        if (error instanceof Error) {
            throw error
        }
        throw new Error('Registration process failed')
    }
}
