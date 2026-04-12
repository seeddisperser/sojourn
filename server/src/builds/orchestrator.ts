import { spawn } from 'child_process'
import { v4 as uuidv4 } from 'uuid'
import { getDb } from '../db/schema.js'
import { createEvent } from '../events.js'
import { broadcast } from '../ws.js'

// Track running processes
const activeProcesses = new Map<string, ReturnType<typeof spawn>>()

const HINGE_PATTERN = /\[HINGE\]\s+(.+)/
const COST_PATTERN = /Cost:\s*\$?([\d.]+)/i
const COST_JSON_PATTERN = /"cost":\s*([\d.]+)/

export function startBuild(sessionId: string, command: string, actor: string): void {
  const db = getDb()
  const now = new Date().toISOString()

  db.prepare(`UPDATE build_sessions SET status = 'running', started_at = ?, updated_at = ? WHERE id = ?`)
    .run(now, now, sessionId)

  const proc = spawn(command, [], { shell: true, env: process.env })
  activeProcesses.set(sessionId, proc)

  if (proc.pid) {
    db.prepare('UPDATE build_sessions SET pid = ? WHERE id = ?').run(proc.pid, sessionId)
  }

  broadcast({ type: 'build_status', payload: { id: sessionId, status: 'running', pid: proc.pid } })
  createEvent('build_started', `Build started`, actor, {
    related_artifact_id: sessionId, related_artifact_type: 'build_session',
  })

  let costAccumulator = ''

  const handleLine = (stream: 'stdout' | 'stderr', line: string) => {
    const ts = new Date().toISOString()
    db.prepare(`INSERT INTO build_logs (build_session_id, stream, line, timestamp) VALUES (?, ?, ?, ?)`)
      .run(sessionId, stream, line, ts)

    broadcast({ type: 'build_log_line', payload: { build_id: sessionId, stream, line, timestamp: ts } })

    // Detect hinge points
    const hingeMatch = line.match(HINGE_PATTERN)
    if (hingeMatch) {
      createHingePoint(sessionId, hingeMatch[1].trim(), 'agent', actor)
    }

    // Accumulate output for cost parsing
    costAccumulator += line + '\n'
  }

  let stdoutBuf = ''
  let stderrBuf = ''

  proc.stdout?.on('data', (chunk: Buffer) => {
    const text = stdoutBuf + chunk.toString()
    const lines = text.split('\n')
    stdoutBuf = lines.pop() ?? ''
    for (const line of lines) handleLine('stdout', line)
  })

  proc.stderr?.on('data', (chunk: Buffer) => {
    const text = stderrBuf + chunk.toString()
    const lines = text.split('\n')
    stderrBuf = lines.pop() ?? ''
    for (const line of lines) handleLine('stderr', line)
  })

  proc.on('exit', (code) => {
    // Flush remaining buffer
    if (stdoutBuf) handleLine('stdout', stdoutBuf)
    if (stderrBuf) handleLine('stderr', stderrBuf)

    activeProcesses.delete(sessionId)
    const status = code === 0 ? 'completed' : 'failed'
    const exitNow = new Date().toISOString()

    // Parse cost from accumulated output
    const costMetrics = parseCostMetrics(costAccumulator)

    db.prepare(`
      UPDATE build_sessions SET status = ?, updated_at = ?, pid = NULL, cost_metrics = ? WHERE id = ?
    `).run(status, exitNow, costMetrics ? JSON.stringify(costMetrics) : null, sessionId)

    broadcast({ type: 'build_status', payload: { id: sessionId, status, cost_metrics: costMetrics } })
    createEvent(
      status === 'completed' ? 'build_finished' : 'build_failed',
      `Build ${status}`,
      actor,
      { related_artifact_id: sessionId, related_artifact_type: 'build_session' }
    )
  })
}

export function stopBuild(sessionId: string): void {
  const proc = activeProcesses.get(sessionId)
  if (proc) {
    proc.kill('SIGTERM')
    activeProcesses.delete(sessionId)
  }
  const now = new Date().toISOString()
  getDb().prepare(`UPDATE build_sessions SET status = 'interrupted', updated_at = ?, pid = NULL WHERE id = ?`)
    .run(now, sessionId)
  broadcast({ type: 'build_status', payload: { id: sessionId, status: 'interrupted' } })
}

export function createHingePoint(buildSessionId: string, description: string, source: 'user' | 'agent', actor: string): string {
  const db = getDb()
  const id = uuidv4()
  const now = new Date().toISOString()
  db.prepare(`
    INSERT INTO hinge_points (id, build_session_id, description, status, source, created_at)
    VALUES (?, ?, ?, 'open', ?, ?)
  `).run(id, buildSessionId, description, source, now)

  const hp = db.prepare('SELECT * FROM hinge_points WHERE id = ?').get(id)
  broadcast({ type: 'hinge_point', payload: hp })
  createEvent('hinge_point_surfaced', `Hinge point: ${description}`, actor, {
    related_artifact_id: buildSessionId, related_artifact_type: 'build_session',
    metadata: { hinge_point_id: id, source },
  })
  return id
}

export function acknowledgeHingePoint(id: string, actor: string): void {
  const now = new Date().toISOString()
  getDb().prepare(`
    UPDATE hinge_points SET status = 'acknowledged', acknowledged_at = ?, acknowledged_by = ? WHERE id = ?
  `).run(now, actor, id)
  broadcast({ type: 'hinge_point_updated', payload: { id, status: 'acknowledged', acknowledged_by: actor } })
}

export function recoverOrphanedBuilds(): void {
  const db = getDb()
  const running = db.prepare(`SELECT id, pid FROM build_sessions WHERE status = 'running'`).all() as Array<{ id: string; pid: number | null }>

  for (const session of running) {
    let isAlive = false
    if (session.pid) {
      try {
        process.kill(session.pid, 0) // 0 = check existence only
        isAlive = true
      } catch {
        isAlive = false
      }
    }

    if (!isAlive) {
      db.prepare(`UPDATE build_sessions SET status = 'interrupted', updated_at = ?, pid = NULL WHERE id = ?`)
        .run(new Date().toISOString(), session.id)
      console.log(`[builds] marked orphaned build ${session.id} as interrupted`)
    }
  }
}

function parseCostMetrics(output: string): { total_cost?: number } | null {
  const dollarMatch = output.match(COST_PATTERN)
  if (dollarMatch) return { total_cost: parseFloat(dollarMatch[1]) }

  const jsonMatch = output.match(COST_JSON_PATTERN)
  if (jsonMatch) return { total_cost: parseFloat(jsonMatch[1]) }

  return null
}
