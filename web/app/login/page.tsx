import { Suspense } from "react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { login, signup } from "./actions"
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

                {/* Force light mode styles on the card by NOT using dark: variants that invert colors, or explicitly setting them to light counterparts if parent dark mode leaks in. Since we are inside a dark mode parent, we might need to override 'dark:' styles if shadcn components use them automatically. 
                   Actually, usually shadcn components adapt to 'class="dark"'.
                   To FORCE light mode inside a dark mode app, we can wrap this part in a `light` class or manually override.
                   However, `globals.css` defines root variables. 
                   Simplest way: Explicitly set bg-white and text-slate-900 etc which usually overrides variable based theming if specificity is high enough,
                   OR we can just let it be if we don't use 'bg-card' but 'bg-white'.
                   Let's stick to explicit colors for the card to ensure it looks 'light'.
                */}
                <Card className="border-0 shadow-lg bg-white/90 backdrop-blur-sm dark:bg-white/90">
                    <CardContent className="pt-10 pb-10 px-8">
                        <div className="text-center mb-8">
                            <h2 className="text-xl font-medium tracking-wide text-slate-700">LOGIN</h2>
                        </div>

                        <form className="space-y-6">
                            <div className="space-y-6">
                                <div className="space-y-2 relative">
                                    <Input
                                        id="username"
                                        name="username"
                                        type="text"
                                        placeholder="(Required for Sign Up)"
                                        className="peer rounded-full border-slate-200 dark:border-gray-500 focus:border-blue-500 focus-visible:ring-blue-500 h-11 placeholder:text-transparent focus:placeholder:text-slate-300 focus:placeholder:text-[10px] transition-colors text-slate-900 bg-white"
                                    />
                                    <Label
                                        htmlFor="username"
                                        className="absolute left-4 top-3.5 text-slate-100 text-xs transition-all bg-white dark:bg-white/0 px-1 
                                        peer-focus:-top-2 peer-focus:left-3 peer-focus:text-blue-500 dark:rounded-full dark:peer-focus:bg-white peer-focus:text-[10px]
                                        peer-[:not(:placeholder-shown)]:-top-2 peer-[:not(:placeholder-shown)]:left-3 peer-[:not(:placeholder-shown)]:text-[10px]
                                        peer-[:not(:placeholder-shown)]:text-slate-400
                                        peer-focus:peer-[:not(:placeholder-shown)]:text-blue-500
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
                                        className="peer rounded-full border-slate-200 dark:border-gray-500 focus:border-blue-500 focus-visible:ring-blue-500 h-11 placeholder:text-transparent focus:placeholder:text-slate-300 focus:placeholder:text-[10px] transition-colors text-slate-900 bg-white"
                                    />
                                    <Label
                                        htmlFor="email"
                                        className="absolute left-4 top-3.5 text-slate-100 text-xs transition-all bg-white dark:bg-white/0 px-1 
                                        peer-focus:-top-2 peer-focus:left-3 peer-focus:text-blue-500 dark:rounded-full dark:peer-focus:bg-white peer-focus:text-[10px]
                                        peer-[:not(:placeholder-shown)]:-top-2 peer-[:not(:placeholder-shown)]:left-3 peer-[:not(:placeholder-shown)]:text-[10px]
                                        peer-[:not(:placeholder-shown)]:text-slate-400
                                        peer-focus:peer-[:not(:placeholder-shown)]:text-blue-500
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
                                        className="peer rounded-full border-slate-200 dark:border-gray-500 focus:border-blue-500 focus-visible:ring-blue-500 h-11 placeholder:text-transparent focus:placeholder:text-slate-300 focus:placeholder:text-[10px] transition-colors text-slate-900 bg-white"
                                    />
                                    <Label
                                        htmlFor="password"
                                        className="absolute left-4 top-3.5 text-slate-100 text-xs transition-all bg-white dark:bg-white/0 px-1 
                                        peer-focus:-top-2 peer-focus:left-3 peer-focus:text-blue-500 dark:rounded-full dark:peer-focus:bg-white peer-focus:text-[10px]
                                        peer-[:not(:placeholder-shown)]:-top-2 peer-[:not(:placeholder-shown)]:left-3 peer-[:not(:placeholder-shown)]:text-[10px]
                                        peer-[:not(:placeholder-shown)]:text-slate-400
                                        peer-focus:peer-[:not(:placeholder-shown)]:text-blue-500
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
                                        <div className="text-red-500 text-xs mt-2 text-center bg-red-50 p-2 rounded-md border border-red-100">
                                            {typeof errorMessage === 'string' ? errorMessage : "An error occurred"}
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-2">
                                    <Button formAction={login} className="flex-1 rounded-full h-11 bg-blue-500 hover:bg-blue-600 shadow-md shadow-blue-200 text-white">
                                        Login
                                    </Button>
                                    <Button formAction={signup} variant="outline" className="flex-1 rounded-full h-11 border-blue-200 dark:text-white text-blue-500 hover:bg-blue-50 bg-white">
                                        Sign Up
                                    </Button>
                                </div>
                            </div>
                        </form>

                        <div className="relative my-8">
                            <div className="absolute inset-0 flex items-center">
                                <Separator className="bg-slate-200 dark:bg-gray-500" />
                            </div>
                            <div className="relative flex justify-center text-[10px] uppercase">
                                <span className="bg-white dark:bg-slate-700 px-2 text-slate-300 dark:text-white">Or</span>
                            </div>
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
