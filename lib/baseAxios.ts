import axios from 'axios'

/**
 * Base Axios instance for all authenticated API calls to the backend.
 * Token injection is handled by the request interceptor in AuthContext.
 */
const baseAxios = axios.create({
    baseURL: process.env.EXPO_PUBLIC_API_URL || 'https://api.hvh.okne.site',
    headers: {
        'Content-Type': 'application/json',
    },
})

export default baseAxios
