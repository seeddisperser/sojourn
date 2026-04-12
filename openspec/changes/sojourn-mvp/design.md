## Context

Sojourn is a greenfield, local-first mission command environment for creative and technical work. It runs entirely on a Raspberry Pi — the Pi serves both as the Node.js runtime host and as the build execution environment. Two users (Calvin and his wife) access the system via browser from their respective devices on the local network, including mobile phones.

The "open claw bot" is Claude Code CLI, invoked by the Workshop as the primary build agent. The system coordinates this agent rather than replacing it.

Design constraints:
- Single machine (Raspberry Pi): runtime, database, file storage, and build execution all colocated
- No cloud dependency for core functionality
- Two concurrent users, light collaboration
- Both users access from mobile browsers (image/note capture on the go)
- Obsidian vault and image folders are on the Pi filesystem (or mounted/synced there)

## Goals / Non-Goals

**Goals:**
- A working browser-accessible portal on the Pi LAN
- A clear data flow from raw notes/images → archive → spec → build → feedback
- Bidirectional Obsidian vault sync
- Mobile-friendly image upload stored reliably on Pi
- Live shared state via WebSocket between two users
- Claude Code CLI invokable from Workshop as a build process
- Simple workspace auth that works on LAN + mobile

**Non-Goals:**
- Public internet hosting or cloud sync
- Full CRDT-based real-time collaboration
- Replacing Obsidian, VS Code, or any editor
- Multi-workspace or multi-org support
- Offline-first (both clients expected to be on LAN)
- Complex agent orchestration beyond invoking Claude Code

## Decisions

### 1. Single-machine architecture (Pi as server + build runner)

**Decision**: The Node.js runtime runs on the Pi and serves the frontend. The Pi is also the build target. No separate server.

**Rationale**: Simplicity. No distributed systems complexity. The Pi is always-on, LAN-accessible, and collocated with all file assets (Obsidian vault, image storage). Build processes spawn as child processes on the same machine the runtime is on.

**Alternative considered**: Mac/desktop as server with Pi as remote build target (SSH). Rejected: adds remote execution complexity, requires Pi to be network-reachable from the server machine, and adds operational fragility.

### 2. SQLite for metadata storage

**Decision**: SQLite (via better-sqlite3 or Drizzle ORM) as the single metadata store.

**Rationale**: No separate database process, zero deployment friction, sufficient for two concurrent users, good enough for all artifact metadata and event history. Files on disk remain the canonical source for note content and images — SQLite stores the index, positions, comments, and event log.

**Alternative considered**: Postgres. Rejected for MVP — operational overhead on a Pi outweighs the benefits.

### 3. Chokidar for file watching

**Decision**: Chokidar for watching the Obsidian vault and image directories. File events trigger artifact indexing and event creation.

**Rationale**: Mature, cross-platform, well-supported on Linux/ARM. Handles debouncing and initial scan.

### 4. Bidirectional Obsidian sync strategy

**Decision**: 
- Vault → Archive: Chokidar watches vault path. On add/change: parse frontmatter + content, upsert Note artifact, record `source_path`. On delete: mark artifact inactive (don't delete — user may want to prune manually).
- Archive → Vault: When a new Note is created in the Archive (not from Obsidian), write a `.md` file to a configurable `vault_inbox_path` subfolder (e.g., `vault/sojourn-inbox/`). This prevents collisions with Obsidian-managed files.
- Conflict model: Files touched by Obsidian are "owned" by Obsidian. Files written by Sojourn are in the inbox subfolder. No cross-ownership writes.

**Rationale**: Clean ownership boundaries eliminate conflict headaches. Sojourn doesn't write into existing Obsidian notes; Obsidian doesn't know about Sojourn.

**Alternative considered**: True bidirectional sync on the same file. Rejected — conflict resolution without CRDT is brittle and risky for a notes vault.

### 5. WebSocket for live updates

**Decision**: Single WebSocket server (ws or socket.io) on the Node runtime. All clients subscribe to a single workspace channel. Events (artifact changes, build status, inbox items) are broadcast to all connected clients.

**Rationale**: Simple pub/sub is sufficient for two users. No message queue or broker needed.

**Conflict model for MVP**: Last-write-wins. If both users edit a spec simultaneously, the last save wins. No merge. Acceptable for two-person usage with light simultaneous editing.

### 6. Image storage path

**Decision**: Uploaded images are stored at `<configurable_storage_root>/<YYYY-MM-DD>/<uuid>.<ext>`. Thumbnails generated at ingest and stored at `<storage_root>/thumbnails/<uuid>_thumb.<ext>`. Paths stored as relative to `storage_root` in the artifact record.

**Rationale**: Stable, predictable paths. Date-bucketed for human browsability. UUID prevents collisions. Storage root configured in runtime config, not hardcoded.

**Thumbnail generation**: Sharp (Node.js) for JPEG/PNG/HEIF resize. Fallback: serve original at reduced quality via Content-Negotiation.

### 7. Auth model

**Decision**: Simple shared workspace token. On first setup, a token is generated and stored in the runtime config. Users authenticate by visiting the Pi's login URL and entering the token (or following a pre-shared link that includes it). Session cookie (httpOnly, SameSite=Strict) persists for a configurable duration. All API routes and WebSocket connections require a valid session.

**Rationale**: Minimal friction for a two-person trusted system. No user management overhead. No OAuth complexity.

**Alternative considered**: Per-user accounts with passwords. Rejected — complexity not warranted for two trusted users on a LAN. Can be added later.

### 8. Build process invocation

**Decision**: Workshop triggers builds by spawning a child process on the Pi using `child_process.spawn()`. The command is defined per-build (stored in the Spec artifact or entered at trigger time). Claude Code CLI is invoked as one possible command. stdout/stderr are streamed via WebSocket to connected clients. Process state is tracked in the BuildSession SQLite record.

**Hinge point model**: A hinge point is a decision surfaced during a build that requires user input before work can meaningfully continue. For MVP, hinge points are created either:
  - Manually by the user (via the Workshop UI, "flag as hinge point")
  - By the agent emitting a structured output line (e.g., `[HINGE] <decision text>`) that the runtime parses from stdout

**Rationale**: Keeps the build orchestrator simple — it's a process runner and log aggregator, not an agent framework.

### 9. Frontend architecture

**Decision**: React + TypeScript + Tailwind. Vite for build tooling. Single-page app served by the Node runtime (or a separate Vite dev server during development, proxied by Node).

**Place navigation**: Client-side routing (React Router or simple state machine). Each place is a distinct React subtree with its own layout and interaction model.

**Archive canvas**: React with absolute positioning and pointer events for drag/drop. No heavy canvas library for MVP — CSS transforms + mouse event tracking is sufficient for the card count expected.

**Notary editor**: BlockNote (React-based block editor). Stores content as JSON in SQLite, renders as rich text.

### 10. Mobile browser support

**Decision**: The frontend must be usable on mobile Safari and Chrome. Archive canvas on mobile is view-only with touch-scrollable card list fallback (full canvas interaction deferred). Image upload uses `<input type="file" accept="image/*" capture>` for native camera/photo library access on mobile.

## Risks / Trade-offs

- **Pi performance**: Raspberry Pi (especially Pi 4) can handle this workload, but Sharp thumbnail generation + chokidar + WebSocket broadcast under concurrent load should be tested. Thumbnail generation should be async/queued, not blocking.
- **Obsidian sync edge cases**: If the vault is on an external machine and mounted via samba/NFS, chokidar behavior on network file systems is unreliable. Document that vault should be on Pi-local disk for reliable sync.
- **Last-write-wins conflicts**: Acceptable for two users but should be made visible — show "last modified by X at Y" on specs to reduce silent overwrites.
- **Build process resilience**: If the Node process restarts mid-build, the child process is orphaned. Mitigation: record PID in BuildSession; on startup, check for orphaned PIDs and mark their sessions as "interrupted".
- **Mobile canvas interaction**: Full free-placement canvas UX on mobile is hard. The fallback list view should be first-class, not an afterthought.
- **HEIF support**: iPhones default to HEIF. Sharp supports it but requires libheif. Must be installed on the Pi. Document as a setup dependency.

## Open Questions

- Should the Sojourn inbox subfolder path be configurable, or always `sojourn-inbox/` relative to vault root?
- What is the token/cost tracking source for Claude Code invocations? Does Claude Code CLI emit structured cost data to stdout, or do we need to parse its output?
- Should hinge points from the agent (stdout parsing) have a defined schema/protocol, or remain freeform text for now?
- Is there a preferred Obsidian-to-Sojourn note linking model (Obsidian wiki links → linked_artifacts)?
