Sojourn MVP Spec
1. Product Summary

Sojourn is a local-first mission command environment for creative and technical work. It helps individuals and small teams transform raw context into specs, builds, and feedback through a set of connected places:

Archive
Notary
Workshop
Mission Control
later: Observatory

The system is designed around a central idea:

Raw material accumulates in the archive, gets shaped into conviction in the notary, gets enacted through the workshop, and is observed through the observatory forming feedback loops over time.

The MVP should prove that this loop is more useful and more alive than using separate tools with no shared substrate.

2. MVP Goal

The MVP should answer one core question:

Can a local-first system with a shared inbox and place-based canvases help users move more fluidly from notes and images to specs and builds?

This version is not trying to replace:

Obsidian
VS Code
chat apps
analytics tools

It is trying to become the coordination and navigation layer between them.

3. Primary Users
Primary user

A solo builder working locally with:

an Obsidian vault
local image folders
local build workflows
agents that help synthesize, generate, and monitor work
Secondary user

A very small team, initially:

me
my wife

The MVP should support shared visibility and light collaboration without requiring heavy enterprise permissions or real-time multiplayer complexity.

4. Product Principles
Local-first

Files remain on disk. Builds happen locally. Sojourn indexes, enriches, and coordinates rather than replacing local tools.

Mission command, not tool replacement

Sojourn should surface the right context, updates, and hinge points while letting work continue in the best local tools.

Places as cognitive environments

Each place has a distinct purpose and interaction style, not just a different page.

Artifacts as the connective tissue

Everything important in the system should become an artifact that can move between places.

Structured but alive

The system should feel crafted, warm, and graphical, not like a sterile dashboard.

5. Core Product Surfaces

The MVP UI consists of three major layout zones.

Left rail: Inbox

A persistent workspace inbox that shows messages, updates, comments, status changes, and agent activity.

Purpose:

see what has happened
issue commands
jump into relevant work
comment on active artifacts
coordinate with other people and agents

This replaces the need to use Telegram as the main shared coordination layer.

Center/right main area: Active View Canvas

A flexible main workspace that switches between:

Mission Control
Archive
Notary
Workshop
later: Observatory

This is the primary stage for interaction.

Top bar or right-side control rail: Place Navigation + Global Status

A persistent control area that allows the user to:

switch views
see cost summary/token usage
see running builds
see sync status

This should feel like a lightweight control bar rather than a dense admin panel.

6. High-Level Information Architecture
Mission Control

A graphical overview of the system and entry point into the different places.

Purpose:

orient the user
show the current state of work
invite entry into Archive, Notary, Workshop

Visual direction:

hand-drawn / garden sketch feel
places represented spatially
crafted, intentional, alive
not a technical network graph
I've added visual inspiration here: inspiration/mission control 

Mission Control is both:

a dashboard
a threshold

It sets the tone for the whole app.

Archive

The compost heap and substrate of the system.

Purpose:

collect notes
collect images
create new notes
annotate
group related material
comment
prune and reorganize
prepare clusters for Notary

Archive is the place of accumulation, decomposition, association, and emergence.

Archive visual inspiration: inspiration/archive

Notary

The place where raw material becomes a hypothesis, conviction, or specification.

Purpose:

gather selected archive artifacts
create/edit a spec
comment on the spec
refine goals, constraints, and implementation direction
hand off to Workshop

Notary should feel like a place of commitment and compression.

Workshop

The place where building is coordinated and monitored.

Purpose:

trigger local build processes
show build status
show logs and snapshots
show token usage / cost
surface hinge-point decisions
link out to local tools like VS Code and local dev servers

Workshop should not be an editor. It should be a control room for build activity.

Observatory

Deferred for later.

Future purpose:

evaluate whether a project is producing signal
show use, engagement, embeddedness, and value
help interpret what reality is saying back
7. Core Loop

The MVP should support this flow clearly:

1. Ingest into Archive

User adds or syncs:

markdown notes from Obsidian
local images
new in-app notes
2. Organize in Archive

User:

drags cards
groups cards
comments
annotates
prunes
selects a cluster
3. Send to Notary

Selected items are packaged into a Notary draft.

4. Edit in Notary

User:

refines the hypothesis
defines scope and constraints
comments with collaborator(s)
finalizes a spec
5. Trigger Workshop

Spec is sent to the Workshop, where a local process is launched or coordinated.

6. Monitor build

User sees:

status
logs
cost
snapshots
hinge points
preview links
7. Return information to system

Build outcomes, comments, errors, and reflections appear in the inbox and can feed back into Archive or Notary.

8. Artifact Model

Artifacts are the core units of the system.

Artifact types in MVP
Note

A text note sourced from:

Obsidian
in-app creation

Fields:

id
title
content
source_path
created_at
updated_at
tags
comments
linked_artifacts
Image

A local image file surfaced as a card.

Fields:

id
file_path
thumbnail
caption
comments
tags
linked_artifacts
Cluster

A user-defined group of notes/images on the Archive canvas.

Fields:

id
title
member_artifact_ids
position
description
comments
Spec

A structured document in Notary.

Fields:

id
title
status
source_cluster_ids
body
comments
created_by
version
linked_build_ids
Build Session

A Workshop artifact representing a local process.

Fields:

id
spec_id
status
started_at
updated_at
logs
cost_metrics
preview_url
screenshots
hinge_points
local_paths
Event

A timeline object that appears in the inbox.

Fields:

id
type
actor
related_artifact_id
message
timestamp
metadata
Comment

A threaded comment attached to any artifact or event.

Fields:

id
parent_id
artifact_id
author
body
created_at
9. Layout Spec
Overall Layout
Left column

Persistent Inbox

Width:

fixed or resizable
wide enough for messages and thread previews

Contains:

event feed
filter tabs
command input
unread indicators
active thread panel
Main panel

Switchable place view

This panel changes based on selected place:

Mission Control
Archive
Notary
Workshop

It should preserve the feeling that the user is entering a different environment, not merely switching tabs.

Global control area

Top bar or right rail

Contains:

place navigation
current workspace / project
active build count
token/cost summary
sync status
user presence
settings
10. View-Level Specs
Mission Control View
Purpose

Provide overview, orientation, and entry into the system.

MVP contents
graphical map/sketch of the places
current active project/workspace
total cost summary
recent build status
pending hinge points
pending comments
recent movement between places
shortcuts into Archive / Notary / Workshop
Interaction
click a place to enter it
hover or select to see summary
click a pending issue to jump directly to relevant artifact
Tone
hand-drawn
warm
intentional
lightly game-like, but not cute
crafted over corporate
Archive View
Purpose

Explore, gather, group, and transform notes and images.

MVP contents
free-placement card canvas
note cards
image cards
clusters/groups
comments
simple selection tools
Core actions
import/sync from vault and image folders
create new note card
drag card
multi-select cards
group into cluster
rename cluster
add comment to card or cluster
remove/prune card from active area
send cluster to Notary
Canvas model

Simple card canvas with:

absolute placement
pan/zoom optional
grouping
comments
lightweight metadata

No complex node graph required for MVP.

Notary View
Purpose

Turn selected material into a draft specification.

MVP contents
BlockNote editor
source materials panel
spec metadata
comment threads
version status
Suggested spec sections
Title
Hypothesis / Conviction
Why this matters
Source material
Scope
Constraints
Open questions
Implementation notes
Next actions
Core actions
create spec from cluster
edit spec
comment on spec
revise based on discussion
trigger build in Workshop
return to Archive for more material
Workshop View
Purpose

Surface build progress and decision points while local development happens elsewhere.

MVP contents
active builds list
status indicators
log stream
token/cost tracker
preview links
screenshots/snapshots
hinge point cards
errors/issues
Core actions
trigger build process
stop/restart process
open relevant local path
open local dev server link
acknowledge hinge point
comment on issue
send build result back to Notary
Important boundary

Workshop does not edit code.
It coordinates and observes.

Inbox
Purpose

Act as the unified workspace feed and coordination layer.

Inbox item types
note added
image added
comment posted
spec created
spec revised
build started
build finished
build failed
hinge point surfaced
cost threshold crossed
preview available
collaborator comment
agent message
Inbox behaviors
chronological feed
filter by artifact type or place
click-through into related view
threaded comments
command input for structured actions
Example commands
create spec from selected cluster
summarize this cluster
show build status
show recent costs
surface open hinge points

The inbox should feel more like a mission log than a generic team chat.

11. Collaboration Model
MVP collaboration scope

Support two users in a shared workspace:

shared archive
shared specs
shared inbox
shared workshop visibility
Collaboration behavior
websocket-based live updates
light presence
user attribution on changes
comments and threaded discussion
Deferred
full CRDT everywhere
granular permissions
roles
complex org/team model

For MVP, the goal is simply:
both users can see and participate in the same evolving system.

12. Technical Architecture
Frontend
React
TypeScript
Tailwind
UI composition
persistent shell layout
routed or stateful place switching
card-based Archive canvas
BlockNote in Notary
event feed in Inbox
Workshop status panels
Runtime

Local Node server

Responsibilities:

file watching
indexing notes/images
local API
websocket updates
triggering build processes
collecting logs/status
handling agent events
tracking cost metrics

Future:

optionally wrapped in Tauri for packaged local app distribution
Source of truth
Files on disk
Obsidian vault
local image folders
Metadata database
SQLite initially
optionally Postgres later

Stores:

artifact metadata
card positions
clusters
comments
events
build records
cost records
user metadata
Sync model
local runtime exposes secure browser-accessible UI
websocket-based updates between clients
support access from other devices on the same trusted network or through a controlled remote access layer

Because you want access beyond localhost, the Node runtime should be reachable from other devices, but access must be gated by workspace auth and safe network assumptions.

13. Local Runtime Responsibilities

The local runtime is the heart of the system.

It should handle:

File indexing
watch Obsidian vault
watch image directories
ingest changed files
extract note content and image metadata
create/update corresponding artifacts
Event creation
turn file changes, comments, builds, and commands into inbox events
Build orchestration
start local processes
capture logs
track process state
collect output links and snapshots
stream status to browser clients
Cost tracking
record token use where available
store spend summaries by build/session
surface thresholds and trends
Agent coordination
receive command requests
call underlying local tools/agents
emit results as events
14. Security / Access Model

Because this is local-first but reachable from other devices, security matters even in MVP.

MVP approach
workspace-level authentication
trusted users only
local runtime configurable for LAN access
no public-by-default exposure
simple device-safe model first

Avoid building broad internet exposure into the first version unless necessary.

A good first shape is:

local runtime on trusted machine
browser UI accessible by approved users/devices
simple auth
optional later remote tunneling or packaged desktop shell
15. Design Direction
Overall mood
crafted
calm
graphical
intentional
alive
not overly technical
Visual metaphor

A garden / cultivated system of places

Not literal gamification, but:

spatial
symbolic
organic
warm
Mission Control visual style

Should feel like:

a sketched plan of land
a crafted map of activity
a place of orientation
Archive visual style

Should feel tactile and exploratory:

cards
grouped material
space to move things around
visual mix of writing and imagery
Notary visual style

More focused and formal:

cleaner composition
document-like
clarity and commitment
Workshop visual style

Instrumental but still elegant:

status
signals
logs
previews
decisions
16. MVP Functional Requirements
Required for MVP
Archive
ingest notes from Obsidian
ingest images from local folders
render as cards
drag/place cards
group cards into clusters
comment on cards/clusters
create new note
send cluster to Notary
Notary
create spec from cluster
edit spec in BlockNote
show source materials
comment on spec
trigger Workshop process
Workshop
start local build process
show process status
stream logs
show preview URL
show snapshots
track simple token/cost values
surface hinge point issues
Inbox
show event feed
threaded comments
click-through to artifact/view
show collaborator and agent activity
Mission Control
show place overview
show active/pending work
show simple cost/build summaries
navigate into places
Shared workspace
two-user visibility
websocket updates
authorship attribution
17. Non-Goals for MVP

Do not build yet:

full observatory analytics
advanced graph relationships
rich canvas connection lines
complete CRDT-based collaboration everywhere
replacement for Obsidian
replacement for VS Code
public sharing infrastructure
complex agent marketplace/system
fine-grained roles and permissions
elaborate economy/game systems