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

    // Supabase automatically persists the session (access_token + refresh_token)
    // to AsyncStorage via the adapter configured in lib/supabase.ts.
    // AuthContext picks it up via onAuthStateChange — no manual storage needed.
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
