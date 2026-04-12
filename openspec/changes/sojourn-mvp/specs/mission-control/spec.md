## ADDED Requirements

### Requirement: Graphical overview of system places
Mission Control SHALL display a graphical, spatially-arranged overview of the system's places (Archive, Notary, Workshop, and future Observatory). The visual style SHALL feel hand-drawn, warm, and map-like — not a technical graph or sterile dashboard.

#### Scenario: Mission Control loads as entry point
- **WHEN** a user opens the application
- **THEN** Mission Control is the default view shown

#### Scenario: Places are visually distinct areas
- **WHEN** Mission Control is displayed
- **THEN** Archive, Notary, and Workshop are each represented as distinct named zones on the graphical map

### Requirement: Navigation into places from map
Users SHALL be able to click any place on the Mission Control map to navigate to that place view.

#### Scenario: Click navigates to place
- **WHEN** a user clicks on the Archive zone in Mission Control
- **THEN** the Archive view is opened

### Requirement: Active work summary
Mission Control SHALL display a summary of active and pending work: current active builds count, pending hinge points count, pending (unread) inbox items count, and most recent build status.

#### Scenario: Active build shows on map
- **WHEN** a build is running
- **THEN** Mission Control shows the active build count and most recent status

### Requirement: Cost summary display
Mission Control SHALL show a simple token/cost summary: total spend for current period (day or session), and cost of the most recent build.

#### Scenario: Cost summary visible
- **WHEN** at least one completed build session with cost data exists
- **THEN** Mission Control displays the total cost and most recent build cost

### Requirement: Pending hinge points indicator
Mission Control SHALL show the count of open (unacknowledged) hinge points. Clicking the indicator SHALL navigate directly to the Workshop and highlight the open hinge points.

#### Scenario: Hinge point click navigates to Workshop
- **WHEN** a user clicks the pending hinge points indicator
- **THEN** the Workshop view opens with open hinge points visible

### Requirement: Pending comments indicator
Mission Control SHALL show the count of unread comments. Clicking SHALL open the Inbox filtered to comment events.

#### Scenario: Comment indicator opens filtered inbox
- **WHEN** a user clicks the pending comments count
- **THEN** the Inbox opens filtered to comment-type events

### Requirement: Tone and aesthetic
Mission Control SHALL feel crafted and intentional: warm color palette, sketch-like or hand-rendered spatial layout, subtle organic textures or line quality. It SHALL NOT look like a technical network graph, admin dashboard, or generic sidebar nav.

#### Scenario: Visual character matches design direction
- **WHEN** Mission Control is rendered
- **THEN** the map uses a hand-rendered or illustrated aesthetic consistent with the Mudbird-style inspiration imagery
