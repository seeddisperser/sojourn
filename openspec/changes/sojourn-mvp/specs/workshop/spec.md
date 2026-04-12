## ADDED Requirements

### Requirement: Trigger build process from spec
Users SHALL be able to trigger a build in the Workshop by providing a command string. The command SHALL be stored in the BuildSession. The Workshop SHALL support invoking Claude Code CLI as the primary build agent command.

#### Scenario: Build triggered with command
- **WHEN** a user triggers a build with command `claude --dangerously-skip-permissions -p "<prompt>"`
- **THEN** a BuildSession is created, the process is spawned on the Pi, and the Workshop view shows status `running`

### Requirement: Active builds list with status indicators
The Workshop SHALL display a list of all BuildSessions (active and recent). Each entry SHALL show: command or spec title, status (pending / running / completed / failed / interrupted), start time, and duration.

#### Scenario: Build appears in list
- **WHEN** a build is triggered
- **THEN** it appears immediately in the active builds list with status `running`

### Requirement: Real-time log streaming
The Workshop SHALL stream stdout and stderr from the running build process to all connected clients via WebSocket. Log lines SHALL appear in the Workshop log panel in real time.

#### Scenario: Log lines appear in real time
- **WHEN** the build process emits a line to stdout
- **THEN** the line appears in the Workshop log panel within 1 second

### Requirement: Token and cost display
The Workshop SHALL display cost metrics for a BuildSession when available. It SHALL show per-session token usage and a running total. Cost data SHALL update as the build progresses if emitted incrementally.

#### Scenario: Cost displayed after build
- **WHEN** a build completes and cost data was recorded
- **THEN** the Workshop shows the token count and cost summary for that session

### Requirement: Preview URL display
When a BuildSession records a `preview_url`, the Workshop SHALL display a clickable link to that URL.

#### Scenario: Preview link shown
- **WHEN** a build sets a `preview_url`
- **THEN** a clickable "Open Preview" link appears in the Workshop panel

### Requirement: Stop and restart build process
Users SHALL be able to stop a running build process. The process SHALL be terminated, the BuildSession status updated to `interrupted`, and an Event created.

#### Scenario: Build stopped by user
- **WHEN** a user clicks "Stop" on a running build
- **THEN** the child process is terminated, the BuildSession status becomes `interrupted`, and log streaming stops

### Requirement: Hinge point cards
Open HingePoints associated with the active BuildSession SHALL be displayed as cards in the Workshop. Each card SHALL show the description and source (user or agent). Users SHALL be able to acknowledge a hinge point.

#### Scenario: Hinge point acknowledged
- **WHEN** a user acknowledges a hinge point
- **THEN** its status becomes `acknowledged`, `acknowledged_at` and `acknowledged_by` are recorded, and the card is visually resolved

#### Scenario: Agent hinge point surfaced during build
- **WHEN** the build process emits `[HINGE] <text>` to stdout
- **THEN** a HingePoint card appears in the Workshop with `source: agent`

### Requirement: Flag hinge point manually
Users SHALL be able to manually create a hinge point by clicking "Flag as hinge point" in the Workshop and entering a description.

#### Scenario: Manual hinge point created
- **WHEN** a user flags a hinge point with a description
- **THEN** a HingePoint is created with `source: user` and appears as a card in the Workshop

### Requirement: Send build result back to Notary
After a build completes, users SHALL be able to navigate back to the linked Spec in Notary, with the BuildSession linked in `linked_build_ids`.

#### Scenario: Build result linked to spec
- **WHEN** a user navigates to the Spec from the Workshop after build completion
- **THEN** the Spec's `linked_build_ids` includes the completed BuildSession ID

### Requirement: Workshop does not edit code
The Workshop SHALL NOT provide any code editing interface. It is a control and observation surface only.

#### Scenario: No code editor in Workshop
- **WHEN** a user is in the Workshop view
- **THEN** there is no editable code textarea or code editor component rendered
