"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { forgotPassword } from "@/app/forgot-password/actions"

export function ForgotPasswordForm() {
    const searchParams = useSearchParams()
    const errorMessage = searchParams.get("error")
    const successMessage = searchParams.get("message")

    const [captchaToken, setCaptchaToken] = useState<string | null>(null)
    const turnstileRef = useRef<TurnstileInstance>(null)
    const [isLoading, setIsLoading] = useState(false)

    const [siteKey, setSiteKey] = useState(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "1x0000000000000000000000000000000AA");

    useEffect(() => {
        const hostname = window.location.hostname;
        const isIpAddress = /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname);

        if (typeof window !== 'undefined' && (hostname === 'localhost' || hostname === '127.0.0.1' || isIpAddress)) {
            // Force dummy key on localhost
            setSiteKey("1x0000000000000000000000000000000AA");
        }
    }, []);

    const handleSubmit = async (formData: FormData) => {
        setIsLoading(true)
        // Add captcha token to form data
        if (captchaToken) {
            formData.set("captchaToken", captchaToken)
        }

        await forgotPassword(formData)
        setIsLoading(false)
        turnstileRef.current?.reset()
        setCaptchaToken(null)
    }

    return (
        <form action={handleSubmit} className="space-y-6">
            <div className="flex justify-center mb-4">
                <Turnstile
                    siteKey={siteKey}
                    ref={turnstileRef}
                    onSuccess={(token) => setCaptchaToken(token)}
                    onError={() => setCaptchaToken(null)}
                    onExpire={() => setCaptchaToken(null)}
                />
            </div>

            <div className="space-y-2 relative">
                <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="Email"
                    required
                    className="peer rounded-full border-slate-200 dark:border-zinc-700 focus:border-blue-500 focus-visible:ring-blue-500 h-11 placeholder:text-transparent transition-colors text-slate-900 dark:text-white bg-white dark:bg-black"
                />
                <Label
                    htmlFor="email"
                    className="absolute left-4 top-3.5 text-slate-400 dark:text-zinc-500 text-xs transition-all bg-white dark:bg-black px-1 
                    peer-focus:-top-2 peer-focus:left-3 peer-focus:text-blue-500 dark:peer-focus:text-blue-400 peer-focus:text-[10px]
                    peer-[:not(:placeholder-shown)]:-top-2 peer-[:not(:placeholder-shown)]:left-3 peer-[:not(:placeholder-shown)]:text-[10px]
                    peer-[:not(:placeholder-shown)]:text-slate-400 dark:peer-[:not(:placeholder-shown)]:text-zinc-500
                    peer-focus:peer-[:not(:placeholder-shown)]:text-blue-500 dark:peer-focus:peer-[:not(:placeholder-shown)]:text-blue-400
                    pointer-events-none"
                >
                    Email
                </Label>
            </div>

            {errorMessage && (
                <div className="text-red-500 text-xs text-center bg-red-50 dark:bg-red-950/30 p-2 rounded-md border border-red-100 dark:border-red-900">
                    {errorMessage}
                </div>
            )}

            {successMessage && (
                <div className="text-green-500 text-xs text-center bg-green-50 dark:bg-green-950/30 p-2 rounded-md border border-green-100 dark:border-green-900">
                    {successMessage}
                </div>
            )}

            {!captchaToken && !successMessage && !errorMessage && (
                <div className="text-slate-400 text-[10px] mt-2 text-center">
                    Please complete the captcha to continue
                </div>
            )}

            <Button
                type="submit"
                disabled={isLoading}
                className="w-full rounded-full h-11 bg-blue-500 hover:bg-blue-600 shadow-md shadow-blue-200 dark:shadow-none text-white disabled:opacity-50"
            >
                {isLoading ? "Sending..." : "Send Reset Link"}
            </Button>

            <div className="text-center mt-4">
                <Link
                    href="/login"
                    className="text-xs text-slate-500 hover:text-blue-500 transition-colors"
                >
                    Back to Login
                </Link>
            </div>
        </form>
    )
}
