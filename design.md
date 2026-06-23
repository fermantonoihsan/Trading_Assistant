# Design Document — Scalping Brief Generator
**Version:** 1.0  
**Date:** 2026-06-10

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                   Single HTML File                   │
│                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │
│  │  React   │  │  State   │  │  Calculation     │  │
│  │  UI      │◄─►  Store   │◄─►  Engine          │  │
│  │  Layer   │  │(useState)│  │  (pure functions)│  │
│  └──────────┘  └──────────┘  └──────────────────┘  │
│       │                              │               │
│       ▼                              ▼               │
│  ┌──────────┐              ┌──────────────────┐      │
│  │ Export   │              │  localStorage    │      │
│  │ (PDF /   │              │  Persistence     │      │
│  │  Copy)   │              └──────────────────┘      │
│  └──────────┘                                        │
└─────────────────────────────────────────────────────┘
```

**Tech Stack:**
- **Framework:** React (via CDN, no build step)
- **Styling:** Tailwind CSS (utility classes)
- **Charts:** Recharts (band visualization)
- **PDF Export:** html2pdf.js (CDN)
- **Icons:** Lucide React
- **Delivery:** Single `.html` file + single `.jsx` file

---

## 2. Layout & Navigation

### 2.1 Overall Layout

```
┌─────────────────────────────────────────────────────────────┐
│  HEADER: "Scalping Brief Generator"  [Date]  [Save] [Reset] │
├──────────┬──────────────────────────────────────────────────┤
│  SIDEBAR │  MAIN CONTENT AREA                               │
│          │                                                   │
│  [1] 📊  │  ┌─────────────────────────────────────────────┐ │
│  Market  │  │  Active Module Content (tabs / accordion)   │ │
│          │  │                                             │ │
│  [2] 📈  │  └─────────────────────────────────────────────┘ │
│  Saham   │                                                   │
│          │  ┌─────────────────────────────────────────────┐ │
│  [3] 💰  │  │  BRIEF PREVIEW (always visible, right panel │ │
│  PE/PBV  │  │  or bottom panel)                           │ │
│          │  └─────────────────────────────────────────────┘ │
│  [4] 📋  │                                                   │
│  Consens │                                                   │
│          ├───────────────────────────────────────────────────│
│  [5] 📄  │  FOOTER: [Generate Brief] [Copy] [Export PDF]    │
│  Brief   │                                                   │
└──────────┴──────────────────────────────────────────────────┘
```

### 2.2 Responsive Breakpoints

| Breakpoint | Layout |
|------------|--------|
| ≥1280px | Sidebar + Main + Brief Preview (3 column) |
| 1024–1279px | Sidebar + Main (2 column), Brief in tab |
| <1024px | Single column, nav tabs at top |

---

## 3. Component Architecture

```
<App>
├── <Header />
├── <Sidebar navItems />
├── <MainPanel>
│   ├── <MarketConditionModule />     // Tab 1
│   │   ├── <IHSGInputForm />
│   │   ├── <ForeignFlowInput />
│   │   ├── <RegionalSentimentGrid />
│   │   ├── <SectorRotationPicker />
│   │   └── <MarketScoreCard />       // auto-calculated
│   │
│   ├── <StockCandidateModule />      // Tab 2
│   │   ├── <AddStockForm />
│   │   ├── <CandidateList>
│   │   │   └── <CandidateCard />    // per saham, draggable
│   │   │       ├── <SetupBadge />
│   │   │       ├── <TradeParamsForm />
│   │   │       └── <RRDisplay />
│   │   └── <CandidateScoreRanking />
│   │
│   ├── <ValuationBandModule />       // Tab 3
│   │   ├── <StockSelector />         // pilih dari kandidat
│   │   ├── <PEBandInputForm />
│   │   ├── <PBVBandInputForm />
│   │   ├── <BandVisualizationChart /> // horizontal gauge
│   │   ├── <ImpliedPriceTable />
│   │   └── <ValuationLabel />        // Undervalued/Fair/Over...
│   │
│   └── <ConsensusModule />           // Tab 4
│       ├── <StockSelector />
│       ├── <AnalystRatingBar />      // Buy/Hold/Sell donut
│       ├── <TargetPriceRange />
│       ├── <EarningsEstimateForm />
│       └── <ConsensusScoreCard />
│
├── <BriefPreviewPanel />             // live preview
│   └── <BriefSection /> × 4
│
└── <ExportToolbar />
    ├── <CopyButton />
    └── <PDFExportButton />
```

---

## 4. State Schema

```javascript
// Global App State
{
  meta: {
    date: "2026-06-10",
    sessionName: "Scalping Brief - Rabu 10 Jun",
    lastSaved: "2026-06-10T08:30:00"
  },

  market: {
    ihsg: { price: 0, change: 0, trend: "sideways" },   // trend: bullish|bearish|sideways
    foreignFlow: { type: "buy", value: 0 },              // type: buy|sell
    regional: [
      { name: "Nikkei", change: 0 },
      { name: "HSI", change: 0 },
      { name: "STI", change: 0 },
      { name: "S&P Fut", change: 0 }
    ],
    sectors: { strong: [], weak: [] },
    notes: "",
    score: 0,           // computed
    regime: "Normal"    // computed: Aggressive|Normal|Defensive|Avoid
  },

  candidates: [
    {
      id: "uuid",
      code: "BBRI",
      name: "Bank Rakyat Indonesia",
      price: 4850,
      volumeMultiplier: 2.3,    // vs 20-day avg
      change: 1.5,
      setup: "Breakout",         // Gap Continuation|Breakout|Pullback MA|VWAP Bounce|Reversal
      trend: "uptrend",          // uptrend|downtrend|sideways
      entry: 4870,
      sl: 4720,
      tp1: 5050,
      tp2: 5200,
      rr: 1.8,                   // computed
      status: "Priority",        // Priority|Watch|Skip
      score: 78                  // computed
    }
  ],

  valuation: {
    selectedStock: "BBRI",
    currentPrice: 4850,
    eps: 520,
    bvps: 2800,
    peBand: { min: 8, sd_minus1: 10, median: 13, sd_plus1: 16, max: 20 },
    pbvBand: { min: 1.2, sd_minus1: 1.5, median: 1.9, sd_plus1: 2.3, max: 3.0 },
    // Computed fields:
    currentPE: 9.33,
    currentPBV: 1.73,
    pePercentile: 12,
    pbvPercentile: 24,
    label: "Undervalued",
    impliedPrices: { pe: {...}, pbv: {...} }
  },

  consensus: {
    selectedStock: "BBRI",
    analysts: { buy: 18, hold: 5, sell: 1 },
    targetPrice: { low: 4500, mean: 5400, high: 6200 },
    epsEstimate: { current: 520, next: 610, growth: 17.3 },
    revenueEstimate: { current: 145000, next: 162000, growth: 11.7 },
    nextEarningsDate: "2026-07-28",
    // Computed:
    consensusScore: 85,
    consensusLabel: "Bullish",
    upsideMean: 11.3,
    upsideHigh: 27.8
  }
}
```

---

## 5. Calculation Engine

### 5.1 Market Score Algorithm

```
Score = weighted sum of:
  - IHSG Trend:      Bullish=30, Sideways=15, Bearish=0
  - IHSG %Change:    >+1%=20, 0–1%=10, <0%=0
  - Foreign Flow:    Net Buy=20, Net Sell=0
  - Regional Avg:    Avg %change > +0.5%=15, 0–0.5%=8, <0%=0
  - Sektor Kuat:     Jumlah sektor kuat × 3, max 15

Regime:
  80–100 → Aggressive  (green)
  55–79  → Normal      (blue)
  30–54  → Defensive   (yellow)
  0–29   → Avoid       (red)
```

### 5.2 Candidate Score Algorithm

```
Score = weighted sum of:
  - Volume Multiplier: >3x=30, 2–3x=20, 1.5–2x=10, <1.5x=0
  - Setup Strength:    Breakout=25, Gap Cont=25, VWAP=20, Pullback=20, Reversal=15
  - Trend Alignment:   Uptrend=20, Sideways=10, Downtrend=0
  - R:R Ratio:         ≥1:3=25, 1:2–1:3=20, 1:1.5–1:2=10, <1:1.5=0

```

### 5.3 PE/PBV Band Calculation

```
currentPE  = currentPrice / eps
currentPBV = currentPrice / bvps

// Implied price at each band level
impliedPrice[level] = eps * peBand[level]  // for PE
impliedPrice[level] = bvps * pbvBand[level] // for PBV

// Percentile position (linear interpolation between min and max)
pePercentile = (currentPE - peBand.min) / (peBand.max - peBand.min) * 100

// Valuation Label
if percentile < 15  → "Deeply Undervalued"
if percentile < 35  → "Undervalued"
if percentile < 65  → "Fair Value"
if percentile < 85  → "Overvalued"
else                → "Deeply Overvalued"
```

### 5.4 Consensus Score

```
total = buy + hold + sell
consensusScore = (buy * 100 + hold * 50 + sell * 0) / total

if score >= 70 → Bullish
if score >= 40 → Neutral
else           → Bearish
```

---

## 6. UI Design Specs

### 6.1 Color Palette

```css
--color-bg:          #0f1117   /* dark background */
--color-surface:     #1a1d27   /* card/panel */
--color-border:      #2a2d3e   /* borders */
--color-text:        #e2e8f0   /* primary text */
--color-text-muted:  #64748b   /* secondary text */

/* Semantic */
--color-bull:        #22c55e   /* green - bullish/positive */
--color-bear:        #ef4444   /* red - bearish/negative */
--color-neutral:     #94a3b8   /* gray - neutral */
--color-accent:      #6366f1   /* indigo - primary action */
--color-warn:        #f59e0b   /* amber - warning */
```

### 6.2 Typography

```
Font: Inter (system fallback: -apple-system, sans-serif)
Heading 1: 24px / 700
Heading 2: 18px / 600
Heading 3: 14px / 600 uppercase tracking-wide
Body:      14px / 400
Caption:   12px / 400
Mono:      JetBrains Mono / 13px (harga, angka)
```

### 6.3 Component Specs

**CandidateCard:**
```
┌─────────────────────────────────────────────────────┐
│ [BBRI] Bank Rakyat Indonesia      [Priority ▼] [✕]  │
│ Rp 4,850  ▲+1.5%   Vol: 2.3x avg   [Breakout]      │
├─────────────────────────────────────────────────────┤
│ Entry: 4,870  SL: 4,720 (-3.1%)  TP1: 5,050 (+3.7%)│
│ TP2: 5,200 (+6.8%)              R:R: 1 : 1.8       │
│ Score: ████████░░ 78/100                            │
└─────────────────────────────────────────────────────┘
```

**Band Visualization Chart:**
```
PE Band Chart:
Min    -1SD   Median  +1SD   Max
8.0    10.0   13.0    16.0   20.0
|──────|──────|───────|──────|
              ▲ 9.33 (Current)
              Deeply Undervalued

Implied Prices:
  Median PE 13x → Rp 6,760  (+39.4% upside)
  +1SD PE 16x   → Rp 8,320  (+71.5% upside)
```

---

## 7. Brief Output Template

```
═══════════════════════════════════════════════════
📊 SCALPING BRIEF — {DATE} | {SESSION_NAME}
═══════════════════════════════════════════════════

🌏 KONDISI MARKET
  IHSG : {price} ({change}%) — {trend}
  Asing: {foreignFlow}
  Rgn  : Nikkei {n}% | HSI {h}% | STI {s}%
  Sektor Kuat: {sectors}
  Market Score: {score}/100 → {regime}
  📝 {notes}

─────────────────────────────────────────────────
📈 KANDIDAT SCALPING HARI INI

[1] {CODE} — {setup}
    Entry: {entry} | SL: {sl} ({sl%}) | TP1: {tp1} | R:R 1:{rr}
    Score: {score}/100

[2] ...

─────────────────────────────────────────────────
💰 VALUASI: {selectedStock}
    PE Saat Ini : {pe}x → {peLabel} (Percentile {pePerc}%)
    PBV Saat Ini: {pbv}x → {pbvLabel}
    Target Median PE: Rp {impliedMedPE} (+{upside}%)

─────────────────────────────────────────────────
📋 CONSENSUS: {selectedStock}
    Rating  : {buy}B / {hold}H / {sell}S → {consensusLabel}
    TP Mean : Rp {tpMean} (+{upsideMean}%)
    EPS Est : {epsEst} (+{epsGrowth}% YoY)
    Earnings: {earningsDate}

═══════════════════════════════════════════════════
⚠️ Bukan rekomendasi beli/jual. Selalu gunakan SL.
```

---

## 8. Data Persistence

- **localStorage key:** `scalping-brief-session`
- **Auto-save:** setiap perubahan input (debounce 1 detik)
- **Manual save:** tombol Save di header
- **Session history:** simpan hingga 7 sesi terakhir

---

## 9. Export Spec

### PDF Export
- Format: A4 landscape
- Font: embed Inter
- Warna: dark theme (sama dengan UI) atau light theme (lebih hemat tinta)
- Library: `html2pdf.js` via CDN

### Copy to Clipboard
- Format: plain text (template di Section 7)
- Trigger: tombol "Copy Brief"
