## ADDED Requirements

### Requirement: Runtime serves frontend and API
The local runtime SHALL be a Node.js HTTP server that serves the compiled React frontend and exposes a REST API for all artifact and system operations. It SHALL listen on a configurable port (default: 3000) and bind to all network interfaces so LAN devices can connect.

#### Scenario: Frontend loads from Pi
- **WHEN** a browser on the local network navigates to `http://<pi-ip>:3000`
- **THEN** the React application loads successfully

#### Scenario: API responds to artifact requests
- **WHEN** an authenticated client makes a GET request to `/api/artifacts`
- **THEN** the runtime returns a JSON list of artifacts from SQLite

### Requirement: File watcher monitors Obsidian vault
The runtime SHALL watch the configured Obsidian vault directory using chokidar. On add or change of any `.md` file (excluding `.obsidian/` system files), the runtime SHALL ingest the file as a Note artifact.

#### Scenario: New note detected in vault
- **WHEN** a new `.md` file is written to the vault directory
- **THEN** within 2 seconds a Note artifact is created or updated in SQLite with `source_path` set to the file path

#### Scenario: System files ignored
- **WHEN** a file inside `.obsidian/` changes
- **THEN** no artifact is created or updated

### Requirement: File watcher monitors image directories
The runtime SHALL watch one or more configured image directories. On add of any image file (JPEG, PNG, HEIF/HEIC, WebP), the runtime SHALL ingest it as an Image artifact and generate a thumbnail.

#### Scenario: New image detected
- **WHEN** an image file is added to a watched image directory
- **THEN** an Image artifact is created in SQLite and a thumbnail is generated at `<storage_root>/thumbnails/<uuid>_thumb.jpg`

### Requirement: Event pipeline records system activity
The runtime SHALL create an Event record in SQLite for every significant system action: artifact created, artifact updated, comment posted, build started, build finished, build failed, hinge point surfaced, cost threshold crossed.

#### Scenario: Artifact creation fires event
- **WHEN** a Note artifact is created (by file watcher or user action)
- **THEN** an Event of type `note_added` is created in SQLite and broadcast via WebSocket to all connected clients

### Requirement: Build process orchestration
The runtime SHALL spawn local build processes as child processes using `child_process.spawn`. It SHALL capture stdout and stderr, stream them to connected clients via WebSocket, track process state (pending, running, completed, failed, interrupted), and record all output in the BuildSession SQLite record.

#### Scenario: Build starts successfully
- **WHEN** the Workshop triggers a build with a valid command
- **THEN** a BuildSession record is created with status `running`, the process is spawned, and log lines begin streaming to clients

#### Scenario: Build process exits
- **WHEN** the child process exits with code 0
- **THEN** the BuildSession status is updated to `completed`

#### Scenario: Build process fails
- **WHEN** the child process exits with a non-zero code
- **THEN** the BuildSession status is updated to `failed` and the exit code is recorded

#### Scenario: Runtime restarts with orphaned build
- **WHEN** the runtime starts and finds a BuildSession with status `running` and a recorded PID that is not alive
- **THEN** the BuildSession status is updated to `interrupted`

### Requirement: WebSocket server broadcasts updates
The runtime SHALL maintain a WebSocket server. All connected authenticated clients SHALL receive broadcast messages for: artifact changes, new events, build status updates, and hinge point surfacing.

#### Scenario: Client receives artifact update
- **WHEN** any artifact is created or updated
- **THEN** all connected WebSocket clients receive a message with the updated artifact payload within 500ms

### Requirement: Cost tracking records token usage
The runtime SHALL record cost/token usage per BuildSession where available. It SHALL parse structured cost output from Claude Code CLI stdout if present. It SHALL expose an API endpoint returning cost summaries by session and by time period.

#### Scenario: Cost data stored
- **WHEN** a build session completes and cost data was emitted
- **THEN** the cost_metrics field of the BuildSession is populated and available via API

### Requirement: Configuration file controls runtime behavior
The runtime SHALL read configuration from a `sojourn.config.json` (or `.yaml`) file at startup. Required fields: `vault_path`, `storage_root`, `port`, `auth_token`. Optional: `image_watch_dirs`, `vault_inbox_path`.

#### Scenario: Missing required config
- **WHEN** the runtime starts without a `vault_path` configured
- **THEN** the runtime logs a clear error and exits with a non-zero code
