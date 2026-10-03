# EchoMemo --- Product Requirements Document (PRD)

**Hacktoberfest 2026 Partner Challenge**\
**Product:** EchoMemo --- Voice-first personal memory assistant\
**Version:** 1.0\
**Status:** Implementation-ready MVP specification\
**Primary partner technologies:** ElevenLabs and MongoDB Atlas Vector
Search\
**Deployment target:** Render

------------------------------------------------------------------------

## 1. Product overview

EchoMemo helps a student capture thoughts, reminders, project ideas, and
useful information while they are commuting or away from a keyboard.
Users can record or type a note, have it transcribed and organized, and
later retrieve it using natural language. EchoMemo can read summaries
and answers aloud.

The product should feel like a dependable personal knowledge tool---not
a generic AI chatbot. The core experience is **capture quickly, find
reliably, and review privately**.

### Product promise

"Capture it now. Find it when it matters."

### Target user

A college student who has ideas, reminders, and project notes throughout
the day, often while commuting, walking between classes, or working on
multiple projects.

### Primary use cases

-   Record a short voice note while on the move.
-   Review and edit the transcript before saving.
-   Search for a thought using natural language.
-   Ask a question grounded in saved notes and see the notes used as
    evidence.
-   Listen to a concise recap or answer.
-   Correct, export, or permanently delete personal data.

### Out of scope for the MVP

-   Always-on listening or background recording.
-   Recording calls or other people without their knowledge.
-   Calendar/email integrations.
-   Team workspaces or shared notes.
-   Medical, legal, financial, or other high-stakes advice.
-   Autonomous actions such as sending messages or creating external
    tasks.
-   Training models on user content.

------------------------------------------------------------------------

## 2. Goals and success criteria

### Product goals

1.  Make capturing a thought take less than 30 seconds in the common
    case.
2.  Make saved notes retrievable without remembering exact wording.
3.  Keep AI answers grounded in the user's own saved content.
4.  Make privacy and user control visible and understandable.
5.  Deliver a polished, responsive application that can be deployed and
    demonstrated reliably.

### MVP acceptance criteria

-   A user can register, sign in, sign out, and reset a password through
    a secure flow.
-   An authenticated user can create, edit, view, search, export, and
    delete their own notes.
-   A user can record audio with explicit interaction, upload it
    securely, and receive a transcript when transcription is configured.
-   A user can type a note if microphone access or transcription is
    unavailable.
-   Semantic search returns relevant notes and does not expose another
    user's data.
-   AI answers cite the note titles or excerpts used; if evidence is
    insufficient, the system says so.
-   Optional spoken playback uses ElevenLabs only through the backend.
-   API secrets are never shipped to the browser.
-   The production deployment uses HTTPS, secure cookies where
    applicable, restrictive CORS, request validation, rate limits, and
    safe error messages.
-   Core screens work at mobile and desktop widths and meet basic
    keyboard and screen-reader accessibility expectations.

### Suggested demo metrics

These are evaluation targets, not claims: - Capture-to-save flow: under
30 seconds for a short note, excluding external transcription latency. -
Search demo: retrieve a relevant note from a seeded collection in a
single query. - No cross-account data access in authorization tests. -
No secrets or raw audio in application logs. - Successful deployment
from documented environment variables.

------------------------------------------------------------------------

## 3. Product principles

-   **Utility over spectacle:** no animated AI orbs, fake terminal
    panels, excessive gradients, or decorative charts without a purpose.
-   **User control:** recording starts only after an explicit action;
    users can review transcripts and delete content.
-   **Grounded AI:** answers must be based on retrieved notes, with
    clear source references.
-   **Progressive disclosure:** keep the capture and search actions
    obvious; place advanced settings out of the way.
-   **Honest states:** distinguish "transcribing," "saved," "failed,"
    and "not configured." Never show fabricated success.
-   **Privacy by default:** collect the minimum data needed and provide
    clear retention and deletion behavior.

------------------------------------------------------------------------

## 4. Information architecture

### Main navigation

-   **Home** --- quick capture, recent notes, and a small "pick up where
    you left off" area.
-   **My Notes** --- searchable list, filters, and note detail.
-   **Ask Echo** --- conversational retrieval over the user's notes.
-   **Settings** --- profile, audio preferences, data export, account
    deletion, and privacy information.

On desktop, use a compact left sidebar and a restrained top bar. On
mobile, use a simple bottom navigation or a compact menu, with the
capture action easy to reach.

### Key routes

-   `/` --- authenticated home or public landing page, depending on auth
    state.
-   `/login`
-   `/register`
-   `/forgot-password`
-   `/notes`
-   `/notes/:id`
-   `/ask`
-   `/settings`
-   `/privacy`
-   `/terms`

Protect all private routes on the server/API, not merely by hiding
frontend links.

------------------------------------------------------------------------

## 5. UX and visual design requirements

### Visual direction

Create a professional, calm, light interface inspired by well-crafted
productivity and editorial software. The UI should look intentionally
designed by a product team, not generated from a generic AI dashboard
template.

**Palette** - Page background: warm off-white, such as `#F7F7F4`. - Main
surfaces: white, such as `#FFFFFF`. - Primary text: deep charcoal, such
as `#202522`. - Secondary text: muted gray-green, such as `#68716B`. -
Primary action: restrained forest green, such as `#28634E`. - Accent:
soft sage, such as `#E6EFE9`. - Borders: quiet neutral, such as
`#E4E7E2`. - Destructive action: accessible muted red, reserved for
destructive controls.

Use color tokens and verify contrast. Do not rely on color alone to
communicate state.

### Typography and layout

-   Use a highly legible sans-serif such as Inter, Geist, or a system
    font stack.
-   Use a clear type scale and comfortable line height.
-   Keep content widths readable; avoid stretching note text across very
    wide screens.
-   Use consistent spacing, alignment, and restrained corner radii.
-   Use subtle borders and minimal shadows. Avoid glassmorphism, neon
    glows, oversized gradients, and excessive pill-shaped cards.
-   Use icons only when they improve recognition; pair unfamiliar icons
    with labels.
-   Avoid emoji as interface icons.

### Interaction details

-   Primary capture area should be prominent but not oversized.
-   Record button must clearly indicate idle, recording, paused (if
    supported), processing, and error states.
-   Show a recording timer and a visible stop action.
-   Request microphone permission only after the user presses Record.
-   Explain why microphone access is needed if permission is denied.
-   Show upload/transcription progress and allow retry after failure.
-   Provide a transcript editor before saving when transcription is
    available.
-   Autosave should not be assumed. Clearly indicate when changes are
    saved.
-   Confirm destructive actions and make the consequences clear.
-   Provide skeletons for loading, helpful empty states, and actionable
    error messages.

### Core screens

#### Home

-   Greeting and one-sentence product guidance.
-   Capture panel with "Record a thought" and "Write a note."
-   Recent notes list with title, short excerpt, date, and source type.
-   A small search field or prominent "Ask your notes" entry point.
-   No fabricated analytics or arbitrary productivity scores.

#### Capture

-   Record, stop, and cancel controls.
-   Recording duration and microphone status.
-   Optional title field.
-   Processing state with clear progress text.
-   Transcript review/edit step.
-   Save action and discard confirmation.
-   Typed-note fallback.
-   Clear notice that the app records only after the user initiates
    recording.

#### My Notes

-   Search input with natural-language and keyword search.
-   Filters for date and capture type (voice/text).
-   List rows with title, excerpt, and timestamp.
-   Empty state with a direct capture action.
-   Pagination or cursor-based loading for larger collections.

#### Note detail

-   Title, editable content, source type, and created/updated
    timestamps.
-   Audio playback only if audio retention is enabled and the audio
    still exists.
-   Edit, export, and delete actions.
-   Do not expose storage object URLs or internal database identifiers
    unnecessarily.

#### Ask Echo

-   A focused question input and answer area.
-   Answers should be concise and grounded in retrieved notes.
-   Show "Sources" with clickable note references and short relevant
    excerpts.
-   If no relevant notes are found, say that the saved notes do not
    contain enough information.
-   Provide optional "Read aloud" playback.
-   Make it clear that answers are generated from the user's notes and
    may be incomplete.
-   Do not imply that EchoMemo has general knowledge unless a separate,
    clearly labeled feature is deliberately added later.

#### Settings and privacy

-   Profile and account controls.
-   Spoken response preference and playback speed if supported.
-   Audio retention setting with a clear default and explanation.
-   Export my data.
-   Delete a note, delete audio, or delete account.
-   Privacy explanation covering transcription, embeddings, AI
    generation, and speech synthesis providers.
-   Show provider configuration status without revealing credentials.

------------------------------------------------------------------------

## 6. Functional requirements

### 6.1 Authentication and account ownership

-   Use a maintained authentication solution appropriate for the
    selected backend.
-   Hash passwords with a modern password-hashing algorithm if managing
    passwords directly; never store plaintext passwords.
-   Use short-lived access credentials and a secure refresh/session
    strategy.
-   Prefer `HttpOnly`, `Secure`, and appropriate `SameSite` cookies for
    browser sessions when the architecture supports them.
-   Protect against CSRF when cookie-based authentication is used.
-   Add login and password-reset rate limits.
-   Verify ownership on every note, audio, search, export, and delete
    operation.
-   Return non-enumerating responses for password reset and account
    lookup flows.
-   Support account deletion and revoke active sessions.

### 6.2 Voice capture and transcription

-   Browser records only after explicit user action and permission.
-   Validate file type, duration, and size on both client and server.
-   Use a configurable maximum audio duration and upload size. Initial
    MVP defaults: 3 minutes and 15 MB, adjustable through environment
    configuration.
-   Accept only explicitly supported audio formats. Do not trust
    filename or browser-provided MIME type alone.
-   Transcription provider must be configurable. Use a supported
    transcription API or a documented speech-to-text provider; do not
    assume ElevenLabs text-to-speech is also the transcription service.
-   Keep provider calls on the backend.
-   Provide a typed-note fallback when transcription is unavailable.
-   Make audio retention configurable. Default recommendation: delete
    raw audio after successful transcription unless the user explicitly
    enables retention.
-   Do not store audio in MongoDB documents. Use private object storage
    if retention is enabled.
-   Do not send audio to a provider until the user submits the recording
    and the UI clearly communicates that processing will occur.

### 6.3 Notes

Each note should support: - Title - Body/transcript - Capture type
(`voice` or `text`) - Optional audio object reference - Created and
updated timestamps - Optional tags - Processing status where relevant

Requirements: - Validate and normalize input. - Enforce per-user
ownership. - Use pagination for note lists. - Support editing and
deletion. - Avoid storing unnecessary sensitive metadata. - Keep note
text out of routine logs and analytics.

### 6.4 Embeddings and semantic search

-   Generate embeddings on the backend using a configured embedding
    model.
-   Store vectors and note metadata in MongoDB Atlas.
-   Configure MongoDB Atlas Vector Search index dimensions to exactly
    match the selected embedding model.
-   Store a user/account ownership field with each searchable chunk.
-   Apply user scoping in the retrieval pipeline and validate ownership
    again before returning results.
-   For MVP, one vector per note may be sufficient; split long notes
    into chunks with source offsets if needed.
-   Support keyword search as a fallback if vector search is
    unavailable.
-   Handle embedding failures without losing the original note.
-   Include an index setup guide and a startup/readiness check for
    required indexes.

### 6.5 Ask Echo: retrieval-grounded answers

Request flow: 1. Authenticate the user. 2. Validate and rate-limit the
question. 3. Embed the question. 4. Retrieve only the user's relevant
note chunks. 5. Apply a relevance threshold and limit the context size.
6. Send the retrieved excerpts to the configured generation model with
instructions to answer only from supplied context. 7. Return the answer
and source note references. 8. Optionally pass the answer to ElevenLabs
for speech synthesis after explicit user action.

Requirements: - Treat note content as untrusted data, not
instructions. - Defend against prompt injection in stored notes by
separating system instructions from retrieved content and instructing
the model to ignore commands found inside notes. - Do not expose
internal prompts, secrets, or other users' data. - Cite sources using
note IDs/titles resolved by the backend, not model-invented
references. - If retrieval is weak or empty, abstain rather than
fabricate. - Keep answers bounded in length. - Do not persist questions
or answers by default unless conversation history is an explicit
user-facing feature. - Clearly label AI-generated content.

### 6.6 ElevenLabs speech playback

-   Use ElevenLabs for text-to-speech only through a backend service.
-   Keep the API key in server-side environment variables.
-   Use an allowlisted voice ID configured by the application; do not
    accept arbitrary provider URLs or voice IDs from untrusted input.
-   Set text length and request-rate limits.
-   Return audio with appropriate content type and cache controls.
-   Do not publicly cache private user responses.
-   Handle quota, timeout, and provider errors gracefully.
-   Provide text answers even when speech playback is unavailable.
-   Do not automatically speak sensitive content on page load.

### 6.7 Export and deletion

-   Provide an export of a user's notes in a practical format such as
    JSON or CSV.
-   Ensure exports include only the requesting user's data.
-   Generate exports on the backend and avoid public, permanent links.
-   Delete associated embeddings and audio objects when a note is
    deleted.
-   Account deletion must remove or schedule removal of notes,
    embeddings, audio, and account-linked records according to the
    documented retention policy.
-   Document backups and provider retention limitations honestly;
    application deletion may not instantly erase provider or backup
    copies.

------------------------------------------------------------------------

## 7. Technical architecture

### Recommended stack

-   Frontend: React, Vite, TypeScript, Tailwind CSS, and an accessible
    component system.
-   Backend: Python, FastAPI, Pydantic, and a maintained MongoDB driver.
-   Primary database: MongoDB Atlas.
-   Semantic retrieval: MongoDB Atlas Vector Search.
-   Speech generation: ElevenLabs API.
-   Transcription: configurable speech-to-text provider, selected and
    documented during implementation.
-   Embeddings and answer generation: configurable provider/model,
    selected based on available credentials and compatible dimensions.
-   Audio storage: private object storage only if raw audio retention is
    enabled.
-   Deployment: Render for frontend/static site and backend service, or
    a single deployment arrangement if justified.
-   Testing: Pytest for backend, frontend component tests, and
    end-to-end tests for critical flows.

### High-level request flow

``` text
Browser
  |
  | HTTPS, authenticated requests
  v
FastAPI backend
  |---- Authentication / authorization
  |---- Input validation / rate limiting
  |---- Notes service --------------------> MongoDB Atlas
  |                                          |
  |                                          | Vector Search
  |                                          v
  |---- Embedding / answer provider <---- Retrieved note chunks
  |
  |---- Transcription provider (on submit)
  |
  |---- ElevenLabs TTS (on explicit request)
  |
  |---- Private object storage (optional audio retention)
```

### Suggested backend modules

-   `auth`: registration, login, session handling, password reset.
-   `notes`: create, list, read, update, delete, export.
-   `capture`: upload validation, transcription orchestration,
    processing status.
-   `embeddings`: embedding generation and vector-index interaction.
-   `retrieval`: scoped vector and keyword retrieval.
-   `assistant`: grounded answer generation and source mapping.
-   `speech`: ElevenLabs request handling.
-   `storage`: private audio object storage and deletion.
-   `security`: rate limits, headers, request IDs, and common security
    utilities.
-   `config`: typed settings loaded from environment variables.

Keep provider adapters separate from product logic so providers can be
changed without rewriting the application.

### Suggested data model

**User** - `_id` - `email_normalized` - `password_hash` or external auth
subject - `created_at` - `settings` - `deletion_status`

**Note** - `_id` - `user_id` - `title` - `body` - `capture_type` -
`created_at` - `updated_at` - `tags` - `audio_object_key` (optional;
never a public URL) - `processing_status`

**NoteChunk** - `_id` - `user_id` - `note_id` - `text` - `embedding` -
`chunk_index` - `source_start` / `source_end` (optional) - `created_at`

**ProcessingJob** (only if asynchronous processing is implemented) -
`_id` - `user_id` - `note_id` - `job_type` - `status` -
`attempt_count` - `created_at` - `updated_at` - `safe_error_code`

Use indexes for user-scoped listing and retrieval. Do not put unbounded
note histories or large audio blobs inside a single document.

------------------------------------------------------------------------

## 8. API requirements

Use a versioned API prefix such as `/api/v1`.

  Method   Endpoint                  Purpose
  -------- ------------------------- ---------------------------------------------
  POST     `/auth/register`          Create account
  POST     `/auth/login`             Authenticate
  POST     `/auth/logout`            End session
  POST     `/auth/forgot-password`   Start password reset
  GET      `/me`                     Current user profile
  GET      `/notes`                  Paginated note list and search
  POST     `/notes`                  Create text note
  GET      `/notes/{note_id}`        Read owned note
  PATCH    `/notes/{note_id}`        Update owned note
  DELETE   `/notes/{note_id}`        Delete owned note and related data
  POST     `/capture/transcribe`     Submit audio for transcription
  POST     `/ask`                    Retrieve notes and generate grounded answer
  POST     `/speech`                 Generate speech for supplied/approved text
  GET      `/export`                 Export current user's notes
  DELETE   `/account`                Initiate account deletion
  GET      `/health/live`            Liveness check
  GET      `/health/ready`           Readiness check for required dependencies

Requirements: - Define request/response schemas and response codes. -
Use consistent error structures with safe, user-friendly messages. -
Never return stack traces, database errors, provider secrets, or
internal paths. - Apply authentication and ownership checks to all
private endpoints. - Apply endpoint-specific rate limits and
request-size limits. - Avoid overly broad CORS settings. - Document API
behavior in OpenAPI, but do not expose sensitive operational details.

------------------------------------------------------------------------

## 9. Security and privacy requirements

Security is a release requirement, not a later polish task. No
application can be guaranteed "unhackable"; the goal is to reduce risk,
use safe defaults, and test the controls.

### Secrets and configuration

-   Never place API keys, database credentials, signing keys, or
    provider secrets in frontend code, source control, build-time public
    variables, or logs.
-   Use Render environment variables or a managed secret store.
-   Commit only `.env.example` with placeholder values.
-   Rotate any credential that has been exposed.
-   Use separate development and production credentials and databases.

### Transport and browser security

-   Enforce HTTPS in production.
-   Set appropriate security headers, including a restrictive Content
    Security Policy where feasible, `X-Content-Type-Options: nosniff`,
    and a suitable `Referrer-Policy`.
-   Configure CORS to exact production origins.
-   Use secure session cookies and CSRF protection when applicable.
-   Avoid storing long-lived authentication tokens in `localStorage`.
-   Use safe rendering; never render note content as trusted HTML.
-   Add clickjacking protections through CSP `frame-ancestors` or
    equivalent.

### Authorization and data isolation

-   Deny by default.
-   Verify user ownership in every data access path, including vector
    search, audio access, export, and deletion.
-   Never trust a `user_id` supplied by the browser as the authority for
    access.
-   Add automated tests attempting cross-user access to notes, search
    results, audio, and exports.
-   Do not expose sequential identifiers that make enumeration easy;
    still enforce authorization even with random IDs.

### Input and file handling

-   Validate all inputs with explicit schemas and sensible length
    limits.
-   Limit request bodies and audio upload size/duration.
-   Verify file signatures where practical; do not trust extensions
    alone.
-   Store uploads outside the web root in private storage.
-   Generate storage keys server-side.
-   Reject unsupported types and malformed content.
-   Protect against path traversal, injection, and unsafe
    deserialization.
-   Use timeouts for external provider calls.

### AI-specific safeguards

-   Treat user notes and retrieved content as untrusted.
-   Do not let retrieved text override system instructions or trigger
    tools/actions.
-   Limit retrieved context and generated output.
-   Validate source references against actual retrieved records.
-   Do not expose other users' content through prompts, logs, caches, or
    shared context.
-   Avoid sending unnecessary personal data to third-party providers.
-   Document which content is sent to each provider and for what
    purpose.
-   Provide a non-AI path for writing and viewing notes.

### Abuse prevention and reliability

-   Rate-limit login, transcription, ask, and speech endpoints.
-   Set per-user quotas or reasonable usage limits for provider-cost
    endpoints.
-   Add request timeouts, bounded retries, and safe handling for
    provider outages.
-   Do not retry non-idempotent operations blindly.
-   Use idempotency keys or job identifiers for long-running capture
    processing where appropriate.
-   Keep logs structured and redact tokens, note bodies, audio, and
    sensitive provider payloads.
-   Monitor error rates and service health without collecting note
    content.

### Privacy defaults

-   No advertising trackers.
-   No training on user content by the application.
-   Raw audio is deleted after transcription by default unless the user
    opts into retention.
-   Explain external provider processing and applicable retention
    policies.
-   Offer export and deletion controls.
-   Establish a clear retention policy for backups and operational logs.

------------------------------------------------------------------------

## 10. Deployment and operations

### Render deployment

-   Deploy the backend as a Render web service.
-   Deploy the frontend as a static site or serve it through a
    documented architecture.
-   Configure production environment variables in Render.
-   Use a production MongoDB Atlas cluster with network access
    restricted as much as the hosting setup permits.
-   Use a dedicated database user with least-privilege permissions.
-   Configure the correct frontend origin in backend CORS settings.
-   Configure health checks and startup/readiness behavior.
-   Ensure the service binds to the host and port provided by the
    deployment platform.
-   Do not rely on ephemeral local disk for persistent audio or user
    data.
-   Use a private object-storage provider if retaining audio.
-   Set reasonable timeouts and handle deployments/restarts without
    corrupting processing state.

### Required environment variables

Document exact names in `.env.example`. Suggested names: - `APP_ENV` -
`FRONTEND_ORIGIN` - `DATABASE_URL` or `MONGODB_URI` -
`MONGODB_DATABASE` - `AUTH_SECRET` or provider-specific auth
configuration - `ELEVENLABS_API_KEY` - `ELEVENLABS_VOICE_ID` -
`TRANSCRIPTION_PROVIDER` - `TRANSCRIPTION_API_KEY` -
`EMBEDDING_PROVIDER` - `EMBEDDING_API_KEY` - `EMBEDDING_MODEL` -
`GENERATION_PROVIDER` - `GENERATION_API_KEY` - `GENERATION_MODEL` -
`AUDIO_RETENTION_ENABLED` - `AUDIO_MAX_BYTES` - `AUDIO_MAX_SECONDS` -
`RATE_LIMIT_*` configuration - Private object-storage credentials, only
if audio retention is enabled.

Never use real secrets in documentation or test fixtures.

### Production readiness checklist

-   [ ] Production secrets are configured outside the repository.
-   [ ] Database access is restricted and least-privilege.
-   [ ] HTTPS and secure browser settings are enabled.
-   [ ] CORS is restricted to known origins.
-   [ ] Authentication, authorization, and CSRF controls are tested.
-   [ ] Cross-account access tests pass.
-   [ ] Audio uploads are size/type validated and private.
-   [ ] Provider quotas, timeouts, and error states are handled.
-   [ ] MongoDB vector index dimensions match the embedding model.
-   [ ] Deletion removes linked records and objects according to policy.
-   [ ] Logs contain no secrets, note bodies, or audio.
-   [ ] Health checks and deployment instructions are verified.
-   [ ] README explains provider setup, privacy behavior, and known
    limitations.

------------------------------------------------------------------------

## 11. Accessibility and responsive behavior

-   Support keyboard navigation for all core actions.
-   Use visible focus indicators.
-   Give icon-only controls accessible names.
-   Associate form labels and validation messages correctly.
-   Announce recording/transcription state changes to assistive
    technology without excessive interruptions.
-   Respect reduced-motion preferences.
-   Maintain readable contrast and text sizes.
-   Ensure the app works at narrow mobile widths and with touch input.
-   Do not make recording or playback dependent on hover.

------------------------------------------------------------------------

## 12. Testing strategy

### Backend tests

-   Authentication and session expiration.
-   Ownership checks for every note endpoint.
-   Cross-user search isolation.
-   Invalid and oversized audio uploads.
-   Provider timeout, quota, and malformed-response handling.
-   Embedding failure without note loss.
-   Retrieval with no results and low-confidence results.
-   Source references correspond to retrieved notes.
-   Export and deletion isolation.
-   Rate limits and safe error responses.

### Frontend tests

-   Capture flow states.
-   Microphone permission denied.
-   Transcript editing and save.
-   Typed-note fallback.
-   Search and source navigation.
-   Playback unavailable or provider error.
-   Empty, loading, and error states.
-   Responsive navigation and keyboard operation.

### End-to-end demo test

1.  Register or sign in to a demo account.
2.  Record or type a note about a project idea.
3.  Review and save it.
4.  Add a second note with related context.
5.  Ask a natural-language question that requires both notes.
6.  Inspect the cited sources.
7.  Play the answer aloud.
8.  Edit or delete one note and confirm the change is reflected in
    search.

Use synthetic demo content. Never seed the demo with real personal
information.

------------------------------------------------------------------------

## 13. Implementation plan for Antigravity

Work in small, verifiable phases. Do not generate the entire system in
one pass.

### Phase 1 --- Project foundation

-   Inspect repository and existing conventions.
-   Create frontend/backend structure.
-   Add typed configuration and `.env.example`.
-   Establish design tokens, typography, navigation, and responsive
    shell.
-   Add linting, formatting, and basic tests.
-   Deliverable: app shell and documented local setup.

### Phase 2 --- Authentication and notes

-   Implement secure authentication/session handling.
-   Create note schema and ownership-scoped CRUD.
-   Build Home, My Notes, and Note Detail screens.
-   Add typed-note capture.
-   Deliverable: fully usable private notes app without AI dependency.

### Phase 3 --- Voice capture

-   Implement explicit microphone capture and recording states.
-   Add upload validation and transcription adapter.
-   Add transcript review/edit and typed fallback.
-   Delete raw audio by default after successful transcription.
-   Deliverable: reliable voice-to-note workflow.

### Phase 4 --- Semantic retrieval

-   Configure embeddings and MongoDB Atlas Vector Search.
-   Add index setup and health/readiness checks.
-   Implement scoped retrieval and keyword fallback.
-   Add retrieval tests, especially cross-user isolation.
-   Deliverable: relevant note search with safe fallback.

### Phase 5 --- Ask Echo and speech

-   Implement grounded answer generation and source mapping.
-   Add abstention behavior for insufficient evidence.
-   Integrate ElevenLabs TTS through the backend.
-   Add quotas, timeouts, and graceful provider failures.
-   Deliverable: ask-and-listen experience grounded in saved notes.

### Phase 6 --- Privacy, deployment, and polish

-   Implement export, note deletion, and account deletion.
-   Review logs, headers, CORS, cookies, rate limits, and secrets.
-   Run backend, frontend, and end-to-end tests.
-   Deploy to Render and configure MongoDB Atlas.
-   Verify the deployed app using the production checklist.
-   Deliverable: deployable MVP with a clear README and demo flow.

At the end of each phase, summarize changed files, commands to run,
tests performed, and unresolved issues. Do not claim a test passed
unless it was actually executed.

------------------------------------------------------------------------

## 14. Risks and mitigations

  -----------------------------------------------------------------------
  Risk                                Mitigation
  ----------------------------------- -----------------------------------
  Transcription provider is           Keep provider configurable;
  unavailable or expensive            typed-note fallback; quotas and
                                      clear errors

  Vector dimensions mismatch          Pin embedding model and validate
                                      index dimensions during setup

  Hallucinated answers                Retrieval thresholds, source
                                      validation, grounded prompts, and
                                      abstention

  Cross-user data leakage             Ownership-scoped queries and
                                      automated adversarial authorization
                                      tests

  API costs grow unexpectedly         Per-user rate limits, length caps,
                                      usage limits, and explicit speech
                                      playback

  Raw audio creates privacy risk      Delete by default; private storage
                                      and clear opt-in retention

  Antigravity produces superficial    Require a real end-to-end partner
  integrations                        demonstration and inspect backend
                                      calls

  Deployment differs from local       Production-like environment
  development                         configuration, health checks, and
                                      deployment smoke tests

  UI looks generic or "AI-generated"  Follow the design system, avoid
                                      decorative AI tropes, and review
                                      every screen for hierarchy and
                                      usability
  -----------------------------------------------------------------------

------------------------------------------------------------------------

## 15. Definition of done

The MVP is complete when: - A user can securely capture, edit, save, and
retrieve notes. - Voice capture has a reliable typed fallback. - MongoDB
Atlas Vector Search is genuinely used for semantic retrieval. - Ask Echo
answers from the user's notes, identifies sources, and abstains when
evidence is insufficient. - ElevenLabs speech generation works through a
protected backend path and is optional. - Users can export and delete
their data. - Core flows have automated tests, including cross-account
access tests. - The interface is responsive, accessible, light-themed,
and visually consistent. - The app is deployed with documented
configuration and no secrets in client code or source control. - The
README explains setup, partner integrations, privacy behavior, and known
limitations.

**Final instruction to Antigravity:** Prioritize a secure, complete,
understandable product over feature count. Do not invent integrations,
fake processing states, hardcode credentials, or sacrifice authorization
for demo convenience. If a provider or deployment capability is not
configured, implement a clear disabled state and document the setup
needed to enable it.
