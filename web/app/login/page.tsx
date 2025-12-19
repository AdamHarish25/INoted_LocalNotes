import { Suspense } from "react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { login, signup } from "./actions"
import { GuestLogin } from "@/components/auth/guest-login"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { OAuthSignIn } from "./oauth-signin"

export default async function LoginPage(props: {
    searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const searchParams = await props.searchParams;
    const errorMessage = searchParams?.error;

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-black bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#333_1px,transparent_1px)] [background-size:16px_16px]">
            <div className="w-full max-w-md">
                <div className="flex justify-center mb-8">
                    {/* Logo stays as is or can be inverted if needed, usually logo handles itself */}
                    <img src="/logo.png" alt="Logo" className="h-6" />
                </div>

                {/* Login Card - Dark Mode Update */}
                <Card className="border-0 shadow-lg bg-white/90 backdrop-blur-sm dark:bg-black dark:border dark:border-zinc-800">
                    <CardContent className="pt-10 pb-10 px-8">
                        <div className="text-center mb-8">
                            <h2 className="text-xl font-medium tracking-wide text-slate-700 dark:text-white">LOGIN</h2>
                        </div>

                        <form className="space-y-6">
                            <div className="space-y-6">
                                <div className="space-y-2 relative">
                                    <Input
                                        id="username"
                                        name="username"
                                        type="text"
                                        placeholder="(Required for Sign Up)"
                                        className="peer rounded-full border-slate-200 dark:border-zinc-700 focus:border-blue-500 focus-visible:ring-blue-500 h-11 placeholder:text-transparent focus:placeholder:text-slate-300 dark:focus:placeholder:text-zinc-500 focus:placeholder:text-[10px] transition-colors text-slate-900 dark:text-white bg-white dark:bg-black"
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
                                </div>

                                <div className="flex gap-2">
                                    <Button formAction={login} className="flex-1 rounded-full h-11 bg-blue-500 hover:bg-blue-600 shadow-md shadow-blue-200 dark:shadow-none text-white">
                                        Login
                                    </Button>
                                    <Button formAction={signup} variant="outline" className="flex-1 rounded-full h-11 border-blue-200 dark:border-zinc-700 text-blue-500 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-zinc-900 bg-white dark:bg-black">
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

                        <div className="mb-6">
                            <GuestLogin />
                        </div>

                        <Suspense fallback={<div>Loading...</div>}>
                            <OAuthSignIn />
                        </Suspense>

                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
