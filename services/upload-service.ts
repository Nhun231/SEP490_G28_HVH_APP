/**
 * Upload Service - Handles file uploads to Supabase storage using signed URLs
 * Uses the official Supabase JS client for React Native compatibility.
 */

import { supabase } from '@/lib/supabase'

export interface UploadProgress {
    loaded: number
    total: number
    percentage: number
}

export interface UploadOptions {
    // Kept for API compatibility; progress not supported natively by uploadToSignedUrl
    onProgress?: (progress: UploadProgress) => void
}

/**
 * Upload an image file to Supabase using a signed upload URL.
 * Uses supabase.storage.uploadToSignedUrl() which works correctly on React Native.
 *
 * @param signedUrl - The full signed URL returned by the backend
 * @param file      - The file object with uri and mimeType
 */
export const uploadImageToSupabase = async (
    signedUrl: string,
    file: { uri: string; mimeType: string },
    _options?: UploadOptions
): Promise<void> => {
    // Parse bucket, path, and token from the signed URL
    // e.g. https://xxx.supabase.co/storage/v1/object/upload/sign/my-bucket/folder/file.jpg?token=TOKEN
    const urlObj = new URL(signedUrl)
    const token = urlObj.searchParams.get('token')
    const bucketAndPath = urlObj.pathname.match(/\/object\/upload\/sign\/([^/]+)\/(.+)/)

    if (!token || !bucketAndPath) {
        throw new Error(`Invalid signed URL format: ${signedUrl}`)
    }

    const bucket = bucketAndPath[1]   // e.g. "file-store"
    const path = bucketAndPath[2]     // e.g. "identity-verification/uuid/cid-front.jpg"

    // Fetch the local file as a blob
    const localResponse = await fetch(file.uri)
    const blob = await localResponse.blob()

    const { error } = await supabase.storage
        .from(bucket)
        .uploadToSignedUrl(path, token, blob, {
            contentType: file.mimeType,
        })

    if (error) {
        throw new Error(`Upload failed: ${error.message}`)
    }
}



/**
 * Extract file extension from a URI or filename
 * @param uri - File URI or filename
 * @returns File extension with dot (e.g., '.jpg', '.png')
 */
export const getFileExtension = (uri: string, mimeType?: string | null): string => {
    const fileName = uri.split('/').pop() || ''
    const extension = fileName.toLowerCase().match(/\.(jpg|jpeg|png)$/)?.[0]

    if (extension) return extension

    // Fallback: derive from mimeType (handles blob: URIs and content:// URIs)
    if (mimeType) {
        if (mimeType.includes('png')) return '.png'
        if (mimeType.includes('jpeg') || mimeType.includes('jpg')) return '.jpg'
    }

    // Last resort default
    return '.jpg'
}

/**
 * Get MIME type from file extension
 * @param extension - File extension (with or without dot)
 * @returns MIME type string
 */
export const getMimeType = (extension: string): string => {
    const ext = extension.toLowerCase().replace('.', '')

    const mimeTypes: Record<string, string> = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
    }

    return mimeTypes[ext] || 'application/octet-stream'
}
