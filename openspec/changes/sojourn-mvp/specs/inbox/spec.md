## ADDED Requirements

### Requirement: Persistent left-rail event feed
The Inbox SHALL be a persistent left-column panel visible across all place views. It SHALL display a chronological feed of Events, newest first. Each item SHALL show: event type icon, actor, message summary, timestamp, and related artifact name if applicable.

#### Scenario: Inbox visible in all places
- **WHEN** a user navigates between Mission Control, Archive, Notary, and Workshop
- **THEN** the Inbox panel remains visible on the left

#### Scenario: Events appear in feed
- **WHEN** a new Event is created (any type)
- **THEN** it appears at the top of the Inbox feed within 1 second via WebSocket

### Requirement: Inbox item types
The Inbox SHALL display Events of the following types, each with a distinct visual style or icon: `note_added`, `image_added`, `comment_posted`, `spec_created`, `spec_revised`, `build_started`, `build_finished`, `build_failed`, `hinge_point_surfaced`, `cost_threshold_crossed`, `preview_available`, `collaborator_comment`, `agent_message`.

#### Scenario: Build failed item is visually distinct
- **WHEN** a `build_failed` event appears in the Inbox
- **THEN** it is visually differentiated (e.g., red indicator) from neutral events

### Requirement: Click-through to related artifact
Clicking any Inbox item SHALL navigate the main panel to the view and artifact relevant to that event (e.g., clicking a `comment_posted` event navigates to the commented artifact).

#### Scenario: Click navigates to artifact
- **WHEN** a user clicks a `spec_created` event in the Inbox
- **THEN** the Notary view opens showing the relevant Spec

### Requirement: Threaded comments inline
For comment events in the Inbox, users SHALL be able to expand a thread panel inline to read and reply to comment threads without leaving the Inbox.

#### Scenario: Comment thread expands
- **WHEN** a user clicks on a comment event
- **THEN** the full thread expands inline within the Inbox panel

### Requirement: Filter by type or place
Users SHALL be able to filter the Inbox feed by event type category (e.g., "builds", "comments", "specs") or by place origin (Archive, Notary, Workshop).

#### Scenario: Filter applied
- **WHEN** a user selects the "builds" filter
- **THEN** only `build_started`, `build_finished`, `build_failed` events are shown

### Requirement: Unread indicators
Events created since the user's last active session SHALL be marked as unread. The total unread count SHALL be visible at the top of the Inbox. Events are marked read when scrolled into view.

#### Scenario: New events are marked unread
- **WHEN** a user opens the app after events occurred while they were away
- **THEN** new events are visually marked as unread and the unread count is shown

### Requirement: Command input for structured actions
The Inbox SHALL include a command input field that accepts structured natural-language commands. Supported MVP commands: `create spec from [cluster name]`, `summarize [cluster name]`, `show build status`, `show recent costs`, `surface open hinge points`.

#### Scenario: Command triggers action
- **WHEN** a user types "show build status" and submits
- **THEN** the Workshop view opens and/or a build status summary appears in the Inbox feed

#### Scenario: Unknown command handled gracefully
- **WHEN** a user submits an unrecognized command
- **THEN** an agent_message event appears with a helpful response indicating supported commands
