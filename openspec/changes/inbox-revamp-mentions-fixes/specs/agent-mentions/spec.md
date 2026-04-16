## ADDED Requirements

### Requirement: Agent registry in config
The system SHALL support an optional `agents` map in `sojourn.config.json` that maps handle strings to webhook URLs. The config schema SHALL accept this field without requiring it.

#### Scenario: Config with agents map
- **WHEN** `sojourn.config.json` contains `"agents": { "botson": "http://localhost:3000/webhooks/agent/botson" }`
- **THEN** the server loads the agents map at startup and makes it available for mention dispatch

#### Scenario: Config without agents map
- **WHEN** `sojourn.config.json` does not contain an `agents` field
- **THEN** the server starts normally; mentions are scanned but no webhooks are dispatched

### Requirement: @mention scanning on comment creation
After a comment is successfully saved, the server SHALL scan the comment body for `@handle` patterns (regex `/@(\w+)/g`). For each handle found that exists in the agents config map, the server SHALL dispatch a webhook POST to the registered URL, non-blocking (fire-and-forget).

#### Scenario: Comment with a registered @mention
- **WHEN** a comment body contains `@botson` and `botson` is registered in the agents map
- **THEN** the server fires a POST to the botson webhook URL with payload `{ mention, comment: { id, body, author }, artifact: { type, id, title, content } }` and returns the comment creation response without waiting for the webhook

#### Scenario: Comment with an unregistered @mention
- **WHEN** a comment body contains `@unknown` and `unknown` is not in the agents map
- **THEN** the server saves the comment normally; no webhook is dispatched

#### Scenario: Comment with no @mentions
- **WHEN** a comment body contains no `@` patterns
- **THEN** the server saves the comment normally; no mention scanning overhead affects the response

#### Scenario: Webhook dispatch failure
- **WHEN** the agent webhook URL is unreachable or returns an error
- **THEN** the comment is already saved and the response has been returned; the failure is logged server-side but does not affect the user

### Requirement: Agent reply inbound webhook endpoint
The server SHALL expose `POST /api/webhooks/agent/:handle/reply` that accepts an agent reply payload and creates a comment attributed to the agent handle. This endpoint SHALL require the standard auth token.

#### Scenario: Agent posts a reply
- **WHEN** `POST /api/webhooks/agent/botson/reply` is called with `{ artifact_id, artifact_type, body }`
- **THEN** a comment is created with `author = "botson"`, `artifact_id`, `artifact_type`, and `body`; a `comment_posted` event is broadcast via WebSocket

#### Scenario: Reply with missing required fields
- **WHEN** the reply payload is missing `artifact_id`, `artifact_type`, or `body`
- **THEN** the server returns HTTP 400 with an error message; no comment is created

### Requirement: @mention spans rendered in comment bodies
The client SHALL render `@handle` tokens in comment body text as visually distinct styled inline elements so mentions are easy to identify at a glance.

#### Scenario: Comment body contains a mention
- **WHEN** a comment with body text containing `@botson` is rendered
- **THEN** the `@botson` token is wrapped in a styled span (distinct colour or weight) while the surrounding text renders normally

#### Scenario: Agent-authored comment is visually distinct
- **WHEN** a comment's `author` field matches a handle (e.g., `"botson"`)
- **THEN** the author byline is rendered in a distinct style (e.g., accent colour) to distinguish it from human-authored comments

### Requirement: Archive canvas has a persistent Add Group button
The Archive canvas SHALL display a persistent "Add Group" button in the page toolbar that is always visible regardless of item selection state, so users can create groups at any time.

#### Scenario: Creating a group with selected items
- **WHEN** the user has one or more items selected on the canvas and clicks the "Add Group" button
- **THEN** the selected items are grouped into a new cluster with a default title; the cluster appears on the canvas

#### Scenario: Creating an empty group with no selection
- **WHEN** the user has no items selected and clicks the "Add Group" button
- **THEN** the system creates a new empty cluster (with a default or prompted title) and adds it to the canvas

### Requirement: Note content renders in ItemOverlay
When a note is opened in the item overlay, its saved content SHALL be displayed in the editor, not a blank input.

#### Scenario: Opening a note with existing content
- **WHEN** the user clicks a note card on the Archive canvas
- **THEN** the overlay opens with the note's `content` field pre-populated in the text area

#### Scenario: Opening a newly created note
- **WHEN** the user creates a new note and the overlay opens
- **THEN** the text area is empty (no phantom content from a previously viewed note)
