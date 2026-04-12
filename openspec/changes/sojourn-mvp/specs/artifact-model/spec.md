## ADDED Requirements

### Requirement: Artifacts have stable UUIDs
Every artifact in the system SHALL have a stable UUID as its `id`. IDs SHALL never be reassigned or reused. All cross-artifact references SHALL use these IDs.

#### Scenario: Artifact created
- **WHEN** any artifact is created
- **THEN** it receives a UUID that persists for the lifetime of the system

### Requirement: Note artifact structure
The system SHALL support Note artifacts with the following fields: `id` (UUID), `title` (string), `content` (markdown string), `source_path` (string | null — path to originating file if from Obsidian), `created_at` (ISO timestamp), `updated_at` (ISO timestamp), `tags` (string[]), `comments` (Comment[] via join), `linked_artifact_ids` (UUID[]).

#### Scenario: Note from Obsidian has source path
- **WHEN** a Note is ingested from the Obsidian vault
- **THEN** its `source_path` is the absolute path to the `.md` file

#### Scenario: Note created in Archive has no source path
- **WHEN** a Note is created directly in the Archive UI
- **THEN** its `source_path` is null

### Requirement: Image artifact structure
The system SHALL support Image artifacts with the following fields: `id` (UUID), `file_path` (string — path relative to `storage_root`), `thumbnail_path` (string — relative path to generated thumbnail), `caption` (string | null), `comments` (Comment[] via join), `tags` (string[]), `linked_artifact_ids` (UUID[]), `created_at` (ISO timestamp).

#### Scenario: Image artifact has valid paths
- **WHEN** an Image artifact is retrieved
- **THEN** its `file_path` resolves to a readable file under `storage_root`

### Requirement: Cluster artifact structure
The system SHALL support Cluster artifacts with the following fields: `id` (UUID), `title` (string), `member_artifact_ids` (UUID[]), `canvas_position` (object: `{x, y, width, height}` | null), `description` (string | null), `comments` (Comment[] via join), `created_at` (ISO timestamp), `updated_at` (ISO timestamp).

#### Scenario: Cluster contains members
- **WHEN** a Cluster is retrieved
- **THEN** its `member_artifact_ids` list references valid Note or Image artifact IDs

### Requirement: Spec artifact structure
The system SHALL support Spec artifacts with the following fields: `id` (UUID), `title` (string), `status` (enum: draft | finalized), `source_cluster_ids` (UUID[]), `body` (BlockNote JSON string), `comments` (Comment[] via join), `created_by` (string — user identifier), `version` (integer, auto-increment on save), `linked_build_ids` (UUID[]), `created_at` (ISO timestamp), `updated_at` (ISO timestamp).

#### Scenario: Spec version increments on save
- **WHEN** a Spec body or title is saved
- **THEN** the `version` field increments by 1

### Requirement: Build Session artifact structure
The system SHALL support BuildSession artifacts with the following fields: `id` (UUID), `spec_id` (UUID | null), `status` (enum: pending | running | completed | failed | interrupted), `command` (string), `started_at` (ISO timestamp | null), `updated_at` (ISO timestamp), `logs` (stored as log lines in a related table), `cost_metrics` (JSON object | null), `preview_url` (string | null), `screenshots` (string[] — file paths), `hinge_points` (HingePoint[] via join), `local_paths` (string[]).

#### Scenario: Build session tracks status transitions
- **WHEN** a build process progresses from pending to running to completed
- **THEN** each status transition is recorded with an updated `updated_at` timestamp

### Requirement: Event artifact structure
The system SHALL support Event records with the following fields: `id` (UUID), `type` (string enum), `actor` (string — user identifier or "system"), `related_artifact_id` (UUID | null), `message` (string), `timestamp` (ISO timestamp), `metadata` (JSON object | null).

#### Scenario: Event references artifact
- **WHEN** an Event is created for a Note being added
- **THEN** its `related_artifact_id` references the Note's UUID

### Requirement: Comment structure and threading
The system SHALL support Comment records with: `id` (UUID), `parent_id` (UUID | null — for threading), `artifact_id` (UUID), `author` (string), `body` (string), `created_at` (ISO timestamp). Comments with a `parent_id` are replies to the parent comment.

#### Scenario: Reply comment has parent
- **WHEN** a user replies to an existing comment
- **THEN** the reply's `parent_id` is set to the parent comment's UUID

### Requirement: HingePoint structure
The system SHALL support HingePoint records associated with a BuildSession: `id` (UUID), `build_session_id` (UUID), `description` (string), `status` (enum: open | acknowledged), `source` (enum: user | agent), `created_at` (ISO timestamp), `acknowledged_at` (ISO timestamp | null), `acknowledged_by` (string | null).

#### Scenario: User-created hinge point is open
- **WHEN** a user flags a hinge point in the Workshop
- **THEN** a HingePoint is created with `source: user` and `status: open`

#### Scenario: Agent hinge point from stdout
- **WHEN** the build process emits a line matching `[HINGE] <text>`
- **THEN** a HingePoint is created with `source: agent`, `description: <text>`, and `status: open`

### Requirement: SQLite schema stores all artifacts
All artifact types SHALL be stored in a SQLite database at a configurable path. The schema SHALL use separate tables for each artifact type and junction tables for many-to-many relationships (e.g., cluster_members, artifact_tags).

#### Scenario: Database persists across restarts
- **WHEN** the runtime restarts
- **THEN** all previously stored artifacts are still accessible via API
