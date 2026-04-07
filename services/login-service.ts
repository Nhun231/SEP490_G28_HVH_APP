import { supabase } from '@/lib/supabase'

export interface SignInParams {
    email: string
    password: string
}

export interface SignUpParams {
    email: string
    password: string
}

export const signInWithEmail = async ({ email, password }: SignInParams) => {
    const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
    })

    if (error) {
        throw new Error(error.message)
    }

    return { session: data.session }
}


export const signUpWithEmail = async ({ email, password }: SignUpParams) => {
    const {
        data: { session },
        error,
    } = await supabase.auth.signUp({
        email: email,
        password: password,
    })

    if (error) {
        throw new Error(error.message)
    }

    return { session }
}

/**
 * Step 1 — send a password-reset email.
 * Supabase will email a 6-digit OTP the user can enter in the app.
 */
export const requestPasswordReset = async (email: string): Promise<void> => {
    const { error } = await supabase.auth.resetPasswordForEmail(email)
    if (error) throw new Error(error.message)
}

/**
 * Step 2 — verify the 6-digit token from the recovery email.
 * On success Supabase establishes a short-lived session in memory.
 */
export const verifyResetOtp = async (email: string, token: string): Promise<void> => {
    const { error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'recovery',
    })
    if (error) throw new Error(error.message)
}

/**
 * Step 3 — update the password. Must be called after verifyResetOtp
 * so the recovery session is active.
 */
export const updatePassword = async (newPassword: string): Promise<void> => {
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) throw new Error(error.message)
}
