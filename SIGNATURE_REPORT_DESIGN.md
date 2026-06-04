# 시그니처 리포트 — 듀얼 테마 디자인 시스템

> **목표:** 시그니처 사주 리포트(PDF·이메일)가 **흰 배경(Light)** 과 **검은 배경(Dark)** 양쪽에서 전문적이고, 읽기 쉽고, 일관된 '시그니처' 브랜드로 보이게 한다.
>
> **적용 범위:** 이 듀얼 테마는 **리포트 산출물**(PDF/이메일)에 한정한다. 앱 UI는 의도적으로 **다크 전용**(몰입형 천체 무드)으로 유지한다 — 별빛·글로우·점수 링이 어둠을 전제로 설계됐기 때문. 리포트는 인쇄·메일이라는 별개 매체이므로 라이트를 1차로, 다크(화면 열람용)를 함께 제공한다.
>
> **SSOT:** 모든 토큰은 [`src/lib/reportTheme.js`](src/lib/reportTheme.js) 한 곳에서 정의되고, PDF([`reportPdf.js`](src/lib/reportPdf.js))와 이메일([`emailTemplate.js`](src/lib/emailTemplate.js))이 이를 소비한다. (이전엔 두 파일이 각자 색을 하드코딩해 미세한 드리프트가 있었음 — 토큰화로 제거.)

---

## 1. 색상 팔레트 전략 (Color Palette Strategy)

원칙: **구조(배경·텍스트·브랜드)는 시맨틱 토큰으로 테마별 1:1 매핑**, **오행 5색은 매체 적응형**(라이트=진한 print 색 / 다크=밝은 screen 색).

### 1.1 Light (인쇄·메일 — 흰/아이보리)

| 역할 | 값 | 비고 |
|---|---|---|
| 캔버스(바깥 매트) | `#f1ede4` | 따뜻한 아이보리 — 흰 카드를 띄워 종이 질감 |
| 주 표면(종이) | `#ffffff` | 본문 읽기 표면 |
| 카드 표면 | `#fbfaf8` | 명식·향후5년 카드 |
| 주 텍스트(ink) | `#211d2b` | 제목·키 |
| 본문 텍스트 | `#474350` | 단락 |
| 보조 텍스트 | `#6f6b7d` | 캡션·메타 |
| 브랜드 골드 | `#9a6a24` | 시그니처 1차 강조 (텍스트 안전 톤) |
| 브랜드 바이올렛 | `#6741c9` | 2차 강조 |
| 라인 | `rgba(0,0,0,0.09)` | 헤어라인 |

### 1.2 Dark (화면 열람 — 딥 네이비)

| 역할 | 값 | 비고 |
|---|---|---|
| 캔버스 | `#070b16` | |
| 주 표면 | `#0b1020` | 딥 네이비 (앱 브랜드와 동조) |
| 카드 표면 | `rgba(255,255,255,0.045)` | 글래스 톤 |
| 주 텍스트 | `#F4F2FB` | |
| 본문 텍스트 | `#D9D6EA` | |
| 보조 텍스트 | `#A7A3BE` | |
| 브랜드 골드 | `#e7b94f` | 밝은 골드(어둠에서 빛남) |
| 브랜드 바이올렛 | `#b39cf8` | |
| 라인 | `rgba(255,255,255,0.10)` | |

### 1.3 WCAG 대비비 (실측)

> 측정 = WCAG 2.1 상대휘도 공식. AA 본문 ≥ 4.5:1, AA 대형(≥24px 또는 ≥18.66px Bold) ≥ 3:1, AAA 본문 ≥ 7:1.

| 쌍 | Light | 등급 | Dark | 등급 |
|---|---|---|---|---|
| 주 텍스트 / 배경 | **16.5:1** | AAA | **17.1:1** | AAA |
| 본문 텍스트 / 배경 | **9.6:1** | AAA | **13.3:1** | AAA |
| 보조 텍스트 / 배경 | **5.2:1** | AA | **7.8:1** | AAA |
| 골드 / 배경 | 4.7:1 | AA(대형 AAA) | **10.3:1** | AAA |
| 바이올렛 / 배경 | **6.6:1** | AA | **8.1:1** | AAA |
| CTA 텍스트 / CTA 배경 | **16.5:1** | AAA | **10.1:1** | AAA |

**오행 색(라이트=print) 대형/그래픽 전용:** 목 3.4·화 4.0·토 3.0·금 5.1·수 5.3 (모두 **대형 텍스트 AA 3:1 충족**). 다크(screen)는 6.3~12.8:1 전 색 AAA.

---

## 2. 디자인 토큰 (Design Tokens)

시맨틱 네이밍 → 테마별 값. JS 키는 [`reportTheme.js`](src/lib/reportTheme.js) `REPORT_TOKENS`.

| 토큰명(canonical) | JS 키 | Light | Dark |
|---|---|---|---|
| `color-bg-canvas` | `bgCanvas` | `#f1ede4` | `#070b16` |
| `color-bg-primary` | `bgPrimary` | `#ffffff` | `#0b1020` |
| `color-bg-surface` | `bgSurface` | `#fbfaf8` | `rgba(255,255,255,.045)` |
| `color-bg-highlight` | `bgHighlight` | `rgba(154,106,36,.06)` | `rgba(231,185,79,.10)` |
| `color-text-main` | `textMain` | `#211d2b` | `#F4F2FB` |
| `color-text-body` | `textBody` | `#474350` | `#D9D6EA` |
| `color-text-muted` | `textMuted` | `#6f6b7d` | `#A7A3BE` |
| `color-brand-gold` | `gold` | `#9a6a24` | `#e7b94f` |
| `color-brand-violet` | `violet` | `#6741c9` | `#b39cf8` |
| `color-line` | `line` | `rgba(0,0,0,.09)` | `rgba(255,255,255,.10)` |
| `color-logo` / shadow | `logo`/`logoShadow` | `#211d2b` / none | `#fff` / glow |
| `color-cta-bg` | `ctaBg` | `#211d2b` | `linear-gradient(135deg,#e7b94f,#c9a24b)` |
| `color-cta-text` | `ctaText` | `#ffffff` | `#1a1205` |
| `color-cta-ring` | `ctaRing` | `#9a6a24` | `rgba(231,185,79,.5)` |
| `shadow-highlight` | `shadowHi` | `0 6px 22px rgba(154,106,36,.12)` | `0 6px 22px rgba(231,185,79,.18)` |

**오행 토큰**(`reportElems(theme)`): `{ plain, hanja, color }` — `color`는 라이트=`OHAENG.print`, 다크=`OHAENG.color`. 5색(목 화 토 금 수)은 saju.js `OHAENG` 단일 소스에서 파생.

> **사용 규칙:** 오행 색은 **대형 글자(한자 글리프)·막대 채움·숫자·도형**에만. 소형 본문/캡션은 항상 `text-body`/`text-muted`. (라이트에서 print 색의 소형 본문은 AA 미달.)

---

## 3. 컴포넌트 스타일링 (Component Styling)

### 3.1 데이터 테이블 — 사주 명식 네 기둥 (`.pcard`)
- **구조:** 4열 균등 카드. 각 카드 = 기둥명(년/월/일/시) + 한글 부제 + **대형 한자 글리프**(천간·지지를 각각 오행색) + 한글 독음 + 오행 plain.
- **강조:** **일주(가운데)** 카드만 `bgHighlight` 채움 + `gold` 테두리 + `shadowHi`. → "중심" 위계를 시각적으로 고정.
- **테마 적응:** 한자 글리프 색 = `reportElems(theme)` (라이트 진한색 / 다크 밝은색). 카드 테두리·표면은 `line`/`bgSurface`.
- 이메일은 동일 구조를 `<table>` 셀로(클라이언트 호환).

### 3.2 차트 — 오행 분포 막대 (`.obar`)
- **트랙:** `rgba(ink, .06)` 배경 위 둥근 막대, 채움색 = 오행색, 폭 = `max(pct, 2)%`(0도 시각적 흔적 유지).
- **라벨:** 한자(오행색·serif·bold) + plain(**body 색**, 소형이므로). 우측 카운트는 `muted`.
- **요약 노트:** `bgHighlight`/violet tint 박스에 "가장 강한/부족한 기운" — 강·약 키워드만 오행색 **bold**로.

### 3.3 헤더 (`.cover`, `.sec-head`, 이메일 헤더)
- **표지:** 작은 자간-확장 eyebrow(`SIGNATURE REPORT`, violet) → 대형 `天 文` 로고(`logo`색, 다크는 글로우) → 골드 ✦ → 부제 → 메타. 별자리 SVG는 gold/violet 라인 0.6px.
- **섹션 헤더:** 번호(`✦ I`, accent색) + serif H2(`text-main`) + 우하향 페이드 룰(accent→투명). accent는 섹션별로 gold/violet/오행색 교차.
- **위계 규칙:** 한 화면에 accent는 1개 지배색만. 룰(rule)은 1.5px, 본문과 18pt 간격.

### 3.4 CTA 버튼 (`color-cta-*`)
- **라이트:** 잉크(`#211d2b`) 채움 + 흰 텍스트 + 골드 1px 링 → 흰 배경에서 **고대비(16.5:1)**·고급 잉크 버튼.
- **다크:** 골드 그라데이션 채움 + 잉크 텍스트(10.1:1) → 어둠에서 빛나는 1차 행동.
- **형태:** pill(`border-radius:999px`), 패딩 14×32, `shadowHi`. 이메일에선 **그라데이션 대신 라이트=단색**(클라이언트 호환), `d.ctaUrl` 있을 때만 노출(죽은 링크 방지).

---

## 4. 비주얼 위계 — 밝기 차에도 같은 '시그니처' 느낌

브랜드 항상성(밝기와 무관하게 유지되는 4요소):
1. **로고타입** `天 文` (serif·초대형·자간 0.3em) — 라이트=잉크, 다크=화이트+글로우. 형태·비례·자간 불변.
2. **골드 ✦ 마크** — 시그니처 시그널. 라이트=딥 골드, 다크=브라이트 골드. 위치·역할(섹션 구분·표지·엔딩) 동일.
3. **타이포 위계** — Noto Serif KR(제목·인용·로고) vs Noto Sans KR(본문). 크기 스케일(H2 20pt · 인용 14pt · 본문 11pt · 캡션 9pt) 테마 공통.
4. **여백·리듬** — 섹션 간 18pt, 룰-본문 간격, 카드 라운드 14px. 테마 무관 동일.

밝기 적응 방식: **색의 명도만 반전**시키되(텍스트↔배경), **채도·hue는 보존**(골드는 골드, 바이올렛은 바이올렛). 오행색은 매체에 맞춰 print↔screen 변형해 *대비를 지키면서 같은 계열*로 인지되게 한다.

---

## 5. 구현 맵 & 테마 전환

| 산출물 | 파일 | 테마 |
|---|---|---|
| PDF(Chromium) | `reportPdf.js` → `renderReportPdfHtml(d, theme)` | `'light'`(기본·인쇄) / `'dark'`(화면) |
| 사용자 이메일 | `emailTemplate.js` → `renderUserReportEmail(d)` | light 고정(메일 클라이언트 호환·`color-scheme:light`) |
| 토큰 SSOT | `reportTheme.js` → `REPORT_TOKENS`, `getReportPalette(theme)`, `reportElems(theme)` | — |

- 테마 추가/조정은 `REPORT_TOKENS`만 수정하면 PDF·이메일에 동시 반영.
- 다크 이메일이 필요하면 `getReportPalette('dark')` + `meta color-scheme:dark`로 변형 가능(현재는 라이트만 — 다수 메일 클라이언트가 다크 변환을 자체 처리/불안정하므로 라이트 고정 권장).

## 6. 접근성 요약
- 본문/제목: 양 테마 **AA 이상, 대부분 AAA**.
- 오행색: 대형·그래픽 전용(대형 AA 충족), 소형 텍스트엔 미사용.
- 색에만 의존하지 않음 — 오행은 색 + 한자 + 한글 + 막대길이 + 숫자로 **다중 부호화**. 일주 강조는 색 + 테두리 + 그림자 + 위치(가운데)로 중복 표시.
- `print-color-adjust:exact`로 인쇄 시 배경/채움색 보존.

---

*이 문서는 디자인 사양(SSOT는 코드의 `reportTheme.js`)이다. 토큰 값이 코드와 어긋나면 코드를 정본으로 본다.*
