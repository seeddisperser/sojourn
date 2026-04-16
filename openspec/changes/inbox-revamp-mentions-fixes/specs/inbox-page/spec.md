## ADDED Requirements

### Requirement: Inbox is a navigable page
The system SHALL provide an Inbox page at route `/inbox` that replaces the persistent left-hand sidebar. The persistent sidebar SHALL be removed from the application shell. The Inbox SHALL be reachable via the ControlBar navigation and via a shortcut card on MissionControl.

#### Scenario: Navigating to Inbox from ControlBar
- **WHEN** the user clicks the Inbox nav item in the ControlBar
- **THEN** the application navigates to `/inbox` and renders the Inbox page

#### Scenario: Navigating to Inbox from MissionControl
- **WHEN** the user clicks the Inbox shortcut card on the MissionControl page
- **THEN** the application navigates to `/inbox`

#### Scenario: Inbox sidebar is absent
- **WHEN** the user is on any page (Archive, Notary, Workshop, MissionControl)
- **THEN** no inbox sidebar is rendered; the full viewport width is available to the page content

### Requirement: Inbox Spaces panel shows per-space activity
The Inbox page SHALL display a Spaces section at the top containing three clickable items: Archive, Notary, and Workshop. Selecting a space SHALL fetch and display the activity log for that space using the existing events API filtered by place.

#### Scenario: Selecting a space
- **WHEN** the user clicks a space item (e.g., Archive)
- **THEN** the activity log panel renders events filtered to that space, ordered by most recent first, showing event type, message, actor, and timestamp

#### Scenario: Default state with no space selected
- **WHEN** the Inbox page first loads and no space has been selected
- **THEN** the activity log panel shows a prompt to select a space

#### Scenario: Space with no recent activity
- **WHEN** the user selects a space that has no events
- **THEN** the activity log panel shows an empty state message

### Requirement: Inbox Messages panel uses two-pane thread layout
The Inbox page SHALL display a Messages section below the Spaces section. The Messages section SHALL use a two-pane layout: a thread list on the left and the selected thread's full comment history on the right.

#### Scenario: Thread list shows artifact threads
- **WHEN** the Messages panel loads
- **THEN** it shows a list of threads, each representing a unique artifact that has comments; each thread preview shows the artifact title, the most recent comment snippet, the author, and the relative time

#### Scenario: Selecting a thread
- **WHEN** the user clicks a thread in the left pane
- **THEN** the right pane renders the full comment thread for that artifact, ordered chronologically

#### Scenario: Empty messages state
- **WHEN** there are no comment threads to display
- **THEN** the Messages panel shows an empty state indicating no messages yet

### Requirement: @mention threads surface in Inbox Messages panel
Comments that contain @mention patterns SHALL cause that artifact's thread to appear in the Inbox Messages panel, ensuring mention interactions are visible in the inbox.

#### Scenario: Mention triggers thread visibility
- **WHEN** a comment containing `@handle` is posted on an artifact
- **THEN** that artifact's thread appears in (or moves to the top of) the Inbox Messages thread list
