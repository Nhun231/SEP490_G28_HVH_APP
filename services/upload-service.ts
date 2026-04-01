/**
 * Upload Service - Handles file uploads to Supabase storage using signed URLs
 */

import { supabase } from '@/lib/supabase'
import * as FileSystem from 'expo-file-system/legacy'

export interface UploadProgress {
    loaded: number
    total: number
    percentage: number
}

export interface UploadOptions {
    // Kept for API compatibility; progress not supported natively by uploadToSignedUrl
    onProgress?: (progress: UploadProgress) => void
}

const decodeBase64ToArrayBuffer = (base64: string): ArrayBuffer => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    const lookup = new Uint8Array(256);
    for (let i = 0; i < chars.length; i++) lookup[chars.charCodeAt(i)] = i;

    let bufferLength = base64.length * 0.75;
    if (base64[base64.length - 1] === '=') {
        bufferLength--;
        if (base64[base64.length - 2] === '=') {
            bufferLength--;
        }
    }

    const arraybuffer = new ArrayBuffer(bufferLength);
    const bytes = new Uint8Array(arraybuffer);

    let p = 0;
    for (let i = 0; i < base64.length; i += 4) {
        const encoded1 = lookup[base64.charCodeAt(i)];
        const encoded2 = lookup[base64.charCodeAt(i + 1)];
        const encoded3 = lookup[base64.charCodeAt(i + 2)];
        const encoded4 = lookup[base64.charCodeAt(i + 3)];

        bytes[p++] = (encoded1 << 2) | (encoded2 >> 4);
        bytes[p++] = ((encoded2 & 15) << 4) | (encoded3 >> 2);
        bytes[p++] = ((encoded3 & 3) << 6) | (encoded4 & 63);
    }

    return arraybuffer;
};

/**
 * Upload an image file to Supabase using a signed upload URL.
 **/
export const uploadImageToSupabase = async (
    signedUrl: string,
    file: { uri: string; mimeType: string },
    _options?: UploadOptions
): Promise<void> => {

    const urlObj = new URL(signedUrl)
    const token = urlObj.searchParams.get('token')
    const bucketAndPath = urlObj.pathname.match(/\/object\/upload\/sign\/([^/]+)\/(.+)/)

    if (!token || !bucketAndPath) {
        throw new Error(`Invalid signed URL format: ${signedUrl}`)
    }

    const bucket = bucketAndPath[1]   // e.g. "file-store"
    const path = bucketAndPath[2]     // e.g. "identity-verification/uuid/cid-front.jpg"

    // Fetch the local file as base64 and convert it to ArrayBuffer to avoid RN Blob bugs
    const base64Data = await FileSystem.readAsStringAsync(file.uri, {
        encoding: 'base64' as any,
    })
    const arrayBuffer = decodeBase64ToArrayBuffer(base64Data)

    const { error } = await supabase.storage
        .from(bucket)
        .uploadToSignedUrl(path, token, arrayBuffer, {
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