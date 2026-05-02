/**
 * api-helpers.ts
 * Shared API utility functions: error message extraction and Supabase URL resolution.
 * Used across all service files and UI components.
 */

import { AxiosError } from 'axios'
import type { ApiErrorMoreInfo, ApiErrorResponse } from './event-types'

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL


const isRecord = (value: unknown): value is Record<string, unknown> => {
    return typeof value === 'object' && value !== null
}

const normalizeApiErrorResponse = (data: unknown): ApiErrorResponse | null => {
    if (!isRecord(data)) return null

    const moreInfoRaw = data.moreInfo
    const moreInfo = isRecord(moreInfoRaw)
        ? Object.entries(moreInfoRaw).reduce<ApiErrorMoreInfo>((acc, [key, value]) => {
            if (typeof value === 'string') acc[key] = value
            return acc
        }, {})
        : undefined

    return {
        code: typeof data.code === 'number' ? data.code : -1,
        message: typeof data.message === 'string' ? data.message : '',
        moreInfo,
    }
}


/**
 * Extracts an array of user-friendly error messages from an API error.
 */
export const extractApiErrorMessages = (error: unknown): string[] => {
    if (error instanceof AxiosError && error.response?.data) {
        const apiError = normalizeApiErrorResponse(error.response.data)
        if (!apiError) return []
        const messages: string[] = []

        if (apiError.moreInfo) {
            const fieldMessages: string[] = []
            Object.entries(apiError.moreInfo).forEach(([key, value]) => {
                if (value && typeof value === 'string' && key !== 'business' && key !== 'auth') {
                    fieldMessages.push(value)
                }
            })
            if (fieldMessages.length > 0) {
                messages.push(...fieldMessages)
            } else {
                if (apiError.moreInfo.business) messages.push(apiError.moreInfo.business)
                if (apiError.moreInfo.auth) messages.push(apiError.moreInfo.auth)
            }
        }

        if (messages.length === 0 && apiError.message) messages.push(apiError.message)
        return messages
    }

    if (error instanceof Error) return [error.message]
    return ['Đã xảy ra lỗi không xác định']
}

/**
 * Returns a single combined error message string.
 */
export const getApiErrorMessage = (error: unknown): string =>
    extractApiErrorMessages(error).join('\n')

/**
 * Returns raw API error payload as a string (for debugging).
 */
export const getApiErrorRawText = (error: unknown): string | undefined => {
    if (!(error instanceof AxiosError)) return undefined
    const data = error.response?.data
    if (data === undefined) return undefined
    if (typeof data === 'string') return data
    try {
        return JSON.stringify(data, null, 4)
    } catch {
        return String(data)
    }
}

/**
 * Resolves a Supabase relative image path to a full public URL.
 */
export const resolveSupabaseUrl = (url: string | null | undefined): string | null => {
    if (!url) return null
    if (url.startsWith('http://') || url.startsWith('https://')) return url
    return SUPABASE_URL + '/storage/v1' + url
}

/**
 * More comprehensive Supabase URL resolver — handles /storage/v1, /object/, and bare paths.
 * Use this when the server may return signed URLs with varying path prefixes.
 */
export const resolveStorageUrl = (url: string | null | undefined): string | null => {
    if (!url) return null
    if (url.startsWith('http://') || url.startsWith('https://')) return url
    if (url.startsWith('/storage/v1')) return `${SUPABASE_URL}${url}`
    if (url.startsWith('/object/')) return `${SUPABASE_URL}/storage/v1${url}`
    return `${SUPABASE_URL}${url}`
}
