"use client"

import { useState, useRef, Suspense, useEffect } from "react"
import Link from "next/link"
import { useSearchParams, useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { createClient } from "@/utils/supabase/client"
import { login, signup, loginWithGoogle } from "@/app/login/actions"

export function LoginContent() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const errorMessage = searchParams.get("error")
    const next = searchParams.get("next")

    const [isLoading, setIsLoading] = useState(false)
    const [captchaToken, setCaptchaToken] = useState<string | null>(null)
    const turnstileRef = useRef<TurnstileInstance>(null)

    const [isSignup, setIsSignup] = useState(false);

    // Guest Login Handler
    const handleGuestLogin = async () => {
        setIsLoading(true)
        try {
            const supabase = createClient()

            const options: any = {}
            if (captchaToken) {
                options.captchaToken = captchaToken
            }

            const { error } = await supabase.auth.signInAnonymously({
                options
            })

            if (error) throw error

            router.push(next || "/")
            router.refresh()
        } catch (error) {
            console.error("Guest login failed", error)
            setIsLoading(false)
            turnstileRef.current?.reset()
            setCaptchaToken(null)
        }
    }

    // Google Login Handler
    const handleGoogleLogin = async () => {
        setIsLoading(true)
        try {
            await loginWithGoogle()
        } catch (error) {
            console.error("Google login failed", error)
            setIsLoading(false)
            turnstileRef.current?.reset()
            setCaptchaToken(null)
        }
    }

    const [siteKey, setSiteKey] = useState(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "1x0000000000000000000000000000000AA");

    useEffect(() => {
        const hostname = window.location.hostname;
        const isIpAddress = /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname);

        if (typeof window !== 'undefined' && (hostname === 'localhost' || hostname === '127.0.0.1' || isIpAddress)) {
            // Force dummy key on localhost, LAN IPs, and Netlify previews to avoid "Invalid Domain" errors
            setSiteKey("1x0000000000000000000000000000000AA");
        }
    }, []);

    // Handle case where Supabase redirects back to Login with the code (fallback)
    useEffect(() => {
        const code = searchParams.get("code")
        if (code) {
            setIsLoading(true)
            // Forward to the actual callback handler
            const callbackUrl = `/auth/callback${window.location.search}`
            router.push(callbackUrl)
        }
    }, [searchParams, router])

    return (
        <>
            <div className="text-center mb-8">
                <h2 className="text-xl font-medium tracking-wide text-slate-700 dark:text-white">LOGIN</h2>
            </div>

            <div className="flex justify-center mb-6">
                <Turnstile
                    siteKey={siteKey}
                    ref={turnstileRef}
                    onSuccess={(token) => setCaptchaToken(token)}
                    onError={() => setCaptchaToken(null)}
                    onExpire={() => setCaptchaToken(null)}
                />
            </div>

            <form className="space-y-6">
                <input type="hidden" name="captchaToken" value={captchaToken || ""} />
                <input type="hidden" name="next" value={next || "/dashboard"} />

                <div className="space-y-6">
                    <div className="space-y-2 relative">
                        <Input
                            id="username"
                            name="username"
                            type="text"
                            placeholder="(Required for Sign Up)"
                            className="peer rounded-full border-slate-200 dark:border-zinc-700 focus:border-blue-500 focus-visible:ring-blue-500 h-11 placeholder:text-transparent focus:placeholder:text-slate-300 dark:focus:placeholder:text-zinc-500 focus:placeholder:text-[10px] transition-colors text-slate-900 dark:text-white bg-white dark:bg-black"
                            required={isSignup}
                        />
                        <Label
                            htmlFor="username"
                            className="absolute left-4 top-3.5 text-slate-400 dark:text-zinc-500 text-xs transition-all bg-white dark:bg-black px-1 
                            peer-focus:-top-2 peer-focus:left-3 peer-focus:text-blue-500 dark:peer-focus:text-blue-400 peer-focus:text-[10px]
                            peer-[:not(:placeholder-shown)]:-top-2 peer-[:not(:placeholder-shown)]:left-3 peer-[:not(:placeholder-shown)]:text-[10px]
                            peer-[:not(:placeholder-shown)]:text-slate-400 dark:peer-[:not(:placeholder-shown)]:text-zinc-500
                            peer-focus:peer-[:not(:placeholder-shown)]:text-blue-500 dark:peer-focus:peer-[:not(:placeholder-shown)]:text-blue-400
                            pointer-events-none"
                        >
                            Username
                        </Label>
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

                    <div className="space-y-2 relative">
                        <Input
                            id="password"
                            name="password"
                            type="password"
                            required
                            placeholder="Password"
                            className="peer rounded-full border-slate-200 dark:border-zinc-700 focus:border-blue-500 focus-visible:ring-blue-500 h-11 placeholder:text-transparent transition-colors text-slate-900 dark:text-white bg-white dark:bg-black"
                        />
                        <Label
                            htmlFor="password"
                            className="absolute left-4 top-3.5 text-slate-400 dark:text-zinc-500 text-xs transition-all bg-white dark:bg-black px-1 
                            peer-focus:-top-2 peer-focus:left-3 peer-focus:text-blue-500 dark:peer-focus:text-blue-400 peer-focus:text-[10px]
                            peer-[:not(:placeholder-shown)]:-top-2 peer-[:not(:placeholder-shown)]:left-3 peer-[:not(:placeholder-shown)]:text-[10px]
                            peer-[:not(:placeholder-shown)]:text-slate-400 dark:peer-[:not(:placeholder-shown)]:text-zinc-500
                            peer-focus:peer-[:not(:placeholder-shown)]:text-blue-500 dark:peer-focus:peer-[:not(:placeholder-shown)]:text-blue-400
                            pointer-events-none"
                        >
                            Password
                        </Label>
                        <div className="flex justify-end mt-1">
                            <Link href="#" className="text-[10px] text-slate-300 hover:text-blue-500 underline">
                                Forgot Password?
                            </Link>
                        </div>

                        {/* Error Message Display */}
                        {errorMessage && (
                            <div className="text-red-500 text-xs mt-2 text-center bg-red-50 dark:bg-red-950/30 p-2 rounded-md border border-red-100 dark:border-red-900">
                                {typeof errorMessage === 'string' ? errorMessage : "An error occurred"}
                            </div>
                        )}
                        {!captchaToken && !errorMessage && (
                            <div className="text-slate-400 text-[10px] mt-2 text-center">
                                Please complete the captcha to continue
                            </div>
                        )}
                    </div>

                    <div className="flex gap-2">
                        <Button
                            onClick={() => setIsSignup(false)}
                            formAction={login}
                            disabled={isLoading}
                            className="flex-1 rounded-full h-11 bg-blue-500 hover:bg-blue-600 shadow-md shadow-blue-200 dark:shadow-none text-white disabled:opacity-50"
                        >
                            Login
                        </Button>
                        <Button
                            onClick={() => setIsSignup(true)}
                            formAction={signup}
                            variant="outline"
                            disabled={isLoading}
                            className="flex-1 rounded-full h-11 border-blue-200 dark:border-zinc-700 text-blue-500 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-zinc-900 bg-white dark:bg-black disabled:opacity-50"
                        >
                            Sign Up
                        </Button>
                    </div>
                </div>
            </form>

            <div className="relative my-8">
                <div className="absolute inset-0 flex items-center">
                    <Separator className="bg-slate-200 dark:bg-zinc-800" />
                </div>
                <div className="relative flex justify-center text-[10px] uppercase">
                    <span className="bg-white dark:bg-black px-2 text-slate-300 dark:text-zinc-500">Or</span>
                </div>
            </div>

            <div className="mb-6 w-full">
                <Button
                    onClick={handleGuestLogin}
                    disabled={isLoading}
                    variant="outline"
                    className="w-full rounded-full h-11 border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-900 bg-white dark:bg-black disabled:opacity-50"
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Processing...
                        </>
                    ) : (
                        "Continue as Guest"
                    )}
                </Button>
            </div>

            <div className="flex justify-center gap-6">
                <Button
                    variant="outline"
                    size="icon"
                    className="rounded-full h-10 w-10 border-slate-100 shadow-sm disabled:opacity-50"
                    onClick={handleGoogleLogin}
                    disabled={isLoading}
                >
                    <img src="https://authjs.dev/img/providers/google.svg" className="w-5 h-5" alt="Google" />
                </Button>
            </div>
        </>
    )
}

export function LoginContentWrapper() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <LoginContent />
        </Suspense>
    )
}
