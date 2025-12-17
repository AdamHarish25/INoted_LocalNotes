"use client"

import { useState, useEffect } from "react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Moon, Sun, Laptop, Loader2 } from "lucide-react"
import { updateProfile } from "@/app/actions"
import { useRouter } from "next/navigation"

export function SettingsUI({ user }: { user: any }) {
    const { theme, setTheme } = useTheme()
    const [name, setName] = useState(user?.user_metadata?.display_name || "")
    const [isLoading, setIsLoading] = useState(false)
    const [mounted, setMounted] = useState(false)
    const router = useRouter()

    useEffect(() => {
        setMounted(true)
    }, [])

    const handleSave = async () => {
        setIsLoading(true)
        const res = await updateProfile(name)
        setIsLoading(false)
        if (res.success) {
            router.refresh()
            // Optionally show toast
        }
    }

    if (!mounted) {
        return null // or a skeleton
    }

    return (
        <div className="space-y-6 max-w-2xl">
            <Card>
                <CardHeader>
                    <CardTitle>Profile</CardTitle>
                    <CardDescription>Manage your public profile settings.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>Display Name</Label>
                        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your Name" />
                    </div>
                    <div className="space-y-2">
                        <Label>Profile Picture</Label>
                        <div className="flex items-center gap-4">
                            <div className="h-16 w-16 rounded-full bg-slate-200 overflow-hidden border">
                                {/* Placeholder for now */}
                                <img src={user?.user_metadata?.avatar_url || "/avatar-placeholder.png"} className="h-full w-full object-cover" alt="Avatar" />
                            </div>
                            <Button variant="outline" disabled>Change (Coming Soon)</Button>
                        </div>
                    </div>
                    <Button onClick={handleSave} disabled={isLoading}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Changes
                    </Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Appearance</CardTitle>
                    <CardDescription>Customize the look and feel of the application.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg w-fit dark:bg-slate-800 border">
                        <Button
                            variant={theme === 'light' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setTheme('light')}
                            className="h-8 shadow-none"
                        >
                            <Sun className="w-4 h-4 mr-2" />
                            Light
                        </Button>
                        <Button
                            variant={theme === 'dark' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setTheme('dark')}
                            className="h-8 shadow-none"
                        >
                            <Moon className="w-4 h-4 mr-2" />
                            Dark
                        </Button>
                        <Button
                            variant={theme === 'system' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setTheme('system')}
                            className="h-8 shadow-none"
                        >
                            <Laptop className="w-4 h-4 mr-2" />
                            System
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
