import { prisma } from '@/lib/db/client'
import { getCommit, getVersion } from '@/lib/release-info'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

interface MigrationRow {
  migration_name: string
  finished_at: Date | null
}

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`
    const rows = await prisma.$queryRaw<MigrationRow[]>`
      SELECT migration_name, finished_at
      FROM _prisma_migrations
      WHERE finished_at IS NOT NULL
      ORDER BY finished_at DESC
      LIMIT 1
    `
    const lastMigration = rows[0]
      ? {
          name: rows[0].migration_name,
          finishedAt: rows[0].finished_at?.toISOString() ?? null,
        }
      : null

    return NextResponse.json({
      status: 'ok',
      db: 'ok',
      version: getVersion(),
      commit: getCommit(),
      lastMigration,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        db: 'fail',
        version: getVersion(),
        commit: getCommit(),
        uptime: process.uptime(),
        error: String(error),
      },
      { status: 503 }
    )
  }
}
