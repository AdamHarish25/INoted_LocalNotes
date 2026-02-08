import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { FileLock2 } from 'lucide-react'

export default function NotFound() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
            <div className="mx-auto flex w-full max-w-md flex-col items-center justify-center space-y-6">
                <div className="rounded-full bg-muted p-6 transition-colors dark:bg-muted/50">
                    <FileLock2 className="h-12 w-12 text-muted-foreground" />
                </div>
                <div className="space-y-2">
                    <h1 className="text-2xl font-bold tracking-tighter sm:text-3xl text-foreground">
                        Access Restricted
                    </h1>
                    <p className="text-muted-foreground md:text-lg/relaxed lg:text-base/relaxed xl:text-lg/relaxed">
                        Sorry you have no access to this document, please refer to the sender
                    </p>
                </div>
                <div className="flex w-full flex-col gap-2 min-[400px]:flex-row justify-center pt-4">
                    <Link href="/dashboard">
                        <Button size="lg" className="w-full min-[400px]:w-auto">
                            Return to Dashboard
                        </Button>
                    </Link>
                </div>
            </div>
        </div>
    )
}
