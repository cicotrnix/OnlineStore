import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

let cachedCommit: string | null = null
let cachedVersion: string | null = null

export function getVersion(): string {
  if (cachedVersion) return cachedVersion
  try {
    const pkg = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf-8')) as {
      version?: string
    }
    cachedVersion = pkg.version ?? 'unknown'
  } catch {
    cachedVersion = 'unknown'
  }
  return cachedVersion
}

export function getCommit(): string {
  if (cachedCommit) return cachedCommit
  const fromEnv =
    process.env.COOLIFY_COMMIT_SHA ??
    process.env.VERCEL_GIT_COMMIT_SHA ??
    process.env.GIT_COMMIT_SHA ??
    null
  if (fromEnv) {
    cachedCommit = fromEnv
    return cachedCommit
  }
  try {
    cachedCommit = execSync('git rev-parse HEAD', {
      cwd: process.cwd(),
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .trim()
  } catch {
    cachedCommit = 'unknown'
  }
  return cachedCommit
}
