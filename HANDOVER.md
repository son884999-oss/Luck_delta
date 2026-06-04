# Cheonmun (天文) — Engineering Handover

> AI Korean fortune-telling (Saju / Myeongri) web app.
> Last updated: 2026-06-01.

This document is for the next engineer taking over **Cheonmun**. It explains what the
app is, how it is built and deployed, where the important code lives, and the
non-obvious traps you should know before you change anything.

---

## 1. What it is

Cheonmun is a mobile-first web app that gives users daily Korean fortune content based
on their birth date (Saju / Four Pillars). It targets **two audiences at once**:
people aged 40+ (large type, plain language, high contrast) and teens/20s (immersive,
"celestial" visuals). The tone is a warm companion, never a cold fortune teller.

Live: **https://luck-delta.vercel.app**

Core ideas that differentiate it:
- **No sign-up.** Name + birth date only; stored in the browser (`localStorage`).
- **Trustworthy scores.** Daily/weekly scores are *computed from Myeongri rules*
  (today's day-pillar × the user's day-pillar), not invented by the AI.
- **Participatory UX.** Results are revealed by flipping cards, drawing tarot, etc.
- **Beyond fortunes.** Connects to daily life: food, study, a mood diary, PDF reports.

---

## 2. Tech stack

| Layer | Choice |
|-------|--------|
| Frontend | React 19 + Vite, Tailwind CSS v4 |
| AI | Google **Gemini** (`gemini-3.1-flash-lite` for text) via REST |
| Maps / places | **Kakao Local API** (nearby restaurants), Kakao Maps JS SDK (in-app map) |
| Serverless | Vercel functions in `/api` (ESM `export default handler`) |
| PDF | client-side `html2canvas-pro` + `jspdf` |
| Storage | `localStorage` (profile, cache, diary) + IndexedDB (`reportStore.js`, PDF blobs) |
| Hosting | **Vercel**, auto-deploy from `main` |
| Icons | `lucide-react` |

There is also a **separate NestJS backend** under `backend/` (PostgreSQL + TypeORM +
Redis) for the "Chunmun Astro-Wellness" wellness features (MFDS food/nutrition data).
It is **not** required for the current live frontend — see §9.

---

## 3. Repository layout

```
src/
  App.jsx              # ~2,000-line monolith: ALL screens + routing (state-based)
  main.jsx             # React entry
  index.css            # Tailwind + the "Celestial" design system (animations, glass)
  ui/
    celestial.jsx      # Shared visual primitives (ScoreRing, RitualReveal, BirthInput,
                       #   WheelPicker, ElementConstellation, Background, PrimaryButton…)
    bits.jsx           # Small shared components (BackBar, ErrorBox)
  lib/
    saju.js            # Myeongri engine: pillars, ohaeng, SCORE_META, dailyFortuneScore,
                       #   weeklyFortuneScore, date utils  ← scoring lives here
    fortune.js         # Gemini prompts + analyze() + caching + report data generation
    foodReco.js        # Client-side instant food recommendation (천문 식탁)
    places.js          # Nearby restaurants → calls /api/nearby (server proxy)
    kakaoMap.js        # Kakao Maps JS SDK loader (in-app map)
    tarot.js           # Tarot deck/draw
    diary.js           # Diary CRUD over localStorage
    clientPdf.js       # HTML → PDF (html2canvas + jsPDF)
    reportPdf.js       # Premium report HTML template (cover, 명식, sections)
    report/            # report data builder + sections (used by reportPdf)
    reportTheme.js     # shared color palette for PDF/email/share-card
    reportStore.js     # IndexedDB save/load/clear for the PDF blob
    shareCard.js       # SNS share image builder
    audio.js           # UI sounds (playTap/playClick/playSuccess…)
api/
  nearby.js            # Vercel function: Kakao Local proxy (keeps REST key server-side)
scripts/
  deck/                # ★ REUSABLE automation module ("DeckKit") — see §8
  capture-screens.mjs  # Cheonmun screenshot flow (uses deck/)
  build-pptx*.mjs      # Cheonmun slide decks (uses deck/)
  (mail/report/audio helpers — dev only)
screenshots/           # Captured screens + user-provided assets + the generated .pptx scripts read
backend/               # Separate NestJS service (optional; see §9)
```

> **Important:** `App.jsx` is intentionally one big file. Screen functions are plain
> components inside it (Entrance, Setup, Hub, Analyzing, Result + per-mode bodies,
> CardResult, TarotResult, FoodTable, ReportSelect, ReportEmail, Diary, DiaryHub,
> GunghapForm, TarotDraw, StudyCompass…). When editing it, **find the function with
> grep first** — inserting lines shifts line numbers, and stale string matches will
> silently fail an edit.

---

## 4. Run / build / deploy

```bash
npm install
npm run dev        # local dev (http://localhost:5173)
npm run build      # production build → dist/
npm run lint
```

- **Deploy is automatic**: pushing to `main` triggers a Vercel build + deploy.
- If a build **fails**, Vercel keeps serving the previous successful deploy — so a
  broken push does not take production down, but it does block new changes. Always run
  `npm run build` locally before pushing.
- Vercel auto-detects the `/api/*.js` functions; no `vercel.json` entry is needed.
  Functions have a ~10s limit and can read all env vars (including `VITE_` ones) via
  `process.env`.

---

## 5. Environment variables

Defined in `.env.local` (not committed) and in the Vercel dashboard.

| Var | Used by | Notes |
|-----|---------|-------|
| `VITE_GEMINI_API_KEY` | `src/lib/fortune.js` (browser) | AI text generation. |
| `VITE_KAKAO_REST_KEY` | `api/nearby.js` (server) | Kakao Local. `KAKAO_REST_KEY` also accepted. |
| `VITE_KAKAO_JS_KEY` | `src/lib/kakaoMap.js` (browser) | Kakao Maps JS SDK; only works on **registered web domains**. Optional — list falls back gracefully if absent. |

**Vite gotcha:** `import.meta.env.VITE_*` is *inlined at build time*. After changing an
env var you **must redeploy/rebuild**. Non-`VITE_` vars are server-only.

**Security note (production):** Gemini and Kakao REST keys are currently exposed to the
browser via `VITE_`. For a hardened production deploy, move them behind server proxies
(`/api/*`) like `api/nearby.js` already does for Kakao. The Kakao key was moved to a
proxy specifically because browser-direct calls to `dapi.kakao.com` return 403 (CORS).

---

## 6. Architecture you must understand

### 6.1 Routing is state, not URL
There is **no router**. `App.jsx` holds a `step` state
(`entrance | setup | hub | form | tarotDraw | analyzing | result | report | food |
reportSelect | studyCompass | diary | diaryHub`). On mount, if a valid `cm_birth`
exists in `localStorage`, it boots straight to `hub`. This matters for automation/tests
(see §8) — you seed `localStorage` to land on a screen.

### 6.2 Scoring (the most important business rule)
Daily and weekly fortune scores are **deterministic, computed in `src/lib/saju.js`**:
- `dailyFortuneScore(birth, dateKey)` — relationship (십성) between today's day-pillar
  (cycles through the 60 갑자) and the user's day-pillar's ohaeng, range ~55–98, plus a
  small deterministic hash spread. Computed at **noon** to avoid the 23:00 day-rollover.
- `weeklyFortuneScore(birth)` — average of that week's 7 daily scores.

`fortune.js analyze()` **overwrites** `parsed.score` with these for `fortune`/`weekly`
modes (even on cache reads, so a previously-cached result still shows a fresh score),
and passes the score to the AI only as a *tone hint*. Other modes (lifetime saju,
gunghap, card) still use the AI score put through `transformScore`.

> History: scores used to be AI-invented → `transformScore` compressed them into the
> 80s → every day looked the same. The deterministic engine fixed that. **Do not**
> revert to letting the AI set fortune/weekly scores.

### 6.3 Caching
`fortune.js` caches AI results in `localStorage` keyed by mode + birth + date
(`cacheKeyFor`). Tarot is never cached (fresh draw each time). `pruneCache()` drops
stale day-scoped caches on load. The premium **PDF blob** is cached in IndexedDB
(`reportStore.js`) so it survives an app restart.

### 6.4 PDF generation
`reportPdf.js` builds a full HTML document (cover + 명식 radar + sections), then
`clientPdf.js` renders it via html2canvas-pro + jsPDF. Known sensitivities:
- jsPDF `unit:'px'` "a4" is 595×842 (pt-based), **not** 794 → caused vertical stretch;
  placement preserves aspect via `drawH = sliceH * (pageW/canvas.width)`.
- A `::first-letter` drop-cap once split the user's name's first character — removed.
- Pagination is **one section = one page (never split)**: sections flow at natural
  height in the DOM, each marked `.page`. `clientPdf` draws every `.page` onto exactly
  one PDF page — **scaling it down (width included) to fit when it's taller than a
  page**, or centering it vertically when shorter. No `transform`/`zoom` is used
  (html2canvas doesn't capture them reliably). Content shrinks rather than splitting.
  Each report also has a standalone "한눈에 보기" overview page right after 명식.
- Report generation is **non-blocking**: it runs in the background, shows a toast
  (`ReportToast`) when done, and the PDF is saved to IndexedDB.

### 6.5 Kakao nearby restaurants
`places.js` → `fetch('/api/nearby?...')` → `api/nearby.js` calls Kakao Local with the
server-side key. Requires the "카카오맵" product to be ON in the Kakao console.
Restaurant rows link to the Kakao place page (where directions/phone work natively) —
the old custom "길찾기" deep link was removed because it dropped users onto the map home.

---

## 7. Feature map (for QA)

| Screen | Where | Notes |
|--------|-------|-------|
| Entrance | `Entrance` | tap to enter; twinkling starfield |
| Onboarding | `Setup` + `BirthInput` (celestial.jsx) | name + Y/M/D/시 wheel pickers |
| Hub | `Hub` | "오늘의 나" panel + 오늘의 운세 / 천문 식탁 up front, rest under 더보기 |
| Today's fortune | `Result` + `FortuneBody` | ScoreRing reveal, ohaeng constellation, lucky color swatch |
| Saju card | `CardResult` | **flip card** (RitualReveal) — procedural mandala from ilju+ohaeng |
| Lifetime saju | `SajuBody` | AI score + transformScore |
| Weekly | `WeeklyBody` | 7-day bars animate fill |
| Gunghap | `GunghapForm` → `GunghapBody` | partner birth only; relationship archetype label |
| Tarot | `TarotDraw` → `TarotResult` | single tap draw, Rider-Waite images in `public/tarot/` |
| 천문 식탁 | `FoodTable` | instant client-side reco (`foodReco.js`) + nearby restaurants |
| Study compass | `StudyCompass` | one Gemini call, cached per day |
| Diary | `Diary` / `DiaryHub` | mood + note, score history chart, CRUD |
| Premium report | `ReportSelect` → background gen → `ReportToast` | signature / study, PDF to device |

**Decommissioned but preserved** (code kept, hidden): in-app food *search* against MFDS
data with A/B/C/D compliance gating, and email delivery of reports. Real phone captures
of these live in `screenshots/user/` and appear in the deck as "비공개 기능".

---

## 8. Screenshot → PPTX automation ("DeckKit") — reusable

`scripts/deck/` is a **project-independent** module. Copy that folder into any other
project and you get automatic screenshots + auto-built PowerPoint.

| File | Role | Deps |
|------|------|------|
| `deck/capture-kit.mjs` | launch system Edge, mobile context, shoot, click-by-text, flip | `playwright-core` + system browser |
| `deck/pptx-kit.mjs` | official-document PPTX builder (cover/content/codebox/flow) | `pptxgenjs` |
| `deck/imgsize.mjs` | read PNG/JPEG pixel size to preserve aspect | none |

Cheonmun-specific config that uses the module:
- `scripts/capture-screens.mjs` — what to click / shoot (Korean text selectors)
- `scripts/build-pptx.mjs` — main 23-slide deck (script/content)
- `scripts/build-pptx-pipeline.mjs` — 8-slide explainer of the automation itself
- `scripts/build-pptx-module.mjs` — 2-slide note: module is reusable + self-reference

Commands:
```bash
npm run shots          # capture screens (deploy URL by default)
npm run shots http://localhost:5173
npm run pptx           # build main deck
npm run pptx:pipeline  # build automation explainer deck
npm run pptx:module    # build 2-slide module note
npm run deck           # do everything: capture → all decks
```
Outputs: `천문_발표자료.pptx`, `천문_자동화_파이프라인.pptx`, `천문_자동화모듈_안내.pptx`.

Automation gotchas:
- Floating elements (`.animate-float`, e.g. the tarot card) are "not stable" for
  Playwright → use `reducedMotion:'reduce'` and/or `click({force:true})`.
- AI result screens take 20–40s → the flow waits until the "메인으로" button appears.
- This machine has **no PowerPoint/LibreOffice**, so decks are validated by ZIP
  signature + slide/media counts, not by visual render.
- `pptxgenjs` bullets use `bullet: { code: '25AA' }` (hex), not `characterCode`.
- **Never overwrite `screenshots/28_1_report_real.png`** — it's a user-provided real
  report capture (an original is in `screenshots/user/`).

---

## 9. Backend (`backend/`) — status

A NestJS "twin-pillar" service exists for wellness features:
- 천문식탁 `ChunmunTableModule` → `POST /api/chunmun-table/analyze`
- 오늘의 추천 음식 `RecommendationsModule` → `GET /api/recommendations/today-food/:userId`

It uses PostgreSQL + TypeORM + Redis, with an A/B/C/D compliance gate and an MFDS
nightly sync. The two MFDS datasets live on different portals (food-nutrition on
data.go.kr; health-functional ingredients on foodsafetykorea.go.kr). The MFDS food
data has already been loaded into a SQL DB. **The current live frontend does not call
this backend** — 천문 식탁 runs fully client-side (`foodReco.js`). If you revive the
food-search/nutrition card, wire it to this DB rather than re-integrating the APIs.

---

## 10. Conventions & gotchas

- **Commits go straight to `main`** (small, focused). End commit messages with the
  `Co-Authored-By` trailer used throughout the history.
- **`.gitattributes`** marks images/audio/pdf as binary (prevents CRLF corruption) and
  normalizes source to LF. Expect "LF will be replaced by CRLF" warnings on Windows —
  harmless.
- **Editing `App.jsx`**: read the exact region first; whitespace differs (e.g.
  `border:'1px...'` with no space after colon). A failed Edit means the working tree is
  unchanged — verify with `git log` / `git status` after committing, don't assume.
- **Report is IndexedDB-cached** — to verify report changes you must regenerate it.
- The AI tone guide ("warm neighbor", no hanja, no negative phrasing, reframe
  positively) lives in `fortune.js` (`WARM`). Keep new prompts consistent with it.

---

## 11. Open / deferred items

- Move `VITE_GEMINI_API_KEY` behind a server proxy (`/api/gemini`) for production
  security (Kakao already proxied).
- `App.jsx` could be split into per-screen modules (only `bits.jsx` extracted so far);
  deferred to avoid destabilizing the live app.
- Optional: in-app Kakao map needs `VITE_KAKAO_JS_KEY` with the deployed domain
  registered, or the restaurant list renders without the embedded map.
- Premium report: depends on Gemini quota; generation is best-effort with retries.

---

## 12. Quick start for the next engineer

1. `npm install`, create `.env.local` with the three keys (§5), `npm run dev`.
2. Read `src/lib/saju.js` (scoring) and skim `src/App.jsx` (screens) — those two cover
   ~80% of the product logic.
3. Make a change, `npm run build`, commit to `main`, let Vercel deploy.
4. To refresh the deck after UI changes: close any open `.pptx`, run `npm run deck`.
