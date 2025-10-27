# LianesMinecraftFront

## Overview
LianesMinecraftFront is a web control panel for managing a Minecraft server. It is a purely client-side application that can:

- Monitor the server status in real time via Server-Sent Events (SSE) with a polling fallback.
- Handle critical operations (start/stop) with accessible controls and contextual messages.
- Display the connected players on an animated pixel-art stage.
- Switch between English and Spanish while persisting the user preference.
- Guide players through the installation with a modal that includes detailed steps and download links.

The project follows Clean Architecture principles. Domain logic lives inside service and coordinator layers, while infrastructure concerns (DOM, translations, HTTP transport) are isolated in replaceable modules.

## Key features
- **Reactive dashboard:** combines SSE and periodic polling to keep information fresh.
- **Safe controls:** includes double confirmations, loading states and accessible tooltips.
- **Internationalisation (i18n):** bilingual catalogue with automatic detection and persistence in `localStorage`.
- **Visual experience:** animated stage linked to live player data.
- **Resilient HTTP layer:** falls back to hidden forms when `fetch` is blocked by CORS restrictions.

## Requirements
- Node.js ≥ 18 to serve static files during development (e.g. `npx http-server`).
- A modern browser with support for ES modules and `EventSource`.

## Quick start
1. Clone the repository and move into the project directory.
2. Serve the static content (e.g. `npx http-server .`).
3. Open `http://localhost:8080` (or your chosen port) in the browser.
4. Adjust the `REMOTE_API_BASE_URL` variable in `scripts/config.js` if your backend is hosted elsewhere.

## Password configuration
The dashboard requires two passwords: one to unlock the interface and another to stop the server. Both values are provided throu
gh environment variables so they never ship in the client bundle.

### Vercel deployment
1. Open your project in the Vercel dashboard and navigate to **Settings → Environment Variables**.
2. Add `START_PASSWORD` with the value that should unlock the panel.
3. Add `STOP_PASSWORD` with the value that should authorise shutdown requests.
4. Redeploy the project (or trigger a new build) so the serverless function can read the new secrets.

### Local development with `vercel dev`
1. Run `vercel env pull .env.local` (or create `.env.local` manually) and define `START_PASSWORD` and `STOP_PASSWORD` inside it.
2. Launch the project with `npx vercel dev` to serve both the static files and the password API locally.
3. Visit the local URL reported by Vercel (default `http://localhost:3000`).
4. When serving files with another tool, proxy `/api/auth` to a process that exposes the same environment variables.

## Directory structure
```
.
├── index.html                # Panel entry point
├── scripts/                  # JavaScript code organised by layers
│   ├── app/                  # UI coordinators and controllers
│   ├── config.js             # API base URL resolution
│   ├── http/                 # HTTP client and alternate transport
│   ├── services/             # Domain services (status, players)
│   └── ui/                   # Presentation (i18n, rendering, stage)
├── styles/                   # CSS stylesheets
├── vercel.json               # Vercel deployment configuration
└── README.md
```

## Class and module catalogue
The following tables summarise the responsibility of each class or exported factory, grouped by layer.

### Application layer (`scripts/app`)
| File | Type | Responsibility |
| --- | --- | --- |
| `dashboardApp.js` | Factory `createDashboardApp` | Connects DOM, presenters and coordinators and requests the startup password before initialising `DashboardController`. |
| `control/controlPanelPresenter.js` | Class `ControlPanelPresenter` | Manages control buttons, tooltips, state indicators and accessible loading states. |
| `core/dashboardController.js` | Class `DashboardController` | Main orchestrator: initialises the UI, processes user actions, synchronises status/player flows and updates contextual messages. |
| `core/errorDescriptor.js` | Function `describeError` | Converts technical errors into descriptors ready for i18n. |
| `core/lifecycleInfoResolver.js` | Function `resolveLifecycleInfo` | Maps backend states to informational messages (online/offline/error). |
| `core/stopConfirmation.js` | Function `confirmStopAction` | Requests consecutive confirmations before stopping the server. |
| `security/passwordPrompt.js` | Class `PasswordPrompt`, factory `createPasswordPrompt` | Coordinates the password dialog and caches authorised scopes. |
| `dom/domReferences.js` | Function `createDomReferences` | Centralises DOM queries and returns frozen references. |
| `info/infoMessageService.js` | Factory `createInfoMessageService` | Renders and reapplies contextual panel messages, normalising descriptors. |
| `locale/localeController.js` | Class `LocaleController` | Applies localised texts, manages the language toggle and keeps links up to date. |
| `modal/installationModalController.js` | Class `InstallationModalController` | Controls the help modal (open/close, accessibility, transitions). |
| `players/playersCoordinator.js` | Factory `createPlayersCoordinator` | Manages the player SSE connection and polling fallback. |
| `players/playersStageController.js` | Class `PlayersStageController` | Encapsulates the lifecycle of the animated player stage. |
| `status/statusCoordinator.js` | Factory `createStatusCoordinator` | Coordinates the status SSE subscription, periodic polling and recovery. |

### Domain services (`scripts/services`)
| File | Type | Responsibility |
| --- | --- | --- |
| `server/serverControl.js` | Functions `fetchServerStatus`, `startServer`, `stopServer`, constants `ServerLifecycleState` | Executes backend REST actions and normalises raw states. |
| `server/serverStatusStream.js` | Function `subscribeToServerStatusStream` | Opens an SSE connection and publishes normalised status updates. |
| `server/playersService.js` | Functions `connectToPlayersStream`, `fetchPlayersSnapshot`, `normalisePlayersSnapshotPayload` | Manages player data both in streaming and snapshots. |
| `server/lifecycle.js` | Utilities `ServerLifecycleState`, `normaliseServerStatusPayload` | Converts arbitrary texts into consistent states for the UI. |
| `server/eventSourceSubscription.js` | Factory `createEventSourceSubscription` | Creates resilient SSE subscriptions with uniform open/close handling. |
| `security/passwordAuthoriser.js` | Class `PasswordAuthoriser`, factory `createPasswordAuthoriser` | Calls the password API to verify start/stop credentials. |

### HTTP layer (`scripts/http`)
| File | Type | Responsibility |
| --- | --- | --- |
| `errors.js` | Classes `HttpError`, `TimeoutError` | Models controlled errors raised by the HTTP layer. |
| `fetchExecutor.js` | Function `performFetchRequest` | Executes `fetch` with timeout, smart parsing and error propagation. |
| `request.js` | Function `request` | Public API that combines `fetch` with the form fallback. |
| `formTransport.js` | Functions `shouldFallbackToForm`, `submitViaForm` | Implements the alternate transport via hidden forms. |
| `urlResolver.js` | Function `resolveApiUrl` | Resolves relative routes against the base URL and validates errors. |

### Configuration (`scripts/config.js`)
- Constants `API_BASE_URL`, `REQUEST_TIMEOUT_MS`, `STATUS_MIN_INTERVAL_MS`.
- Functions `buildApiUrl` and logic to swap between same-origin proxy and remote host depending on the protocol.

### Presentation and utilities (`scripts/ui`)
| File | Type | Responsibility |
| --- | --- | --- |
| `statusPresenter.js` | Constants `StatusViewState`, `InfoViewState`; functions `renderStatus`, `renderInfo` | Renders the status button and message panel based on logical state. |
| `i18n.js` | Functions `getActiveLocale`, `setLocale`, `translate` | Public internationalisation API. |
| `i18n/constants.js` | Constants for supported languages. |
| `i18n/initialLocaleResolver.js` | Function `resolveInitialLocale` | Determines the initial language (query string, storage or default). |
| `i18n/localeNormalizer.js` | Function `normaliseLocale` | Validates and normalises BCP-47 identifiers. |
| `i18n/messageResolver.js` | Functions `resolveTemplate`, `renderTemplate` | Looks up templates and replaces placeholders. |
| `i18n/queryLocaleReader.js` | Function `readLocaleFromQuery` | Reads the `lang` URL parameter. |
| `i18n/storage.js` | Functions `loadPersistedLocale`, `persistLocalePreference` | Manages the language preference in `localStorage`. |
| `i18n/messages/*.js` | Catalogues `enMessages` and `esMessages`, aggregated in `index.js`. |

### Player stage (`scripts/ui/playersStage`)
| File | Type | Responsibility |
| --- | --- | --- |
| `stageFactory.js` | Factory `createPlayersStage` | Mounts the canvas, updates actors and manages render cycles. |
| `actors/actorLifecycle.js` | Functions `createActor`, `stepActor`, `clampActorToBounds`, `normaliseWavePhase` | Player movement and animation model. |
| `actors/playerSnapshot.js` | Functions `normalisePlayers`, `resolvePlayerIdentifier`, `sanitiseName` | Normalises player snapshots and guarantees unique identifiers. |
| `constants.js` | Rendering constants (scale, speed, dimensions). |
| `dom/domUtils.js` | Canvas utilities, resize observer, DPR handling and animations. |
| `utils/geometry.js` | Auxiliary geometry helpers (clamp, positions, velocities). |
| `rendering/drawActor.js` | Function `drawActor` | Draws each player shadow, sprite and label. |
| `rendering/skins/*.js` | Functions `drawXxxSkin` | Pixel-art renderers per player; `index.js` selects the correct skin. |

## Workflow
1. **Initialisation:** `createDashboardApp` requests the startup password before wiring the controllers and starting `DashboardController.initialise()`.
2. **Connectivity:** `statusCoordinator` and `playersCoordinator` open SSE connections and fall back to polling through `requestSnapshot()` when required.
3. **User interaction:** Buttons delegate to `DashboardController`, which coordinates HTTP actions (`serverControl`) and updates the view (`ControlPanelPresenter`, `renderInfo`).
4. **Internationalisation:** `LocaleController` applies translated texts and switches languages using the `i18n` API.
5. **Animated stage:** `PlayersStageController` wraps the canvas created by `createPlayersStage`, which renders actors based on normalised player data.

## Licence
This project is distributed under the licence defined by the repository owners (not included in this document). Add your preferred licence if needed.
