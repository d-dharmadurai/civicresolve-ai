# CivicResolve — AI-Powered Civic Issue Reporting & Management Platform

CivicResolve is a full-stack civic-tech reporting, automated AI triage, and municipal operations platform built for Chennai. It enables citizens to submit street-level infrastructure, sanitation, and public-safety complaints (with optional photographic evidence) and empowers municipal administrators to prioritize, track, and resolve issues efficiently.

---

## Problem Statement Alignment

CivicResolve implements every core capability required for an end-to-end AI-powered municipal grievance platform:

1. **Citizen Issue Reporting (`Report an Issue` tab)**
   - Structured submission form capturing **Issue Title**, **Location** (with **Use Sample Chennai Location** quick-fill, **Use Current GPS Location** browser geolocation pin, and editable street landmark field), **Detailed Description**, **Voice Report** microphone input supporting English (`en-IN`) and Tamil/Tanglish (`ta-IN`) with graceful transcript fallback formatted via Gemini, **Optional Category Override**, **Duplicate Issue Alert**, and **Photo Evidence Upload** with **Auto-Draft Details with AI**.
   - Includes a **Demo Sample Fill** button that populates a realistic Mylapore roadside drainage collapse report and attaches a site photograph in one click for live demonstrations.
2. **AI-Powered Classification, Risk Breakdown & Multimodal Triage (`Google Gemini`)**
   - Server-side integration with the official `@google/genai` SDK (`gemini-2.5-flash`) using structured JSON schema output (`responseSchema`).
   - Simultaneously analyzes complaint text and uploaded site photographs to determine:
     - **Category**, **Priority** (`Critical`, `High`, `Medium`, `Low`), and **Recommended Department**
     - **Official 1-Sentence Summary**, **Priority Reasoning**, and **Visual Image Analysis**
     - **Public Safety Risk Factors** (`risk_factors`) and **Estimated Resolution SLA** (`sla_hours`)
     - Assigns a trackable **Ticket ID** (e.g., `CR-2026-1042`) with one-click **Copy Ticket ID**.
3. **Public Issue Tracker (`Public Issue Tracker` tab) & Community Impact**
   - Pre-populated with 5 realistic Chennai civic issues across **Adyar**, **OMR**, **Anna Nagar**, **Velachery**, and **T. Nagar**.
   - Live summary metrics bar, segmented status and priority filters, keyword search, interactive **Upvote / Confirm Issue** buttons, **Community Impact** Civic Points counter in the header (`+50` per report, `+10` per upvote), Google Maps location links/previews, expandable risk breakdown/SLA details, and **Before vs. After** photo comparison with **Verified Resolution** badges.
4. **Municipal Admin Dashboard (`Admin Dashboard` tab)**
   - **Department Workload & Priority Breakdown** summary bar, high-priority alert banner, priority-ordered dispatch queue, **After Repair Photo Proof** upload/URL attachment for resolved tickets, official brief copy/export, and one-click **Export CSV** download.

---

## Google Services Integration

- **Google Gemini API (`@google/genai`)**:
  - Uses `GoogleGenAI` on the Node/Express backend (`server/app.ts`) calling `gemini-2.5-flash` with multimodal `inlineData` image parts and `Type`-defined `responseSchema` for triage classification, photo auto-drafting, English/Tamil voice formatting, and the floating CivicResolve AI Assistant.
- **Google Maps**:
  - Every complaint card in the AI Triage Result panel, Public Issue Tracker, and Admin Dashboard includes a direct **View on Google Maps** link (`https://www.google.com/maps/search/?api=1&query=...`) and a lazy-loaded interactive **Preview Map** embed (plus live GPS coordinates).

---

## Architecture & Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS v4 (dark frosted glassmorphic UI over a live aurora/constellation canvas backdrop), Lucide React icons.
- **Backend**: Express.js with Vite middleware in development and cached static `dist/` serving in production (`server.ts`). The API is split into small, single-purpose modules:

  | Module | Responsibility |
  | --- | --- |
  | `server/app.ts` | Composes middleware (Helmet, gzip compression, rate limits, JSON parsing) and routes |
  | `server/routes/issues.ts` | In-memory issue store + list / upvote / status-update endpoints |
  | `server/routes/ai.ts` | Gemini-backed triage, auto-draft, voice-format and assistant endpoints |
  | `server/gemini.ts` | Gemini client, shared `generateJson` / `generateText` helpers, HTTP error mapping |
  | `server/prompts.ts` | System instructions, prompts and `responseSchema` definitions |
  | `server/validation.ts` | Sanitization, image validation and safe coercion of model output |
  | `server/constants.ts` | Model name, limits, category → department map, SLA defaults |
- **Frontend structure**: `src/components/` (views + `report/` sub-components), `src/hooks/` (`useImageUpload`, `useSpeechRecognition`), `src/utils/api.ts` (typed API client with unified `ApiError` handling), `src/utils/image.ts` (client-side photo downscaling).
- **Endpoints**:
  - `GET /api/issues` — Retrieves all civic complaints.
  - `POST /api/analyze-issue` — Validates/sanitizes payload, invokes Gemini `gemini-2.5-flash` multimodal triage (including `risk_factors` and `sla_hours`), and logs a trackable Ticket ID.
  - `POST /api/auto-draft` — Generates draft title & description from an uploaded photo via Gemini.
  - `POST /api/voice-format` — Translates/formats English or Tamil/Tanglish voice transcripts into structured complaints via Gemini.
  - `POST /api/assistant` — Answers citizen civic-reporting questions via Gemini.
  - `POST /api/issues/:id/upvote` — Increments community confirmation count.
  - `PATCH /api/issues/:id` — Transitions issue status (`Reported` → `In Progress` → `Resolved`) and attaches optional `afterImageUrl` resolution proof.

---

## Security, Efficiency & Accessibility (WCAG AA)

- **Security**:
  - `GEMINI_API_KEY` is read strictly from `process.env` on the server (never exposed to client bundles or hardcoded); `.env.example` documents required variables.
  - HTTP security headers enforced via `helmet` (configured cleanly for iframe preview compatibility and production CSP).
  - Request throttling via `express-rate-limit` on `/api/*` and `/api/analyze-issue`.
  - Input sanitization (`sanitizeText`), character-length caps, MIME allowlisting (`image/jpeg`, `image/png`, `image/webp`, `image/gif`), data-URL validation, and `12mb` JSON payload limits.
- **Efficiency**:
  - **Code splitting**: only the landing "Report" view is in the main bundle; the Tracker, Admin Dashboard, How-It-Works modal and AI Assistant are `React.lazy` chunks, and React/icons are split into long-lived vendor chunks.
  - **Images**: demo photographs are resized and re-encoded as WebP (7.4 MB → 0.8 MB, ~89% smaller; production `dist/` is 1.3 MB instead of 7.7 MB). Citizen uploads are downscaled to ≤1600 px JPEG in the browser before upload, shrinking request payloads and Gemini latency.
  - **Network**: gzip/deflate compression on all responses, `immutable` one-year caching for content-hashed assets, and `no-cache` revalidation for `index.html`.
  - **Rendering**: summary metrics, filter pipelines and priority-sorted queues are memoized (`useMemo` / `useCallback`); tracker search uses `useDeferredValue`; the animated canvas background pauses while the tab is hidden and coalesces resize events.
  - Site photographs and map embeds use `loading="lazy"` to minimize initial viewport bandwidth.
- **Accessibility**:
  - Semantic landmarks (`<header>`, `<nav>`, `<main>`, `<section>`, `<footer>`) and a keyboard **Skip to main content** link.
  - Explicit `<label htmlFor="...">` bindings on every form input and select control.
  - `aria-live="polite"` regions for AI triage results, live filter counts, and admin status announcements.
  - High-contrast `focus-visible` keyboard rings and descriptive `alt` attributes on all imagery.

---

## Setup & Running Locally

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env` and provide your Gemini API key:
```bash
cp .env.example .env
```
```env
GEMINI_API_KEY="YOUR_GEMINI_API_KEY"
```

### 3. Start the Development Server
```bash
npm run dev
```
The full-stack Express + Vite server runs on `http://localhost:3000`.

### 4. Run Automated Tests, Type-Checking & Production Build
```bash
# Run unit, API integration, and React UI tests (Vitest + Supertest + Testing Library)
npm test

# Strict TypeScript type-check (strict, noUnusedLocals, noUnusedParameters)
npm run lint

# Build production bundle
npm run build

# Run all three in one go
npm run check
```

To serve the production build locally: `npm run build && PORT=3000 npm start`.
