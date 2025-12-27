import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { updatePassword } from "./actions"

export default async function UpdatePasswordPage(props: {
    searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const searchParams = await props.searchParams;
    const errorMessage = searchParams?.error;

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-black bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#333_1px,transparent_1px)] [background-size:16px_16px]">
            <div className="w-full max-w-md">
                <div className="flex justify-center mb-8">
                    <Link href="/login">
                        <img src="/logo.png" alt="Logo" className="h-6 cursor-pointer" />
                    </Link>
                </div>

                <Card className="border-0 shadow-lg bg-white/90 backdrop-blur-sm dark:bg-black dark:border dark:border-zinc-800">
                    <CardHeader className="text-center">
                        <CardTitle className="text-xl">Update Password</CardTitle>
                        <CardDescription>
                            Enter your new password below.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="px-8 pb-10">
                        <form className="space-y-6">
                            <div className="space-y-2 relative">
                                <Input
                                    id="password"
                                    name="password"
                                    type="password"
                                    placeholder="New Password"
                                    required
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
                                    New Password
                                </Label>
                            </div>

                            <div className="space-y-2 relative">
                                <Input
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    type="password"
                                    placeholder="Confirm Password"
                                    required
                                    className="peer rounded-full border-slate-200 dark:border-zinc-700 focus:border-blue-500 focus-visible:ring-blue-500 h-11 placeholder:text-transparent transition-colors text-slate-900 dark:text-white bg-white dark:bg-black"
                                />
                                <Label
                                    htmlFor="confirmPassword"
                                    className="absolute left-4 top-3.5 text-slate-400 dark:text-zinc-500 text-xs transition-all bg-white dark:bg-black px-1 
                                    peer-focus:-top-2 peer-focus:left-3 peer-focus:text-blue-500 dark:peer-focus:text-blue-400 peer-focus:text-[10px]
                                    peer-[:not(:placeholder-shown)]:-top-2 peer-[:not(:placeholder-shown)]:left-3 peer-[:not(:placeholder-shown)]:text-[10px]
                                    peer-[:not(:placeholder-shown)]:text-slate-400 dark:peer-[:not(:placeholder-shown)]:text-zinc-500
                                    peer-focus:peer-[:not(:placeholder-shown)]:text-blue-500 dark:peer-focus:peer-[:not(:placeholder-shown)]:text-blue-400
                                    pointer-events-none"
                                >
                                    Confirm Password
                                </Label>
                            </div>

                            {errorMessage && (
                                <div className="text-red-500 text-xs text-center bg-red-50 dark:bg-red-950/30 p-2 rounded-md border border-red-100 dark:border-red-900">
                                    {errorMessage}
                                </div>
                            )}

                            <Button
                                formAction={updatePassword}
                                className="w-full rounded-full h-11 bg-blue-500 hover:bg-blue-600 shadow-md shadow-blue-200 dark:shadow-none text-white"
                            >
                                Update Password
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
