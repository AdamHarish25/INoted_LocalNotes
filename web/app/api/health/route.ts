import { NextResponse } from 'next/server'

export async function GET() {
    return NextResponse.json({
        status: 'ok',
        message: 'INoted API is up and running!',
        timestamp: new Date().toISOString(),
    })
}
