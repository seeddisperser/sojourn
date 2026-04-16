## Why

The current Sojourn UI suffers from several friction points: the persistent inbox sidebar wastes horizontal space and competes with the main canvas, the inbox itself lacks meaningful structure (no thread grouping, no space-activity drill-down), and there is no way for Calvin to involve agents or collaborators by name inside comments. Two bugs round out the urgency — note content is silently lost on render, and the Archive canvas has no way to create groups after the item-detail click feature broke that path.

## What Changes

- **Remove persistent inbox sidebar** from AppShell layout; inbox becomes a first-class navigable page reachable from ControlBar and MissionControl.
- **Revamp Inbox page** with two sections: (1) Spaces panel (Archive, Notary, Workshop) showing activity logs per space on click; (2) Messages/threads panel using a traditional two-pane preview-left / detail-right layout.
- **Add @mention feature to comments**: scan comment bodies for `@handle`, look up handles in `sojourn.config.json agents` map, POST to agent webhook, receive replies via new `/api/webhooks/agent/:handle/reply` endpoint, surface mention threads in Inbox.
- **Render @handle spans** in comment bodies as styled inline elements.
- **Fix note content not rendering** in ItemOverlay (content field not being populated/read correctly).
- **Add persistent "Add Group" button** to Archive canvas so groups can always be created, independent of item selection state.

## Capabilities

### New Capabilities

- `inbox-page`: Standalone Inbox page with Spaces activity panel and Messages/threads two-pane layout; replaces persistent sidebar.
- `agent-mentions`: @mention system in comments — config-driven agent registry, outbound webhook dispatch, inbound reply endpoint, Inbox thread surfacing, and styled mention rendering.

### Modified Capabilities

<!-- No existing spec files to delta against -->

## Impact

- **Client**:
  - `AppShell.tsx` — remove Inbox sidebar, adjust layout
  - `ControlBar.tsx` — add Inbox nav item
  - `MissionControl.tsx` — add Inbox shortcut card
  - `ArchivePage.tsx` — add persistent Add Group button
  - `ItemOverlay.tsx` — fix note content rendering; render @mention spans
  - New `InboxPage.tsx` component
- **Server**:
  - New `server/src/routes/webhooks.ts` — `POST /api/webhooks/agent/:handle/reply`
  - `server/src/routes/comments.ts` — post-insert mention scanning + outbound webhook dispatch
  - `sojourn.config.json` — new optional `agents` map field; config schema updated
- **Database**: no schema changes required (agent replies create regular comments attributed to handle)
- **Dependencies**: none new; standard `fetch` for outbound webhook calls
