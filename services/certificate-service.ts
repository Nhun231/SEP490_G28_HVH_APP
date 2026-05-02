/**
 * certificate-service.ts
 * Volunteer-facing certificate APIs — requires VOL role authentication.
 * Endpoints: /api/v1/vol/certificates
 */

import baseAxios from '@/lib/baseAxios'

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://api.hvh.homes'

// ── Types ──────────────────────────────────────────────────────────────────────

export interface VolunteerCertificate {
    /** Name of the event the certificate is for */
    eventName: string
    /** Organization that issued the certificate */
    organizationName: string
    /** Unique certificate code (used for QR / verification) */
    certCode: string
    /** Supabase signed URL to the PDF/image file */
    certSignedUrl: string | null
    /** ISO-8601 timestamp of when the certificate was issued */
    issuedAt: string
}

export interface CertificatesParams {
    pageNumber?: number
    pageSize?: number
    eventName?: string
}

export interface CertificatesResponse {
    content: VolunteerCertificate[]
    page: {
        size: number
        number: number
        totalElements: number
        totalPages: number
    }
}

// ── API calls ──────────────────────────────────────────────────────────────────

/**
 * Fetch the current volunteer's certificates, with optional event-name search.
 * GET /api/v1/vol/certificates
 * Requires VOL role.
 */
export const getVolunteerCertificates = async (
    params: CertificatesParams = {}
): Promise<CertificatesResponse> => {
    const query = new URLSearchParams()
    query.append('pageNumber', String(params.pageNumber ?? 0))
    query.append('pageSize', String(params.pageSize ?? 10))
    if (params.eventName) query.append('eventName', params.eventName)

    const url = `${API_BASE}/api/v1/vol/certificates?${query.toString()}`
    const response = await baseAxios.get<CertificatesResponse>(url)
    return response.data
}
