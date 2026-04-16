## Context

Sojourn is a local-first mission command environment running on a Raspberry Pi. The client is a React/TypeScript SPA (Vite + React Router v6 + Zustand + Tailwind). The server is Express + better-sqlite3. Real-time sync runs over WebSocket. Currently:

- `AppShell.tsx` renders a persistent left-sidebar `Inbox.tsx` on every page, consuming horizontal space and competing with the Archive canvas.
- `Inbox.tsx` is a flat event feed with basic tabs (All / Builds / Comments / Specs / Images). There is no thread grouping, no space-activity drill-down, and no agent integration.
- Comments are plain text; no mention parsing or agent dispatch exists.
- Note content is not rendering in `ItemOverlay.tsx` — the component appears to not hydrate the textarea with the fetched `note.content` value.
- The Archive canvas's "Add Group" path requires multi-select (Shift+click → Group), but opening a card on click now interferes with that flow. No persistent group-creation entry point exists.

## Goals / Non-Goals

**Goals:**
- Convert Inbox from persistent sidebar to a standalone navigable page.
- Give the Inbox page meaningful structure: per-space activity logs + a two-pane messages/threads panel.
- Add @mention support to comments with config-driven agent dispatch and inbound reply webhook.
- Surface @mention threads in the Inbox messages panel.
- Fix note content not rendering in ItemOverlay.
- Add a persistent "Add Group" button to the Archive canvas.

**Non-Goals:**
- Real-time comment sync across multiple connected clients (comments still load on overlay open).
- OAuth or cryptographic signing for agent webhooks (shared-secret or none for now).
- Rich text / markdown rendering in comments (plain text + styled @mention spans only).
- Mobile layout changes.

## Decisions

### 1. Inbox as a page, not a sidebar

**Decision**: Remove `<Inbox />` from `AppShell.tsx`. Add `/inbox` route. Add "Inbox" nav button to `ControlBar.tsx` and a shortcut card to `MissionControl.tsx`.

**Rationale**: The persistent sidebar adds width cost on every page. Inbox is a periodic review surface, not a constant HUD element. Moving it to a page frees the full viewport for canvas/editor pages and normalises the navigation pattern — all four places (Archive, Notary, Workshop, Inbox) live at the same routing level.

**Alternative considered**: Collapsible sidebar. Rejected — adds toggle state complexity and still occupies space when open. A full-page inbox is simpler and more useful.

### 2. Inbox layout — Spaces panel + Messages two-pane

**Decision**: `InboxPage.tsx` has two vertical sections:
1. **Spaces rail** (top): three clickable cards (Archive, Notary, Workshop). Clicking fetches events filtered by `place` and renders them in an adjacent activity log panel. Uses existing `GET /api/events?place=<X>&limit=50`.
2. **Messages panel** (bottom): two-pane layout. Left pane = list of threads (one per unique artifact that has comments involving the user or @mentions). Right pane = full comment thread for selected artifact. Threads are ordered by most recent comment.

**Rationale**: Spaces panel reuses the existing events table with no new DB columns. Messages panel gives a traditional inbox UX that scales well as comment volume grows.

**Thread data source**: Query `GET /api/comments?author=<me>` plus a new query returning threads where `@<username>` appears in any comment body. Threads grouped by `(artifact_id, artifact_type)`, sorted by max `created_at`.

**Alternative considered**: Single flat feed with filter tabs (current approach). Rejected — doesn't allow space drill-down or thread-level navigation.

### 3. Agent mentions — config-driven, synchronous dispatch

**Decision**: 
- Config: optional `agents` object in `sojourn.config.json`: `{ "botson": "http://..." }`.
- Server: after `POST /comments` creates the comment, scan body for `/@(\w+)/g`. For each handle found in `config.agents`, fire-and-forget `fetch(url, { method: 'POST', body: JSON.stringify(payload) })`. Do not block the comment response on webhook delivery.
- Inbound: `POST /api/webhooks/agent/:handle/reply` creates a comment attributed to the handle with `author = handle`.
- Client: regex replace `@word` tokens in rendered comment bodies with `<span class="mention">@word</span>`.

**Rationale**: Config-driven registry keeps the server code simple and avoids a DB agents table. Fire-and-forget avoids coupling comment latency to external service availability. The inbound reply endpoint is a simple comment insert — no special agent state needed.

**Alternative considered**: DB agents table with admin UI. Rejected — over-engineered for a two-person household tool; config file is sufficient and easier to edit.

**Alternative considered**: Block on webhook response and immediately insert reply. Rejected — agent response time is unpredictable; better to receive asynchronously via the reply endpoint.

### 4. Fix note content rendering

**Decision**: Audit `ItemOverlay.tsx` — specifically how the overlay initialises its local state from the fetched note. Most likely the `useEffect` that sets content from `note.content` either has the wrong dependency array or runs before the fetch resolves. Fix by ensuring the local `content` state is initialised/reset whenever the fetched note data changes.

**Rationale**: The notes table `content` column is populated (Obsidian watcher and `POST /notes` both write it). The bug is client-side state initialisation, not a server/DB issue.

### 5. Persistent Add Group button on Archive canvas

**Decision**: Add a fixed "Add Group" button to the Archive page header/toolbar, independent of selection state. Clicking it when items are selected groups them (existing behaviour). Clicking it with nothing selected creates an empty cluster (title prompt, then `POST /clusters` with empty members array).

**Rationale**: The current multi-select → Group button only appears contextually. The button being persistent makes group creation always discoverable and separates the intent (create a group) from the selection (what goes in it).

## Risks / Trade-offs

- **Mention scan adds latency to comment saves**: Mitigated — webhook dispatch is fire-and-forget (non-blocking). Comment save response is unaffected by agent response time.
- **Agent webhook failures are silent**: Acceptable for now. If the agent URL is unreachable, the mention simply doesn't get a reply. Future: add a `webhook_failures` event type.
- **Empty cluster creation**: Creating a cluster with no members is a new state. The server and canvas need to handle `cluster_members` being empty gracefully. Current code should already handle this (no enforced minimum) but needs verification.
- **Inbox thread query performance**: Querying comments by `@handle` string pattern (`LIKE '%@handle%'`) over large comment tables could be slow. Acceptable at household scale; index can be added later if needed.

## Migration Plan

1. Deploy server changes first (new webhook route, comment mention scanning) — backwards compatible.
2. Deploy client changes (remove sidebar, add Inbox page, fix note rendering, add group button) — no data migration needed.
3. Update `sojourn.config.json` manually to add `agents` map if agent mentions are desired.

No rollback complexity — all changes are additive or UI-only. If sidebar removal causes issues, reverting `AppShell.tsx` restores prior behaviour.

## Open Questions

- Should the Inbox messages panel show threads for all artifacts, or only notes/specs? (Current plan: all artifact types.)
- Should agent reply comments have a visual badge/icon distinguishing them from human comments? (Lean yes — render author as `@handle` in a different colour.)
