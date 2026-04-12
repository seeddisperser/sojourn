## 1. Project Setup

- [x] 1.1 Initialize monorepo structure: `server/` (Node.js runtime) and `client/` (React frontend)
- [x] 1.2 Set up `server/package.json` with dependencies: express, better-sqlite3, ws, chokidar, sharp, multer, uuid, zod
- [x] 1.3 Set up `client/package.json` with dependencies: react, react-router-dom, typescript, tailwindcss, vite, @blocknote/react
- [x] 1.4 Configure TypeScript (`tsconfig.json`) for both server and client
- [x] 1.5 Configure Tailwind CSS in the client
- [x] 1.6 Set up Vite dev server with proxy to Node backend (`/api` and `/ws`)
- [x] 1.7 Create `sojourn.config.json` schema and sample config file with all required fields

## 2. Database Schema

- [x] 2.1 Create SQLite database initialization module with `better-sqlite3`
- [x] 2.2 Create `notes` table (id, title, content, source_path, created_at, updated_at, created_by, updated_by, pruned)
- [x] 2.3 Create `images` table (id, file_path, thumbnail_path, caption, created_at, created_by)
- [x] 2.4 Create `clusters` table (id, title, description, canvas_x, canvas_y, canvas_w, canvas_h, created_at, updated_at, created_by)
- [x] 2.5 Create `cluster_members` junction table (cluster_id, artifact_id, artifact_type)
- [x] 2.6 Create `specs` table (id, title, status, body_json, created_by, version, created_at, updated_at)
- [x] 2.7 Create `spec_source_clusters` and `spec_linked_builds` junction tables
- [x] 2.8 Create `build_sessions` table (id, spec_id, command, status, pid, started_at, updated_at, cost_metrics, preview_url, local_paths)
- [x] 2.9 Create `build_logs` table (id, build_session_id, stream, line, timestamp)
- [x] 2.10 Create `hinge_points` table (id, build_session_id, description, status, source, created_at, acknowledged_at, acknowledged_by)
- [x] 2.11 Create `events` table (id, type, actor, related_artifact_id, related_artifact_type, message, timestamp, metadata)
- [x] 2.12 Create `comments` table (id, parent_id, artifact_id, artifact_type, author, body, created_at)
- [x] 2.13 Create `sessions` table (id, user_name, token_hash, created_at, expires_at)
- [x] 2.14 Create `artifact_tags` junction table (artifact_id, artifact_type, tag)
- [x] 2.15 Create `card_positions` table (artifact_id, artifact_type, canvas_x, canvas_y) for Archive layout

## 3. Runtime Core and Config

- [x] 3.1 Implement config loader: read `sojourn.config.json`, validate required fields with Zod, expose typed config object
- [x] 3.2 Set up Express server: bind to `0.0.0.0:<port>`, serve client build from `client/dist/`
- [x] 3.3 Add request logging middleware
- [x] 3.4 Add error handling middleware that returns JSON error responses

## 4. Authentication

- [x] 4.1 Create login page React component (token input + name input, minimal styled)
- [x] 4.2 Implement `POST /api/auth/login` endpoint: validate token against config, create session record, set httpOnly cookie
- [x] 4.3 Implement session middleware for all `/api/*` routes: validate cookie → session → reject with 401 if invalid
- [x] 4.4 Implement `POST /api/auth/logout` endpoint: clear session cookie and delete session record
- [x] 4.5 Implement frontend auth guard: redirect to login page if no valid session on app load
- [x] 4.6 Store user name from session in React context for attribution

## 5. WebSocket Server

- [x] 5.1 Set up `ws` WebSocket server on the same HTTP server (upgrade handler)
- [x] 5.2 Implement WebSocket session validation: reject connections without valid session cookie
- [x] 5.3 Implement broadcast utility: send JSON message to all connected authenticated clients
- [x] 5.4 Define WebSocket message envelope schema: `{ type, payload, timestamp }`
- [x] 5.5 Implement client-side WebSocket hook in React: connect on mount, reconnect on disconnect, dispatch messages to global state

## 6. File Watching — Obsidian Sync

- [x] 6.1 Set up Chokidar watcher on configured `vault_path`, excluding `.obsidian/`, `.trash/`, dot files
- [x] 6.2 Implement vault note ingest: parse YAML frontmatter (gray-matter), extract title/content/tags, upsert Note in SQLite
- [x] 6.3 Fire `note_added` or `note_updated` Event on ingest; broadcast via WebSocket
- [x] 6.4 Implement write-back: when a Note with null `source_path` is created, write `.md` to `vault_inbox_path` with frontmatter (`sojourn_id`, `created_at`, `tags`)
- [x] 6.5 Ensure write-back does not trigger re-ingest loop (ignore files written by Sojourn using a flag/path check)
- [x] 6.6 Log warning (don't crash) if `vault_path` does not exist at startup

## 7. File Watching — Image Directories

- [x] 7.1 Set up Chokidar watcher on each directory in `image_watch_dirs` config
- [x] 7.2 On new image file detected: generate UUID, copy/record path, trigger thumbnail generation, create Image artifact
- [x] 7.3 Fire `image_added` Event on ingest; broadcast via WebSocket

## 8. Image Storage and Upload

- [x] 8.1 Implement `POST /api/images/upload` endpoint using Multer: accept multipart file, save to `<storage_root>/<YYYY-MM-DD>/<uuid>.<ext>`
- [x] 8.2 Validate file type on upload (JPEG, PNG, WebP, HEIC, GIF); reject unsupported formats with 400
- [x] 8.3 Enforce configurable max file size in Multer (default 50MB)
- [x] 8.4 Implement Sharp thumbnail generation: resize to max 400×400px, save as JPEG to `<storage_root>/thumbnails/<uuid>_thumb.jpg`
- [x] 8.5 Run thumbnail generation async (don't block upload response); update Image artifact when complete
- [x] 8.6 Implement `GET /api/images/:id/thumbnail` and `GET /api/images/:id/full` authenticated file-serving routes
- [x] 8.7 Create frontend image upload component with `<input type="file" accept="image/*">` for mobile camera support

## 9. Artifact REST API

- [x] 9.1 `GET /api/artifacts` — list all artifacts (notes, images, clusters) with pagination
- [x] 9.2 `POST /api/notes` — create note; `GET /api/notes/:id`; `PATCH /api/notes/:id`
- [x] 9.3 `GET /api/images` — list images; `PATCH /api/images/:id` (caption, tags)
- [x] 9.4 `POST /api/clusters` — create cluster with member IDs; `GET /api/clusters/:id`; `PATCH /api/clusters/:id`
- [x] 9.5 `POST /api/specs` — create spec; `GET /api/specs/:id`; `PATCH /api/specs/:id` (increments version)
- [x] 9.6 `POST /api/comments` — create comment (with artifact_id + artifact_type); `GET /api/comments?artifact_id=&artifact_type=`
- [x] 9.7 `GET /api/events` — paginated event feed with optional type/place filter
- [x] 9.8 `PATCH /api/card-positions/:id` — update card position on Archive canvas
- [x] 9.9 `PATCH /api/artifacts/:id/prune` — soft-prune artifact from active Archive view
- [x] 9.10 All mutating endpoints broadcast relevant WebSocket event after DB write

## 10. Build Orchestration

- [x] 10.1 `POST /api/builds` — create BuildSession with command + optional spec_id; set status `pending`
- [x] 10.2 Immediately spawn child process via `child_process.spawn(command, { shell: true })`; update status to `running`, record PID
- [x] 10.3 Stream stdout/stderr: write each line to `build_logs` table; broadcast `build_log_line` WebSocket message with `{ build_id, stream, line }`
- [x] 10.4 On process exit: update BuildSession status to `completed` or `failed`; broadcast `build_finished`/`build_failed` event
- [x] 10.5 Implement `DELETE /api/builds/:id` — kill process (SIGTERM), update status to `interrupted`
- [x] 10.6 On runtime startup: find BuildSessions with status `running`; check if PID is alive; mark orphans as `interrupted`
- [x] 10.7 Parse `[HINGE] <text>` lines from stdout; create HingePoint record; broadcast `hinge_point_surfaced` event
- [x] 10.8 Parse cost output from Claude Code CLI stdout (e.g., `Cost: $X.XX` or JSON block); store in `cost_metrics`
- [x] 10.9 `POST /api/builds/:id/hinge-points` — create manual hinge point
- [x] 10.10 `PATCH /api/builds/:id/hinge-points/:hpId/acknowledge` — acknowledge hinge point

## 11. Frontend Shell

- [x] 11.1 Set up React Router with routes: `/login`, `/` (Mission Control), `/archive`, `/notary`, `/notary/:specId`, `/workshop`, `/workshop/:buildId`
- [x] 11.2 Implement persistent shell layout: left Inbox rail (fixed width), main panel (flex-fill), top control bar
- [x] 11.3 Implement top control bar: place navigation buttons, active build count badge, cost summary, sync status dot, user presence indicators
- [x] 11.4 Set up global state (Zustand or React Context): current user, artifacts cache, active view, unread count, WebSocket connection state
- [x] 11.5 Wire WebSocket messages to global state updates (artifact changes, events, build status)

## 12. Mission Control View

- [x] 12.1 Create SVG or CSS-based graphical map component with named zones for Archive, Notary, Workshop
- [x] 12.2 Apply hand-drawn / sketch visual style using custom CSS (rough borders, organic shapes, warm palette)
- [x] 12.3 Render active build count, pending hinge points count, pending comments count as badges on the map
- [x] 12.4 Render most recent build status and cost summary in a summary card on the map
- [x] 12.5 Wire zone clicks to navigate to corresponding place view
- [x] 12.6 Wire hinge point badge click to navigate to Workshop
- [x] 12.7 Wire comment badge click to open Inbox filtered to comments

## 13. Archive View

- [x] 13.1 Implement card canvas container with CSS `position: relative` and pointer event handling
- [x] 13.2 Implement NoteCard component: title + excerpt, author attribution, comment count badge, prune action
- [x] 13.3 Implement ImageCard component: thumbnail display, caption, comment count badge
- [x] 13.4 Implement drag-and-drop for cards: mouse/touch events, update position on drop via API
- [x] 13.5 Implement rubber-band multi-select: draw selection rect on canvas drag, select overlapping cards
- [x] 13.6 Implement shift-click multi-select as alternative to rubber-band
- [x] 13.7 Implement "Group" action on multi-select: prompt for cluster name, call `POST /api/clusters`
- [x] 13.8 Render Cluster as a visual container around its member cards with label
- [x] 13.9 Implement "Send to Notary" action on Cluster: call `POST /api/specs` with cluster ID, navigate to Notary
- [x] 13.10 Implement inline new note creation: click "New note" → editable text card → save on blur
- [x] 13.11 Implement comment panel for cards/clusters: slide-in panel showing thread, comment input
- [x] 13.12 Implement mobile list view: conditional render for screens < 768px, scrollable list of card items
- [x] 13.13 Implement image upload button in Archive toolbar (feeds into image-storage upload endpoint)

## 14. Notary View

- [x] 14.1 Install and configure `@blocknote/react`; render BlockNote editor in Notary
- [x] 14.2 On spec creation from cluster: pre-populate editor with suggested section headings as placeholder blocks
- [x] 14.3 Implement auto-save: debounce editor changes (500ms), PATCH spec on change, increment version
- [x] 14.4 Implement source materials panel: fetch cluster members for linked source_cluster_ids, render as scrollable read-only list
- [x] 14.5 Implement comment threads panel alongside editor: list comments, reply inline
- [x] 14.6 Implement spec status toolbar: show current status, "Finalize" button → PATCH status to `finalized`, make editor read-only
- [x] 14.7 Implement "Reopen" button on finalized specs to return to draft status
- [x] 14.8 Implement "Trigger Build" button on finalized spec: open command input modal, call `POST /api/builds`
- [x] 14.9 Show `linked_build_ids` as a list of linked build sessions with status badges

## 15. Workshop View

- [x] 15.1 Implement active builds list panel: fetch all BuildSessions, show command/title, status badge, start time, duration (live-updating)
- [x] 15.2 Implement log stream panel: subscribe to `build_log_line` WebSocket messages, render lines with stdout/stderr color distinction
- [x] 15.3 Auto-scroll log panel to bottom on new lines; allow user to scroll up to pause auto-scroll
- [x] 15.4 Implement stop build button: call `DELETE /api/builds/:id`
- [x] 15.5 Implement cost/token display panel: show per-session token count and cost from `cost_metrics`
- [x] 15.6 Implement preview URL panel: show clickable link when `preview_url` is set
- [x] 15.7 Implement hinge point cards: list open HingePoints for active build, show description + source badge, "Acknowledge" button
- [x] 15.8 Implement "Flag hinge point" button: text input modal → `POST /api/builds/:id/hinge-points`
- [x] 15.9 Implement "Back to Spec" navigation link from Workshop to linked Notary spec

## 16. Inbox

- [x] 16.1 Implement event feed: fetch paginated events from `GET /api/events`, render list of EventItem components
- [x] 16.2 Implement EventItem component: icon by type, actor name, message, relative timestamp, click-through navigation
- [x] 16.3 Add visual distinction for critical events (`build_failed`, `hinge_point_surfaced`)
- [x] 16.4 Implement filter tabs: All / Builds / Comments / Specs / Images
- [x] 16.5 Implement unread tracking: mark events as read when scrolled into view; show unread count badge
- [x] 16.6 Implement inline comment thread expansion on comment events
- [x] 16.7 Implement command input field at bottom of Inbox
- [x] 16.8 Implement command parser and handlers for: `show build status`, `show recent costs`, `surface open hinge points`
- [x] 16.9 Implement `create spec from [cluster name]` command: fuzzy match cluster name, call `POST /api/specs`
- [x] 16.10 Emit `agent_message` event for unrecognized commands with supported command list

## 17. Collaboration and Presence

- [x] 17.1 Broadcast user presence on WebSocket connect/disconnect: send `user_online`/`user_offline` message with user name
- [x] 17.2 Render presence indicators in top control bar: colored dot or initials badge per connected user
- [x] 17.3 Display `created_by` and `updated_by` attribution on Note cards, Image cards, Spec headers, and Comment items
- [x] 17.4 Ensure all API PATCH endpoints record `updated_by` from session and broadcast the updated artifact to all clients

## 18. Pi Setup and Documentation

- [x] 18.1 Write `README.md` covering: prerequisites (Node.js, libheif, Claude Code CLI), config setup, starting the server
- [x] 18.2 Create a start script (`start.sh`) that launches the server with the correct working directory
- [x] 18.3 Document how to find the Pi's local IP and access the portal from other devices
- [x] 18.4 Document the Obsidian vault setup: where to point `vault_path`, how `sojourn-inbox/` folder works
- [x] 18.5 Create a `systemd` service unit file (optional) for running Sojourn as a background service on the Pi
