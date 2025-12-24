import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
    const supabase = await createClient()

    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
        // Fallback to Auth.js session
        const { auth } = await import("@/auth")
        const session = await auth()

        if (session?.user) {
            return NextResponse.json({
                authenticated: true,
                user: {
                    id: session.user.id,
                    email: session.user.email,
                    role: "authenticated",
                    last_sign_in: new Date().toISOString(),
                    app_metadata: {},
                    user_metadata: {}
                },
                message: "You are successfully authenticated via Auth.js!"
            })
        }

        return NextResponse.json({
            authenticated: false,
            error: error?.message || "Not authenticated",
            user: null
        }, { status: 401 })
    }

    return NextResponse.json({
        authenticated: true,
        user: {
            id: user.id,
            email: user.email,
            role: user.role,
            last_sign_in: user.last_sign_in_at,
            app_metadata: user.app_metadata,
            user_metadata: user.user_metadata
        },
        message: "You are successfully authenticated!"
    })
}
