import { z } from 'zod'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

const ConfigSchema = z.object({
  port: z.number().int().positive().default(3000),
  auth_token: z.string().min(16, 'auth_token must be at least 16 characters'),
  vault_path: z.string(),
  vault_inbox_path: z.string().optional(),
  storage_root: z.string(),
  image_watch_dirs: z.array(z.string()).default([]),
  db_path: z.string().default('./sojourn.db'),
  session_duration_days: z.number().int().positive().default(30),
  max_upload_mb: z.number().int().positive().default(50),
  agents: z.record(z.string()).optional(),
})

export type Config = z.infer<typeof ConfigSchema>

let _config: Config | null = null

export function loadConfig(configPath?: string): Config {
  const path = configPath ?? resolve(process.cwd(), 'sojourn.config.json')

  if (!existsSync(path)) {
    throw new Error(`Config file not found: ${path}\nCreate sojourn.config.json — see sojourn.config.sample.json for reference.`)
  }

  const raw = JSON.parse(readFileSync(path, 'utf-8'))
  const result = ConfigSchema.safeParse(raw)

  if (!result.success) {
    const issues = result.error.issues.map(i => `  - ${i.path.join('.')}: ${i.message}`).join('\n')
    throw new Error(`Invalid config:\n${issues}`)
  }

  // Resolve vault_inbox_path default relative to vault_path
  if (!result.data.vault_inbox_path) {
    result.data.vault_inbox_path = resolve(result.data.vault_path, 'sojourn-inbox')
  }

  _config = result.data
  return _config
}

export function getConfig(): Config {
  if (!_config) throw new Error('Config not loaded — call loadConfig() first')
  return _config
}
