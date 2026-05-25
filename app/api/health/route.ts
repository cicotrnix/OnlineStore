import { prisma } from '@/lib/db/client'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`
    return NextResponse.json({
      status: 'ok',
      db: 'ok',
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json({ status: 'error', db: 'fail', error: String(error) }, { status: 503 })
  }
}
