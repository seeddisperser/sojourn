## ADDED Requirements

### Requirement: Archive renders artifacts as cards on a canvas
The Archive view SHALL display Note and Image artifacts as draggable cards on a free-placement canvas with absolute positioning. Cards SHALL show a title/thumbnail preview. The canvas SHALL support pan with mouse drag on empty space.

#### Scenario: Notes display as text cards
- **WHEN** the Archive is opened
- **THEN** Note artifacts appear as cards showing title and a content excerpt

#### Scenario: Images display as image cards
- **WHEN** an Image artifact exists in the system
- **THEN** it appears as a card showing the thumbnail

### Requirement: Cards are draggable to any canvas position
Users SHALL be able to drag any card to a new absolute position on the canvas. The new position SHALL be persisted to SQLite immediately on drop.

#### Scenario: Card position persists after drag
- **WHEN** a user drags a card to a new position and releases
- **THEN** on page refresh the card appears in the new position

### Requirement: Multi-select and group into cluster
Users SHALL be able to multi-select cards (shift-click or rubber-band drag) and group them into a named Cluster. The Cluster SHALL be represented as a visual container on the canvas.

#### Scenario: Grouping creates cluster
- **WHEN** a user selects multiple cards and chooses "Group"
- **THEN** a Cluster artifact is created containing those artifact IDs, and the cards appear visually grouped

#### Scenario: Cluster is named
- **WHEN** a cluster is created
- **THEN** the user is prompted to name it, and the name appears on the cluster container

### Requirement: New note creation in Archive
Users SHALL be able to create a new Note artifact directly in the Archive by typing inline. The note SHALL appear as a card immediately and be persisted to SQLite.

#### Scenario: New note appears on canvas
- **WHEN** a user creates a new note in Archive
- **THEN** a Note artifact is created, a card appears on the canvas, and an `note_added` Event is created

### Requirement: Comment on cards and clusters
Users SHALL be able to add threaded comments to any Note card, Image card, or Cluster. Comments SHALL be visible inline on the card or in an expanded panel.

#### Scenario: Comment posted on card
- **WHEN** a user submits a comment on a Note card
- **THEN** the comment is persisted, appears on the card, and a `comment_posted` Event is created and broadcast to all clients

### Requirement: Prune artifacts from active canvas
Users SHALL be able to remove a card from the active canvas view (soft-archive). Pruned artifacts are NOT deleted from the database; they are hidden from the default canvas view.

#### Scenario: Pruned card disappears from canvas
- **WHEN** a user prunes a card
- **THEN** it no longer appears on the default Archive canvas but remains in the SQLite database

### Requirement: Send cluster to Notary
Users SHALL be able to select a Cluster and send it to Notary. This action SHALL create a Spec artifact draft pre-populated with the cluster's member artifacts as source material.

#### Scenario: Cluster sent to Notary
- **WHEN** a user sends a Cluster to Notary
- **THEN** a Spec artifact is created with `source_cluster_ids` containing the cluster ID, and the user is navigated to the Notary view showing the new spec draft

### Requirement: Mobile list view fallback
On mobile screen widths, the Archive SHALL display artifacts in a scrollable list view rather than the free-placement canvas. List items SHALL show title/thumbnail and allow tap-to-view.

#### Scenario: Mobile shows list view
- **WHEN** the Archive is viewed on a screen narrower than 768px
- **THEN** a scrollable list of cards is shown instead of the canvas

### Requirement: Auto-sync from local runtime
When the local runtime detects new artifacts (from Obsidian or image watches), the Archive canvas SHALL update in real time via WebSocket without requiring a page refresh.

#### Scenario: New note appears without refresh
- **WHEN** a new note is added to the Obsidian vault
- **THEN** a new card appears on the Archive canvas within 3 seconds for all connected clients
