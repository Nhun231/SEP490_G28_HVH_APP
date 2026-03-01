import axios from 'axios'

/**
 * Base Axios instance for all authenticated API calls to the backend.
 * Token injection is handled by the request interceptor in AuthContext.
 */
const baseAxios = axios.create({
    baseURL: process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.38:8080',
    headers: {
        'Content-Type': 'application/json',
    },
})

export default baseAxios
