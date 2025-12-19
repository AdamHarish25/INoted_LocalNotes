"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { cookies } from "next/headers"

import { createClient } from "@/utils/supabase/server"

export async function login(formData: FormData) {
    const supabase = await createClient()

    const data = {
        email: formData.get("email") as string,
        password: formData.get("password") as string,
    }

    const { error } = await supabase.auth.signInWithPassword(data)

    if (error) {
        redirect("/login?error=" + error.message)
    }

    revalidatePath("/", "layout")
    redirect("/")
}

export async function signup(formData: FormData) {
    const supabase = await createClient()

    const data = {
        email: formData.get("email") as string,
        password: formData.get("password") as string,
        options: {
            data: {
                display_name: formData.get("username") as string,
            }
        }
    }

    const { error } = await supabase.auth.signUp(data)

    if (error) {
        redirect("/login?error=" + error.message)
    }

    revalidatePath("/", "layout")
    redirect("/auth/verify-email")
}


export async function continueAsGuest() {
    try {
        const supabase = await createClient()
        const { error } = await supabase.auth.signInAnonymously()

        if (error) {
            console.error("Supabase anonymous sign-in failed:", error)
            throw error
        }

    } catch (err) {
        console.error("Guest login error:", err)
        throw err
    }

    return { success: true }
}
