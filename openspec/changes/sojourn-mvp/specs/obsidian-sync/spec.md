## ADDED Requirements

### Requirement: Vault-to-Archive ingest on file change
The runtime SHALL watch the configured `vault_path` directory recursively. When a `.md` file is added or modified, the runtime SHALL parse its frontmatter and content, then create or update a Note artifact in SQLite. The Note's `source_path` SHALL be set to the file's absolute path.

#### Scenario: New vault note becomes Archive artifact
- **WHEN** a new `.md` file is written to the Obsidian vault
- **THEN** within 2 seconds a Note artifact is created in SQLite and a `note_added` Event is broadcast

#### Scenario: Modified vault note updates artifact
- **WHEN** an existing `.md` file in the vault is modified
- **THEN** the corresponding Note artifact's `content`, `updated_at`, and `tags` (from frontmatter) are updated

### Requirement: Obsidian system files excluded from ingest
Files under `.obsidian/`, `.trash/`, or beginning with `.` SHALL be excluded from the vault watcher ingest pipeline.

#### Scenario: System directory changes ignored
- **WHEN** any file inside `.obsidian/` is changed
- **THEN** no artifact is created or updated

### Requirement: Archive-created notes written back to vault inbox
When a Note artifact is created directly in the Archive (i.e., `source_path` is null), the runtime SHALL write a corresponding `.md` file to the `vault_inbox_path` directory (configurable; default: `<vault_path>/sojourn-inbox/`).

#### Scenario: In-app note appears in vault inbox
- **WHEN** a user creates a new note in the Archive
- **THEN** a `.md` file is created at `<vault_inbox_path>/<timestamp>-<sanitized-title>.md` within 2 seconds

#### Scenario: Written file is valid Obsidian markdown
- **WHEN** a Sojourn-created note is written to the vault inbox
- **THEN** the file contains valid frontmatter (with `sojourn_id`, `created_at`, `tags`) and the note content as markdown body

### Requirement: No cross-ownership writes
The runtime SHALL NOT modify `.md` files that were originally created by Obsidian (i.e., files with a `source_path` not under `vault_inbox_path`). Updates to Obsidian-owned notes SHALL only flow vault → Sojourn, not Sojourn → vault.

#### Scenario: Edit to Obsidian note not written back
- **WHEN** a user edits a Note artifact whose `source_path` is in the main vault (not sojourn-inbox)
- **THEN** the edit is saved to SQLite only — the source `.md` file is NOT modified

### Requirement: Frontmatter tag extraction
When ingesting a vault note, the runtime SHALL extract tags from YAML frontmatter (`tags:` field) and store them on the Note artifact. If no frontmatter tags exist, tags default to an empty array.

#### Scenario: Tags extracted from frontmatter
- **WHEN** a vault note has `tags: [project, idea]` in its frontmatter
- **THEN** the Note artifact has `tags: ["project", "idea"]`

### Requirement: Vault path configurable
The vault path SHALL be configurable in `sojourn.config.json` under the `vault_path` key. The runtime SHALL log a warning at startup if the configured path does not exist but SHALL NOT exit — the watcher will begin when the path becomes available.

#### Scenario: Missing vault path at startup
- **WHEN** the configured `vault_path` does not exist at startup
- **THEN** the runtime logs a warning but continues running
