## Why

Creative and technical work is fragmented across disconnected tools — notes in Obsidian, images in local folders, builds triggered ad-hoc, coordination via chat apps with no shared context. Sojourn creates a unified, local-first mission command environment that lives on a Raspberry Pi and connects these fragments into a single flowing system, shared between two people.

## What Changes

This is a greenfield implementation. There is no existing codebase.

- Introduces a local Node.js runtime that runs on a Raspberry Pi, serving a browser-accessible web portal
- Introduces a React/TypeScript frontend with four distinct "place" views: Mission Control, Archive, Notary, Workshop
- Introduces a persistent Inbox (left rail) as unified coordination and command layer
- Introduces bidirectional sync with an Obsidian vault (watch vault → ingest artifacts; write new notes back to vault)
- Introduces mobile-friendly browser image upload stored at a reliable path on the Pi filesystem
- Introduces a Workshop that triggers local build processes (including Claude Code / "open claw bot"), streams logs, and surfaces hinge-point decisions
- Introduces a two-user shared workspace with websocket-based live updates
- Introduces workspace-level authentication gating Pi access from LAN devices and mobile browsers

## Capabilities

### New Capabilities

- `local-runtime`: Node.js server on the Pi — file watching, artifact indexing, event creation, build orchestration, websocket broadcast, cost tracking
- `artifact-model`: Core data model — Note, Image, Cluster, Spec, Build Session, Event, Comment — stored in SQLite with stable IDs and metadata
- `archive`: Free-placement card canvas for accumulating, grouping, and pruning notes and images; entry point into Notary
- `notary`: BlockNote-based spec editor; receives clusters from Archive; produces finalized Specs handed off to Workshop
- `workshop`: Control room for build processes — trigger, stream logs, track cost, surface hinge points, link back to Notary
- `mission-control`: Graphical map/sketch overview — shows system state, pending work, cost/build summaries, and navigation into places
- `inbox`: Persistent left-rail feed of events and agent activity; supports threaded comments and structured commands
- `obsidian-sync`: Bidirectional sync between Obsidian vault and Sojourn Archive (vault → ingest notes; Archive-created notes → write to vault)
- `image-storage`: Browser upload (including mobile) stores image files on the Pi at a configurable root path; serves thumbnails via local runtime
- `collaboration`: Two-user shared workspace — websocket live updates, user attribution on changes, shared inbox/archive/specs/workshop visibility
- `auth`: Workspace-level authentication for LAN and mobile browser access; simple shared-secret or token model for MVP

### Modified Capabilities

## Impact

- New system, no existing code to modify
- Depends on: Node.js runtime on Raspberry Pi, SQLite, React/TypeScript frontend, BlockNote editor, WebSocket server, Obsidian vault accessible from Pi filesystem, configurable image storage directory
- Pi must be reachable on local network from both users' devices (desktop browsers + mobile browsers)
- Claude Code CLI ("open claw bot") must be installed and accessible on the Pi for build orchestration
