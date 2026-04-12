## ADDED Requirements

### Requirement: Browser upload stores image on Pi filesystem
Users SHALL be able to upload images via the browser (desktop or mobile). Uploaded images SHALL be stored on the Pi filesystem at `<storage_root>/<YYYY-MM-DD>/<uuid>.<ext>`. The storage root SHALL be configurable in `sojourn.config.json`.

#### Scenario: Image uploaded from desktop browser
- **WHEN** a user selects an image file via the upload UI on desktop
- **THEN** the file is stored at the correct path on the Pi and an Image artifact is created

#### Scenario: Image uploaded from mobile browser
- **WHEN** a user uploads an image from a mobile browser (iOS Safari or Android Chrome)
- **THEN** the file is stored on the Pi and an Image artifact is created with a thumbnail

### Requirement: Mobile camera capture supported
The upload input SHALL use `<input type="file" accept="image/*">` to support native camera/photo library selection on iOS and Android mobile browsers.

#### Scenario: Mobile camera option available
- **WHEN** a user on a mobile browser taps the upload button
- **THEN** the native iOS/Android file picker with camera option is presented

### Requirement: Thumbnail generated on ingest
On upload or file watcher detection, the runtime SHALL generate a thumbnail for each image using Sharp. Thumbnails SHALL be stored at `<storage_root>/thumbnails/<uuid>_thumb.jpg`. Max thumbnail dimensions: 400×400px, maintaining aspect ratio.

#### Scenario: Thumbnail created after upload
- **WHEN** an image is uploaded
- **THEN** a thumbnail file exists at `<storage_root>/thumbnails/<uuid>_thumb.jpg` within 5 seconds

#### Scenario: HEIF/HEIC from iPhone processed
- **WHEN** an iPhone user uploads a HEIC image
- **THEN** a thumbnail is generated successfully (requires libheif on the Pi)

### Requirement: Images served via runtime HTTP
The runtime SHALL expose a static file route for serving both full images and thumbnails from the storage root. Paths SHALL be authenticated (session required).

#### Scenario: Image served to authenticated client
- **WHEN** an authenticated browser requests `/api/images/<uuid>/thumbnail`
- **THEN** the thumbnail file is returned with the correct Content-Type

#### Scenario: Unauthenticated image request rejected
- **WHEN** a request for an image is made without a valid session
- **THEN** a 401 response is returned

### Requirement: Supported image formats
The system SHALL support the following upload formats: JPEG, PNG, WebP, HEIC/HEIF (iPhone default), and GIF. Other formats SHALL return a clear error message.

#### Scenario: Unsupported format rejected
- **WHEN** a user attempts to upload a PDF as an image
- **THEN** the upload is rejected with a user-visible error message

### Requirement: Maximum file size limit
Uploads SHALL be rejected if the file exceeds a configurable maximum size (default: 50MB). Users SHALL see a clear error message when a file is too large.

#### Scenario: Oversized upload rejected
- **WHEN** a user uploads a file larger than the configured maximum
- **THEN** the upload fails with an error message showing the size limit

### Requirement: File path stored relative to storage root
The `file_path` field on Image artifacts SHALL be stored as a path relative to `storage_root` (not an absolute path). This ensures portability if `storage_root` is reconfigured.

#### Scenario: File path is relative
- **WHEN** an Image artifact is retrieved via API
- **THEN** its `file_path` is a relative path (e.g., `2026-04-11/abc123.jpg`) not an absolute path
