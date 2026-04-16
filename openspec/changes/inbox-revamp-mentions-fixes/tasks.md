## 1. Bug Fixes (do first — independent, low risk)

- [x] 1.1 Audit `ItemOverlay.tsx` — find where note `content` is set into local state and fix the `useEffect` so it re-initialises when the fetched note data changes
- [x] 1.2 Verify note content renders correctly by opening a note with existing content

## 2. Archive Canvas — Persistent Add Group Button

- [x] 2.1 Add a persistent "Add Group" button to the Archive page toolbar (always visible, not gated on selection state)
- [x] 2.2 When items are selected and "Add Group" is clicked, group them into a cluster (existing logic)
- [x] 2.3 When no items are selected and "Add Group" is clicked, create an empty cluster with a default title via `POST /clusters`
- [x] 2.4 Verify the button does not interfere with click-to-open item overlay behaviour

## 3. Remove Persistent Inbox Sidebar

- [x] 3.1 Remove `<Inbox />` from `AppShell.tsx` and adjust the layout (remove sidebar column, full-width main content)
- [x] 3.2 Remove or archive `Inbox.tsx` component (keep code accessible but not rendered)
- [x] 3.3 Verify all pages (Archive, Notary, Workshop, MissionControl) render correctly without the sidebar

## 4. Inbox Page — Routing & Navigation

- [x] 4.1 Create `client/src/pages/InboxPage.tsx` (scaffolding only, empty content)
- [x] 4.2 Add `/inbox` route to `App.tsx` router config
- [x] 4.3 Add "Inbox" nav button to `ControlBar.tsx` (same style as Archive/Notary/Workshop buttons)
- [x] 4.4 Add Inbox shortcut card to `MissionControl.tsx`

## 5. Inbox Page — Spaces Panel

- [x] 5.1 Implement the Spaces section in `InboxPage.tsx` with three clickable cards (Archive, Notary, Workshop)
- [x] 5.2 On space selection, fetch events via `GET /api/events?place=<X>&limit=50` and render activity log
- [x] 5.3 Show empty state when no space is selected; show empty state when selected space has no events
- [x] 5.4 Display event type, message, actor, and timestamp for each event in the log

## 6. Inbox Page — Messages Two-Pane Panel

- [x] 6.1 Add server endpoint or query to fetch threads: unique `(artifact_id, artifact_type)` pairs from comments, ordered by most recent comment, with preview snippet
- [x] 6.2 Implement the thread list left pane in `InboxPage.tsx` — shows artifact title, snippet, author, relative time
- [x] 6.3 Implement the thread detail right pane — loads full comment thread for selected artifact via existing `GET /api/comments?artifact_id=X&artifact_type=Y`
- [x] 6.4 Show empty state in messages panel when no threads exist

## 7. Agent Mentions — Server Config & Comment Scanning

- [x] 7.1 Update `server/src/config.ts` to accept optional `agents` field (`Record<string, string>`) with Zod schema
- [x] 7.2 Update `sojourn.config.sample.json` to include an example `agents` map
- [x] 7.3 In `server/src/routes/comments.ts`, after successful comment insert, scan body for `/@(\w+)/g`
- [x] 7.4 For each matching handle found in `config.agents`, fire-and-forget `fetch` POST to the webhook URL with payload `{ mention, comment: { id, body, author }, artifact: { type, id, title, content } }`
- [x] 7.5 Fetch the artifact details (title, content) needed for the webhook payload before dispatching

## 8. Agent Mentions — Inbound Reply Endpoint

- [x] 8.1 Create `server/src/routes/webhooks.ts` with `POST /api/webhooks/agent/:handle/reply`
- [x] 8.2 Validate request body: require `artifact_id`, `artifact_type`, `body`; return 400 on missing fields
- [x] 8.3 Insert comment with `author = handle`, broadcast `comment_posted` event via WebSocket
- [x] 8.4 Mount the webhooks router in `server/src/index.ts` under `/api/webhooks`

## 9. Agent Mentions — Client Rendering

- [x] 9.1 In `CommentPanel.tsx` (or wherever comment bodies are rendered), replace `@word` tokens with styled `<span>` elements (distinct colour, e.g. accent/blue)
- [x] 9.2 In comment author byline rendering, detect if author matches an `@handle` pattern and apply a distinct style to agent-authored comments
- [x] 9.3 Verify mention spans render correctly in ItemOverlay for both human and agent comments

## 10. Integration & Smoke Testing

- [ ] 10.1 Test full mention flow: post comment with `@botson`, confirm webhook fires (or logs attempt), confirm reply endpoint creates comment attributed to `botson`
- [ ] 10.2 Verify Inbox Spaces panel drill-down works for all three spaces
- [ ] 10.3 Verify Inbox Messages panel shows threads and detail pane loads correct comments
- [ ] 10.4 Verify mention threads appear in Messages panel
- [ ] 10.5 Confirm Archive canvas group creation works via persistent button (with and without selection)
- [ ] 10.6 Confirm note content persists and renders across open/close cycles of ItemOverlay
