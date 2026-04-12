## ADDED Requirements

### Requirement: Shared workspace with two-user visibility
All artifacts (Notes, Images, Clusters, Specs, BuildSessions, Events, Comments) SHALL exist in a single shared workspace accessible to both users simultaneously. There is no per-user workspace isolation in MVP.

#### Scenario: Second user sees all artifacts
- **WHEN** User A creates a Note artifact
- **THEN** User B sees the Note in their Archive without refreshing the page

### Requirement: WebSocket-based live updates
All artifact changes SHALL be broadcast to connected clients via WebSocket within 500ms of the change occurring on the server. Clients SHALL update their UI state reactively without requiring a page reload.

#### Scenario: Spec edit appears for partner
- **WHEN** User A saves changes to a Spec in Notary
- **THEN** User B's Notary view shows the updated spec within 1 second

#### Scenario: Build status updates in real time
- **WHEN** a build transitions from `running` to `completed`
- **THEN** both users' Workshop views update the status indicator simultaneously

### Requirement: User attribution on changes
Every artifact creation and modification SHALL record the acting user's identifier. The UI SHALL display attribution on artifacts (e.g., "created by Calvin", "last edited by Wife").

#### Scenario: Note shows creator
- **WHEN** User A creates a Note
- **THEN** the Note card shows "created by [User A's name]"

### Requirement: Comment attribution
Every Comment SHALL record and display the author's name. Comments from different users SHALL be visually distinguishable.

#### Scenario: Comments show distinct authors
- **WHEN** both users post comments on the same Spec
- **THEN** each comment displays the author's name and they are visually distinct

### Requirement: Light presence indicator
The UI SHALL show a light presence indicator for each connected user (e.g., a colored dot or initials badge in the control bar). Only online/offline state is shown — no cursor or selection sharing.

#### Scenario: Partner online indicator
- **WHEN** User B connects to the workspace
- **THEN** User A sees an indicator showing User B is online

### Requirement: Last-write-wins conflict model
For MVP, concurrent edits to the same artifact SHALL use last-write-wins. No merge or diff resolution is required. The `updated_at` timestamp and `updated_by` field SHALL make the winning edit visible.

#### Scenario: Concurrent spec edits resolved
- **WHEN** both users save edits to the same Spec within seconds of each other
- **THEN** the later save overwrites the earlier one and the `updated_at` reflects the latest change

### Requirement: Shared inbox feed
The Inbox event feed SHALL be identical for both users. Both users SHALL see all events in the same chronological order.

#### Scenario: Both users see the same events
- **WHEN** a new build finishes
- **THEN** the `build_finished` event appears in both users' Inbox feeds
