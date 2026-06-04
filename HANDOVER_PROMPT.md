# Cheonmun (天文) — Onboarding Prompt for an AI Engineer

> Paste everything below into a new AI coding session as the system/first message.
> It briefs an AI agent to work productively on this codebase on day one.

---

You are taking over engineering on **Cheonmun (天文)**, a production web app. Work
autonomously, prefer small focused commits to `main`, and always `npm run build` before
pushing. Read this brief fully before changing anything.

## What you are working on
Cheonmun is a mobile-first **AI Korean fortune-telling (Saju / Myeongri)** web app, live
at **https://luck-delta.vercel.app**, auto-deployed from `main` on Vercel. It serves two
audiences at once: 40+ users (large type, plain Korean, high contrast) and teens/20s
(immersive "celestial" visuals). Voice = a warm companion, never a cold fortune teller.

Differentiators you must preserve:
- **No sign-up** — name + birth date only, kept in `localStorage`.
- **Trustworthy scores** — daily/weekly scores are *computed from Myeongri rules*, never
  invented by the AI.
- **Participatory reveals** — flip cards, draw tarot, etc.
- **Beyond fortunes** — food, study, mood diary, premium PDF report.

## Stack
React 19 + Vite, Tailwind v4, Google **Gemini** (`gemini-3.1-flash-lite`, REST),
**Kakao Local API** (nearby restaurants via a server proxy) + Kakao Maps JS SDK,
Vercel serverless functions in `/api`, client-side PDF (`html2canvas-pro` + `jspdf`),
`localStorage` + IndexedDB. Icons: `lucide-react`. A separate **NestJS backend** exists
under `backend/` (Postgres/TypeORM/Redis, MFDS food data) but the **live frontend does
not call it** — 천문 식탁 is fully client-side.

## Where the code is (read these first)
- `src/lib/saju.js` — **Myeongri engine + scoring** (the core business rule). Pillars,
  ohaeng, `SCORE_META`, `dailyFortuneScore`, `weeklyFortuneScore`, date utils.
- `src/App.jsx` — **~2,000-line monolith** containing ALL screens and routing. Screens
  are plain components inside it (Entrance, Setup, Hub, Analyzing, Result + per-mode
  bodies, CardResult, TarotResult, FoodTable, ReportSelect, ReportEmail, Diary,
  DiaryHub, GunghapForm, TarotDraw, StudyCompass).
- `src/lib/fortune.js` — Gemini prompts, `analyze()`, caching, report-data generation,
  the `WARM` tone guide.
- `src/ui/celestial.jsx` — shared visual primitives (ScoreRing, RitualReveal, BirthInput,
  WheelPicker, ElementConstellation, Background, PrimaryButton…); `src/ui/bits.jsx` —
  BackBar, ErrorBox; `src/ui/ErrorBoundary.jsx`.
- `src/lib/`: `foodReco.js` (instant food reco), `places.js` (→ `/api/nearby`),
  `kakaoMap.js`, `tarot.js`, `diary.js`, `clientPdf.js`, `reportPdf.js` + `report/`,
  `reportTheme.js`, `reportStore.js` (IndexedDB PDF blob), `sajuCardArt.js`,
  `shareCard.js`, `audio.js`, `foodApi.js` (talks to backend via `VITE_API_BASE`).
- `api/nearby.js` (Kakao Local proxy), `api/send-report.js` (email via `RESEND_API_KEY`).
- `scripts/deck/` — reusable screenshot→PPTX automation ("DeckKit"); see end.

## How to run / ship
```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # MUST pass before pushing
npm run lint
```
Push to `main` → Vercel builds & deploys. A failed build does **not** take prod down
(Vercel keeps the last good deploy) but blocks new changes. `vercel.json` exists; `/api/*`
functions are auto-detected, ~10s limit, can read all env vars via `process.env`.

## Environment variables (`.env.local`, also set in Vercel)
- `VITE_GEMINI_API_KEY` — Gemini text (browser, `fortune.js`).
- `VITE_KAKAO_REST_KEY` (or `KAKAO_REST_KEY`) — Kakao Local (server, `api/nearby.js`).
- `VITE_KAKAO_JS_KEY` — Kakao Maps JS SDK (browser); only on registered web domains;
  optional (list falls back without the embedded map).
- `VITE_API_BASE` — base URL for the optional NestJS backend (`foodApi.js`).
- `RESEND_API_KEY` — email delivery (`api/send-report.js`).
**Vite gotcha:** `import.meta.env.VITE_*` is inlined at build time → after changing an env
var you must rebuild/redeploy.

## Architecture rules you must not break
1. **Routing is state, not URL.** `App.jsx` holds a `step` state; on mount, a valid
   `cm_birth` in `localStorage` boots straight to `hub`. (Automation seeds localStorage
   to land on a screen.)
2. **Scoring is deterministic and lives in `saju.js`.** `dailyFortuneScore(birth,dateKey)`
   = relationship (십성) between today's day-pillar (60갑자 cycle) and the user's
   day-pillar ohaeng (~55–98, computed at noon to dodge the 23:00 rollover);
   `weeklyFortuneScore` = average of the week's 7. `analyze()` **overwrites**
   `parsed.score` with these for `fortune`/`weekly` (even on cache reads) and passes the
   score to the AI only as a tone hint. Other modes (lifetime saju, gunghap, card) use
   the AI score via `transformScore`. **Do not** let the AI set fortune/weekly scores —
   that regressed to "same 80s every day" before.
3. **Caching:** AI results cached in `localStorage` (`cacheKeyFor`, keyed by
   mode+birth+date); tarot never cached; `pruneCache()` clears stale day caches; the PDF
   blob is cached in IndexedDB (`reportStore.js`) — **regenerate the report to verify PDF
   changes**.
4. **PDF:** `reportPdf.js` builds HTML → `clientPdf.js` rasterizes (html2canvas+jsPDF).
   jsPDF px "a4" is 595×842 (not 794) — preserve aspect. Generation is non-blocking with
   a `ReportToast`.
5. **Kakao nearby:** browser-direct `dapi.kakao.com` = 403 → must go through
   `api/nearby.js`. Restaurant rows link to the Kakao place page (native directions).

## Conventions & traps
- Commit straight to `main`, small and focused; end messages with the existing
  `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>` trailer.
- **Editing `App.jsx`:** grep for the function first; whitespace is exact
  (e.g. `border:'1px...'` with no space after the colon). A failed Edit leaves the tree
  unchanged — after committing, verify with `git log`/`git status`; never assume.
- `.gitattributes` marks images/audio/pdf binary and normalizes source to LF; the
  "LF will be replaced by CRLF" warnings on Windows are harmless.
- Keep AI prompts consistent with the `WARM` guide in `fortune.js`: warm-neighbor tone,
  pure Korean (no hanja), no negative/forbidding phrasing — reframe positively.
- This machine has **no runnable Python** and **no PowerPoint/LibreOffice** (decks are
  validated by ZIP signature + slide/media counts, not visual render).

## Decommissioned-but-preserved features
In-app food *search* over MFDS data with A/B/C/D compliance gating, and email delivery of
reports — code kept and hidden. Real phone captures live in `screenshots/user/`.

## Reusable automation ("DeckKit")
`scripts/deck/` is project-independent: `capture-kit.mjs` (Playwright + system Edge
screenshots), `pptx-kit.mjs` (`pptxgenjs` official-document slide builder),
`imgsize.mjs` (aspect-preserving image sizing). Cheonmun config uses it via
`scripts/capture-screens.mjs` and `scripts/build-pptx*.mjs`.
```bash
npm run shots            # capture screens (deploy URL by default; pass a URL for local)
npm run pptx             # main deck   |  npm run pptx:pipeline / pptx:module
npm run deck             # capture → build all decks
```
Traps: floating elements (`.animate-float`, tarot card) need
`reducedMotion:'reduce'` + `click({force:true})`; AI screens take 20–40s (wait for the
"메인으로" button); bullets use `bullet:{code:'25AA'}`; **never overwrite
`screenshots/28_1_report_real.png`** (user-provided).

## Deferred / open
- Move `VITE_GEMINI_API_KEY` behind an `/api/gemini` proxy for production (Kakao already
  proxied).
- `App.jsx` could be split per-screen (only `bits.jsx` extracted so far); deferred for
  live-app safety.
- In-app Kakao map needs `VITE_KAKAO_JS_KEY` with the deployed domain registered.

## Start here
1. `npm install`, create `.env.local` with the keys above, `npm run dev`.
2. Read `src/lib/saju.js` (scoring) and skim `src/App.jsx` (screens) — ~80% of the
   product logic.
3. Make a change → `npm run build` → commit to `main` → let Vercel deploy.

When you respond, briefly confirm you have read this and state which file you will open
first for the task you are given.
