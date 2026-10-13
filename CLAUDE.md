# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Beihilfe Manager tracks doctor's bills: payment, and the reimbursement claim with the private
insurance and with the Beihilfe (German civil-servant health subsidy), each tracked separately.
Self-hosted on a Raspberry Pi on a home network, no authentication by design.

## Commands

One Gradle build (`settings.gradle.kts`) with two projects, `backend` and `frontend`.

```bash
./gradlew build                     # everything: Angular build + Vitest, Kotlin compile + tests, bootJar
./gradlew :backend:test             # backend tests only (does not build the frontend)
./gradlew :backend:test --tests 'de.beihilfemanager.BillApiTest.tracks payment'   # single test
./gradlew :frontend:npmTest         # frontend tests via Gradle
./gradlew :backend:bootRun          # API on :8080, data in backend/data/
java -jar backend/build/libs/beihilfe-manager.jar   # UI + API on :8080, data in ./data/
```

Frontend directly (from `frontend/`):

```bash
npm start                                                      # dev server :4200, proxies /api → :8080 (proxy.conf.json)
npx ng test --watch=false                                      # all specs (Vitest + jsdom)
npx ng test --watch=false --include src/app/bills/amount.spec.ts   # single spec
npx prettier --write "src/**/*.{ts,html,css}"                  # formatting (.prettierrc); there is no linter
```

Angular 22 refuses Node < 22.22.3 / 24.15. If the system Node is older, use the Node that Gradle
downloads: `export PATH=$PWD/.gradle/nodejs/node-v24.21.0-linux-x64/bin:$PATH` (inside `frontend/`,
after any Gradle frontend task has run).

If Gradle dependency downloads fail with HTTP 429 from Maven Central, retry with `--max-workers=1`.

## Architecture

### Build and packaging
- `frontend/build.gradle.kts` runs npm through the node-gradle plugin with a pinned Node, and exposes
  `dist/frontend/browser` through a consumable `frontendDist` configuration.
- `backend/build.gradle.kts` copies that into `BOOT-INF/classes/static` **only in `bootJar`**, so
  backend tests and `bootRun` never trigger an npm build. The result is a single jar named
  `beihilfe-manager.jar` (plain `jar` is disabled).
- Bytecode targets **Java 17** on purpose: Raspberry Pi OS Bookworm only ships OpenJDK 17. Don't
  raise it or use newer JDK APIs.
- `deploy/` has the systemd unit and backup script; the README's "Raspberry Pi" section documents
  the install. CI (`.github/workflows/ci.yml`) runs `./gradlew build` and uploads the jar.

### Backend (`backend/src/main/kotlin/de/beihilfemanager`)
- Spring Boot 4, so **Jackson 3** (`tools.jackson.*`, not `com.fasterxml.jackson.databind`) and the
  split test starters (e.g. `AutoConfigureMockMvc` lives in `org.springframework.boot.webmvc.test.autoconfigure`).
- Schema is owned by **Flyway** (`resources/db/migration`) with `ddl-auto: validate`. Any entity change
  needs a new `V<n>__*.sql`; never edit an applied migration (real data lives on the Pi).
- `Bill` embeds two `Claim`s (insurance, beihilfe) with `@AttributeOverrides` mapping to
  `insurance_*` / `beihilfe_*` columns. Status transitions (`NOT_SUBMITTED → SUBMITTED → RECEIVED|DENIED`,
  plus undo) and their date rules live in `BillService.updateClaim`; the API sets a status, it
  doesn't patch individual claim fields.
- Attachments: metadata in the `attachment` table (`ON DELETE CASCADE` from `bill`), files on disk
  under `<beihilfe.data-dir>/attachments/<uuid>` via `AttachmentStorage`. File deletion is deferred
  to after commit (and uploads are cleaned up on rollback) via transaction synchronizations in
  `AttachmentService`. Uploads are restricted to an image/PDF allowlist (no SVG/HTML) and served
  with `nosniff`.
- `BillResponse.attachmentCount` is filled in `BillController` (grouped count query for the list).
- `WebConfig` serves the bundled SPA: unknown non-`/api/` paths fall back to `index.html` so
  Angular routes survive reloads. Errors are RFC 7807 problem details; the frontend reads `detail`.
- Everything persistent lives under `beihilfe.data-dir` (env `BEIHILFE_DATA_DIR`, default `./data`):
  the H2 file DB and the attachments. Tests use in-memory H2 and `build/test-data`
  (`src/test/resources/application.yml`).

### Frontend (`frontend/src/app`)
- Angular 22, standalone components, **zoneless** (no zone.js): state must live in signals for the
  view to update. Data is loaded with `HttpClient` subscribes into signals.
- Route params are bound to component inputs (`withComponentInputBinding`), e.g. `BillDetail.id`,
  and the `uploadFailed` query param.
- All API calls go through `bills/bills.service.ts`. `uploadAttachment` first shrinks large photos
  in the browser (`shared/shrink-image.ts`) before posting multipart.
- Pure logic (summaries, filters, amount parsing) lives in `bills/*.ts` with specs next to it;
  prefer putting new logic there over in components.
- Styling is in the global `src/styles.css` (CSS variables with a dark-mode override, mobile layout
  under `@media (max-width: 640px)`); components carry no styles, which keeps them under the
  4 kB component-style budget.

### UI conventions
- UI text is English, but numbers and dates are German: `LOCALE_ID` is `de-DE` and the currency
  `EUR` (`app.config.ts`).
- Amounts are entered in text inputs with `inputmode="decimal"` and parsed with `parseAmount`
  (accepts `1.234,56` and `12.50`), not `type="number"`, so a German decimal comma works on phones.
- The app is mainly used on an Android phone: check layouts at phone width, and keep the camera
  path working (`shared/file-picker.ts` shows "Take photo" only for `pointer: coarse`).
