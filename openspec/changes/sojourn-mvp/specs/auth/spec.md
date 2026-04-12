## ADDED Requirements

### Requirement: Workspace token authentication
The system SHALL use a single shared workspace token for authentication. The token SHALL be generated once at setup and stored in `sojourn.config.json`. Any user who knows the token can access the workspace.

#### Scenario: Valid token grants access
- **WHEN** a user submits the correct workspace token on the login page
- **THEN** a session is established and the user is redirected to Mission Control

#### Scenario: Invalid token rejected
- **WHEN** a user submits an incorrect token
- **THEN** access is denied and an error message is shown

### Requirement: Session persistence via httpOnly cookie
After successful authentication, the runtime SHALL set an httpOnly, SameSite=Strict session cookie. The session SHALL persist for a configurable duration (default: 30 days). No re-authentication is required until the session expires.

#### Scenario: Session persists across browser restarts
- **WHEN** a user closes and reopens the browser
- **THEN** they remain logged in without re-entering the token (within the session duration)

### Requirement: All API routes require valid session
Every REST API route and WebSocket connection SHALL require a valid session cookie. Unauthenticated requests SHALL receive a 401 response and be redirected to the login page.

#### Scenario: Unauthenticated API request rejected
- **WHEN** a request is made to any API endpoint without a valid session cookie
- **THEN** a 401 response is returned

#### Scenario: WebSocket without session rejected
- **WHEN** a WebSocket connection is attempted without a valid session
- **THEN** the connection is rejected

### Requirement: Login page served unauthenticated
The login page SHALL be the only route accessible without authentication. All other routes (including the frontend app) SHALL redirect to the login page if no valid session is present.

#### Scenario: Unauthenticated browser redirected to login
- **WHEN** a browser navigates to `http://<pi-ip>:3000` without a session
- **THEN** the login page is displayed

### Requirement: User identity from session
Each session SHALL be associated with a user name. During the login flow, users SHALL provide their name alongside the workspace token. The name is stored in the session and used for attribution.

#### Scenario: User name recorded with session
- **WHEN** a user logs in with name "Calvin" and the correct token
- **THEN** all subsequent actions by that session are attributed to "Calvin"

### Requirement: LAN access without public exposure
The runtime SHALL bind to all network interfaces (0.0.0.0) so it is accessible from any device on the local network. It SHALL NOT configure any public-internet port forwarding or external tunneling by default.

#### Scenario: Accessible from phone on same network
- **WHEN** a mobile phone on the same WiFi network navigates to `http://<pi-ip>:3000`
- **THEN** the login page loads

#### Scenario: Not accessible from public internet by default
- **WHEN** a device on the public internet attempts to connect
- **THEN** the connection fails (protected by home router NAT by default)
