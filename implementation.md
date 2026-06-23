# Implementation Document — Scalping Brief Generator
**Version:** 1.0  
**Date:** 2026-06-10

---

## 1. Tech Stack Decision

| Layer | Choice | Alasan |
|-------|--------|--------|
| UI Framework | React 18 (CDN) | Komponen reaktif, no build step |
| Styling | Tailwind CSS (CDN) | Utility-first, cepat, konsisten |
| Charts | Recharts (CDN) | Declarative, React-native, mudah custom |
| PDF Export | html2pdf.js (CDN) | Client-side PDF, no server |
| Icons | Lucide React (CDN) | Tree-shakable, konsisten IDX feel |
| Persistence | localStorage | No backend, privacy-first |
| Delivery | Single `.jsx` file | Mudah dibuka, share, deploy |

**Tidak menggunakan:** Redux, React Router, build tools (Vite/webpack), backend/API.

---

## 2. File Structure

```
Trading/
├── scalping-brief.jsx          ← Main app (single file deliverable)
├── requirement.md
├── design.md
└── implementation.md
```

Semua logic, state, komponen, styling dalam satu file `.jsx`.

---

## 3. Sprint Plan

### Sprint 1 — Foundation & Kondisi Market (Est. 1 session)

**Deliverable:** App shell + Modul Kondisi Market berjalan

Tasks:
- [ ] Setup React app shell (CDN imports, root render)
- [ ] Implement global state dengan `useReducer`
- [ ] Buat `<Header />` dengan date, save, reset
- [ ] Buat `<Sidebar />` navigasi 4 modul
- [ ] Buat `<MarketConditionModule />`
  - [ ] IHSG form: harga, %change, trend radio
  - [ ] Foreign flow: buy/sell toggle + input nilai
  - [ ] Regional grid: 4 input (%change per index)
  - [ ] Sektor picker: multi-select strong/weak
  - [ ] Market Score calculator + RegimeCard
  - [ ] Notes textarea
- [ ] Implement `calculateMarketScore()` function
- [ ] Styling dark theme + color tokens

**Acceptance Criteria:**
- User bisa isi semua field Kondisi Market
- Market Score update real-time
- Regime label berubah warna sesuai score

---

### Sprint 2 — Kandidat Saham (Est. 1 session)

**Deliverable:** Modul watchlist kandidat scalping berjalan

Tasks:
- [ ] Buat `<StockCandidateModule />`
- [ ] Buat `<AddStockForm />` (kode, nama, harga, vol, change, setup)
- [ ] Buat `<CandidateCard />` dengan:
  - [ ] Inline edit: entry, SL, TP1, TP2
  - [ ] Auto-calc R:R dari entry/SL/TP
  - [ ] Setup badge (color-coded per type)
  - [ ] Priority/Watch/Skip dropdown
  - [ ] Score bar
  - [ ] Delete button
- [ ] Implement `calculateCandidateScore()` function
- [ ] Implement drag-reorder (menggunakan mouse events)
- [ ] Validasi: max 5 kandidat aktif (Priority+Watch)
- [ ] SL warning jika >7% dari entry

**Acceptance Criteria:**
- Bisa add/edit/delete kandidat
- R:R & score update real-time saat edit
- SL > 7% tampil warning merah

---

### Sprint 3 — Valuasi PE/PBV Band (Est. 1 session)

**Deliverable:** Modul PE/PBV band dengan visualisasi berjalan

Tasks:
- [ ] Buat `<ValuationBandModule />`
- [ ] Buat stock selector (dari list kandidat atau input baru)
- [ ] Buat `<PEBandInputForm />` (5 level input)
- [ ] Buat `<PBVBandInputForm />` (5 level input)
- [ ] Implement `calculateValuation()`:
  - [ ] currentPE, currentPBV
  - [ ] Implied prices per level
  - [ ] Percentile position
  - [ ] Valuation label
- [ ] Buat `<BandVisualizationChart />`:
  - [ ] Custom horizontal range bar (Recharts atau SVG)
  - [ ] Pointer/marker di posisi harga saat ini
  - [ ] Label di setiap band level
- [ ] Buat `<ImpliedPriceTable />`:
  - [ ] Tabel upside/downside ke setiap level
  - [ ] Highlight level terdekat dengan harga saat ini
- [ ] Save profil PE/PBV per kode saham ke localStorage

**Acceptance Criteria:**
- Band chart tampil setelah user isi semua input
- Implied prices update real-time
- Valuation label berubah sesuai posisi PE/PBV

---

### Sprint 4 — Consensus Estimate (Est. 1 session)

**Deliverable:** Modul consensus estimate berjalan

Tasks:
- [ ] Buat `<ConsensusModule />`
- [ ] Buat `<AnalystRatingInput />` (Buy/Hold/Sell number inputs)
- [ ] Buat `<AnalystRatingBar />` (horizontal stacked bar: hijau/abu/merah)
- [ ] Buat `<TargetPriceInput />` (Low, Mean, High)
- [ ] Buat upside calculator (vs harga saat ini)
- [ ] Buat `<EarningsEstimateForm />` (EPS & Revenue FY0/FY1 + YoY growth)
- [ ] Implement `calculateConsensus()`:
  - [ ] Consensus Score (weighted avg)
  - [ ] Label: Bullish/Neutral/Bearish
- [ ] Buat `<ConsensusScoreCard />` dengan gauge/badge
- [ ] Input next earnings date (date picker)

**Acceptance Criteria:**
- Rating bar proporsional sesuai input analis
- Upside ke TP tampil dalam %
- Consensus label update real-time

---

### Sprint 5 — Brief Generator & Export (Est. 1 session)

**Deliverable:** Brief preview + copy + PDF export

Tasks:
- [ ] Buat `<BriefPreviewPanel />` (live preview panel kanan/bawah)
- [ ] Implement `generateBriefText()` — template string dari state
- [ ] Preview update real-time saat state berubah
- [ ] Buat `<CopyButton />` dengan `navigator.clipboard.writeText()`
- [ ] Buat `<PDFExportButton />` menggunakan html2pdf.js
  - [ ] Render brief ke hidden div → capture → PDF
  - [ ] Filename: `scalping-brief-{date}.pdf`
- [ ] Buat session persistence (auto-save + load)
- [ ] Buat session history (dropdown 7 sesi terakhir)
- [ ] Tombol Reset dengan konfirmasi dialog

**Acceptance Criteria:**
- Brief preview update saat data berubah
- Copy berhasil → tampil toast "Copied!"
- PDF ter-download dengan layout rapi

---

### Sprint 6 — Polish & QA (Est. 1 session)

**Deliverable:** App siap pakai, responsif, bug-free

Tasks:
- [ ] Responsive layout: 1280px / 1024px / mobile fallback
- [ ] Validasi semua input (angka negatif, required fields)
- [ ] Error states (field kosong → highlight merah)
- [ ] Empty states (sebelum data diisi → placeholder guide)
- [ ] Keyboard shortcut: `Ctrl+S` save, `Ctrl+G` generate brief
- [ ] Tooltip bantuan di setiap section (ikon ❓)
- [ ] Disclaimer footer
- [ ] Cross-browser test: Chrome, Edge, Firefox
- [ ] Performance: smooth di >100 re-renders/sec

---

## 4. Key Implementation Details

### 4.1 State Management Pattern

```javascript
// useReducer dengan immer-style update
const [state, dispatch] = useReducer(reducer, initialState);

// Actions
dispatch({ type: 'UPDATE_MARKET', payload: { ihsg: { price: 7200 } } })
dispatch({ type: 'ADD_CANDIDATE', payload: { code: 'BBRI', ... } })
dispatch({ type: 'UPDATE_VALUATION', payload: { eps: 520 } })

// Auto-save effect
useEffect(() => {
  const timer = setTimeout(() => {
    localStorage.setItem('scalping-brief', JSON.stringify(state));
  }, 1000);
  return () => clearTimeout(timer);
}, [state]);
```

### 4.2 Band Chart (SVG Custom Component)

Karena Recharts horizontal bar complex, gunakan SVG native:

```jsx
function BandChart({ bands, current, eps }) {
  const min = bands[0], max = bands[4];
  const toX = (val) => ((val - min) / (max - min)) * 100; // % position

  return (
    <svg viewBox="0 0 400 60">
      {/* Background bar */}
      <rect x="0" y="25" width="400" height="10" fill="#1e293b" rx="5" />
      {/* Colored zones */}
      <rect x={`${toX(min)}%`} y="25" width={`${toX(bands[2])-toX(min)}%`} height="10" fill="#22c55e" rx="3" />
      <rect x={`${toX(bands[2])}%`} y="25" width={`${toX(max)-toX(bands[2])}%`} height="10" fill="#ef4444" rx="3" />
      {/* Current PE marker */}
      <line x1={`${toX(current)}%`} y1="15" x2={`${toX(current)}%`} y2="45" stroke="#f59e0b" strokeWidth="2" />
      <text x={`${toX(current)}%`} y="12" textAnchor="middle" fill="#f59e0b" fontSize="11">{current}x</text>
    </svg>
  );
}
```

### 4.3 R:R Auto-Calculation

```javascript
function calculateRR(entry, sl, tp1) {
  const risk   = entry - sl;
  const reward = tp1 - entry;
  if (risk <= 0) return null;
  return (reward / risk).toFixed(1);
}

// Validasi
function validateSL(entry, sl) {
  const pct = ((entry - sl) / entry) * 100;
  return {
    valid: pct <= 7,
    pct: pct.toFixed(1),
    warning: pct > 7 ? `SL ${pct.toFixed(1)}% melebihi batas 7%` : null
  };
}
```

### 4.4 PDF Export

```javascript
async function exportPDF() {
  const element = document.getElementById('brief-pdf-target');
  const opt = {
    margin: [10, 10],
    filename: `scalping-brief-${formatDate(new Date())}.pdf`,
    image: { type: 'jpeg', quality: 0.95 },
    html2canvas: { scale: 2, backgroundColor: '#0f1117' },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };
  await html2pdf().set(opt).from(element).save();
}
```

---

## 5. CDN Dependencies

```html
<!-- React 18 -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/react/18.2.0/umd/react.production.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.2.0/umd/react-dom.production.min.js"></script>

<!-- Babel (JSX transform, dev only) -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/babel-standalone/7.23.2/babel.min.js"></script>

<!-- Tailwind CSS -->
<script src="https://cdn.tailwindcss.com"></script>

<!-- Recharts -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/recharts/2.8.0/Recharts.min.js"></script>

<!-- Lucide React -->
<script src="https://unpkg.com/lucide-react@latest/dist/umd/lucide-react.js"></script>

<!-- html2pdf -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
```

---

## 6. Milestones & Timeline

| Sprint | Target | Est. Duration |
|--------|--------|---------------|
| Sprint 1 | Foundation + Market Module | 1 sesi |
| Sprint 2 | Kandidat Saham | 1 sesi |
| Sprint 3 | PE/PBV Band | 1 sesi |
| Sprint 4 | Consensus Estimate | 1 sesi |
| Sprint 5 | Brief + Export | 1 sesi |
| Sprint 6 | Polish + QA | 1 sesi |
| **Total** | **Full App** | **~6 sesi** |

---

## 7. Definition of Done

Sebuah sprint dianggap selesai jika:
- [ ] Semua acceptance criteria terpenuhi
- [ ] Tidak ada error di console browser
- [ ] State persists setelah page refresh
- [ ] Kalkulasi diverifikasi manual dengan contoh data nyata
- [ ] File `.jsx` tunggal berjalan di Chrome tanpa setup apapun

---

## 8. Future Enhancements (Post-MVP)

- Integrasi screener IDX via API publik (BMAD, IDX API)
- Import data historis PE/PBV dari CSV
- Multi-session management (simpan & bandingkan brief antar hari)
- Notifikasi SL/TP via Telegram bot webhook
- Template watchlist per sektor (Banking, Mining, Tech, dll.)
- Backtesting sederhana: track hasil setup yang dieksekusi
