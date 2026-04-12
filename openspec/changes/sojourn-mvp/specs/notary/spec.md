## ADDED Requirements

### Requirement: Spec created from Archive cluster
A Spec artifact SHALL be creatable from an Archive Cluster. The resulting Spec draft SHALL list the cluster's member artifacts in a source materials panel and pre-populate the spec title with the cluster name.

#### Scenario: Spec draft created
- **WHEN** a user sends a Cluster to Notary
- **THEN** a Spec artifact is created with status `draft`, `source_cluster_ids` containing the cluster ID, and the Notary view opens to the new spec

### Requirement: BlockNote editor for spec body
The Notary view SHALL provide a BlockNote rich-text block editor for authoring the spec body. The editor SHALL support headings, paragraphs, bullet lists, numbered lists, and code blocks. Content SHALL be stored as BlockNote JSON in the Spec artifact.

#### Scenario: Rich text persists
- **WHEN** a user types and formats content in the BlockNote editor and saves
- **THEN** the formatted content is preserved on reload with all formatting intact

### Requirement: Suggested spec sections
When a new Spec is created, the editor SHALL be pre-populated with section headings as placeholders: Title, Hypothesis / Conviction, Why This Matters, Source Material, Scope, Constraints, Open Questions, Implementation Notes, Next Actions.

#### Scenario: New spec has section scaffolding
- **WHEN** a new Spec draft is opened in the editor
- **THEN** the document contains the suggested section headings as a starting structure

### Requirement: Source materials panel
The Notary view SHALL display a read-only source materials panel alongside the editor showing all Note and Image artifacts from the linked source clusters. Users SHALL be able to reference this material while writing the spec.

#### Scenario: Source panel shows cluster contents
- **WHEN** a Spec is opened with a linked cluster
- **THEN** the source materials panel lists all member artifacts of that cluster

### Requirement: Threaded comments on specs
Users SHALL be able to post threaded comments on a Spec. Comments SHALL be visible in the Notary view alongside the editor and persist in SQLite.

#### Scenario: Comment posted on spec
- **WHEN** a user posts a comment on a Spec
- **THEN** the comment appears in the comments panel and a `comment_posted` Event is broadcast

### Requirement: Spec status lifecycle
A Spec SHALL transition through statuses: `draft` → `finalized`. Users SHALL be able to explicitly finalize a spec. Once finalized, the spec body is read-only unless explicitly reopened.

#### Scenario: Spec finalized
- **WHEN** a user clicks "Finalize"
- **THEN** the Spec status becomes `finalized`, the editor becomes read-only, and a `spec_revised` Event is created

### Requirement: Trigger Workshop build from spec
From a finalized Spec, users SHALL be able to trigger a Workshop build. This action SHALL navigate to the Workshop view and create a BuildSession linked to the Spec.

#### Scenario: Build triggered from Notary
- **WHEN** a user triggers a build on a finalized Spec
- **THEN** a BuildSession is created with `spec_id` referencing the Spec, the Workshop view opens, and the build starts

### Requirement: Return to Archive for more material
Users SHALL be able to navigate from Notary back to Archive to gather additional material, with the current Spec draft preserved and accessible on return.

#### Scenario: Navigation preserves draft
- **WHEN** a user navigates from Notary to Archive and back
- **THEN** the Spec draft is exactly as they left it
