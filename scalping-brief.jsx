// scalping-brief.jsx — Sprint 1 + Sprint 2: Kondisi Market + Kandidat Saham
// Load via: index.html (React 18 CDN + Babel Standalone + Tailwind CDN)

const { useState, useReducer, useEffect } = React;

// ─────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────

const SECTORS = [
  'Keuangan', 'Energi', 'Material', 'Industri',
  'Konsumsi', 'Kesehatan', 'Teknologi', 'Properti',
  'Infrastruktur', 'Transportasi',
];

const TREND_OPTIONS = [
  { value: 'bullish',  label: 'Bullish'  },
  { value: 'sideways', label: 'Sideways' },
  { value: 'bearish',  label: 'Bearish'  },
];

const FLOW_OPTIONS = [
  { value: 'buy',  label: 'Net Buy'  },
  { value: 'sell', label: 'Net Sell' },
];

const NAV_ITEMS = [
  { id: 'market',    label: 'Kondisi Market', icon: '📊' },
  { id: 'saham',     label: 'Kandidat Saham', icon: '📈' },
  { id: 'valuasi',   label: 'PE/PBV Band',    icon: '💰' },
  { id: 'consensus', label: 'Consensus',      icon: '📋' },
  { id: 'brief',     label: 'Brief',          icon: '📄' },
  { id: 'jurnal',    label: 'Jurnal',         icon: '📒' },
];

// ─────────────────────────────────────────────────────────
// SPRINT 2 CONSTANTS
// ─────────────────────────────────────────────────────────

const SETUP_TYPES = [
  { value: 'Breakout',         color: '#6366f1', score: 25 },
  { value: 'Gap Continuation', color: '#22c55e', score: 25 },
  { value: 'VWAP Bounce',      color: '#3b82f6', score: 20 },
  { value: 'Pullback MA',      color: '#f59e0b', score: 20 },
  { value: 'Reversal',         color: '#ef4444', score: 15 },
];

const CANDIDATE_TRENDS = [
  { value: 'uptrend',   label: 'Uptrend'   },
  { value: 'sideways',  label: 'Sideways'  },
  { value: 'downtrend', label: 'Downtrend' },
];

const CANDIDATE_STATUSES = ['Priority', 'Watch', 'Skip'];
const ACTIVE_CANDIDATE_LIMIT = 5;
const SESSION_KEY = 'scalping-brief-session';
const SESSION_HISTORY_KEY = 'scalping-brief-history';

const STATUS_STYLE = {
  Priority: { bg: '#14532d', border: '#16a34a', color: '#4ade80' },
  Watch:    { bg: '#1e1b4b', border: '#4f46e5', color: '#818cf8' },
  Skip:     { bg: '#1e293b', border: '#334155', color: '#64748b' },
};

// App-level IDX auto rejection assumption for decision-support labels only.
// Kept explicit and centralized so the app does not imply this is the latest exchange rule.
var IDX_AUTO_REJECTION_RULE = {
  araBands: [
    { maxPrice: 200, pct: 35 },
    { maxPrice: 5000, pct: 25 },
    { maxPrice: Infinity, pct: 20 },
  ],
  arbPct: 7,
};

// ─────────────────────────────────────────────────────────
// SECTOR ROTATION DEFAULT DATA
// ─────────────────────────────────────────────────────────

const DEFAULT_SECTOR_ROTATION = [
  { name: 'Basic-Ind',    change: '', stocks: [ {ticker:'ANTM',change:''}, {ticker:'BRMS',change:''}, {ticker:'BRPT',change:''} ] },
  { name: 'Cyclical',     change: '', stocks: [ {ticker:'MNCN',change:''}, {ticker:'SCMA',change:''}, {ticker:'MINA',change:''} ] },
  { name: 'Energy',       change: '', stocks: [ {ticker:'ADRO',change:''}, {ticker:'BUMI',change:''}, {ticker:'PGAS',change:''} ] },
  { name: 'Health',       change: '', stocks: [ {ticker:'KLBF',change:''}, {ticker:'SIDO',change:''}, {ticker:'KAEF',change:''} ] },
  { name: 'Finance',      change: '', stocks: [ {ticker:'BBCA',change:''}, {ticker:'BBRI',change:''}, {ticker:'BMRI',change:''} ] },
  { name: 'Industrial',   change: '', stocks: [ {ticker:'ASII',change:''}, {ticker:'UNTR',change:''}, {ticker:'IMPC',change:''} ] },
  { name: 'Infrastruktur',change: '', stocks: [ {ticker:'TLKM',change:''}, {ticker:'ADHI',change:''}, {ticker:'CDIA',change:''} ] },
  { name: 'Transport',    change: '', stocks: [ {ticker:'PJHB',change:''}, {ticker:'GIAA',change:''}, {ticker:'SMDR',change:''} ] },
  { name: 'Technology',   change: '', stocks: [ {ticker:'GOTO',change:''}, {ticker:'WIFI',change:''}, {ticker:'EMTK',change:''} ] },
  { name: 'Non-Cyclical', change: '', stocks: [ {ticker:'UNVR',change:''}, {ticker:'INDF',change:''}, {ticker:'ICBP',change:''} ] },
  { name: 'Property',     change: '', stocks: [ {ticker:'CTRA',change:''}, {ticker:'PWON',change:''}, {ticker:'BSDE',change:''} ] },
];

// ─────────────────────────────────────────────────────────
// DATE HELPERS
// ─────────────────────────────────────────────────────────

const DAY_NAMES   = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
const MONTH_NAMES = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

function formatDisplayDate(iso) {
  const d = new Date(iso + 'T00:00:00');
  return DAY_NAMES[d.getDay()] + ', ' + d.getDate() + ' ' + MONTH_NAMES[d.getMonth()] + ' ' + d.getFullYear();
}

function buildSessionName() {
  const d = new Date();
  return 'Scalping Brief - ' + DAY_NAMES[d.getDay()] + ' ' + d.getDate() + ' ' + MONTH_NAMES[d.getMonth()];
}

function reportAppError(context, err) {
  var msg = context + (err && err.message ? ': ' + err.message : '');
  if (typeof console !== 'undefined' && console.warn) console.warn(msg, err || '');
  return msg;
}

function safeSetStorage(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (err) {
    reportAppError('Gagal menyimpan localStorage ' + key, err);
    return false;
  }
}

function safeRemoveStorage(key) {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (err) {
    reportAppError('Gagal menghapus localStorage ' + key, err);
    return false;
  }
}

function readLocalJson(key, fallback) {
  try {
    var raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (err) {
    reportAppError('Gagal membaca localStorage ' + key, err);
    return fallback;
  }
}

function loadSessionHistory() {
  var history = readLocalJson(SESSION_HISTORY_KEY, []);
  return Array.isArray(history) ? history : [];
}

function saveSessionHistory(state) {
  var savedAt = state.meta.lastSaved || new Date().toISOString();
  var entry = {
    id: state.meta.date + '-' + savedAt,
    label: state.meta.sessionName || ('Scalping Brief ' + state.meta.date),
    savedAt: savedAt,
    state: state,
  };
  var existing = loadSessionHistory().filter(function(item) {
    return item && item.state && item.state.meta && item.state.meta.date !== state.meta.date;
  });
  var history = [entry].concat(existing).slice(0, 7);
  safeSetStorage(SESSION_HISTORY_KEY, JSON.stringify(history));
  return history;
}

// ─────────────────────────────────────────────────────────
// INITIAL STATE  (design.md §4)
// ─────────────────────────────────────────────────────────

const initialState = {
  meta: {
    date:        todayISO(),
    sessionName: buildSessionName(),
    lastSaved:   null,
  },
  market: {
    ihsg:        { price: '', change: '', trend: 'sideways' },
    foreignFlow: { type: 'buy', value: '' },
    regional: [
      { name: 'Nikkei',  change: '' },
      { name: 'HSI',     change: '' },
      { name: 'STI',     change: '' },
      { name: 'S&P Fut', change: '' },
    ],
    sectors:        { strong: [], weak: [] },  // derived from sectorRotation by withScore
    sectorRotation: DEFAULT_SECTOR_ROTATION,
    notes:  '',
    score:  0,
    regime: 'Normal',
  },
  candidates: [],
  valuation: {
    selectedStock: '',
    currentPrice:  '',
    eps:           '',
    bvps:          '',
    peBand:  { min: '', sd_minus1: '', median: '', sd_plus1: '', max: '' },
    pbvBand: { min: '', sd_minus1: '', median: '', sd_plus1: '', max: '' },
  },
  consensus: {
    selectedStock:    '',
    analysts:         { buy: '', hold: '', sell: '' },
    targetPrice:      { low: '', mean: '', high: '' },
    epsEstimate:      { current: '', next: '', growth: '' },
    revenueEstimate:  { current: '', next: '', growth: '' },
    nextEarningsDate: '',
  },
  // Pengaturan manajemen risiko untuk position sizing
  settings: {
    capital: '',   // modal trading (Rp)
    riskPct: '1',  // risiko per transaksi (% dari modal)
  },
  // Jurnal trading: catatan eksekusi nyata untuk evaluasi
  journal: [],
  ui: {
    error: null,
  },
};

// ─────────────────────────────────────────────────────────
// PURE CALCULATION FUNCTIONS  (design.md §5.1)
// ─────────────────────────────────────────────────────────

function calculateMarketScore(market) {
  var score = 0;

  // IHSG Trend: Bullish=30, Sideways=15, Bearish=0
  if      (market.ihsg.trend === 'bullish')  score += 30;
  else if (market.ihsg.trend === 'sideways') score += 15;

  // IHSG %Change: >+1%=20, 0-1%=10, <0%=0
  var chg = parseFloat(market.ihsg.change) || 0;
  if      (chg > 1)  score += 20;
  else if (chg >= 0) score += 10;

  // Foreign Flow: Net Buy=20, Net Sell=0
  if (market.foreignFlow.type === 'buy') score += 20;

  // Regional Avg: avg>+0.5%=15, 0-0.5%=8, <0%=0
  var vals = market.regional.map(function(r) { return parseFloat(r.change) || 0; });
  var rAvg = vals.reduce(function(s, v) { return s + v; }, 0) / vals.length;
  if      (rAvg > 0.5) score += 15;
  else if (rAvg >= 0)  score += 8;

  // Sektor Kuat: count x 3, max 15
  score += Math.min(market.sectors.strong.length * 3, 15);

  return Math.min(100, Math.max(0, Math.round(score)));
}

function getRegime(score) {
  if (score >= 80) return 'Aggressive';
  if (score >= 55) return 'Normal';
  if (score >= 30) return 'Defensive';
  return 'Avoid';
}

// Recompute score+regime and merge into market slice.
// Derives sectors.strong/weak from sectorRotation so calculateMarketScore stays unchanged.
function withScore(market) {
  var derived = market;
  if (market.sectorRotation && market.sectorRotation.length) {
    var strong = market.sectorRotation
      .filter(function(s) { return parseFloat(s.change) > 0; })
      .map(function(s) { return s.name; });
    var weak = market.sectorRotation
      .filter(function(s) { return parseFloat(s.change) < 0; })
      .map(function(s) { return s.name; });
    derived = Object.assign({}, market, { sectors: { strong: strong, weak: weak } });
  }
  var score  = calculateMarketScore(derived);
  var regime = getRegime(score);
  return Object.assign({}, derived, { score: score, regime: regime });
}

// ─────────────────────────────────────────────────────────
// SPRINT 2 PURE FUNCTIONS  (design.md §5.2, impl.md §4.3)
// ─────────────────────────────────────────────────────────

function generateId() {
  return 'c_' + Date.now() + '_' + Math.floor(Math.random() * 9999);
}

function formatPrice(n) {
  var num = parseFloat(n);
  if (isNaN(num)) return '–';
  return num.toLocaleString('id-ID');
}

function pctDiff(from, to) {
  var f = parseFloat(from), t = parseFloat(to);
  if (isNaN(f) || isNaN(t) || f === 0) return null;
  return ((t - f) / f * 100).toFixed(1);
}

function calculateRR(entry, sl, tp1) {
  var risk   = parseFloat(entry) - parseFloat(sl);
  var reward = parseFloat(tp1)   - parseFloat(entry);
  if (isNaN(risk) || isNaN(reward) || risk <= 0) return null;
  return (reward / risk).toFixed(2);
}

function validateSL(entry, sl) {
  var e = parseFloat(entry), s = parseFloat(sl);
  if (isNaN(e) || isNaN(s) || e <= 0) return { valid: true, pct: null, warning: null };
  var pct = ((e - s) / e) * 100;
  return {
    valid:   pct <= 7,
    pct:     pct.toFixed(1),
    warning: pct > 7 ? 'SL ' + pct.toFixed(1) + '% melebihi batas risiko 7%' : null,
  };
}

function calculateCandidateScore(candidate) {
  var score = 0;

  // Volume Multiplier: >3x=30, 2-3x=20, 1.5-2x=10, <1.5x=0
  var vol = parseFloat(candidate.volumeMultiplier) || 0;
  if      (vol > 3)    score += 30;
  else if (vol >= 2)   score += 20;
  else if (vol >= 1.5) score += 10;

  // Setup Strength
  var setupScores = {
    'Breakout': 25, 'Gap Continuation': 25,
    'VWAP Bounce': 20, 'Pullback MA': 20, 'Reversal': 15,
  };
  score += setupScores[candidate.setup] || 0;

  // Trend Alignment: Uptrend=20, Sideways=10, Downtrend=0
  if      (candidate.trend === 'uptrend')  score += 20;
  else if (candidate.trend === 'sideways') score += 10;

  // R:R Ratio: >=1:3=25, 1:2-3=20, 1:1.5-2=10, <1.5=0
  var rr = parseFloat(calculateRR(candidate.entry, candidate.sl, candidate.tp1));
  if      (!isNaN(rr) && rr >= 3)   score += 25;
  else if (!isNaN(rr) && rr >= 2)   score += 20;
  else if (!isNaN(rr) && rr >= 1.5) score += 10;

  return Math.min(100, Math.max(0, score));
}

// ─────────────────────────────────────────────────────────
// VALUATION CALCULATION  (design.md §5.3)
// ─────────────────────────────────────────────────────────

var BAND_KEYS        = ['min', 'sd_minus1', 'median', 'sd_plus1', 'max'];
var BAND_LABEL_NAMES = ['Min', '-1SD', 'Median', '+1SD', 'Max'];

var VALUATION_LABEL_COLORS = {
  'Deeply Undervalued': '#22c55e',
  'Undervalued':        '#86efac',
  'Fair Value':         '#60a5fa',
  'Overvalued':         '#fb923c',
  'Deeply Overvalued':  '#ef4444',
};

function getValuationLabel(pct) {
  if (pct < 15) return 'Deeply Undervalued';
  if (pct < 35) return 'Undervalued';
  if (pct < 65) return 'Fair Value';
  if (pct < 85) return 'Overvalued';
  return 'Deeply Overvalued';
}

function calculateValuation(v) {
  var price = parseFloat(v.currentPrice);
  var eps   = parseFloat(v.eps);
  var bvps  = parseFloat(v.bvps);

  var out = {
    currentPE:     null,
    currentPBV:    null,
    pePercentile:  null,
    pbvPercentile: null,
    peLabel:       null,
    pbvLabel:      null,
    peImplied:     {},
    pbvImplied:    {},
    peUpside:      {},
    pbvUpside:     {},
  };

  var validPrice = !isNaN(price) && price > 0;

  if (validPrice && !isNaN(eps) && eps > 0) {
    out.currentPE = price / eps;
    BAND_KEYS.forEach(function(k) {
      var bv = parseFloat(v.peBand[k]);
      if (!isNaN(bv) && bv > 0) {
        out.peImplied[k] = bv * eps;
        out.peUpside[k]  = (bv * eps - price) / price * 100;
      }
    });
    var peMin = parseFloat(v.peBand.min);
    var peMax = parseFloat(v.peBand.max);
    if (!isNaN(peMin) && !isNaN(peMax) && peMax > peMin) {
      var rawPePct = (out.currentPE - peMin) / (peMax - peMin) * 100;
      out.pePercentile = Math.max(0, Math.min(100, rawPePct));
      out.peLabel = getValuationLabel(out.pePercentile);
    }
  }

  if (validPrice && !isNaN(bvps) && bvps > 0) {
    out.currentPBV = price / bvps;
    BAND_KEYS.forEach(function(k) {
      var bv = parseFloat(v.pbvBand[k]);
      if (!isNaN(bv) && bv > 0) {
        out.pbvImplied[k] = bv * bvps;
        out.pbvUpside[k]  = (bv * bvps - price) / price * 100;
      }
    });
    var pbvMin = parseFloat(v.pbvBand.min);
    var pbvMax = parseFloat(v.pbvBand.max);
    if (!isNaN(pbvMin) && !isNaN(pbvMax) && pbvMax > pbvMin) {
      var rawPbvPct = (out.currentPBV - pbvMin) / (pbvMax - pbvMin) * 100;
      out.pbvPercentile = Math.max(0, Math.min(100, rawPbvPct));
      out.pbvLabel = getValuationLabel(out.pbvPercentile);
    }
  }

  return out;
}

// ─────────────────────────────────────────────────────────
// CONSENSUS CALCULATION  (design.md §5.4)
// ─────────────────────────────────────────────────────────

function calculateConsensus(cs, currentPrice) {
  var buy   = parseFloat(cs.analysts.buy)  || 0;
  var hold  = parseFloat(cs.analysts.hold) || 0;
  var sell  = parseFloat(cs.analysts.sell) || 0;
  var total = buy + hold + sell;

  var out = {
    total: total, score: null, label: null,
    buyPct: 0, holdPct: 0, sellPct: 0,
    upsideMean: null, upsideHigh: null,
    epsGrowthCalc: null, revGrowthCalc: null,
  };

  if (total > 0) {
    out.score   = (buy * 100 + hold * 50) / total;
    out.buyPct  = (buy  / total) * 100;
    out.holdPct = (hold / total) * 100;
    out.sellPct = (sell / total) * 100;
    if      (out.score >= 70) out.label = 'Bullish';
    else if (out.score >= 40) out.label = 'Neutral';
    else                      out.label = 'Bearish';
  }

  if (currentPrice !== null && currentPrice > 0) {
    var tpMean = parseFloat(cs.targetPrice.mean);
    var tpHigh = parseFloat(cs.targetPrice.high);
    if (!isNaN(tpMean) && tpMean > 0)
      out.upsideMean = (tpMean - currentPrice) / currentPrice * 100;
    if (!isNaN(tpHigh) && tpHigh > 0)
      out.upsideHigh = (tpHigh - currentPrice) / currentPrice * 100;
  }

  var epsCur  = parseFloat(cs.epsEstimate.current);
  var epsNxt  = parseFloat(cs.epsEstimate.next);
  if (!isNaN(epsCur) && epsCur !== 0 && !isNaN(epsNxt))
    out.epsGrowthCalc = (epsNxt - epsCur) / Math.abs(epsCur) * 100;

  var revCur  = parseFloat(cs.revenueEstimate.current);
  var revNxt  = parseFloat(cs.revenueEstimate.next);
  if (!isNaN(revCur) && revCur !== 0 && !isNaN(revNxt))
    out.revGrowthCalc = (revNxt - revCur) / Math.abs(revCur) * 100;

  return out;
}

// ─────────────────────────────────────────────────────────
// POSITION SIZING · JURNAL · ALERT  (Tier 1 pure functions)
// ─────────────────────────────────────────────────────────

var SHARES_PER_LOT = 100;   // IDX: 1 lot = 100 lembar

// Saran jumlah lot berbasis risiko: modal × risk% ÷ (jarak SL per lembar × 100)
function suggestLot(capital, riskPct, entry, sl) {
  var cap = parseFloat(capital);
  var risk = parseFloat(riskPct);
  var e = parseFloat(entry);
  var s = parseFloat(sl);
  if (isNaN(cap) || cap <= 0 || isNaN(risk) || risk <= 0) return null;
  if (isNaN(e) || isNaN(s) || e <= 0) return null;
  var riskPerShare = Math.abs(e - s);
  if (riskPerShare <= 0) return null;
  var riskAmount = cap * risk / 100;
  var lots = Math.floor(riskAmount / (riskPerShare * SHARES_PER_LOT));
  return lots > 0 ? lots : 0;
}

// P/L & R-multiple satu trade jurnal (entry/exit/sl/lot)
function calcTradePnl(trade) {
  var e = parseFloat(trade.entry), x = parseFloat(trade.exit), lot = parseInt(trade.lot, 10);
  if (isNaN(e) || isNaN(x) || isNaN(lot) || lot <= 0) return null;
  return (x - e) * lot * SHARES_PER_LOT;
}
function calcTradeR(trade) {
  var e = parseFloat(trade.entry), x = parseFloat(trade.exit), s = parseFloat(trade.sl);
  if (isNaN(e) || isNaN(x) || isNaN(s)) return null;
  var risk = Math.abs(e - s);
  if (risk <= 0) return null;
  return (x - e) / risk;
}

// Statistik jurnal: win-rate, avg R, total P/L, profit factor
function calculateJournalStats(journal) {
  var out = { count: 0, closed: 0, wins: 0, losses: 0, be: 0,
              winRate: null, totalPnl: 0, avgR: null, profitFactor: null };
  if (!Array.isArray(journal)) return out;
  out.count = journal.length;
  var rSum = 0, rCount = 0, grossWin = 0, grossLoss = 0;
  journal.forEach(function(t) {
    var pnl = calcTradePnl(t);
    if (pnl === null) return;   // trade belum ditutup / data kurang
    out.closed += 1;
    out.totalPnl += pnl;
    if (pnl > 0)      { out.wins += 1;   grossWin += pnl; }
    else if (pnl < 0) { out.losses += 1; grossLoss += Math.abs(pnl); }
    else              { out.be += 1; }
    var r = calcTradeR(t);
    if (r !== null) { rSum += r; rCount += 1; }
  });
  if (out.closed > 0) out.winRate = out.wins / out.closed * 100;
  if (rCount > 0)     out.avgR = rSum / rCount;
  if (grossLoss > 0)  out.profitFactor = grossWin / grossLoss;
  else if (grossWin > 0) out.profitFactor = Infinity;
  return out;
}

// Alert: level harga yang sedang didekati (Entry/SL/TP/ARA/ARB) dalam ambang %
function proximityAlerts(candidate, thresholdPct) {
  var thr = thresholdPct || 1.5;
  var price = parseFloat(candidate.price);
  if (isNaN(price) || price <= 0) return [];
  var levels = [
    { key: 'sl',    label: 'SL',   value: parseFloat(candidate.sl),       color: '#f87171' },
    { key: 'tp1',   label: 'TP1',  value: parseFloat(candidate.tp1),      color: '#22c55e' },
    { key: 'tp2',   label: 'TP2',  value: parseFloat(candidate.tp2),      color: '#22c55e' },
    { key: 'ara',   label: 'ARA',  value: parseFloat(candidate.araPrice), color: '#a855f7' },
    { key: 'arb',   label: 'ARB',  value: parseFloat(candidate.arbPrice), color: '#ef4444' },
  ];
  var hits = [];
  levels.forEach(function(lv) {
    if (isNaN(lv.value) || lv.value <= 0) return;
    var distPct = Math.abs(price - lv.value) / price * 100;
    if (distPct <= thr) hits.push({ key: lv.key, label: lv.label, color: lv.color, distPct: distPct });
  });
  return hits;
}

// ─────────────────────────────────────────────────────────
// BRIEF GENERATOR  (design.md §7)
// ─────────────────────────────────────────────────────────

function fmtRp(v) {
  var n = parseFloat(v);
  if (isNaN(n)) return '—';
  return 'Rp ' + Math.round(n).toLocaleString('id-ID');
}
function fmtChg(v) {
  var n = parseFloat(v);
  if (isNaN(n)) return '—';
  return (n >= 0 ? '+' : '') + n.toFixed(2) + '%';
}

function generateBriefText(state) {
  var m     = state.market;
  var val   = state.valuation;
  var cs    = state.consensus;
  var cands = state.candidates
    .filter(function(c) { return c.status !== 'Skip'; })
    .slice(0, 5);

  var L   = [];
  var SEP = '═'.repeat(51);
  var DIV = '─'.repeat(51);

  // ── Header ──────────────────────────────────────────────
  L.push(SEP);
  L.push('📊 SCALPING BRIEF — ' + formatDisplayDate(state.meta.date));
  L.push(SEP);
  L.push('');

  // ── Kondisi Market ───────────────────────────────────────
  L.push('🌏 KONDISI MARKET');
  var trendLabel = m.ihsg.trend === 'bullish' ? 'BULLISH' : m.ihsg.trend === 'bearish' ? 'BEARISH' : 'SIDEWAYS';
  L.push('  IHSG : ' + fmtRp(m.ihsg.price) + ' (' + fmtChg(m.ihsg.change) + ') — ' + trendLabel);

  var flowStr = (m.foreignFlow.type === 'buy' ? 'Net Buy' : 'Net Sell') +
                (m.foreignFlow.value ? ' Rp ' + m.foreignFlow.value : '');
  L.push('  Asing: ' + flowStr);

  L.push('  Rgn  : ' + m.regional.map(function(r) {
    return r.name + ' ' + (r.change !== '' ? fmtChg(r.change) : '—');
  }).join(' | '));

  if (m.sectors.strong && m.sectors.strong.length)
    L.push('  ✅ Sektor Kuat : ' + m.sectors.strong.join(', '));
  if (m.sectors.weak && m.sectors.weak.length)
    L.push('  🔻 Sektor Lemah: ' + m.sectors.weak.join(', '));

  L.push('  Market Score : ' + m.score + '/100 → ' + m.regime);
  if (m.notes) L.push('  📝 ' + m.notes);
  L.push('');

  // ── Kandidat ─────────────────────────────────────────────
  L.push(DIV);
  L.push('📈 KANDIDAT SCALPING HARI INI');
  L.push('');

  if (!cands.length) {
    L.push('  (Belum ada kandidat)');
    L.push('');
  } else {
    cands.forEach(function(c, i) {
      var fcTag = c.forecast ? ' [' + c.forecast.icon + ' ' + c.forecast.label + ']' : '';
      L.push('[' + (i + 1) + '] ' + c.code + (c.name ? ' — ' + c.name : '') + ' | ' + (c.setup || '—') + fcTag);

      var volStr = c.volumeMultiplier ? c.volumeMultiplier + 'x avg' : '—';
      L.push('    Harga : ' + fmtRp(c.price) + ' (' + fmtChg(c.change) + ')  Vol: ' + volStr);

      if (c.entry || c.sl || c.tp1) {
        var slPct = '';
        if (c.entry && c.sl) {
          var sp = ((parseFloat(c.sl) - parseFloat(c.entry)) / parseFloat(c.entry) * 100);
          slPct = ' (' + sp.toFixed(1) + '%)';
        }
        var rrStr = c.rr ? ' | R:R 1:' + c.rr : '';
        L.push('    Entry : ' + fmtRp(c.entry) + ' | SL: ' + fmtRp(c.sl) + slPct +
               ' | TP1: ' + fmtRp(c.tp1) + rrStr);
      }
      // Lot + estimasi modal/profit/rugi (IDX: 1 lot = 100 lembar)
      var lotN = parseInt(c.lot, 10), entryN = parseFloat(c.entry);
      if (!isNaN(lotN) && lotN > 0 && !isNaN(entryN) && entryN > 0) {
        var shares = lotN * 100;
        var fmtSigned = function(target) {
          var t = parseFloat(target);
          if (isNaN(t)) return null;
          var v = (t - entryN) * shares;
          return (v >= 0 ? '+' : '−') + 'Rp ' + Math.abs(Math.round(v)).toLocaleString('id-ID');
        };
        var parts = ['Modal ' + fmtRp(entryN * shares)];
        if (fmtSigned(c.sl))  parts.push('SL ' + fmtSigned(c.sl));
        if (fmtSigned(c.tp1)) parts.push('TP1 ' + fmtSigned(c.tp1));
        if (fmtSigned(c.tp2)) parts.push('TP2 ' + fmtSigned(c.tp2));
        L.push('    Lot   : ' + lotN + ' (' + shares.toLocaleString('id-ID') + ' lbr) | ' + parts.join(' | '));
      }
      L.push('    Score : ' + c.score + '/100 | ' + c.status);
      L.push('');
    });
  }

  // ── Valuasi ──────────────────────────────────────────────
  if (val.selectedStock || val.currentPrice) {
    L.push(DIV);
    L.push('💰 VALUASI: ' + (val.selectedStock || '—'));
    var vc = calculateValuation(val);
    if (vc.currentPE != null)
      L.push('  PE  : ' + vc.currentPE.toFixed(1) + 'x → ' + (vc.peLabel || '—') +
             (vc.pePercentile != null ? ' (Persentil ' + vc.pePercentile.toFixed(0) + '%)' : ''));
    if (vc.currentPBV != null)
      L.push('  PBV : ' + vc.currentPBV.toFixed(2) + 'x → ' + (vc.pbvLabel || '—'));
    if (vc.peImplied && vc.peImplied.median != null) {
      var mu = vc.peUpside.median;
      L.push('  Target Median PE: ' + fmtRp(vc.peImplied.median) +
             (mu != null ? ' (' + fmtChg(mu) + ')' : ''));
    }
    L.push('');
  }

  // ── Consensus ────────────────────────────────────────────
  if (cs.selectedStock || cs.analysts.buy || cs.analysts.hold || cs.analysts.sell) {
    L.push(DIV);
    L.push('📋 CONSENSUS: ' + (cs.selectedStock || '—'));
    var cc   = calculateConsensus(cs, parseFloat(val.currentPrice) || null);
    var buy  = cs.analysts.buy  || '0';
    var hold = cs.analysts.hold || '0';
    var sell = cs.analysts.sell || '0';
    L.push('  Rating  : ' + buy + 'B / ' + hold + 'H / ' + sell + 'S → ' + (cc.label || '—'));
    if (cs.targetPrice.mean) {
      var upMean = cc.upsideMean != null ? ' (' + fmtChg(cc.upsideMean) + ')' : '';
      L.push('  TP Mean : ' + fmtRp(cs.targetPrice.mean) + upMean);
    }
    if (cs.epsEstimate.current || cs.epsEstimate.next) {
      var epsCur  = cs.epsEstimate.current || '—';
      var epsGrow = cs.epsEstimate.growth !== '' && cs.epsEstimate.growth != null
        ? ' (' + fmtChg(cs.epsEstimate.growth) + ' YoY)' : '';
      L.push('  EPS Est : Rp ' + epsCur + epsGrow);
    }
    if (cs.nextEarningsDate) L.push('  Earnings: ' + cs.nextEarningsDate);
    L.push('');
  }

  // ── Footer ───────────────────────────────────────────────
  L.push(SEP);
  L.push('⚠️  Bukan rekomendasi beli/jual. Selalu gunakan SL.');
  L.push(new Date().toLocaleString('id-ID'));

  return L.join('\n');
}

// ─────────────────────────────────────────────────────────
// XLSX IMPORT & FORECAST FUNCTIONS
// ─────────────────────────────────────────────────────────

function roundIdxPrice(price) {
  var p = parseFloat(price);
  if (isNaN(p)) return null;
  if (p < 200) return Math.round(p);
  if (p < 500) return Math.round(p / 5) * 5;
  if (p < 2000) return Math.round(p / 10) * 10;
  if (p < 5000) return Math.round(p / 25) * 25;
  return Math.round(p / 50) * 50;
}

// Batas Auto Rejection untuk label app, bukan klaim aturan bursa terbaru.
function getARALimit(price) {
  var p = parseFloat(price);
  if (isNaN(p) || p <= 0) return 25;
  for (var i = 0; i < IDX_AUTO_REJECTION_RULE.araBands.length; i++) {
    var band = IDX_AUTO_REJECTION_RULE.araBands[i];
    if (p <= band.maxPrice) return band.pct;
  }
  return 25;
}
function getARBLimit(price) {
  return -IDX_AUTO_REJECTION_RULE.arbPct;
}

// Hitung sinyal forecast per saham berdasarkan % change, volume, consensus score, harga
function calcForecastSignal(changePct, volMultiplier, consensusScore, price) {
  if (changePct === null || changePct === undefined) return null;
  var vm  = parseFloat(volMultiplier)  || 0;
  var cs  = parseFloat(consensusScore) || 0;

  var araLimit = getARALimit(price);   // mis. +25
  var arbLimit = getARBLimit(price);   // mis. −25

  // ARA: sudah >= 80% batas atas, atau sisa room ke batas <= 3%
  var araRoom = araLimit - changePct;
  if (changePct >= araLimit * 0.8 || araRoom <= 3)
    return { label: 'ARA Potential', color: '#a855f7', bg: '#2e1065', icon: '🚀' };

  // ARB: sudah <= 80% batas bawah, atau sisa room ke batas <= 1.5%
  var arbRoom = changePct - arbLimit;
  if (changePct <= arbLimit * 0.8 || arbRoom <= 1.5)
    return { label: 'ARB Risk', color: '#ef4444', bg: '#450a0a', icon: '🔻' };

  // Bullish score
  var bull = 0;
  if (changePct > 2)   bull += 35;
  else if (changePct > 0.5) bull += 20;
  if (vm > 2)          bull += 30;
  else if (vm > 1.5)   bull += 15;
  if (cs > 70)         bull += 20;
  if (bull >= 50) return { label: 'Bullish', color: '#22c55e', bg: '#052e16', icon: '📈' };

  // Bearish score
  var bear = 0;
  if (changePct < -2)  bear += 35;
  else if (changePct < -0.5) bear += 20;
  if (vm > 1.5 && changePct < 0) bear += 25;
  if (bear >= 40) return { label: 'Bearish', color: '#ef4444', bg: '#450a0a', icon: '📉' };

  return { label: 'Sideways', color: '#94a3b8', bg: '#0f172a', icon: '➡️' };
}

// Hitung level ARA/ARB dari harga penutupan sebelumnya memakai asumsi app di atas.
function calcAraArb(prevClose) {
  var pc = parseFloat(prevClose);
  if (isNaN(pc) || pc <= 0) return { ara: null, arb: null };
  return {
    ara: roundIdxPrice(pc * (1 + getARALimit(pc) / 100)),
    arb: roundIdxPrice(pc * (1 + getARBLimit(pc) / 100)),
  };
}

// Parse file XLSX Scalping_Analysis.xlsx → {candidates, valuation, consensus}
// Membaca sheet: GF_Import, PE_PBV_Band, Consensus_EPS
function parseXLSXToAppData(file) {
  return new Promise(function(resolve, reject) {
    if (typeof XLSX === 'undefined') {
      reject(new Error('SheetJS belum dimuat. Reload halaman dan coba lagi.')); return;
    }
    var reader = new FileReader();
    reader.onerror = function() { reject(new Error('Gagal membaca file.')); };
    reader.onload = function(e) {
      try {
        var wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });

        // ── GF_Import: KODE | Tanggal | Open | High | Low | Close | Volume | %Change ──
        var gfArr = wb.Sheets['GF_Import']
          ? XLSX.utils.sheet_to_json(wb.Sheets['GF_Import'], { header: 1, defval: null })
          : [];
        var gfStart = -1;
        for (var i = 0; i < gfArr.length; i++) {
          if (String(gfArr[i][0] || '').trim().toUpperCase() === 'KODE') { gfStart = i + 1; break; }
        }
        var ohlcvByCode = {};
        if (gfStart >= 0) {
          for (var r = gfStart; r < gfArr.length; r++) {
            var row = gfArr[r];
            var code = String(row[0] || '').trim().toUpperCase();
            if (!code) continue;
            if (!ohlcvByCode[code]) ohlcvByCode[code] = [];
            ohlcvByCode[code].push({
              close:  parseFloat(row[5]) || null,
              volume: parseFloat(row[6]) || null,
            });
          }
        }

        // ── PE_PBV_Band: KODE | Harga | EPS | BVPS | PE(5) | PBV(5) ──
        var peArr = wb.Sheets['PE_PBV_Band']
          ? XLSX.utils.sheet_to_json(wb.Sheets['PE_PBV_Band'], { header: 1, defval: null })
          : [];
        var peStart = -1;
        for (var i = 0; i < peArr.length; i++) {
          if (String(peArr[i][0] || '').trim().toUpperCase() === 'KODE') { peStart = i + 1; break; }
        }
        function sv(x) { return x != null ? String(x) : ''; }
        function pctString(x) {
          if (x == null || x === '') return '';
          var n = parseFloat(x);
          if (isNaN(n)) return '';
          var pct = Math.abs(n) <= 1 ? n * 100 : n;
          return String(pct.toFixed(1));
        }

        var peByCode = {};
        if (peStart >= 0) {
          for (var r = peStart; r < peArr.length; r++) {
            var row = peArr[r];
            var code = String(row[0] || '').trim().toUpperCase();
            if (!code) break;
            if (code === '↑ INPUT' || !(/^[A-Z]{3,5}$/.test(code))) continue;
            peByCode[code] = {
              selectedStock: code,
              currentPrice: sv(row[1]), eps: sv(row[2]), bvps: sv(row[3]),
              peBand:  { min: sv(row[4]),  sd_minus1: sv(row[5]),  median: sv(row[6]),  sd_plus1: sv(row[7]),  max: sv(row[8])  },
              pbvBand: { min: sv(row[9]),  sd_minus1: sv(row[10]), median: sv(row[11]), sd_plus1: sv(row[12]), max: sv(row[13]) },
            };
          }
        }

        // ── Consensus_EPS: KODE | Buy | Hold | Sell | TP(3) | EPS(3) | Rev(3) | Date | Catalyst ──
        var csArr = wb.Sheets['Consensus_EPS']
          ? XLSX.utils.sheet_to_json(wb.Sheets['Consensus_EPS'], { header: 1, defval: null })
          : [];
        var csStart = -1;
        for (var i = 0; i < csArr.length; i++) {
          if (String(csArr[i][0] || '').trim().toUpperCase() === 'KODE') { csStart = i + 1; break; }
        }
        var csByCode = {};
        if (csStart >= 0) {
          for (var r = csStart; r < csArr.length; r++) {
            var row = csArr[r];
            var code = String(row[0] || '').trim().toUpperCase();
            if (!code) break;
            if (!(/^[A-Z]{3,5}$/.test(code))) continue;
            var buy = parseFloat(row[1]) || 0;
            var hold = parseFloat(row[2]) || 0;
            var sell = parseFloat(row[3]) || 0;
            var tot  = buy + hold + sell;
            csByCode[code] = {
              _csScore: tot > 0 ? (buy * 100 + hold * 50) / tot : 0,
              selectedStock: code,
              analysts:        { buy: String(buy), hold: String(hold), sell: String(sell) },
              targetPrice:     { low: String(row[4] || ''), mean: String(row[5] || ''), high: String(row[6] || '') },
              epsEstimate:     {
                current: String(row[7] || ''), next: String(row[8] || ''),
                growth: pctString(row[9]),
              },
              revenueEstimate: {
                current: String(row[10] || ''), next: String(row[11] || ''),
                growth: pctString(row[12]),
              },
              nextEarningsDate: row[13] ? String(row[13]) : '',
            };
          }
        }

        // ── Build candidates ──
        var seen = {}; var allCodes = [];
        [Object.keys(ohlcvByCode), Object.keys(peByCode), Object.keys(csByCode)].forEach(function(arr) {
          arr.forEach(function(c) { if (!seen[c] && c.length <= 6) { seen[c] = true; allCodes.push(c); } });
        });

        // Filter to valid IDX codes only (4-5 uppercase letters); removes chart-data rows
        allCodes = allCodes.filter(function(c) { return /^[A-Z]{3,5}$/.test(c); });

        var candidates = allCodes.map(function(code) {
          var rows = ohlcvByCode[code] || [];
          var todayClose = rows[0] && rows[0].close;
          var prevClose  = rows[1] && rows[1].close;
          var pePriceClose = peByCode[code] && parseFloat(peByCode[code].currentPrice);
          var close = todayClose || pePriceClose || null;

          // Volume multiplier: today vol / avg of remaining rows
          var volMul = null;
          if (rows.length >= 2) {
            var todayVol = rows[0].volume || 0;
            var rest = rows.slice(1);
            var avgVol = rest.reduce(function(s, r) { return s + (r.volume || 0); }, 0) / rest.length;
            if (avgVol > 0) volMul = (todayVol / avgVol).toFixed(2);
          }

          // Change%: hitung dari close hari ini vs kemarin
          var changePct = null;
          if (close && prevClose && prevClose > 0) changePct = (close - prevClose) / prevClose * 100;

          // ARA/ARB levels (XLSX tak punya field ini → hitung dari prevClose)
          var aa = calcAraArb(prevClose);
          var araPrice = aa.ara;
          var arbPrice = aa.arb;

          // Forecast
          var csScore = csByCode[code] ? csByCode[code]._csScore : 0;
          var forecast = calcForecastSignal(changePct, volMul, csScore, close);

          // Auto-trend
          var trend = 'sideways';
          if (changePct !== null) {
            if (changePct > 0.5) trend = 'uptrend';
            else if (changePct < -0.5) trend = 'downtrend';
          }

          var priceStr  = close    ? String(Math.round(close))              : '';
          var changeStr = changePct !== null ? changePct.toFixed(2)         : '';

          var c = {
            id: generateId(), code: code, name: code,
            price: priceStr, change: changeStr,
            volumeMultiplier: volMul ? String(volMul) : '',
            setup: 'Breakout', trend: trend,
            entry: priceStr, sl: '', tp1: '', tp2: '',
            rr: null, status: 'Watch', score: 0,
            forecast: forecast, prevClose: prevClose,
            araPrice: araPrice, arbPrice: arbPrice,
          };
          c.score = calculateCandidateScore(c);
          return c;
        });

        // ── Valuation dari PE_PBV_Band (saham pertama) ──
        var valResult = null;
        var firstPe = Object.keys(peByCode)[0];
        if (firstPe) {
          valResult = peByCode[firstPe];
        }

        // ── Consensus dari Consensus_EPS (saham pertama) ──
        var csResult = null;
        var firstCs = Object.keys(csByCode)[0];
        if (firstCs) {
          csResult = Object.assign({}, csByCode[firstCs]);
          delete csResult._csScore;
        }

        var consensusAll = {};
        Object.keys(csByCode).forEach(function(code) {
          consensusAll[code] = Object.assign({}, csByCode[code]);
          delete consensusAll[code]._csScore;
        });

        resolve({
          candidates: candidates,
          valuation: valResult,
          consensus: csResult,
          fundamentals_all: peByCode,
          consensus_all: consensusAll,
        });
      } catch(err) { reject(new Error('Gagal parse XLSX: ' + (err.message || String(err)))); }
    };
    reader.readAsArrayBuffer(file);
  });
}

// Normalisasi objek stock_data.json (sudah di-parse) → schema app.
// Dipakai oleh parseJSONToAppData (impor manual) dan auto-fetch saat load.
function normalizeStockJson(data) {
  if (!data || !data.candidates || !Array.isArray(data.candidates)) {
    throw new Error('Format JSON tidak valid: tidak ada array candidates.');
  }
  {
        // Normalisasi candidate dari schema scraper → schema app
        // (volMultiplier→volumeMultiplier, changePct→change, hitung score/rr)
        var candidates = data.candidates.map(function(c) {
          var priceStr  = (c.price != null && c.price !== '') ? String(c.price) : '';
          var changeStr = (c.changePct != null) ? String(c.changePct)
                        : (c.change != null && c.change !== '') ? String(c.change) : '';
          var volStr    = (c.volMultiplier != null) ? String(c.volMultiplier)
                        : (c.volumeMultiplier != null && c.volumeMultiplier !== '') ? String(c.volumeMultiplier) : '';

          // Pakai araPrice/arbPrice/forecast dari JSON apa adanya;
          // fallback ke perhitungan lokal HANYA bila field-nya null.
          var prevClose = c.prevClose != null ? c.prevClose : null;
          var araPrice  = c.araPrice  != null ? c.araPrice  : calcAraArb(prevClose).ara;
          var arbPrice  = c.arbPrice  != null ? c.arbPrice  : calcAraArb(prevClose).arb;
          var changeNum = changeStr !== '' ? parseFloat(changeStr) : null;
          var forecast  = c.forecast  != null ? c.forecast
                        : calcForecastSignal(changeNum, volStr, c.consensusScore, priceStr);

          var nc = {
            id: generateId(), code: c.code, name: c.name || c.code,
            price: priceStr, change: changeStr,
            volumeMultiplier: volStr,
            setup: c.setup || '', trend: c.trend || 'sideways',
            entry: priceStr, sl: '', tp1: '', tp2: '',
            rr: null, status: 'Watch', score: 0,
            forecast: forecast, prevClose: prevClose,
            araPrice: araPrice, arbPrice: arbPrice,
          };
          nc.score = calculateCandidateScore(nc);
          return nc;
        });

        return {
          candidates:      candidates,
          valuation:       data.valuation  || null,
          consensus:       data.consensus  || null,
          fundamentals_all: data.fundamentals_all || {},
          consensus_all:   data.consensus_all    || {},
        };
  }
}

// Parse stock_data.json dari idx_scraper.py → format sama dengan IMPORT_FROM_XLSX
function parseJSONToAppData(file) {
  return new Promise(function(resolve, reject) {
    var reader = new FileReader();
    reader.onerror = function() { reject(new Error('Gagal membaca file.')); };
    reader.onload = function(e) {
      try {
        resolve(normalizeStockJson(JSON.parse(e.target.result)));
      } catch(err) { reject(new Error('Gagal parse JSON: ' + err.message)); }
    };
    reader.readAsText(file, 'utf-8');
  });
}

// ─────────────────────────────────────────────────────────
// REDUCER
// ─────────────────────────────────────────────────────────

function isActiveCandidate(candidate) {
  return candidate && (candidate.status === 'Priority' || candidate.status === 'Watch');
}

function activeCandidateCount(candidates, excludeId) {
  return candidates.filter(function(c) {
    return c.id !== excludeId && isActiveCandidate(c);
  }).length;
}

function withUiError(state, message) {
  return Object.assign({}, state, {
    ui: Object.assign({}, state.ui || {}, { error: message })
  });
}

function clearUiError(state) {
  return Object.assign({}, state, {
    ui: Object.assign({}, state.ui || {}, { error: null })
  });
}

function limitImportedCandidates(candidates) {
  var activeSeen = 0;
  var changed = false;
  var limited = candidates.map(function(c) {
    if (!isActiveCandidate(c)) return c;
    activeSeen += 1;
    if (activeSeen <= ACTIVE_CANDIDATE_LIMIT) return c;
    changed = true;
    return Object.assign({}, c, { status: 'Skip' });
  });
  return { candidates: limited, changed: changed };
}

function reducer(state, action) {
  switch (action.type) {

    case 'UPDATE_IHSG':
      return Object.assign({}, state, {
        market: withScore(Object.assign({}, state.market, {
          ihsg: Object.assign({}, state.market.ihsg, action.payload)
        }))
      });

    case 'UPDATE_FLOW':
      return Object.assign({}, state, {
        market: withScore(Object.assign({}, state.market, {
          foreignFlow: Object.assign({}, state.market.foreignFlow, action.payload)
        }))
      });

    case 'UPDATE_REGIONAL': {
      var newRegional = state.market.regional.map(function(r, i) {
        return i === action.payload.index
          ? Object.assign({}, r, { change: action.payload.change })
          : r;
      });
      return Object.assign({}, state, {
        market: withScore(Object.assign({}, state.market, { regional: newRegional }))
      });
    }

    case 'UPDATE_SECTOR_ROTATION': {
      var baseRot = state.market.sectorRotation || DEFAULT_SECTOR_ROTATION;
      var si      = action.payload.sectorIndex;
      var fld     = action.payload.field;
      var val     = action.payload.value;
      var sti     = action.payload.stockIndex;
      var updRot  = baseRot.map(function(s, i) {
        if (i !== si) return s;
        if (fld === 'change') return Object.assign({}, s, { change: val });
        if (fld === 'stockChange') {
          var ns = s.stocks.map(function(t, j) {
            return j === sti ? Object.assign({}, t, { change: val }) : t;
          });
          return Object.assign({}, s, { stocks: ns });
        }
        if (fld === 'stockTicker') {
          var ns = s.stocks.map(function(t, j) {
            return j === sti ? Object.assign({}, t, { ticker: val }) : t;
          });
          return Object.assign({}, s, { stocks: ns });
        }
        return s;
      });
      return Object.assign({}, state, {
        market: withScore(Object.assign({}, state.market, { sectorRotation: updRot }))
      });
    }

    case 'SET_SECTOR_ROTATION': {
      return Object.assign({}, state, {
        market: withScore(Object.assign({}, state.market, { sectorRotation: action.payload.sectorRotation }))
      });
    }

    case 'TOGGLE_SECTOR': {
      var kind    = action.payload.kind;
      var sector  = action.payload.sector;
      var other   = kind === 'strong' ? 'weak' : 'strong';
      var current = state.market.sectors[kind];
      var newList = current.indexOf(sector) >= 0
        ? current.filter(function(s) { return s !== sector; })
        : current.concat([sector]);
      var newOther = state.market.sectors[other].filter(function(s) { return s !== sector; });
      var newSectors = {};
      newSectors[kind]  = newList;
      newSectors[other] = newOther;
      return Object.assign({}, state, {
        market: withScore(Object.assign({}, state.market, { sectors: newSectors }))
      });
    }

    case 'UPDATE_NOTES':
      return Object.assign({}, state, {
        market: Object.assign({}, state.market, { notes: action.payload })
      });

    case 'SAVE_SESSION': {
      var lastSaved = new Date().toISOString();
      var next = Object.assign({}, state, {
        meta: Object.assign({}, state.meta, { lastSaved: lastSaved }),
        ui: Object.assign({}, state.ui || {}, { error: null })
      });
      var savedSession = safeSetStorage(SESSION_KEY, JSON.stringify(next));
      saveSessionHistory(next);
      return savedSession ? next : withUiError(next, 'Gagal menyimpan sesi ke browser storage.');
    }

    case 'RESET': {
      safeRemoveStorage(SESSION_KEY);
      return Object.assign({}, initialState, {
        meta: Object.assign({}, initialState.meta, {
          date:        todayISO(),
          sessionName: buildSessionName()
        })
      });
    }

    case 'LOAD_SESSION': {
      if (!action.payload || !action.payload.meta) return withUiError(state, 'Sesi tidak valid.');
      return Object.assign({}, action.payload, {
        ui: { error: null }
      });
    }

    case 'CLEAR_UI_ERROR':
      return clearUiError(state);

    case 'SET_UI_ERROR':
      return withUiError(state, action.payload);

    case 'IMPORT_FROM_XLSX': {
      var imp = action.payload;
      var ns  = Object.assign({}, state);
      var importLimited = null;
      if (imp.candidates && imp.candidates.length > 0) {
        importLimited = limitImportedCandidates(imp.candidates);
        ns.candidates = importLimited.candidates;
      }
      if (imp.valuation) ns.valuation = imp.valuation;
      if (imp.consensus) ns.consensus = imp.consensus;
      ns.ui = Object.assign({}, ns.ui || {}, {
        error: importLimited && importLimited.changed
          ? 'Import berisi lebih dari 5 kandidat aktif. Kandidat setelah urutan ke-5 otomatis menjadi Skip.'
          : null
      });

      // Simpan profil valuasi & consensus PER saham ke localStorage,
      // supaya saat ganti saham di modul Valuasi/Consensus datanya termuat.
      try {
        var fundAll = imp.fundamentals_all || {};
        Object.keys(fundAll).forEach(function(code) {
          safeSetStorage('scalping-brief-val-' + code, JSON.stringify(fundAll[code]));
        });
        var csAll = imp.consensus_all || {};
        Object.keys(csAll).forEach(function(code) {
          safeSetStorage('scalping-brief-cons-' + code, JSON.stringify(csAll[code]));
        });
      } catch(e) {
        ns = withUiError(ns, 'Import berhasil, tetapi sebagian profil gagal disimpan.');
        reportAppError('Gagal menyimpan profil import', e);
      }

      return ns;
    }

    case 'IMPORT_MARKET_JSON': {
      var mj  = action.payload;
      var nm  = Object.assign({}, state.market);
      if (mj.ihsg)          nm.ihsg          = Object.assign({}, nm.ihsg, mj.ihsg);
      if (mj.regional && mj.regional.length) nm.regional = mj.regional;
      if (mj.sectorRotation && mj.sectorRotation.length) nm.sectorRotation = mj.sectorRotation;
      return Object.assign({}, state, { market: withScore(nm) });
    }

    // ── Sprint 2: Kandidat Saham ──────────────────────────

    case 'ADD_CANDIDATE': {
      var newC = Object.assign({
        id: generateId(), status: 'Watch',
        entry: '', sl: '', tp1: '', tp2: '', lot: '',
        rr: null, score: 0,
      }, action.payload);
      if (isActiveCandidate(newC) && activeCandidateCount(state.candidates) >= ACTIVE_CANDIDATE_LIMIT) {
        return withUiError(state, 'Maksimal 5 kandidat aktif. Ubah kandidat lain ke Skip sebelum menambah Priority/Watch.');
      }
      newC.rr    = calculateRR(newC.entry, newC.sl, newC.tp1);
      newC.score = calculateCandidateScore(newC);
      return Object.assign({}, clearUiError(state), { candidates: state.candidates.concat([newC]) });
    }

    case 'UPDATE_CANDIDATE': {
      var currentCandidate = state.candidates.filter(function(c) { return c.id === action.payload.id; })[0];
      if (currentCandidate && action.payload.fields && action.payload.fields.status) {
        var desired = Object.assign({}, currentCandidate, { status: action.payload.fields.status });
        if (!isActiveCandidate(currentCandidate) && isActiveCandidate(desired) &&
            activeCandidateCount(state.candidates, currentCandidate.id) >= ACTIVE_CANDIDATE_LIMIT) {
          return withUiError(state, 'Maksimal 5 kandidat aktif. Ubah kandidat lain ke Skip sebelum mengaktifkan kandidat ini.');
        }
      }
      var updList = state.candidates.map(function(c) {
        if (c.id !== action.payload.id) return c;
        var next = Object.assign({}, c, action.payload.fields);
        next.rr    = calculateRR(next.entry, next.sl, next.tp1);
        next.score = calculateCandidateScore(next);
        return next;
      });
      return Object.assign({}, clearUiError(state), { candidates: updList });
    }

    case 'DELETE_CANDIDATE':
      return Object.assign({}, state, {
        candidates: state.candidates.filter(function(c) { return c.id !== action.payload; })
      });

    case 'MOVE_CANDIDATE': {
      var arr  = state.candidates.slice();
      var idx  = action.payload.index;
      var swap = action.payload.dir === 'up' ? idx - 1 : idx + 1;
      if (swap < 0 || swap >= arr.length) return state;
      var tmp  = arr[idx]; arr[idx] = arr[swap]; arr[swap] = tmp;
      return Object.assign({}, state, { candidates: arr });
    }

    // ── Sprint 3: Valuasi ────────────────────────────────

    case 'UPDATE_VALUATION': {
      var vp  = action.payload;
      var cur = state.valuation;
      var merged = Object.assign({}, cur, vp);
      if (vp.peBand)  merged.peBand  = Object.assign({}, cur.peBand,  vp.peBand);
      if (vp.pbvBand) merged.pbvBand = Object.assign({}, cur.pbvBand, vp.pbvBand);
      return Object.assign({}, state, { valuation: merged });
    }

    // ── Sprint 4: Consensus ──────────────────────────────

    case 'UPDATE_CONSENSUS': {
      var cp   = action.payload;
      var ccs  = state.consensus;
      var cm   = Object.assign({}, ccs, cp);
      if (cp.analysts)        cm.analysts        = Object.assign({}, ccs.analysts,        cp.analysts);
      if (cp.targetPrice)     cm.targetPrice     = Object.assign({}, ccs.targetPrice,     cp.targetPrice);
      if (cp.epsEstimate)     cm.epsEstimate     = Object.assign({}, ccs.epsEstimate,     cp.epsEstimate);
      if (cp.revenueEstimate) cm.revenueEstimate = Object.assign({}, ccs.revenueEstimate, cp.revenueEstimate);
      return Object.assign({}, state, { consensus: cm });
    }

    // ── Tier 1: Pengaturan risiko & Jurnal ──────────────────
    case 'UPDATE_SETTINGS':
      return Object.assign({}, state, {
        settings: Object.assign({}, state.settings, action.payload)
      });

    case 'ADD_TRADE': {
      var nt = Object.assign({
        id: generateId(),
        date: todayISO(),
        code: '', setup: '', entry: '', sl: '', exit: '', lot: '', notes: '',
      }, action.payload);
      return Object.assign({}, state, { journal: [nt].concat(state.journal || []) });
    }

    case 'UPDATE_TRADE': {
      var jl = (state.journal || []).map(function(t) {
        return t.id === action.payload.id ? Object.assign({}, t, action.payload.fields) : t;
      });
      return Object.assign({}, state, { journal: jl });
    }

    case 'DELETE_TRADE':
      return Object.assign({}, state, {
        journal: (state.journal || []).filter(function(t) { return t.id !== action.payload; })
      });

    default:
      return state;
  }
}

// ─────────────────────────────────────────────────────────
// PRIMITIVE UI HELPERS
// ─────────────────────────────────────────────────────────

function Label(props) {
  return (
    <label style={{ display:'block', fontSize:'11px', fontWeight:600,
                    textTransform:'uppercase', letterSpacing:'0.06em',
                    color:'#64748b', marginBottom:'4px' }}>
      {props.children}
    </label>
  );
}

function NumberInput(props) {
  return (
    <input
      type="number"
      step={props.step || 'any'}
      placeholder={props.placeholder}
      value={props.value}
      onChange={function(e) { props.onChange(e.target.value); }}
      style={{ width:'100%', backgroundColor:'#0f1117', border:'1px solid #334155',
               borderRadius:'4px', padding:'6px 10px', fontSize:'13px', color:'#e2e8f0',
               fontFamily:'monospace', outline:'none', boxSizing:'border-box' }}
      onFocus={function(e) { e.target.style.borderColor = '#6366f1'; }}
      onBlur={function(e)  { e.target.style.borderColor = '#334155'; }}
    />
  );
}

function Card(props) {
  return (
    <div style={{ backgroundColor:'#1a1d27', border:'1px solid #2a2d3e',
                  borderRadius:'8px', padding:'16px' }}
         className={props.className || ''}>
      {props.title && (
        <p style={{ fontSize:'11px', fontWeight:600, textTransform:'uppercase',
                    letterSpacing:'0.1em', color:'#4b5563', marginBottom:'12px', marginTop:0 }}>
          {props.title}
        </p>
      )}
      {props.children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// HEADER
// ─────────────────────────────────────────────────────────

function Header(props) {
  var state        = props.state;
  var dispatch     = props.dispatch;
  var onOpenImport = props.onOpenImport;
  var history      = props.history || [];
  var saved        = state.meta.lastSaved;
  var timeStr      = saved
    ? new Date(saved).toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit' })
    : null;

  function handleSave() { dispatch({ type: 'SAVE_SESSION' }); }
  function handleReset() {
    if (window.confirm('Reset semua data? Tindakan ini tidak dapat dibatalkan.')) {
      dispatch({ type: 'RESET' });
    }
  }

  return (
    <header className="app-header"
      style={{ position:'sticky', top:0, zIndex:50, display:'flex', alignItems:'center',
                     justifyContent:'space-between', padding:'10px 20px',
                     backgroundColor:'#0d1117', borderBottom:'1px solid #2a2d3e' }}>
      <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
        <span style={{ fontSize:'18px' }}>📊</span>
        <div>
          <h1 style={{ margin:0, fontSize:'14px', fontWeight:700, color:'#e2e8f0', lineHeight:1 }}>
            Scalping Brief Generator
          </h1>
          <p style={{ margin:0, fontSize:'11px', color:'#475569', marginTop:'2px' }}>
            {formatDisplayDate(state.meta.date)}
          </p>
        </div>
      </div>
      <div className="header-actions" style={{ display:'flex', alignItems:'center', gap:'8px' }}>
        {timeStr && (
          <span style={{ fontSize:'11px', color:'#374151' }}>Tersimpan {timeStr}</span>
        )}
        {history.length > 0 && (
          <select value=""
            onChange={function(e) {
              var item = history.filter(function(h) { return h.id === e.target.value; })[0];
              if (item && item.state) dispatch({ type: 'LOAD_SESSION', payload: item.state });
            }}
            style={{ maxWidth:'170px', padding:'6px 8px', fontSize:'12px', borderRadius:'4px',
                     backgroundColor:'#111827', color:'#94a3b8', border:'1px solid #334155' }}
            title="Muat 7 sesi terakhir">
            <option value="">History sesi</option>
            {history.map(function(item) {
              var d = item.state && item.state.meta ? item.state.meta.date : '';
              return <option key={item.id} value={item.id}>{d} · {item.label}</option>;
            })}
          </select>
        )}
        <button onClick={onOpenImport}
          style={{ padding:'6px 12px', fontSize:'12px', fontWeight:500, borderRadius:'4px',
                   backgroundColor:'#0d2a1a', color:'#4ade80', border:'1px solid #14532d', cursor:'pointer' }}
          onMouseOver={function(e) { e.currentTarget.style.backgroundColor = '#14532d'; }}
          onMouseOut={function(e)  { e.currentTarget.style.backgroundColor = '#0d2a1a'; }}>
          📥 Import XLSX/JSON
        </button>
        <button onClick={handleSave}
          style={{ padding:'6px 12px', fontSize:'12px', fontWeight:500, borderRadius:'4px',
                   backgroundColor:'#4f46e5', color:'#fff', border:'none', cursor:'pointer' }}
          onMouseOver={function(e) { e.target.style.backgroundColor = '#4338ca'; }}
          onMouseOut={function(e)  { e.target.style.backgroundColor = '#4f46e5'; }}>
          Simpan
        </button>
        <button onClick={handleReset}
          style={{ padding:'6px 12px', fontSize:'12px', fontWeight:500, borderRadius:'4px',
                   backgroundColor:'#1e293b', color:'#94a3b8', border:'1px solid #334155', cursor:'pointer' }}
          onMouseOver={function(e) { e.target.style.backgroundColor = '#283548'; }}
          onMouseOut={function(e)  { e.target.style.backgroundColor = '#1e293b'; }}>
          Reset
        </button>
      </div>
    </header>
  );
}

// ─────────────────────────────────────────────────────────
// SIDEBAR  (desktop)
// ─────────────────────────────────────────────────────────

function Sidebar(props) {
  return (
    <aside className="app-sidebar"
      style={{ width:'168px', flexShrink:0, backgroundColor:'#0d1117',
                    borderRight:'1px solid #2a2d3e', padding:'12px 8px',
                    display:'flex', flexDirection:'column', gap:'2px' }}>
      {NAV_ITEMS.map(function(item) {
        var isActive = props.active === item.id;
        return (
          <button key={item.id} onClick={function() { props.onNavigate(item.id); }}
            style={{ display:'flex', alignItems:'center', gap:'10px', padding:'10px 12px',
                     borderRadius:'6px', fontSize:'13px', textAlign:'left', border:'none',
                     cursor:'pointer', width:'100%',
                     backgroundColor: isActive ? '#4f46e5' : 'transparent',
                     color: isActive ? '#fff' : '#64748b',
                     fontWeight: isActive ? 600 : 400,
                     transition:'background-color 0.15s, color 0.15s' }}
            onMouseOver={function(e) {
              if (!isActive) {
                e.currentTarget.style.backgroundColor = '#1e293b';
                e.currentTarget.style.color = '#e2e8f0';
              }
            }}
            onMouseOut={function(e) {
              if (!isActive) {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = '#64748b';
              }
            }}>
            <span style={{ fontSize:'15px', lineHeight:1 }}>{item.icon}</span>
            <span style={{ lineHeight:'1.2' }}>{item.label}</span>
          </button>
        );
      })}
    </aside>
  );
}

// ─────────────────────────────────────────────────────────
// MARKET SCORE CARD
// ─────────────────────────────────────────────────────────

var REGIME_CFG = {
  Aggressive: { color: '#22c55e', label: 'Agresif'  },
  Normal:     { color: '#6366f1', label: 'Normal'   },
  Defensive:  { color: '#f59e0b', label: 'Defensif' },
  Avoid:      { color: '#ef4444', label: 'Hindari'  },
};

var REGIME_LEGEND = [
  { key: 'Aggressive', range: '80-100' },
  { key: 'Normal',     range: '55-79'  },
  { key: 'Defensive',  range: '30-54'  },
  { key: 'Avoid',      range: '0-29'   },
];

// Circle r=32, circumference = 2*PI*32 = 201.06
var CIRC = 2 * Math.PI * 32;

function MarketScoreCard(props) {
  var score  = props.score;
  var regime = props.regime;
  var cfg    = REGIME_CFG[regime] || REGIME_CFG.Normal;
  var dash   = ((score / 100) * CIRC) + ' ' + CIRC;

  return (
    <Card title="Market Score">
      <div style={{ display:'flex', alignItems:'center', gap:'16px' }}>

        {/* Circular gauge */}
        <div style={{ position:'relative', width:'80px', height:'80px', flexShrink:0 }}>
          <svg viewBox="0 0 80 80" style={{ width:'80px', height:'80px', transform:'rotate(-90deg)' }}>
            <circle cx="40" cy="40" r="32" fill="none" stroke="#1e293b" strokeWidth="8" />
            <circle cx="40" cy="40" r="32"
              fill="none"
              stroke={cfg.color}
              strokeWidth="8"
              strokeDasharray={dash}
              strokeLinecap="round"
              style={{ transition:'stroke-dasharray 0.3s ease' }}
            />
          </svg>
          <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column',
                        alignItems:'center', justifyContent:'center' }}>
            <span style={{ fontSize:'20px', fontWeight:700, color:'#e2e8f0',
                           fontFamily:'monospace', lineHeight:1 }}>{score}</span>
            <span style={{ fontSize:'11px', color:'#475569' }}>/100</span>
          </div>
        </div>

        {/* Regime badge + legend */}
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'inline-block', padding:'2px 10px', borderRadius:'999px',
                        fontSize:'12px', fontWeight:700, color:cfg.color,
                        border:'1px solid ' + cfg.color, marginBottom:'8px' }}>
            {cfg.label}
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:'4px' }}>
            {REGIME_LEGEND.map(function(r) {
              var rc       = REGIME_CFG[r.key];
              var isActive = regime === r.key;
              return (
                <div key={r.key} style={{ display:'flex', alignItems:'center', gap:'6px' }}>
                  <span style={{ width:'8px', height:'8px', borderRadius:'50%', flexShrink:0,
                                 backgroundColor:rc.color, opacity: isActive ? 1 : 0.2 }} />
                  <span style={{ fontSize:'11px',
                                 color: isActive ? '#e2e8f0' : '#374151',
                                 fontWeight: isActive ? 600 : 400 }}>
                    {rc.label}
                  </span>
                  <span style={{ fontSize:'11px', color:'#1f2937', fontFamily:'monospace',
                                 marginLeft:'auto' }}>{r.range}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ marginTop:'12px', height:'4px', backgroundColor:'#1e293b',
                    borderRadius:'999px', overflow:'hidden' }}>
        <div style={{ height:'100%', borderRadius:'999px',
                      width: score + '%', backgroundColor: cfg.color,
                      transition:'width 0.3s ease' }} />
      </div>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────
// SECTOR ROTATION OVERVIEW  (Stockbit-style)
// ─────────────────────────────────────────────────────────

function TinyInput(props) {
  var isText  = props.isText || false;
  var color   = props.color || '#e2e8f0';
  var tAlign  = props.textAlign || (isText ? 'left' : 'right');
  return (
    <input
      type={isText ? 'text' : 'number'}
      step={isText ? undefined : '0.01'}
      value={props.value}
      placeholder={props.placeholder || '0.00'}
      onChange={function(e) {
        var v = isText ? e.target.value.toUpperCase() : e.target.value;
        props.onChange(v);
      }}
      style={{
        width:           props.width || (isText ? '42px' : '50px'),
        backgroundColor: 'transparent',
        border:          'none',
        borderBottom:    '1px solid #2a2d3e',
        color:           color,
        fontSize:        '11px',
        fontFamily:      'monospace',
        fontWeight:      isText ? 400 : 600,
        outline:         'none',
        padding:         '1px 2px',
        textAlign:       tAlign,
      }}
      onFocus={function(e) { e.target.style.borderBottomColor = '#6366f1'; }}
      onBlur={function(e)  { e.target.style.borderBottomColor = '#2a2d3e'; }}
    />
  );
}

function SectorCard(props) {
  var sector      = props.sector;
  var sectorIndex = props.sectorIndex;
  var onUpdate    = props.onUpdate;

  var chg      = parseFloat(sector.change);
  var hasChg   = sector.change !== '' && !isNaN(chg);
  var chgColor = !hasChg ? '#475569' : chg > 0 ? '#22c55e' : chg < 0 ? '#ef4444' : '#94a3b8';
  var bdrColor = !hasChg ? '#2a2d3e' : chg > 0 ? '#14532d' : chg < 0 ? '#450a0a' : '#2a2d3e';
  var hdrBg    = !hasChg ? '#1e2535' : chg > 0 ? '#0c1f10' : chg < 0 ? '#1f0808' : '#1e2535';

  return (
    <div style={{ border: '1px solid ' + bdrColor, borderRadius: '6px', overflow: 'hidden',
                  transition: 'border-color 0.2s' }}>

      {/* ── Sector header ── */}
      <div style={{ backgroundColor: hdrBg, padding: '7px 10px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8',
                       textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {sector.name}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1px' }}>
          {hasChg && (
            <span style={{ fontSize: '10px', color: chgColor, marginRight: '1px' }}>
              {chg > 0 ? '▲' : '▼'}
            </span>
          )}
          <TinyInput
            value={sector.change}
            placeholder="0.00"
            color={chgColor}
            onChange={function(v) { onUpdate(sectorIndex, 'change', v); }}
          />
          <span style={{ fontSize: '10px', color: chgColor }}>%</span>
        </div>
      </div>

      {/* ── Stock rows ── */}
      <div style={{ backgroundColor: '#1a1d27', padding: '6px 10px',
                    display: 'flex', flexDirection: 'column', gap: '5px' }}>
        {sector.stocks.map(function(stock, si) {
          var sc     = parseFloat(stock.change);
          var hasSc  = stock.change !== '' && !isNaN(sc);
          var scClr  = !hasSc ? '#475569' : sc > 0 ? '#22c55e' : sc < 0 ? '#ef4444' : '#94a3b8';
          return (
            <div key={si} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <TinyInput
                value={stock.ticker}
                isText={true}
                placeholder="TICK"
                color="#94a3b8"
                textAlign="left"
                onChange={function(v) { onUpdate(sectorIndex, 'stockTicker', v, si); }}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: '1px' }}>
                {hasSc && (
                  <span style={{ fontSize: '10px', color: scClr }}>
                    {sc > 0 ? '+' : ''}
                  </span>
                )}
                <TinyInput
                  value={stock.change}
                  placeholder="0.00"
                  color={scClr}
                  onChange={function(v) { onUpdate(sectorIndex, 'stockChange', v, si); }}
                />
                <span style={{ fontSize: '10px', color: scClr }}>%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function parseSectorRotationText(text, mode, currentSectorRotation) {
  // Returns { newRotation: [...], matchCount: number }
  // mode: 'sector' (sector change only) | 'stocks' (sector change + stock rows)

  // Deep clone so we don't mutate current state
  var result = currentSectorRotation.map(function(s) {
    return Object.assign({}, s, {
      stocks: s.stocks.map(function(t) { return Object.assign({}, t); })
    });
  });

  // Build lowercase name → index lookup
  var lookup = {};
  result.forEach(function(s, i) { lookup[s.name.toLowerCase()] = i; });
  // Alias: English "infrastructure" → Indonesian "infrastruktur"
  if (lookup['infrastruktur'] !== undefined) {
    lookup['infrastructure'] = lookup['infrastruktur'];
  }

  function parseValue(str) {
    var clean = str.replace('%', '').trim();
    var num = parseFloat(clean);
    return isNaN(num) ? null : num;
  }

  var lines = text.split('\n').map(function(l) { return l.trim(); }).filter(Boolean);
  var matchCount      = 0;
  var curSectorIdx    = -1;
  var curStockIdx     = 0;

  lines.forEach(function(line) {
    var parts = line.trim().split(/\s+/);
    if (parts.length < 2) return;

    var token    = parts[0];
    var num      = parseValue(parts[parts.length - 1]);
    if (num === null) return;

    var sIdx = lookup[token.toLowerCase()];
    if (sIdx !== undefined) {
      // Sector line
      result[sIdx].change = String(num);
      matchCount++;
      curSectorIdx = sIdx;
      curStockIdx  = 0;
    } else if (mode === 'stocks' && curSectorIdx >= 0) {
      // Stock line: ticker must look like an IDX code (2-6 uppercase letters)
      var maxStocks = result[curSectorIdx].stocks.length;
      if (/^[A-Z]{2,6}$/.test(token) && curStockIdx < maxStocks) {
        result[curSectorIdx].stocks[curStockIdx] = Object.assign(
          {}, result[curSectorIdx].stocks[curStockIdx],
          { ticker: token, change: String(num) }
        );
        curStockIdx++;
        matchCount++;
      }
    }
  });

  return { newRotation: result, matchCount: matchCount };
}

function SectorRotationOverview(props) {
  var sectorRotation = props.sectorRotation;
  var onUpdate       = props.onUpdate;
  var onBulkParse    = props.onBulkParse;

  var _paste      = useState('');
  var pasteText   = _paste[0], setPasteText = _paste[1];

  var _fb         = useState('');
  var feedback    = _fb[0],    setFeedback  = _fb[1];

  var _show       = useState(false);
  var showPaste   = _show[0],  setShowPaste = _show[1];

  function handleParse(mode) {
    var r = parseSectorRotationText(pasteText, mode, sectorRotation);
    if (r.matchCount === 0) {
      setFeedback('Tidak ada data yang cocok');
    } else {
      onBulkParse(r.newRotation);
      setFeedback('Data berhasil diparse (' + r.matchCount + ' item)');
    }
  }

  // Summary stats
  var strongList = sectorRotation.filter(function(s) { return parseFloat(s.change) > 0; });
  var weakList   = sectorRotation.filter(function(s) { return parseFloat(s.change) < 0; });

  var topSector = null, topChange = -Infinity;
  sectorRotation.forEach(function(s) {
    var c = parseFloat(s.change);
    if (s.change !== '' && !isNaN(c) && c > topChange) { topChange = c; topSector = s; }
  });

  var scoreContrib = Math.min(strongList.length * 3, 15);

  return (
    <Card title="Rotasi Sektor">

      {/* ── Bulk Paste panel ── */}
      <div style={{ marginBottom: '12px' }}>
        <button
          onClick={function() { setShowPaste(!showPaste); setFeedback(''); }}
          style={{
            backgroundColor: showPaste ? '#1e1b4b' : 'transparent',
            border:           '1px solid ' + (showPaste ? '#6366f1' : '#374151'),
            borderRadius:     '4px',
            color:            showPaste ? '#818cf8' : '#64748b',
            cursor:           'pointer',
            fontSize:         '11px',
            padding:          '4px 10px',
            transition:       'all 0.15s',
          }}>
          {showPaste ? '▲ Tutup Paste' : '▼ Paste Market Overview'}
        </button>

        {showPaste && (
          <div style={{ marginTop: '8px', backgroundColor: '#161922',
                        border: '1px solid #2a2d3e', borderRadius: '6px', padding: '10px' }}>
            <div style={{ fontSize: '11px', color: '#475569', marginBottom: '6px' }}>
              Format: <span style={{ fontFamily: 'monospace', color: '#64748b' }}>
                Basic-Ind 2.64
              </span> — nilai boleh dengan atau tanpa tanda + / %
            </div>
            <textarea
              rows={9}
              placeholder={'Basic-Ind 2.64\nCyclical 1.81\nEnergy 2.88\nHealth -0.57\nFinance 2.78\nIndustrial 2.79\nInfrastruktur 1.51\nTransport 2.54\nTechnology 5.21\nNon-Cyclical 0.40\nProperty 2.14'}
              value={pasteText}
              onChange={function(e) { setPasteText(e.target.value); setFeedback(''); }}
              style={{
                width:           '100%',
                backgroundColor: '#0f1117',
                border:          '1px solid #334155',
                borderRadius:    '4px',
                color:           '#e2e8f0',
                fontSize:        '12px',
                fontFamily:      'monospace',
                padding:         '8px',
                resize:          'vertical',
                outline:         'none',
                boxSizing:       'border-box',
              }}
            />
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px',
                          alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={function() { handleParse('sector'); }}
                style={{
                  backgroundColor: '#1e3a5f', border: '1px solid #2563eb',
                  borderRadius: '4px', color: '#60a5fa', cursor: 'pointer',
                  fontSize: '11px', fontWeight: 600, padding: '5px 12px',
                }}>
                Parse Sektor Saja
              </button>
              <button
                onClick={function() { handleParse('stocks'); }}
                style={{
                  backgroundColor: '#1a2e1a', border: '1px solid #16a34a',
                  borderRadius: '4px', color: '#4ade80', cursor: 'pointer',
                  fontSize: '11px', fontWeight: 600, padding: '5px 12px',
                }}>
                Parse Sektor + Saham
              </button>
              {feedback && (
                <span style={{
                  fontSize:   '11px',
                  color:      feedback.indexOf('berhasil') >= 0 ? '#4ade80' : '#f59e0b',
                  fontFamily: 'monospace',
                }}>
                  {feedback.indexOf('berhasil') >= 0 ? '✓ ' : '⚠ '}{feedback}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Summary row ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px',
                    flexWrap: 'wrap', padding: '8px 10px', backgroundColor: '#161922',
                    borderRadius: '6px', border: '1px solid #2a2d3e' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ width: '7px', height: '7px', borderRadius: '50%',
                         backgroundColor: '#22c55e', display: 'inline-block' }} />
          <span style={{ fontSize: '11px', color: '#64748b' }}>Kuat</span>
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#22c55e',
                         fontFamily: 'monospace' }}>{strongList.length}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ width: '7px', height: '7px', borderRadius: '50%',
                         backgroundColor: '#ef4444', display: 'inline-block' }} />
          <span style={{ fontSize: '11px', color: '#64748b' }}>Lemah</span>
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#ef4444',
                         fontFamily: 'monospace' }}>{weakList.length}</span>
        </div>
        {topSector && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ fontSize: '11px', color: '#64748b' }}>Top:</span>
            <span style={{ fontSize: '11px', fontWeight: 700,
                           color: topChange > 0 ? '#22c55e' : '#ef4444',
                           fontFamily: 'monospace' }}>
              {topSector.name}&nbsp;{topChange > 0 ? '+' : ''}{topChange.toFixed(2)}%
            </span>
          </div>
        )}
        <span style={{ marginLeft: 'auto', fontSize: '10px', color: '#374151',
                       fontFamily: 'monospace' }}>
          Skor sektor: +{scoreContrib}/15
        </span>
      </div>

      {/* ── Sector card grid ── */}
      <div style={{ display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(158px, 1fr))',
                    gap: '8px' }}>
        {sectorRotation.map(function(sector, idx) {
          return (
            <SectorCard
              key={sector.name}
              sector={sector}
              sectorIndex={idx}
              onUpdate={onUpdate}
            />
          );
        })}
      </div>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────
// SECTOR PICKER
// ─────────────────────────────────────────────────────────

var SECTOR_COLS = [
  { kind:'strong', label:'Sektor Kuat',  activeColor:'#14532d', activeBorder:'#16a34a', hoverColor:'#166534' },
  { kind:'weak',   label:'Sektor Lemah', activeColor:'#450a0a', activeBorder:'#dc2626', hoverColor:'#7f1d1d' },
];

function SectorPicker(props) {
  var sectors  = props.sectors;
  var onToggle = props.onToggle;

  return (
    <div className="market-overview-grid" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px' }}>
      {SECTOR_COLS.map(function(col) {
        return (
          <div key={col.kind}>
            <Label>{col.label}</Label>
            <div style={{ display:'flex', flexWrap:'wrap', gap:'6px' }}>
              {SECTORS.map(function(s) {
                var isThis  = sectors[col.kind].indexOf(s) >= 0;
                var other   = col.kind === 'strong' ? 'weak' : 'strong';
                var isOther = sectors[other].indexOf(s) >= 0;
                var btnStyle = {
                  padding:'3px 8px', fontSize:'11px', borderRadius:'4px',
                  border:'1px solid', cursor: isOther ? 'not-allowed' : 'pointer',
                  transition:'all 0.15s',
                  backgroundColor: isThis  ? col.activeColor
                                 : isOther ? '#0f172a'  : '#1e293b',
                  borderColor:     isThis  ? col.activeBorder
                                 : isOther ? '#1e293b'  : '#334155',
                  color:           isThis  ? '#fff'
                                 : isOther ? '#1e293b'  : '#94a3b8',
                  fontWeight:      isThis  ? 600 : 400,
                  opacity:         isOther ? 0.35 : 1,
                };
                return (
                  <button key={s}
                    onClick={function() { if (!isOther) onToggle(col.kind, s); }}
                    disabled={isOther}
                    style={btnStyle}>
                    {s}
                  </button>
                );
              })}
            </div>
            {col.kind === 'strong' && sectors.strong.length > 0 && (
              <p style={{ marginTop:'6px', fontSize:'11px', color:'#475569' }}>
                {sectors.strong.length} dipilih · +{Math.min(sectors.strong.length * 3, 15)} poin
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// MARKET CONDITION MODULE
// ─────────────────────────────────────────────────────────

function MarketConditionModule(props) {
  var market   = props.market;
  var dispatch = props.dispatch;

  function dispatchIhsg(payload) { dispatch({ type:'UPDATE_IHSG',     payload:payload }); }
  function dispatchFlow(payload) { dispatch({ type:'UPDATE_FLOW',     payload:payload }); }
  function dispatchNote(v)       { dispatch({ type:'UPDATE_NOTES',    payload:v }); }
  function dispatchSector(k, s)  { dispatch({ type:'TOGGLE_SECTOR',   payload:{ kind:k, sector:s } }); }
  function dispatchRegion(i, v)  { dispatch({ type:'UPDATE_REGIONAL', payload:{ index:i, change:v } }); }

  var marketFileRef = React.useRef(null);

  function handleMarketJsonImport(e) {
    var file = e.target.files && e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function(ev) {
      try {
        var data = JSON.parse(ev.target.result);
        var mkt = data.market || data;
        dispatch({ type: 'IMPORT_MARKET_JSON', payload: mkt });
      } catch (err) {
        alert('Gagal parse JSON: ' + err.message);
      }
    };
    reader.readAsText(file, 'utf-8');
    e.target.value = '';
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <h2 style={{ margin:0, fontSize:'15px', fontWeight:600, color:'#e2e8f0' }}>Kondisi Market</h2>
        <div>
          <input type="file" accept=".json" ref={marketFileRef}
            onChange={handleMarketJsonImport} style={{ display:'none' }} />
          <button onClick={function() { marketFileRef.current && marketFileRef.current.click(); }}
            style={{ padding:'5px 10px', fontSize:'11px', borderRadius:'6px', cursor:'pointer',
                     backgroundColor:'#0c1a2e', color:'#60a5fa', border:'1px solid #1d4ed8',
                     display:'flex', alignItems:'center', gap:'4px' }}
            title="Import market_data.json dari ihsg_market.py">
            📥 Import Market JSON
          </button>
        </div>
      </div>

      {/* ── Row 1: IHSG + Score ── */}
      <div className="market-top-grid" style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:'16px' }}>

        <Card title="IHSG">
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'12px' }}>

            <div>
              <Label>Harga</Label>
              <NumberInput value={market.ihsg.price} placeholder="7200"
                onChange={function(v) { dispatchIhsg({ price:v }); }} />
            </div>

            <div>
              <Label>% Perubahan</Label>
              <NumberInput value={market.ihsg.change} placeholder="+0.50" step="0.01"
                onChange={function(v) { dispatchIhsg({ change:v }); }} />
            </div>

            <div>
              <Label>Trend</Label>
              <div style={{ display:'flex', gap:'4px' }}>
                {TREND_OPTIONS.map(function(opt) {
                  var isActive = market.ihsg.trend === opt.value;
                  var bg = isActive
                    ? (opt.value === 'bullish' ? '#14532d'
                    :  opt.value === 'bearish' ? '#450a0a' : '#334155')
                    : '#1e293b';
                  var bc = isActive
                    ? (opt.value === 'bullish' ? '#16a34a'
                    :  opt.value === 'bearish' ? '#dc2626' : '#475569')
                    : '#334155';
                  return (
                    <button key={opt.value}
                      onClick={function() { dispatchIhsg({ trend:opt.value }); }}
                      style={{ flex:1, padding:'6px 2px', fontSize:'11px', borderRadius:'4px',
                               border:'1px solid ' + bc, backgroundColor:bg, cursor:'pointer',
                               color: isActive ? '#fff' : '#64748b', fontWeight: isActive ? 600 : 400 }}>
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

          </div>
        </Card>

        <MarketScoreCard score={market.score} regime={market.regime} />
      </div>

      {/* ── Row 2: Foreign Flow + Regional ── */}
      <div className="market-bottom-grid" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px' }}>

        <Card title="Asing (Foreign Flow)">
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
            <div>
              <Label>Tipe</Label>
              <div style={{ display:'flex', gap:'4px' }}>
                {FLOW_OPTIONS.map(function(opt) {
                  var isActive = market.foreignFlow.type === opt.value;
                  var bg = isActive
                    ? (opt.value === 'buy' ? '#14532d' : '#450a0a')
                    : '#1e293b';
                  var bc = isActive
                    ? (opt.value === 'buy' ? '#16a34a' : '#dc2626')
                    : '#334155';
                  return (
                    <button key={opt.value}
                      onClick={function() { dispatchFlow({ type:opt.value }); }}
                      style={{ flex:1, padding:'6px 4px', fontSize:'11px', borderRadius:'4px',
                               border:'1px solid ' + bc, backgroundColor:bg, cursor:'pointer',
                               color: isActive ? '#fff' : '#64748b', fontWeight: isActive ? 600 : 400 }}>
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <Label>Nilai (Rp Miliar)</Label>
              <NumberInput value={market.foreignFlow.value} placeholder="500"
                onChange={function(v) { dispatchFlow({ value:v }); }} />
            </div>
          </div>
        </Card>

        <Card title="Sentimen Regional">
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
            {market.regional.map(function(r, i) {
              var chg   = parseFloat(r.change);
              var clr   = isNaN(chg) ? '#94a3b8'
                        : chg > 0   ? '#22c55e'
                        : chg < 0   ? '#ef4444' : '#94a3b8';
              return (
                <div key={r.name}>
                  <Label>
                    {r.name}
                    {!isNaN(chg) && (
                      <span style={{ marginLeft:'6px', fontFamily:'monospace', color:clr, textTransform:'none', fontWeight:400 }}>
                        {chg > 0 ? '+' : ''}{chg.toFixed(2)}%
                      </span>
                    )}
                  </Label>
                  <NumberInput value={r.change} placeholder="+0.50" step="0.01"
                    onChange={function(v) { dispatchRegion(i, v); }} />
                </div>
              );
            })}
          </div>
        </Card>

      </div>

      {/* ── Row 3: Rotasi Sektor (Stockbit Overview) ── */}
      <SectorRotationOverview
        sectorRotation={market.sectorRotation || DEFAULT_SECTOR_ROTATION}
        onUpdate={function(sIdx, field, value, stockIdx) {
          dispatch({ type: 'UPDATE_SECTOR_ROTATION', payload: {
            sectorIndex: sIdx, field: field, value: value, stockIndex: stockIdx
          }});
        }}
        onBulkParse={function(newRotation) {
          dispatch({ type: 'SET_SECTOR_ROTATION', payload: { sectorRotation: newRotation } });
        }}
      />

      {/* ── Row 4: Notes ── */}
      <Card title="Catatan Market">
        <textarea
          rows={3}
          placeholder="Contoh: Fed meeting hari ini, market menunggu data NFP, IHSG retest support 7100..."
          value={market.notes}
          onChange={function(e) { dispatchNote(e.target.value); }}
          style={{ width:'100%', backgroundColor:'#0f1117', border:'1px solid #334155',
                   borderRadius:'4px', padding:'8px 10px', fontSize:'13px', color:'#e2e8f0',
                   resize:'vertical', outline:'none', boxSizing:'border-box',
                   fontFamily:'inherit', lineHeight:'1.5' }}
          onFocus={function(e) { e.target.style.borderColor = '#6366f1'; }}
          onBlur={function(e)  { e.target.style.borderColor = '#334155'; }}
        />
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// SPRINT 2 UI HELPERS
// ─────────────────────────────────────────────────────────

var inputBase = {
  width: '100%', backgroundColor: '#0f1117', border: '1px solid #334155',
  borderRadius: '4px', padding: '5px 8px', fontSize: '12px', color: '#e2e8f0',
  fontFamily: 'monospace', outline: 'none', boxSizing: 'border-box',
};

function TextInput(props) {
  return (
    <input type="text"
      placeholder={props.placeholder}
      value={props.value}
      onChange={function(e) { props.onChange(e.target.value); }}
      style={Object.assign({}, inputBase, props.style)}
      onFocus={function(e) { e.target.style.borderColor = '#6366f1'; }}
      onBlur={function(e)  { e.target.style.borderColor = '#334155'; }}
    />
  );
}

function MiniNumberInput(props) {
  return (
    <input type="number" step="any"
      placeholder={props.placeholder}
      value={props.value}
      onChange={function(e) { props.onChange(e.target.value); }}
      style={Object.assign({}, inputBase, props.style)}
      onFocus={function(e) { e.target.style.borderColor = '#6366f1'; }}
      onBlur={function(e)  { e.target.style.borderColor = '#334155'; }}
    />
  );
}

function SelectInput(props) {
  return (
    <select
      value={props.value}
      onChange={function(e) { props.onChange(e.target.value); }}
      style={Object.assign({}, inputBase, { cursor: 'pointer' }, props.style)}>
      {props.options.map(function(opt) {
        var val = typeof opt === 'string' ? opt : opt.value;
        var lbl = typeof opt === 'string' ? opt : (opt.label || opt.value);
        return <option key={val} value={val}>{lbl}</option>;
      })}
    </select>
  );
}

function MiniLabel(props) {
  return (
    <span style={{ display: 'block', fontSize: '10px', fontWeight: 600,
                   textTransform: 'uppercase', letterSpacing: '0.06em',
                   color: '#475569', marginBottom: '3px' }}>
      {props.children}
    </span>
  );
}

// ─────────────────────────────────────────────────────────
// ADD STOCK FORM  (Sprint 2)
// ─────────────────────────────────────────────────────────

var EMPTY_FORM = {
  code: '', name: '', price: '', volumeMultiplier: '', change: '',
  setup: 'Breakout', trend: 'uptrend', status: 'Watch',
  entry: '', sl: '', tp1: '', tp2: '',
};

function AddStockForm(props) {
  var fs = useState(Object.assign({}, EMPTY_FORM));
  var form = fs[0], setForm = fs[1];

  function set(field, value) {
    setForm(function(prev) {
      var u = {}; u[field] = value;
      return Object.assign({}, prev, u);
    });
  }

  function handleSubmit() {
    if (!form.code.trim()) { alert('Kode saham wajib diisi.'); return; }
    props.onAdd(Object.assign({}, form, { code: form.code.trim().toUpperCase() }));
    setForm(Object.assign({}, EMPTY_FORM));
  }

  var gridCell = { display: 'flex', flexDirection: 'column' };
  var grid2 = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' };
  var grid4 = { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '10px' };
  var grid3 = { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' };

  return (
    <Card title="Tambah Kandidat Baru">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

        {/* Row 1: Kode + Nama + Harga + Vol + Change */}
        <div className="candidate-add-row-primary"
          style={{ display: 'grid', gridTemplateColumns: '80px 1fr 110px 110px 100px', gap: '10px' }}>
          <div style={gridCell}>
            <MiniLabel>Kode</MiniLabel>
            <TextInput value={form.code} placeholder="BBRI"
              style={{ textTransform: 'uppercase' }}
              onChange={function(v) { set('code', v.toUpperCase()); }} />
          </div>
          <div style={gridCell}>
            <MiniLabel>Nama Saham</MiniLabel>
            <TextInput value={form.name} placeholder="Bank Rakyat Indonesia"
              onChange={function(v) { set('name', v); }} />
          </div>
          <div style={gridCell}>
            <MiniLabel>Harga (Rp)</MiniLabel>
            <MiniNumberInput value={form.price} placeholder="4850"
              onChange={function(v) { set('price', v); }} />
          </div>
          <div style={gridCell}>
            <MiniLabel>Vol (x avg)</MiniLabel>
            <MiniNumberInput value={form.volumeMultiplier} placeholder="2.3"
              onChange={function(v) { set('volumeMultiplier', v); }} />
          </div>
          <div style={gridCell}>
            <MiniLabel>% Change</MiniLabel>
            <MiniNumberInput value={form.change} placeholder="+1.5"
              onChange={function(v) { set('change', v); }} />
          </div>
        </div>

        {/* Row 2: Setup + Trend + Status + Entry + SL + TP1 + TP2 */}
        <div className="candidate-add-row-trade"
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 100px 100px 100px 100px', gap: '10px' }}>
          <div style={gridCell}>
            <MiniLabel>Setup</MiniLabel>
            <SelectInput value={form.setup}
              options={SETUP_TYPES.map(function(s) { return { value: s.value, label: s.value }; })}
              onChange={function(v) { set('setup', v); }} />
          </div>
          <div style={gridCell}>
            <MiniLabel>Trend</MiniLabel>
            <SelectInput value={form.trend} options={CANDIDATE_TRENDS}
              onChange={function(v) { set('trend', v); }} />
          </div>
          <div style={gridCell}>
            <MiniLabel>Status</MiniLabel>
            <SelectInput value={form.status} options={CANDIDATE_STATUSES}
              onChange={function(v) { set('status', v); }} />
          </div>
          <div style={gridCell}>
            <MiniLabel>Entry</MiniLabel>
            <MiniNumberInput value={form.entry} placeholder="4870"
              onChange={function(v) { set('entry', v); }} />
          </div>
          <div style={gridCell}>
            <MiniLabel>Stop Loss</MiniLabel>
            <MiniNumberInput value={form.sl} placeholder="4720"
              onChange={function(v) { set('sl', v); }} />
          </div>
          <div style={gridCell}>
            <MiniLabel>TP1</MiniLabel>
            <MiniNumberInput value={form.tp1} placeholder="5050"
              onChange={function(v) { set('tp1', v); }} />
          </div>
          <div style={gridCell}>
            <MiniLabel>TP2</MiniLabel>
            <MiniNumberInput value={form.tp2} placeholder="5200"
              onChange={function(v) { set('tp2', v); }} />
          </div>
        </div>

        {/* Submit */}
        <div>
          <button onClick={handleSubmit}
            style={{ padding: '7px 20px', fontSize: '12px', fontWeight: 600,
                     backgroundColor: '#4f46e5', color: '#fff', border: 'none',
                     borderRadius: '4px', cursor: 'pointer' }}
            onMouseOver={function(e) { e.currentTarget.style.backgroundColor = '#4338ca'; }}
            onMouseOut={function(e)  { e.currentTarget.style.backgroundColor = '#4f46e5'; }}>
            + Tambah Kandidat
          </button>
        </div>
      </div>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────
// SETUP BADGE + SCORE BAR  (Sprint 2)
// ─────────────────────────────────────────────────────────

function SetupBadge(props) {
  var setup = props.setup || '–';
  var color = '#64748b';
  for (var i = 0; i < SETUP_TYPES.length; i++) {
    if (SETUP_TYPES[i].value === setup) { color = SETUP_TYPES[i].color; break; }
  }
  return (
    <span style={{ padding: '2px 7px', borderRadius: '3px', fontSize: '10px', fontWeight: 700,
                   color: color, border: '1px solid ' + color, whiteSpace: 'nowrap' }}>
      {setup}
    </span>
  );
}

function ScoreBar(props) {
  var score = props.score || 0;
  var color = score >= 75 ? '#22c55e'
            : score >= 50 ? '#6366f1'
            : score >= 25 ? '#f59e0b' : '#ef4444';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={{ flex: 1, height: '5px', backgroundColor: '#1e293b', borderRadius: '3px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: score + '%', backgroundColor: color,
                      borderRadius: '3px', transition: 'width 0.25s' }} />
      </div>
      <span style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace', flexShrink: 0, minWidth: '48px', textAlign: 'right' }}>
        {score}/100
      </span>
    </div>
  );
}

function EstBox(props) {
  return (
    <div style={{ backgroundColor: '#0f1117', border: '1px solid #1e293b', borderRadius: '4px',
                  padding: '4px 8px', display: 'flex', flexDirection: 'column', gap: '1px' }}>
      <span style={{ fontSize: '9px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
        {props.label}
      </span>
      <span style={{ fontSize: '12px', fontWeight: 700, fontFamily: 'monospace', color: props.color }}>
        {props.value}
      </span>
    </div>
  );
}

// Peta level harga (ARB·SL·Entry·Now·TP·ARA) — HTML/CSS, highlight saat alert
function LevelLadder(props) {
  var c = props.candidate;
  var alertKeys = {};
  (props.alerts || []).forEach(function(a) { alertKeys[a.key] = true; });
  var pts = [
    { key:'arb',   label:'ARB',   v: parseFloat(c.arbPrice), color:'#ef4444' },
    { key:'sl',    label:'SL',    v: parseFloat(c.sl),       color:'#f87171' },
    { key:'entry', label:'Entry', v: parseFloat(c.entry),    color:'#cbd5e1' },
    { key:'price', label:'Now',   v: parseFloat(c.price),    color:'#f59e0b' },
    { key:'tp1',   label:'TP1',   v: parseFloat(c.tp1),      color:'#22c55e' },
    { key:'tp2',   label:'TP2',   v: parseFloat(c.tp2),      color:'#16a34a' },
    { key:'ara',   label:'ARA',   v: parseFloat(c.araPrice), color:'#a855f7' },
  ].filter(function(p) { return !isNaN(p.v) && p.v > 0; });
  if (pts.length < 2) return null;

  var vals = pts.map(function(p) { return p.v; });
  var min = Math.min.apply(null, vals), max = Math.max.apply(null, vals);
  var span = (max - min) || 1;
  function xPct(v) { return ((v - min) / span) * 100; }

  return (
    <div style={{ marginTop: '12px' }}>
      <div style={{ fontSize: '9px', color: '#64748b', textTransform: 'uppercase',
                    letterSpacing: '0.03em', marginBottom: '2px' }}>
        Peta Level Harga
      </div>
      <div style={{ position: 'relative', height: '40px' }}>
        <div style={{ position: 'absolute', top: '19px', left: 0, right: 0, height: '2px',
                      backgroundColor: '#2a2d3e', borderRadius: '2px' }} />
        {pts.map(function(p) {
          var hit = !!alertKeys[p.key];
          return (
            <div key={p.key} style={{ position: 'absolute', left: xPct(p.v) + '%', top: 0,
                                      transform: 'translateX(-50%)', textAlign: 'center' }}>
              <div style={{ fontSize: '8px', color: p.color, whiteSpace: 'nowrap',
                            fontWeight: hit ? 700 : 500 }}>{p.label}</div>
              <div style={{ width: hit ? '11px' : '7px', height: hit ? '11px' : '7px',
                            borderRadius: '50%', backgroundColor: p.color, margin: '3px auto',
                            boxShadow: hit ? '0 0 0 3px ' + p.color + '55' : 'none' }} />
              <div style={{ fontSize: '8px', color: '#64748b', whiteSpace: 'nowrap',
                            fontFamily: 'monospace' }}>
                {Math.round(p.v).toLocaleString('id-ID')}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// CANDIDATE CARD  (Sprint 2)
// ─────────────────────────────────────────────────────────

function CandidateCard(props) {
  var c        = props.candidate;
  var idx      = props.index;
  var total    = props.total;
  var dispatch = props.dispatch;
  var settings = props.settings || {};

  function upd(fields) {
    dispatch({ type: 'UPDATE_CANDIDATE', payload: { id: c.id, fields: fields } });
  }

  // Tier 1: saran lot berbasis risiko + alert proximity ke level
  var suggested = suggestLot(settings.capital, settings.riskPct, c.entry, c.sl);
  var alerts    = proximityAlerts(c);

  var slVal = validateSL(c.entry, c.sl);
  var rr    = c.rr;
  var chg   = parseFloat(c.change);
  var chgColor = isNaN(chg) ? '#64748b' : chg >= 0 ? '#22c55e' : '#ef4444';
  var chgArrow = isNaN(chg) ? '' : chg >= 0 ? '▲' : '▼';

  var stStyle = STATUS_STYLE[c.status] || STATUS_STYLE.Skip;

  // Warna setup (untuk border select)
  var setupColor = '#64748b';
  for (var si = 0; si < SETUP_TYPES.length; si++) {
    if (SETUP_TYPES[si].value === c.setup) { setupColor = SETUP_TYPES[si].color; break; }
  }

  // ── Estimasi posisi berdasarkan Lot (IDX: 1 lot = 100 lembar) ──
  var SHARES_PER_LOT = 100;
  var lotN   = parseInt(c.lot, 10);
  var entryN = parseFloat(c.entry);
  var hasLot = !isNaN(lotN) && lotN > 0 && !isNaN(entryN) && entryN > 0;
  var shares = hasLot ? lotN * SHARES_PER_LOT : 0;
  var modal  = hasLot ? entryN * shares : null;
  function estVal(target) {
    var t = parseFloat(target);
    if (!hasLot || isNaN(t)) return null;
    return (t - entryN) * shares;
  }
  var estLoss = estVal(c.sl);
  var estTp1  = estVal(c.tp1);
  var estTp2  = estVal(c.tp2);
  function rupiahSigned(n) {
    if (n === null) return '–';
    var s = (n >= 0 ? '+' : '−') + 'Rp ' + Math.abs(Math.round(n)).toLocaleString('id-ID');
    return s;
  }

  // pct helper
  function pct(from, to) {
    var p = pctDiff(from, to);
    if (p === null) return '';
    return ' (' + (parseFloat(p) >= 0 ? '+' : '') + p + '%)';
  }

  var divider = { borderTop: '1px solid #2a2d3e', margin: '10px 0' };
  var paramGrid = { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '8px', alignItems: 'end' };
  var paramCell = { display: 'flex', flexDirection: 'column', gap: '3px' };

  return (
    <div style={{ backgroundColor: '#1a1d27', border: '1px solid #2a2d3e', borderRadius: '8px',
                  padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '0' }}>

      {/* ── Header row ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>

        {/* Rank badge */}
        <span style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#1e293b',
                       color: '#64748b', fontSize: '10px', fontWeight: 700, display: 'flex',
                       alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {idx + 1}
        </span>

        {/* Code + Name */}
        <span style={{ fontSize: '13px', fontWeight: 700, color: '#e2e8f0', fontFamily: 'monospace' }}>
          {c.code || '–'}
        </span>
        <span style={{ fontSize: '12px', color: '#64748b', flex: 1, minWidth: 0,
                       overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {c.name}
        </span>

        {/* Status select */}
        <select value={c.status}
          onChange={function(e) { upd({ status: e.target.value }); }}
          style={{ backgroundColor: stStyle.bg, border: '1px solid ' + stStyle.border,
                   color: stStyle.color, borderRadius: '4px', padding: '2px 6px',
                   fontSize: '11px', fontWeight: 600, cursor: 'pointer', outline: 'none' }}>
          {CANDIDATE_STATUSES.map(function(s) { return <option key={s} value={s}>{s}</option>; })}
        </select>

        {/* Move Up */}
        <button onClick={function() { dispatch({ type: 'MOVE_CANDIDATE', payload: { index: idx, dir: 'up' } }); }}
          disabled={idx === 0}
          title="Naikan"
          style={{ padding: '2px 7px', fontSize: '11px', border: '1px solid #334155',
                   borderRadius: '3px', backgroundColor: idx === 0 ? '#0f1117' : '#1e293b',
                   color: idx === 0 ? '#1f2937' : '#94a3b8', cursor: idx === 0 ? 'not-allowed' : 'pointer' }}>
          ▲
        </button>

        {/* Move Down */}
        <button onClick={function() { dispatch({ type: 'MOVE_CANDIDATE', payload: { index: idx, dir: 'down' } }); }}
          disabled={idx === total - 1}
          title="Turunkan"
          style={{ padding: '2px 7px', fontSize: '11px', border: '1px solid #334155',
                   borderRadius: '3px', backgroundColor: idx === total - 1 ? '#0f1117' : '#1e293b',
                   color: idx === total - 1 ? '#1f2937' : '#94a3b8', cursor: idx === total - 1 ? 'not-allowed' : 'pointer' }}>
          ▼
        </button>

        {/* Delete */}
        <button onClick={function() { dispatch({ type: 'DELETE_CANDIDATE', payload: c.id }); }}
          title="Hapus"
          style={{ padding: '2px 8px', fontSize: '11px', border: '1px solid #7f1d1d',
                   borderRadius: '3px', backgroundColor: '#450a0a', color: '#f87171', cursor: 'pointer' }}>
          ✕
        </button>
      </div>

      {/* ── Info row ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '13px', color: '#e2e8f0', fontFamily: 'monospace' }}>
          Rp {formatPrice(c.price)}
        </span>
        {!isNaN(chg) && (
          <span style={{ fontSize: '12px', color: chgColor, fontFamily: 'monospace' }}>
            {chgArrow}{chg >= 0 ? '+' : ''}{chg.toFixed(1)}%
          </span>
        )}
        {c.volumeMultiplier && (
          <span style={{ fontSize: '12px', color: '#94a3b8' }}>
            Vol: <span style={{ fontFamily: 'monospace', color: '#e2e8f0' }}>{c.volumeMultiplier}x</span> avg
          </span>
        )}

        {/* Setup (editable) */}
        <select value={c.setup || ''}
          onChange={function(e) { upd({ setup: e.target.value }); }}
          title="Tipe setup"
          style={{ backgroundColor: '#0f1117', border: '1px solid ' + setupColor,
                   color: setupColor, borderRadius: '4px', padding: '2px 6px',
                   fontSize: '10px', fontWeight: 700, cursor: 'pointer', outline: 'none' }}>
          <option value="">— Setup —</option>
          {SETUP_TYPES.map(function(s) { return <option key={s.value} value={s.value}>{s.value}</option>; })}
        </select>

        {/* Trend (editable) */}
        <select value={c.trend || 'sideways'}
          onChange={function(e) { upd({ trend: e.target.value }); }}
          title="Trend"
          style={{ backgroundColor: '#0f1117', border: '1px solid #334155',
                   color: '#94a3b8', borderRadius: '4px', padding: '2px 6px',
                   fontSize: '10px', fontWeight: 600, cursor: 'pointer', outline: 'none' }}>
          {CANDIDATE_TRENDS.map(function(t) { return <option key={t.value} value={t.value}>{t.label}</option>; })}
        </select>
        {c.forecast && (
          <span style={{ display:'inline-flex', alignItems:'center', gap:'4px',
                         padding:'2px 8px', borderRadius:'12px', fontSize:'11px', fontWeight:600,
                         backgroundColor: c.forecast.bg, color: c.forecast.color,
                         border:'1px solid ' + c.forecast.color + '55', marginLeft:'auto' }}>
            {c.forecast.icon} {c.forecast.label}
          </span>
        )}
      </div>
      {/* ARA/ARB level row (hanya jika dari import) */}
      {(c.araPrice || c.arbPrice) && (
        <div style={{ display:'flex', gap:'12px', marginTop:'4px' }}>
          {c.araPrice && (
            <span style={{ fontSize:'10px', color:'#a855f7' }}>
              ARA: Rp {c.araPrice.toLocaleString('id-ID')}
            </span>
          )}
          {c.arbPrice && (
            <span style={{ fontSize:'10px', color:'#f87171' }}>
              ARB: Rp {c.arbPrice.toLocaleString('id-ID')}
            </span>
          )}
        </div>
      )}

      {/* Alert proximity: harga dekat level kritis */}
      {alerts.length > 0 && (
        <div style={{ display:'flex', gap:'6px', marginTop:'6px', flexWrap:'wrap' }}>
          {alerts.map(function(a) {
            return (
              <span key={a.key} style={{ display:'inline-flex', alignItems:'center', gap:'3px',
                fontSize:'10px', fontWeight:600, padding:'2px 7px', borderRadius:'10px',
                color:a.color, backgroundColor:a.color + '1a', border:'1px solid ' + a.color + '55' }}>
                ⚠ Dekat {a.label} ({a.distPct.toFixed(1)}%)
              </span>
            );
          })}
        </div>
      )}

      {/* ── Divider ── */}
      <div style={divider} />

      {/* ── Trade params ── */}
      <div className="candidate-params" style={paramGrid}>
        <div style={paramCell}>
          <MiniLabel>Entry</MiniLabel>
          <MiniNumberInput value={c.entry} placeholder="4870"
            onChange={function(v) { upd({ entry: v }); }} />
        </div>
        <div style={paramCell}>
          <MiniLabel>
            Stop Loss
            {slVal.pct && (
              <span style={{ marginLeft: '4px', color: slVal.warning ? '#f87171' : '#64748b',
                             textTransform: 'none', fontWeight: 400 }}>
                ({slVal.pct}%)
              </span>
            )}
          </MiniLabel>
          <MiniNumberInput value={c.sl} placeholder="4720"
            onChange={function(v) { upd({ sl: v }); }}
            style={{ borderColor: slVal.warning ? '#7f1d1d' : '#334155' }} />
        </div>
        <div style={paramCell}>
          <MiniLabel>
            TP1
            {c.entry && c.tp1 && (
              <span style={{ marginLeft: '4px', color: '#22c55e', textTransform: 'none', fontWeight: 400 }}>
                ({pct(c.entry, c.tp1)})
              </span>
            )}
          </MiniLabel>
          <MiniNumberInput value={c.tp1} placeholder="5050"
            onChange={function(v) { upd({ tp1: v }); }} />
        </div>
        <div style={paramCell}>
          <MiniLabel>
            TP2
            {c.entry && c.tp2 && (
              <span style={{ marginLeft: '4px', color: '#22c55e', textTransform: 'none', fontWeight: 400 }}>
                ({pct(c.entry, c.tp2)})
              </span>
            )}
          </MiniLabel>
          <MiniNumberInput value={c.tp2} placeholder="5200"
            onChange={function(v) { upd({ tp2: v }); }} />
        </div>
      </div>

      {/* SL warning */}
      {slVal.warning && (
        <div style={{ marginTop: '6px', fontSize: '11px', color: '#f87171',
                      backgroundColor: '#450a0a', border: '1px solid #7f1d1d',
                      borderRadius: '4px', padding: '4px 8px' }}>
          ⚠ {slVal.warning}
        </div>
      )}

      {/* ── Lot + Estimasi posisi ── */}
      <div style={{ marginTop: '10px', display: 'flex', alignItems: 'flex-end', gap: '12px', flexWrap: 'wrap' }}>
        <div style={Object.assign({}, paramCell, { width: '90px', flexShrink: 0 })}>
          <MiniLabel>
            Lot
            {hasLot && (
              <span style={{ marginLeft: '4px', color: '#64748b', textTransform: 'none', fontWeight: 400 }}>
                ({shares.toLocaleString('id-ID')} lbr)
              </span>
            )}
          </MiniLabel>
          <MiniNumberInput value={c.lot} placeholder="10"
            onChange={function(v) { upd({ lot: v }); }} />
          {suggested !== null && (
            <button onClick={function() { upd({ lot: String(suggested) }); }}
              title={'Risiko ' + (settings.riskPct || '?') + '% modal'}
              style={{ marginTop:'3px', fontSize:'9px', color:'#4ade80', background:'none',
                       border:'none', padding:0, cursor:'pointer', textAlign:'left' }}>
              Saran: {suggested} lot ↺
            </button>
          )}
        </div>

        {hasLot ? (
          <div style={{ flex: 1, minWidth: '200px', display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(95px, 1fr))', gap: '6px' }}>
            <EstBox label="Modal" value={'Rp ' + Math.round(modal).toLocaleString('id-ID')} color="#94a3b8" />
            <EstBox label="Est. Rugi (SL)" value={rupiahSigned(estLoss)}
              color={estLoss === null ? '#475569' : '#f87171'} />
            <EstBox label="Est. Profit TP1" value={rupiahSigned(estTp1)}
              color={estTp1 === null ? '#475569' : '#22c55e'} />
            <EstBox label="Est. Profit TP2" value={rupiahSigned(estTp2)}
              color={estTp2 === null ? '#475569' : '#22c55e'} />
          </div>
        ) : (
          <span style={{ fontSize: '11px', color: '#475569', alignSelf: 'center' }}>
            Isi Lot + Entry untuk estimasi modal & profit/rugi
          </span>
        )}
      </div>

      {/* ── Peta level harga (chart + alert) ── */}
      <LevelLadder candidate={c} alerts={alerts} />

      {/* ── R:R + Score ── */}
      <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <span style={{ fontSize: '12px', color: '#64748b', flexShrink: 0 }}>
          R:R&nbsp;
          <span style={{ fontFamily: 'monospace', color: rr ? '#e2e8f0' : '#374151', fontWeight: 700 }}>
            {rr ? '1 : ' + rr : '–'}
          </span>
        </span>
        <div style={{ flex: 1 }}>
          <ScoreBar score={c.score} />
        </div>
      </div>

    </div>
  );
}

// ─────────────────────────────────────────────────────────
// STOCK CANDIDATE MODULE  (Sprint 2)
// ─────────────────────────────────────────────────────────

var FORECAST_FILTERS = ['ARA Potential', 'Bullish', 'Sideways', 'Bearish', 'ARB Risk'];

function StockCandidateModule(props) {
  var candidates = props.candidates;
  var dispatch   = props.dispatch;
  var settings   = props.settings || {};

  var fcState = useState('');     var fFc = fcState[0],   setFFc = fcState[1];
  var stState = useState('');     var fSt = stState[0],   setFSt = stState[1];
  var soState = useState('manual'); var sortBy = soState[0], setSortBy = soState[1];

  var activeCount = candidates.filter(function(c) {
    return c.status === 'Priority' || c.status === 'Watch';
  }).length;

  function handleAdd(formData) {
    dispatch({ type: 'ADD_CANDIDATE', payload: formData });
  }
  function setCap(v)  { dispatch({ type: 'UPDATE_SETTINGS', payload: { capital: v } }); }
  function setRisk(v) { dispatch({ type: 'UPDATE_SETTINGS', payload: { riskPct: v } }); }

  // Screener: filter lalu sort (pasangan {c,i} agar index asli utuh untuk move)
  var displayed = candidates.map(function(c, i) { return { c: c, i: i }; });
  if (fFc) displayed = displayed.filter(function(x) { return x.c.forecast && x.c.forecast.label === fFc; });
  if (fSt) displayed = displayed.filter(function(x) { return x.c.status === fSt; });
  if (sortBy !== 'manual') {
    displayed = displayed.slice().sort(function(a, b) {
      if (sortBy === 'score')  return (b.c.score || 0) - (a.c.score || 0);
      if (sortBy === 'change') return (parseFloat(b.c.change) || -999) - (parseFloat(a.c.change) || -999);
      if (sortBy === 'rr')     return (parseFloat(b.c.rr) || 0) - (parseFloat(a.c.rr) || 0);
      return 0;
    });
  }
  var isFiltered = !!(fFc || fSt) || sortBy !== 'manual';

  var ctlStyle = { backgroundColor:'#0f1117', border:'1px solid #334155', borderRadius:'4px',
                   color:'#e2e8f0', fontSize:'12px', padding:'5px 8px', outline:'none' };
  var labelStyle = { fontSize:'10px', color:'#64748b', display:'block', marginBottom:'3px' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
        <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#e2e8f0' }}>
          Kandidat Saham
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', color: '#64748b' }}>
            Aktif (Priority+Watch):
          </span>
          <span style={{ fontSize: '12px', fontWeight: 700, fontFamily: 'monospace',
                         color: activeCount >= 5 ? '#f87171' : '#4ade80' }}>
            {activeCount} / 5
          </span>
          {activeCount >= 5 && (
            <span style={{ fontSize: '11px', color: '#f59e0b', backgroundColor: '#422006',
                           border: '1px solid #92400e', borderRadius: '4px', padding: '2px 8px' }}>
              ⚠ Batas brief tercapai
            </span>
          )}
        </div>
      </div>

      {/* Pengaturan risiko (position sizing) */}
      <Card title="⚖️ Manajemen Risiko (untuk saran lot)">
        <div style={{ display:'flex', gap:'16px', flexWrap:'wrap', alignItems:'flex-end' }}>
          <div>
            <label style={labelStyle}>Modal Trading (Rp)</label>
            <NumberInput value={settings.capital} placeholder="100000000"
              onChange={setCap} />
          </div>
          <div>
            <label style={labelStyle}>Risiko per Transaksi (%)</label>
            <NumberInput value={settings.riskPct} placeholder="1" step="0.1"
              onChange={setRisk} />
          </div>
          <span style={{ fontSize:'11px', color:'#475569', maxWidth:'280px' }}>
            Saran lot muncul di tiap kartu (butuh Entry & SL terisi): modal × risiko% ÷ jarak SL.
          </span>
        </div>
      </Card>

      {/* Add form */}
      <AddStockForm onAdd={handleAdd} />

      {/* Screener */}
      {candidates.length > 0 && (
        <div style={{ display:'flex', gap:'12px', flexWrap:'wrap', alignItems:'flex-end',
                      backgroundColor:'#1a1d27', border:'1px solid #2a2d3e',
                      borderRadius:'8px', padding:'10px 14px' }}>
          <div>
            <label style={labelStyle}>Filter Sinyal</label>
            <select value={fFc} onChange={function(e){ setFFc(e.target.value); }} style={ctlStyle}>
              <option value="">Semua sinyal</option>
              {FORECAST_FILTERS.map(function(f){ return <option key={f} value={f}>{f}</option>; })}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Filter Status</label>
            <select value={fSt} onChange={function(e){ setFSt(e.target.value); }} style={ctlStyle}>
              <option value="">Semua status</option>
              {CANDIDATE_STATUSES.map(function(s){ return <option key={s} value={s}>{s}</option>; })}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Urutkan</label>
            <select value={sortBy} onChange={function(e){ setSortBy(e.target.value); }} style={ctlStyle}>
              <option value="manual">Manual (urutan kartu)</option>
              <option value="score">Skor tertinggi</option>
              <option value="change">% Change tertinggi</option>
              <option value="rr">R:R tertinggi</option>
            </select>
          </div>
          <span style={{ fontSize:'11px', color:'#64748b' }}>
            Menampilkan {displayed.length} / {candidates.length}
            {isFiltered && sortBy !== 'manual' && ' · tombol ▲▼ tetap mengubah urutan asli'}
          </span>
        </div>
      )}

      {/* List */}
      {candidates.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
                      justifyContent: 'center', padding: '48px 20px', textAlign: 'center',
                      backgroundColor: '#1a1d27', border: '1px solid #2a2d3e', borderRadius: '8px' }}>
          <span style={{ fontSize: '36px', marginBottom: '12px' }}>📋</span>
          <p style={{ margin: 0, fontSize: '13px', color: '#475569' }}>
            Belum ada kandidat. Tambahkan saham menggunakan form di atas.
          </p>
        </div>
      ) : displayed.length === 0 ? (
        <div style={{ padding:'32px 20px', textAlign:'center', backgroundColor:'#1a1d27',
                      border:'1px solid #2a2d3e', borderRadius:'8px', fontSize:'13px', color:'#475569' }}>
          Tidak ada kandidat yang cocok dengan filter.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {displayed.map(function(item) {
            return (
              <CandidateCard
                key={item.c.id}
                candidate={item.c}
                index={item.i}
                total={candidates.length}
                dispatch={dispatch}
                settings={settings}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// VALUATION BAND MODULE  (Sprint 3)
// ─────────────────────────────────────────────────────────

function BandChart(props) {
  var bandObj = props.bandObj;
  var current = props.current;

  var bv = [
    parseFloat(bandObj.min),
    parseFloat(bandObj.sd_minus1),
    parseFloat(bandObj.median),
    parseFloat(bandObj.sd_plus1),
    parseFloat(bandObj.max),
  ];

  var W = 380, PAD = 10;
  var TY = 28, TH = 14;

  function toX(val) {
    var range = bv[4] - bv[0];
    if (range <= 0) return PAD;
    return PAD + ((val - bv[0]) / range) * W;
  }

  var curX  = Math.max(PAD, Math.min(PAD + W, toX(current)));
  var textX = Math.max(35, Math.min(365, curX));

  return (
    <svg viewBox="0 0 400 72" style={{ width: '100%', height: '72px' }}>
      {/* Track background */}
      <rect x={PAD} y={TY} width={W} height={TH} fill="#1e293b" rx="7" />
      {/* Green zone: min → median */}
      <rect x={toX(bv[0])} y={TY}
            width={Math.max(0, toX(bv[2]) - toX(bv[0]))} height={TH}
            fill="#14532d" rx="5" />
      {/* Red zone: median → max */}
      <rect x={toX(bv[2])} y={TY}
            width={Math.max(0, toX(bv[4]) - toX(bv[2]))} height={TH}
            fill="#450a0a" rx="5" />
      {/* Median divider */}
      <line x1={toX(bv[2])} y1={TY} x2={toX(bv[2])} y2={TY + TH} stroke="#4b5563" strokeWidth="1" />

      {/* Tick marks + labels */}
      {bv.map(function(val, i) {
        var tx = toX(val);
        return (
          <g key={i}>
            <line x1={tx} y1={TY + TH} x2={tx} y2={TY + TH + 5} stroke="#374151" strokeWidth="1" />
            <text x={tx} y={TY + TH + 14} textAnchor="middle" fill="#64748b" fontSize="9">{BAND_LABEL_NAMES[i]}</text>
            <text x={tx} y={TY + TH + 25} textAnchor="middle" fill="#475569" fontSize="8">{val.toFixed(2)}</text>
          </g>
        );
      })}

      {/* Current marker */}
      <line x1={curX} y1={TY - 10} x2={curX} y2={TY + TH + 2} stroke="#f59e0b" strokeWidth="2" />
      <polygon
        points={(curX - 5) + ',' + (TY - 10) + ' ' + (curX + 5) + ',' + (TY - 10) + ' ' + curX + ',' + (TY - 2)}
        fill="#f59e0b"
      />
      <text x={textX} y={TY - 13} textAnchor="middle" fill="#f59e0b" fontSize="10" fontWeight="bold">
        {current.toFixed(2)}x
      </text>
    </svg>
  );
}

function ImpliedPriceTable(props) {
  var typeName   = props.typeName;
  var bandObj    = props.bandObj;
  var implied    = props.implied;
  var upside     = props.upside;
  var currentVal = props.currentVal;

  var minDiff = Infinity, closestKey = null;
  BAND_KEYS.forEach(function(k) {
    var bv = parseFloat(bandObj[k]);
    if (!isNaN(bv) && bv > 0 && currentVal !== null) {
      var d = Math.abs(bv - currentVal);
      if (d < minDiff) { minDiff = d; closestKey = k; }
    }
  });

  var hdStyle = {
    padding: '4px 8px', fontSize: '10px', fontWeight: 600,
    textTransform: 'uppercase', color: '#475569',
    borderBottom: '1px solid #2a2d3e',
  };

  return (
    <div>
      <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b',
                    textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
        Implied Price — {typeName} Band
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
        <thead>
          <tr>
            <th style={Object.assign({}, hdStyle, { textAlign: 'left' })}>Level</th>
            <th style={Object.assign({}, hdStyle, { textAlign: 'right' })}>{typeName}</th>
            <th style={Object.assign({}, hdStyle, { textAlign: 'right' })}>Implied Price</th>
            <th style={Object.assign({}, hdStyle, { textAlign: 'right' })}>Upside/Downside</th>
          </tr>
        </thead>
        <tbody>
          {BAND_KEYS.map(function(k, i) {
            var ip   = implied[k];
            var up   = upside[k];
            var near = k === closestKey;
            var uClr = up === undefined ? '#64748b' : up > 0 ? '#22c55e' : up < 0 ? '#ef4444' : '#94a3b8';
            var bvNum = parseFloat(bandObj[k]);
            return (
              <tr key={k} style={{ backgroundColor: near ? '#1e2535' : 'transparent' }}>
                <td style={{ padding: '4px 8px', color: near ? '#e2e8f0' : '#64748b',
                             fontWeight: near ? 700 : 400 }}>
                  {BAND_LABEL_NAMES[i]}{near ? ' ◀' : ''}
                </td>
                <td style={{ padding: '4px 8px', textAlign: 'right',
                             color: '#94a3b8', fontFamily: 'monospace' }}>
                  {!isNaN(bvNum) ? bvNum.toFixed(2) + 'x' : '—'}
                </td>
                <td style={{ padding: '4px 8px', textAlign: 'right',
                             color: '#e2e8f0', fontFamily: 'monospace' }}>
                  {ip !== undefined
                    ? 'Rp ' + Math.round(ip).toLocaleString('id-ID')
                    : '—'}
                </td>
                <td style={{ padding: '4px 8px', textAlign: 'right',
                             color: uClr, fontFamily: 'monospace', fontWeight: 600 }}>
                  {up !== undefined
                    ? (up >= 0 ? '+' : '') + up.toFixed(1) + '%'
                    : '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ValuationBandModule(props) {
  var valuation  = props.valuation;
  var candidates = props.candidates;
  var dispatch   = props.dispatch;

  var _pm = useState('');
  var profileMsg = _pm[0], setProfileMsg = _pm[1];

  function upd(fields) {
    dispatch({ type: 'UPDATE_VALUATION', payload: fields });
  }

  function saveProfile() {
    var ticker = valuation.selectedStock;
    if (!ticker) return;
    try {
      var ok = safeSetStorage('scalping-brief-val-' + ticker, JSON.stringify({
        selectedStock: ticker,
        currentPrice: valuation.currentPrice, eps: valuation.eps, bvps: valuation.bvps,
        peBand: valuation.peBand, pbvBand: valuation.pbvBand,
      }));
      setProfileMsg(ok ? 'Tersimpan: ' + ticker : 'Gagal menyimpan');
    } catch(e) { reportAppError('Gagal menyimpan profil valuasi', e); setProfileMsg('Gagal menyimpan'); }
  }

  function loadProfile() {
    var ticker = valuation.selectedStock;
    if (!ticker) return;
    try {
      var raw = localStorage.getItem('scalping-brief-val-' + ticker);
      if (raw) {
        var p = JSON.parse(raw);
        var fields = { peBand: p.peBand || {}, pbvBand: p.pbvBand || {} };
        if (p.currentPrice) fields.currentPrice = p.currentPrice;
        if (p.eps)  fields.eps  = p.eps;
        if (p.bvps) fields.bvps = p.bvps;
        upd(fields);
        setProfileMsg('Dimuat: ' + ticker);
      } else {
        setProfileMsg('Tidak ada profil tersimpan');
      }
    } catch(e) { reportAppError('Gagal memuat profil valuasi', e); setProfileMsg('Gagal memuat'); }
  }

  // Ganti saham + auto-muat profil tersimpan (hasil import / simpan manual)
  function selectStock(code) {
    code = (code || '').toUpperCase();
    var fields = { selectedStock: code };
    try {
      var raw = code ? localStorage.getItem('scalping-brief-val-' + code) : null;
      if (raw) {
        var p = JSON.parse(raw);
        if (p.currentPrice) fields.currentPrice = p.currentPrice;
        if (p.eps)     fields.eps     = p.eps;
        if (p.bvps)    fields.bvps    = p.bvps;
        if (p.peBand)  fields.peBand  = p.peBand;
        if (p.pbvBand) fields.pbvBand = p.pbvBand;
        setProfileMsg('Profil dimuat otomatis: ' + code);
      } else {
        var cand = candidates.filter(function(c) { return c.code === code; })[0];
        fields.currentPrice = cand ? String(cand.price) : '';
        setProfileMsg('');
      }
    } catch(e) { reportAppError('Gagal auto-load profil valuasi', e); setProfileMsg(''); }
    upd(fields);
  }

  function hasProfile(ticker) {
    if (!ticker) return false;
    try { return !!localStorage.getItem('scalping-brief-val-' + ticker); } catch(e) { reportAppError('Gagal cek profil valuasi', e); return false; }
  }

  var calc = calculateValuation(valuation);

  function bandComplete(band) {
    return BAND_KEYS.every(function(k) {
      var v = parseFloat(band[k]);
      return !isNaN(v) && v > 0;
    }) && parseFloat(band.max) > parseFloat(band.min);
  }
  var peBandOK  = bandComplete(valuation.peBand);
  var pbvBandOK = bandComplete(valuation.pbvBand);

  var inputStyle = {
    backgroundColor: '#0f1117', border: '1px solid #334155', borderRadius: '4px',
    color: '#e2e8f0', fontSize: '13px', fontFamily: 'monospace',
    padding: '6px 8px', outline: 'none', width: '100%', boxSizing: 'border-box',
  };

  function BandInputs(bandKey, placeholders) {
    var band = valuation[bandKey];
    return (
      <div className="band-input-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
        {BAND_KEYS.map(function(k, i) {
          return (
            <div key={k} style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <label style={{ fontSize: '10px', color: '#475569', textTransform: 'uppercase',
                              letterSpacing: '0.04em' }}>
                {BAND_LABEL_NAMES[i]}
              </label>
              <input
                type="number"
                step="0.01"
                value={band[k]}
                placeholder={placeholders[i]}
                onChange={function(e) {
                  var patch = {};
                  patch[k] = e.target.value;
                  var payload = {};
                  payload[bandKey] = patch;
                  upd(payload);
                }}
                style={inputStyle}
              />
            </div>
          );
        })}
      </div>
    );
  }

  function ResultBlock(label, pct, valLabel) {
    var lColor = VALUATION_LABEL_COLORS[valLabel] || '#e2e8f0';
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap',
                    padding: '8px 12px', backgroundColor: '#161922',
                    borderRadius: '6px', border: '1px solid #2a2d3e', marginTop: '8px' }}>
        <div>
          <span style={{ fontSize: '11px', color: '#64748b' }}>Label: </span>
          <span style={{ fontSize: '13px', fontWeight: 700, color: lColor }}>{valLabel}</span>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <span style={{ fontSize: '11px', color: '#64748b' }}>Persentil: </span>
          <span style={{ fontSize: '13px', fontWeight: 700,
                         color: '#94a3b8', fontFamily: 'monospace' }}>
            {pct.toFixed(1)}%
          </span>
        </div>
      </div>
    );
  }

  var missingHint = (
    <div style={{ marginTop: '10px', color: '#374151', fontSize: '11px', fontStyle: 'italic' }}>
      Isi semua 5 level band dan data saham untuk melihat chart &amp; implied price.
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

      {/* ── Stock selector ── */}
      <Card title="Pilih Saham">
        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: '1', minWidth: '160px' }}>
            <label style={{ fontSize: '11px', color: '#64748b' }}>Dari daftar kandidat</label>
            <select
              value={valuation.selectedStock}
              onChange={function(e) { selectStock(e.target.value); }}
              style={Object.assign({}, inputStyle, { fontSize: '13px' })}>
              <option value="">— Pilih Saham —</option>
              {candidates.map(function(c) {
                return (
                  <option key={c.id} value={c.code}>
                    {c.code}{c.name ? ' — ' + c.name : ''}
                  </option>
                );
              })}
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '110px' }}>
            <label style={{ fontSize: '11px', color: '#64748b' }}>Atau ketik kode</label>
            <input
              type="text"
              value={valuation.selectedStock}
              placeholder="BBRI"
              onChange={function(e) { selectStock(e.target.value); }}
              style={inputStyle}
            />
          </div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <button
              onClick={saveProfile}
              disabled={!valuation.selectedStock}
              style={{
                backgroundColor: valuation.selectedStock ? '#1e3a5f' : '#1a1d27',
                border: '1px solid ' + (valuation.selectedStock ? '#2563eb' : '#374151'),
                borderRadius: '4px', padding: '6px 12px', cursor: valuation.selectedStock ? 'pointer' : 'default',
                color: valuation.selectedStock ? '#60a5fa' : '#475569', fontSize: '12px', fontWeight: 600,
              }}>
              Simpan Profil
            </button>
            {hasProfile(valuation.selectedStock) && (
              <button
                onClick={loadProfile}
                style={{
                  backgroundColor: '#1a2e1a', border: '1px solid #16a34a',
                  borderRadius: '4px', padding: '6px 12px', cursor: 'pointer',
                  color: '#4ade80', fontSize: '12px', fontWeight: 600,
                }}>
                Muat Profil
              </button>
            )}
          </div>
          {profileMsg && (
            <span style={{ fontSize: '11px', color: '#4ade80', fontFamily: 'monospace' }}>
              ✓ {profileMsg}
            </span>
          )}
        </div>
      </Card>

      {/* ── Data saham ── */}
      <Card title="Data Saham">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '12px' }}>
          {[
            { label: 'Harga Saat Ini (Rp)', key: 'currentPrice', ph: '4850' },
            { label: 'EPS TTM (Rp)',         key: 'eps',          ph: '520'  },
            { label: 'BVPS (Rp)',            key: 'bvps',         ph: '2800' },
          ].map(function(f) {
            return (
              <div key={f.key} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', color: '#64748b' }}>{f.label}</label>
                <input
                  type="number"
                  step="1"
                  value={valuation[f.key]}
                  placeholder={f.ph}
                  onChange={function(e) {
                    var patch = {};
                    patch[f.key] = e.target.value;
                    upd(patch);
                  }}
                  style={inputStyle}
                />
              </div>
            );
          })}
        </div>
        {(calc.currentPE !== null || calc.currentPBV !== null) && (
          <div style={{ display: 'flex', gap: '24px', marginTop: '12px', flexWrap: 'wrap',
                        padding: '10px 12px', backgroundColor: '#161922',
                        borderRadius: '6px', border: '1px solid #2a2d3e' }}>
            {calc.currentPE !== null && (
              <div>
                <span style={{ fontSize: '11px', color: '#64748b' }}>PE Saat Ini: </span>
                <span style={{ fontSize: '15px', fontWeight: 700, color: '#e2e8f0', fontFamily: 'monospace' }}>
                  {calc.currentPE.toFixed(2)}x
                </span>
              </div>
            )}
            {calc.currentPBV !== null && (
              <div>
                <span style={{ fontSize: '11px', color: '#64748b' }}>PBV Saat Ini: </span>
                <span style={{ fontSize: '15px', fontWeight: 700, color: '#e2e8f0', fontFamily: 'monospace' }}>
                  {calc.currentPBV.toFixed(2)}x
                </span>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* ── PE Band ── */}
      <Card title="PE Band Historis">
        {BandInputs('peBand', ['8', '10', '13', '16', '20'])}
        {peBandOK && calc.currentPE !== null
          ? (
            <div style={{ marginTop: '14px' }}>
              <BandChart bandObj={valuation.peBand} current={calc.currentPE} />
              {ResultBlock('PE', calc.pePercentile, calc.peLabel)}
              <div style={{ marginTop: '12px' }}>
                <ImpliedPriceTable
                  typeName="PE"
                  bandObj={valuation.peBand}
                  implied={calc.peImplied}
                  upside={calc.peUpside}
                  currentVal={calc.currentPE}
                />
              </div>
            </div>
          ) : missingHint}
      </Card>

      {/* ── PBV Band ── */}
      <Card title="PBV Band Historis">
        {BandInputs('pbvBand', ['1.2', '1.5', '1.9', '2.3', '3.0'])}
        {pbvBandOK && calc.currentPBV !== null
          ? (
            <div style={{ marginTop: '14px' }}>
              <BandChart bandObj={valuation.pbvBand} current={calc.currentPBV} />
              {ResultBlock('PBV', calc.pbvPercentile, calc.pbvLabel)}
              <div style={{ marginTop: '12px' }}>
                <ImpliedPriceTable
                  typeName="PBV"
                  bandObj={valuation.pbvBand}
                  implied={calc.pbvImplied}
                  upside={calc.pbvUpside}
                  currentVal={calc.currentPBV}
                />
              </div>
            </div>
          ) : missingHint}
      </Card>

    </div>
  );
}

// ─────────────────────────────────────────────────────────
// CONSENSUS MODULE  (Sprint 4)
// ─────────────────────────────────────────────────────────

function AnalystRatingBar(props) {
  var total = props.total;

  if (total === 0) {
    return (
      <div style={{ height: '22px', backgroundColor: '#1e293b', borderRadius: '4px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: '11px', color: '#374151', fontStyle: 'italic' }}>
          Belum ada data analis
        </span>
      </div>
    );
  }

  var segments = [
    { pct: props.buyPct,  bg: '#15803d', textClr: '#bbf7d0', label: props.buyPct.toFixed(0) + '%'  },
    { pct: props.holdPct, bg: '#374151', textClr: '#d1d5db', label: props.holdPct.toFixed(0) + '%' },
    { pct: props.sellPct, bg: '#991b1b', textClr: '#fecaca', label: props.sellPct.toFixed(0) + '%' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <div style={{ display: 'flex', height: '22px', borderRadius: '4px', overflow: 'hidden' }}>
        {segments.map(function(seg, i) {
          if (seg.pct <= 0) return null;
          return (
            <div key={i} style={{ width: seg.pct + '%', backgroundColor: seg.bg,
                                   display: 'flex', alignItems: 'center', justifyContent: 'center',
                                   transition: 'width 0.3s' }}>
              {seg.pct > 9 && (
                <span style={{ fontSize: '10px', color: seg.textClr, fontWeight: 700 }}>
                  {seg.label}
                </span>
              )}
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
        {[
          { dot: '#15803d', name: 'Buy',  val: props.buy,  clr: '#4ade80' },
          { dot: '#374151', name: 'Hold', val: props.hold, clr: '#9ca3af' },
          { dot: '#991b1b', name: 'Sell', val: props.sell, clr: '#f87171' },
        ].map(function(item) {
          return (
            <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '8px', height: '8px', backgroundColor: item.dot,
                             borderRadius: '2px', display: 'inline-block', flexShrink: 0 }} />
              <span style={{ fontSize: '11px', color: '#64748b' }}>
                {item.name}:{' '}
                <span style={{ fontWeight: 700, color: item.clr, fontFamily: 'monospace' }}>
                  {Math.round(item.val)}
                </span>
              </span>
            </div>
          );
        })}
        <span style={{ marginLeft: 'auto', fontSize: '11px', color: '#475569' }}>
          {Math.round(total)} analis
        </span>
      </div>
    </div>
  );
}

function ConsensusScoreCard(props) {
  var score = props.score;
  var label = props.label;

  var palette = {
    'Bullish': { bg: '#0c1f10', border: '#16a34a', text: '#4ade80', sub: 'Mayoritas Beli' },
    'Neutral': { bg: '#1e1b4b', border: '#4f46e5', text: '#818cf8', sub: 'Sentimen Campuran' },
    'Bearish': { bg: '#1f0808', border: '#dc2626', text: '#f87171', sub: 'Mayoritas Jual'  },
  };
  var p = palette[label] || { bg: '#1e2535', border: '#2a2d3e', text: '#475569', sub: '' };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '14px 16px',
                  backgroundColor: p.bg, border: '1px solid ' + p.border, borderRadius: '8px' }}>
      <div>
        <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase',
                      letterSpacing: '0.06em', marginBottom: '4px' }}>
          Consensus Score
        </div>
        <div style={{ fontSize: '30px', fontWeight: 800, color: p.text,
                      fontFamily: 'monospace', lineHeight: 1 }}>
          {score !== null ? Math.round(score) : '—'}
          <span style={{ fontSize: '13px', fontWeight: 400, color: '#475569' }}>/100</span>
        </div>
      </div>
      <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
        <div style={{ fontSize: '20px', fontWeight: 700, color: p.text }}>{label || '—'}</div>
        <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>{p.sub}</div>
      </div>
    </div>
  );
}

function ConsensusModule(props) {
  var consensus  = props.consensus;
  var candidates = props.candidates;
  var dispatch   = props.dispatch;

  function upd(fields) {
    dispatch({ type: 'UPDATE_CONSENSUS', payload: fields });
  }

  // Ganti saham + auto-muat consensus tersimpan (hasil import / sesi sebelumnya)
  function selectStock(code) {
    code = (code || '').toUpperCase();
    var fields = { selectedStock: code };
    try {
      var raw = code ? localStorage.getItem('scalping-brief-cons-' + code) : null;
      if (raw) {
        var p = JSON.parse(raw);
        if (p.analysts)         fields.analysts        = p.analysts;
        if (p.targetPrice)      fields.targetPrice     = p.targetPrice;
        if (p.epsEstimate)      fields.epsEstimate     = p.epsEstimate;
        if (p.revenueEstimate)  fields.revenueEstimate = p.revenueEstimate;
        if (p.nextEarningsDate) fields.nextEarningsDate = p.nextEarningsDate;
      }
    } catch(e) { reportAppError('Gagal auto-load consensus', e); }
    upd(fields);
  }

  // Derive current price from matching candidate
  var matched = candidates.filter(function(cand) { return cand.code === consensus.selectedStock; });
  var currentPrice = matched.length > 0 ? parseFloat(matched[0].price) : null;
  if (currentPrice !== null && isNaN(currentPrice)) currentPrice = null;

  var calc = calculateConsensus(consensus, currentPrice);

  var inputStyle = {
    backgroundColor: '#0f1117', border: '1px solid #334155', borderRadius: '4px',
    color: '#e2e8f0', fontSize: '13px', fontFamily: 'monospace',
    padding: '6px 8px', outline: 'none', width: '100%', boxSizing: 'border-box',
  };

  function autoHint(val) {
    if (val === null) return null;
    return (
      <span style={{ fontSize: '10px', color: '#4ade80', fontFamily: 'monospace', marginTop: '2px' }}>
        Auto: {val >= 0 ? '+' : ''}{val.toFixed(1)}%
      </span>
    );
  }

  function upsideDisplay(upsideVal, tpVal) {
    if (tpVal === '') return { text: '—', color: '#374151' };
    if (upsideVal === null) {
      return { text: consensus.selectedStock ? 'Pilih dari kandidat' : '—', color: '#475569' };
    }
    var sign = upsideVal >= 0 ? '+' : '';
    return {
      text:  sign + upsideVal.toFixed(1) + '%',
      color: upsideVal > 0 ? '#22c55e' : upsideVal < 0 ? '#ef4444' : '#94a3b8',
    };
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

      {/* ── Pilih Saham ── */}
      <Card title="Pilih Saham">
        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          {candidates.length > 0 && (
            <div style={{ flex: '1', minWidth: '160px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '11px', color: '#64748b' }}>Dari daftar kandidat</label>
              <select
                value={consensus.selectedStock}
                onChange={function(e) { selectStock(e.target.value); }}
                style={Object.assign({}, inputStyle, { fontSize: '13px' })}>
                <option value="">— Pilih Saham —</option>
                {candidates.map(function(c) {
                  return (
                    <option key={c.id} value={c.code}>
                      {c.code}{c.name ? ' — ' + c.name : ''}
                    </option>
                  );
                })}
              </select>
            </div>
          )}
          <div style={{ minWidth: '120px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '11px', color: '#64748b' }}>
              {candidates.length > 0 ? 'Atau ketik kode' : 'Kode Saham'}
            </label>
            <input
              type="text"
              value={consensus.selectedStock}
              placeholder="BBRI"
              onChange={function(e) { selectStock(e.target.value); }}
              style={inputStyle}
            />
          </div>
          {currentPrice !== null && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontSize: '10px', color: '#64748b' }}>Harga Terakhir</span>
              <span style={{ fontSize: '14px', fontWeight: 700, color: '#e2e8f0', fontFamily: 'monospace' }}>
                Rp {Math.round(currentPrice).toLocaleString('id-ID')}
              </span>
            </div>
          )}
        </div>
      </Card>

      {/* ── Rating Analis ── */}
      <Card title="Rating Analis">
        <div className="consensus-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px',
                      marginBottom: '14px' }}>
          {[
            { label: 'Buy',  key: 'buy',  clr: '#4ade80' },
            { label: 'Hold', key: 'hold', clr: '#9ca3af' },
            { label: 'Sell', key: 'sell', clr: '#f87171' },
          ].map(function(f) {
            return (
              <div key={f.key} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', color: f.clr, fontWeight: 600 }}>{f.label}</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={consensus.analysts[f.key]}
                  placeholder="0"
                  onChange={function(e) {
                    var patch = {};
                    patch[f.key] = e.target.value;
                    upd({ analysts: patch });
                  }}
                  style={inputStyle}
                />
              </div>
            );
          })}
        </div>
        <AnalystRatingBar
          total={calc.total}
          buyPct={calc.buyPct} holdPct={calc.holdPct} sellPct={calc.sellPct}
          buy={parseFloat(consensus.analysts.buy) || 0}
          hold={parseFloat(consensus.analysts.hold) || 0}
          sell={parseFloat(consensus.analysts.sell) || 0}
        />
        {calc.total > 0 && (
          <div style={{ marginTop: '12px' }}>
            <ConsensusScoreCard score={calc.score} label={calc.label} />
          </div>
        )}
      </Card>

      {/* ── Target Price ── */}
      <Card title="Target Price">
        <div className="consensus-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px',
                      marginBottom: '12px' }}>
          {[
            { label: 'TP Low (Rp)',  key: 'low',  ph: '4500' },
            { label: 'TP Mean (Rp)', key: 'mean', ph: '5400' },
            { label: 'TP High (Rp)', key: 'high', ph: '6200' },
          ].map(function(f) {
            return (
              <div key={f.key} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', color: '#64748b' }}>{f.label}</label>
                <input
                  type="number"
                  step="1"
                  value={consensus.targetPrice[f.key]}
                  placeholder={f.ph}
                  onChange={function(e) {
                    var patch = {};
                    patch[f.key] = e.target.value;
                    upd({ targetPrice: patch });
                  }}
                  style={inputStyle}
                />
              </div>
            );
          })}
        </div>
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', padding: '8px 12px',
                      backgroundColor: '#161922', borderRadius: '6px', border: '1px solid #2a2d3e' }}>
          {[
            { label: 'Upside ke TP Mean', ud: upsideDisplay(calc.upsideMean, consensus.targetPrice.mean) },
            { label: 'Upside ke TP High', ud: upsideDisplay(calc.upsideHigh, consensus.targetPrice.high) },
          ].map(function(item) {
            return (
              <div key={item.label}>
                <span style={{ fontSize: '11px', color: '#64748b' }}>{item.label}: </span>
                <span style={{ fontSize: '13px', fontWeight: 700,
                               color: item.ud.color, fontFamily: 'monospace' }}>
                  {item.ud.text}
                </span>
              </div>
            );
          })}
        </div>
      </Card>

      {/* ── Estimasi EPS ── */}
      <Card title="Estimasi EPS">
        <div className="consensus-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '11px', color: '#64748b' }}>EPS FY Saat Ini (Rp)</label>
            <input type="number" step="1"
              value={consensus.epsEstimate.current} placeholder="520"
              onChange={function(e) { upd({ epsEstimate: { current: e.target.value } }); }}
              style={inputStyle} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '11px', color: '#64748b' }}>EPS FY+1 (Rp)</label>
            <input type="number" step="1"
              value={consensus.epsEstimate.next} placeholder="610"
              onChange={function(e) { upd({ epsEstimate: { next: e.target.value } }); }}
              style={inputStyle} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '11px', color: '#64748b' }}>Growth YoY (%)</label>
            <input type="number" step="0.1"
              value={consensus.epsEstimate.growth}
              placeholder={calc.epsGrowthCalc !== null
                ? (calc.epsGrowthCalc >= 0 ? '+' : '') + calc.epsGrowthCalc.toFixed(1) + ' (auto)'
                : '17.3'}
              onChange={function(e) { upd({ epsEstimate: { growth: e.target.value } }); }}
              style={inputStyle} />
            {consensus.epsEstimate.growth === '' && autoHint(calc.epsGrowthCalc)}
          </div>
        </div>
      </Card>

      {/* ── Estimasi Revenue ── */}
      <Card title="Estimasi Revenue">
        <div className="consensus-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '11px', color: '#64748b' }}>Revenue FY Saat Ini (Rp M)</label>
            <input type="number" step="1"
              value={consensus.revenueEstimate.current} placeholder="145000"
              onChange={function(e) { upd({ revenueEstimate: { current: e.target.value } }); }}
              style={inputStyle} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '11px', color: '#64748b' }}>Revenue FY+1 (Rp M)</label>
            <input type="number" step="1"
              value={consensus.revenueEstimate.next} placeholder="162000"
              onChange={function(e) { upd({ revenueEstimate: { next: e.target.value } }); }}
              style={inputStyle} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '11px', color: '#64748b' }}>Growth YoY (%)</label>
            <input type="number" step="0.1"
              value={consensus.revenueEstimate.growth}
              placeholder={calc.revGrowthCalc !== null
                ? (calc.revGrowthCalc >= 0 ? '+' : '') + calc.revGrowthCalc.toFixed(1) + ' (auto)'
                : '11.7'}
              onChange={function(e) { upd({ revenueEstimate: { growth: e.target.value } }); }}
              style={inputStyle} />
            {consensus.revenueEstimate.growth === '' && autoHint(calc.revGrowthCalc)}
          </div>
        </div>
      </Card>

      {/* ── Jadwal Katalis ── */}
      <Card title="Jadwal Katalis">
        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: '1', minWidth: '160px' }}>
            <label style={{ fontSize: '11px', color: '#64748b' }}>
              Tanggal Laporan Keuangan Berikutnya
            </label>
            <input
              type="date"
              value={consensus.nextEarningsDate}
              onChange={function(e) { upd({ nextEarningsDate: e.target.value }); }}
              style={Object.assign({}, inputStyle, { colorScheme: 'dark' })}
            />
          </div>
          {consensus.nextEarningsDate && (
            <div style={{ padding: '6px 12px', backgroundColor: '#1e1b4b',
                          border: '1px solid #4f46e5', borderRadius: '6px',
                          display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '12px' }}>📅</span>
              <span style={{ fontSize: '12px', color: '#818cf8', fontFamily: 'monospace' }}>
                {consensus.nextEarningsDate}
              </span>
            </div>
          )}
        </div>
      </Card>

    </div>
  );
}

// ─────────────────────────────────────────────────────────
// PLACEHOLDER PANELS  (Sprint 4–5)
// ─────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────
// BRIEF GENERATOR MODULE  (Sprint 5)
// ─────────────────────────────────────────────────────────

function BriefGeneratorModule(props) {
  var state = props.state;

  var copiedState = useState(false);
  var copied      = copiedState[0];
  var setCopied   = copiedState[1];

  var text = generateBriefText(state);

  function handleCopy() {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function() {
        setCopied(true);
        setTimeout(function() { setCopied(false); }, 2000);
      }).catch(function() { fallbackCopy(); });
    } else {
      fallbackCopy();
    }
  }

  function fallbackCopy() {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.focus(); ta.select();
    try { document.execCommand('copy'); setCopied(true); }
    catch(e) { reportAppError('Gagal copy brief', e); alert('Gagal menyalin brief. Coba pilih teks manual.'); }
    document.body.removeChild(ta);
    setTimeout(function() { setCopied(false); }, 2000);
  }

  function handlePDF() {
    if (typeof html2pdf === 'undefined') {
      alert('html2pdf.js belum dimuat. Cek koneksi internet dan reload halaman.'); return;
    }
    var el = document.getElementById('brief-pdf-target');
    html2pdf().set({
      margin:     [12, 12],
      filename:   'scalping-brief-' + state.meta.date + '.pdf',
      image:      { type: 'jpeg', quality: 0.95 },
      html2canvas:{ scale: 2, backgroundColor: '#0f1117', useCORS: true },
      jsPDF:      { unit: 'mm', format: 'a4', orientation: 'portrait' }
    }).from(el).save();
  }

  var btnBase = {
    padding: '6px 14px', fontSize: '12px', borderRadius: '6px',
    cursor: 'pointer', fontWeight: 500,
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>

      {/* ── Toolbar ── */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <h2 style={{ margin:0, fontSize:'15px', fontWeight:600, color:'#e2e8f0' }}>
          Scalping Brief
        </h2>
        <div style={{ display:'flex', gap:'8px' }}>
          <button onClick={handleCopy} style={Object.assign({}, btnBase, {
            backgroundColor: copied ? '#14532d' : '#1e293b',
            color:           copied ? '#4ade80' : '#94a3b8',
            border: '1px solid ' + (copied ? '#16a34a' : '#334155'),
          })}>
            {copied ? '✓ Tersalin!' : '📋 Copy Teks'}
          </button>
          <button onClick={handlePDF} style={Object.assign({}, btnBase, {
            backgroundColor: '#1e1b4b', color: '#818cf8',
            border: '1px solid #3730a3',
          })}>
            📑 Export PDF
          </button>
        </div>
      </div>

      {/* ── Brief Preview ── */}
      <div id="brief-pdf-target"
        style={{ backgroundColor:'#080c12', border:'1px solid #1e293b',
                 borderRadius:'8px', padding:'20px 24px', overflowX:'auto' }}>
        <pre style={{
          margin: 0,
          fontFamily: "'JetBrains Mono', Consolas, 'Courier New', monospace",
          fontSize: '12px', lineHeight: '1.75', color: '#cbd5e1',
          whiteSpace: 'pre-wrap', wordBreak: 'break-word',
        }}>
          {text}
        </pre>
      </div>

      <p style={{ margin:0, fontSize:'11px', color:'#1e293b' }}>
        Brief diperbarui otomatis saat data di modul lain berubah.
      </p>
    </div>
  );
}

function PlaceholderPanel(props) {
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center',
                  justifyContent:'center', padding:'80px 20px', textAlign:'center' }}>
      <span style={{ fontSize:'48px', marginBottom:'16px' }}>{props.icon}</span>
      <h2 style={{ margin:0, fontSize:'15px', fontWeight:600, color:'#475569', marginBottom:'6px' }}>
        {props.title}
      </h2>
      <p style={{ margin:0, fontSize:'13px', color:'#1f2937' }}>
        Akan diimplementasi di {props.sprint}
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// IMPORT MODAL
// ─────────────────────────────────────────────────────────

var FORECAST_ORDER = ['ARA Potential', 'Bullish', 'Sideways', 'Bearish', 'ARB Risk'];
function forecastSort(a, b) {
  var ai = FORECAST_ORDER.indexOf(a.forecast ? a.forecast.label : 'Sideways');
  var bi = FORECAST_ORDER.indexOf(b.forecast ? b.forecast.label : 'Sideways');
  return ai - bi;
}

function ImportModal(props) {
  var onClose  = props.onClose;
  var onImport = props.onImport;

  var dragState    = useState(false); var isDragging = dragState[0]; var setIsDragging = dragState[1];
  var loadingState = useState(false); var loading    = loadingState[0]; var setLoading    = loadingState[1];
  var errorState   = useState(null);  var error      = errorState[0];  var setError      = errorState[1];
  var previewState = useState(null);  var preview    = previewState[0]; var setPreview    = previewState[1];

  function handleFile(file) {
    if (!file) return;
    var isJson = file.name.match(/\.json$/i);
    var isXlsx = file.name.match(/\.xlsx$/i);
    if (!isJson && !isXlsx) { setError('Hanya file .xlsx atau .json yang didukung.'); return; }
    setLoading(true); setError(null); setPreview(null);
    var parser = isJson ? parseJSONToAppData(file) : parseXLSXToAppData(file);
    parser
      .then(function(data) { setPreview(data); setLoading(false); })
      .catch(function(err) { setError('Gagal parsing: ' + (err.message || String(err))); setLoading(false); });
  }

  function onDrop(e) {
    e.preventDefault(); setIsDragging(false);
    var file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function onFileInput(e) { handleFile(e.target.files[0]); }

  var sortedCandidates = preview ? preview.candidates.slice().sort(forecastSort) : [];

  var overlay = {
    position: 'fixed', inset: 0, zIndex: 200,
    backgroundColor: 'rgba(0,0,0,0.75)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '24px',
  };
  var modal = {
    backgroundColor: '#1a1d27', border: '1px solid #2a2d3e', borderRadius: '10px',
    width: '100%', maxWidth: '760px', maxHeight: '85vh',
    display: 'flex', flexDirection: 'column', overflow: 'hidden',
  };
  var dropzone = {
    border: '2px dashed ' + (isDragging ? '#4ade80' : '#334155'),
    borderRadius: '8px', padding: '32px 20px',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px',
    cursor: 'pointer', transition: 'border-color 0.2s',
    backgroundColor: isDragging ? '#0d2a1a' : '#0f1117',
  };

  return (
    <div style={overlay} onClick={function(e) { if (e.target === e.currentTarget) onClose(); }}>
      <div style={modal}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
                      padding:'14px 18px', borderBottom:'1px solid #2a2d3e', flexShrink:0 }}>
          <div>
            <p style={{ margin:0, fontSize:'14px', fontWeight:700, color:'#e2e8f0' }}>
              📥 Import Data Saham
            </p>
            <p style={{ margin:'2px 0 0', fontSize:'11px', color:'#64748b' }}>
              Scalping_Analysis.xlsx (GF_Import · PE_PBV_Band · Consensus_EPS)
              &nbsp;·&nbsp; stock_data.json (dari idx_scraper.py)
            </p>
          </div>
          <button onClick={onClose}
            style={{ background:'none', border:'none', color:'#64748b', fontSize:'18px', cursor:'pointer', padding:'0 4px' }}>
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ flex:1, overflowY:'auto', padding:'18px' }}>

          {/* Drop zone (selalu tampil jika belum preview) */}
          {!preview && (
            <label style={{ display:'block' }}>
              <div style={dropzone}
                onDragOver={function(e) { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={function() { setIsDragging(false); }}
                onDrop={onDrop}>
                <span style={{ fontSize:'32px' }}>📄</span>
                <p style={{ margin:0, fontSize:'13px', color:'#94a3b8', textAlign:'center' }}>
                  Drag & drop <strong style={{ color:'#e2e8f0' }}>Scalping_Analysis.xlsx</strong>
                  {' '}atau{' '}
                  <strong style={{ color:'#60a5fa' }}>stock_data.json</strong> ke sini
                  <br/>atau klik untuk pilih file
                </p>
                {loading && <p style={{ margin:0, fontSize:'12px', color:'#6366f1' }}>⏳ Memproses...</p>}
              </div>
              <input type="file" accept=".xlsx,.json" style={{ display:'none' }} onChange={onFileInput} />
            </label>
          )}

          {error && (
            <p style={{ margin:'10px 0 0', fontSize:'12px', color:'#f87171',
                        backgroundColor:'#450a0a', padding:'8px 12px', borderRadius:'6px' }}>
              ⚠️ {error}
            </p>
          )}

          {/* Preview hasil parsing */}
          {preview && (
            <div>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'12px' }}>
                <p style={{ margin:0, fontSize:'13px', color:'#94a3b8' }}>
                  Ditemukan <strong style={{ color:'#e2e8f0' }}>{preview.candidates.length} saham</strong>
                  {preview.valuation ? ' · PE/PBV data siap' : ''}
                  {preview.consensus ? ' · Consensus data siap' : ''}
                </p>
                <button onClick={function() { setPreview(null); setError(null); }}
                  style={{ fontSize:'11px', color:'#64748b', background:'none', border:'1px solid #334155',
                           borderRadius:'4px', padding:'3px 8px', cursor:'pointer' }}>
                  Ganti file
                </button>
              </div>

              {/* Tabel preview */}
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'12px' }}>
                  <thead>
                    <tr style={{ borderBottom:'1px solid #2a2d3e' }}>
                      {['Kode','Harga','Change %','Vol Multiplier','ARA Level','ARB Level','Forecast Signal'].map(function(h) {
                        return (
                          <th key={h} style={{ padding:'6px 10px', textAlign:'left', color:'#64748b',
                                              fontWeight:600, fontSize:'10px', textTransform:'uppercase',
                                              letterSpacing:'0.05em', whiteSpace:'nowrap' }}>
                            {h}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {sortedCandidates.map(function(c) {
                      var chg = parseFloat(c.change);
                      var chgColor = isNaN(chg) ? '#64748b' : chg >= 0 ? '#22c55e' : '#ef4444';
                      var fc = c.forecast;
                      return (
                        <tr key={c.id} style={{ borderBottom:'1px solid #1e293b' }}>
                          <td style={{ padding:'7px 10px', fontWeight:700, color:'#e2e8f0', fontFamily:'monospace' }}>
                            {c.code}
                          </td>
                          <td style={{ padding:'7px 10px', fontFamily:'monospace', color:'#e2e8f0' }}>
                            {c.price ? 'Rp ' + parseInt(c.price).toLocaleString('id-ID') : '–'}
                          </td>
                          <td style={{ padding:'7px 10px', fontFamily:'monospace', color: chgColor }}>
                            {!isNaN(chg) ? (chg >= 0 ? '+' : '') + chg.toFixed(2) + '%' : '–'}
                          </td>
                          <td style={{ padding:'7px 10px', color:'#94a3b8' }}>
                            {c.volumeMultiplier ? c.volumeMultiplier + 'x' : '–'}
                          </td>
                          <td style={{ padding:'7px 10px', fontFamily:'monospace', color:'#a855f7', fontSize:'11px' }}>
                            {c.araPrice ? 'Rp ' + c.araPrice.toLocaleString('id-ID') : '–'}
                          </td>
                          <td style={{ padding:'7px 10px', fontFamily:'monospace', color:'#f87171', fontSize:'11px' }}>
                            {c.arbPrice ? 'Rp ' + c.arbPrice.toLocaleString('id-ID') : '–'}
                          </td>
                          <td style={{ padding:'7px 10px' }}>
                            {fc ? (
                              <span style={{ display:'inline-flex', alignItems:'center', gap:'4px',
                                             padding:'2px 8px', borderRadius:'12px', fontSize:'11px',
                                             fontWeight:600, backgroundColor: fc.bg, color: fc.color,
                                             border:'1px solid ' + fc.color + '44' }}>
                                {fc.icon} {fc.label}
                              </span>
                            ) : <span style={{ color:'#475569' }}>–</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Info tip GOOGLEFINANCE */}
              <div style={{ marginTop:'14px', padding:'10px 12px', backgroundColor:'#0f172a',
                            borderRadius:'6px', border:'1px solid #1e3a5f' }}>
                <p style={{ margin:0, fontSize:'11px', color:'#475569', lineHeight:'1.6' }}>
                  💡 <strong style={{ color:'#60a5fa' }}>Import stock_data.json</strong> mengisi otomatis ke 3 modul:
                  Kandidat Saham, PE/PBV Band (termasuk band min/SD/median/max dari harga 1 tahun),
                  dan Consensus (analis, target price, EPS est). Data tiap saham tersimpan per-kode —
                  ganti saham di modul Valuasi/Consensus untuk memuat datanya. Jalankan{' '}
                  <code style={{ backgroundColor:'#1e293b', padding:'1px 5px', borderRadius:'3px', color:'#a78bfa' }}>
                    py idx_scraper.py BBRI BBCA
                  </code>{' '}
                  untuk membuat file-nya.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ display:'flex', justifyContent:'flex-end', gap:'8px',
                      padding:'12px 18px', borderTop:'1px solid #2a2d3e', flexShrink:0 }}>
          <button onClick={onClose}
            style={{ padding:'7px 16px', fontSize:'12px', borderRadius:'4px',
                     backgroundColor:'#1e293b', color:'#94a3b8', border:'1px solid #334155', cursor:'pointer' }}>
            Batal
          </button>
          <button disabled={!preview} onClick={function() { if (preview) onImport(preview); }}
            style={{ padding:'7px 16px', fontSize:'12px', fontWeight:600, borderRadius:'4px',
                     backgroundColor: preview ? '#4f46e5' : '#1e293b',
                     color: preview ? '#fff' : '#374151',
                     border:'none', cursor: preview ? 'pointer' : 'not-allowed' }}>
            ✅ Import {preview ? preview.candidates.length + ' Saham' : ''}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// MAIN PANEL — module router
// ─────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────
// TRADING JOURNAL MODULE  (Tier 1)
// ─────────────────────────────────────────────────────────

function JournalStatCard(props) {
  return (
    <div style={{ backgroundColor:'#1a1d27', border:'1px solid #2a2d3e', borderRadius:'8px',
                  padding:'10px 14px', flex:'1', minWidth:'120px' }}>
      <div style={{ fontSize:'10px', color:'#64748b', textTransform:'uppercase', letterSpacing:'0.03em' }}>
        {props.label}
      </div>
      <div style={{ fontSize:'18px', fontWeight:700, fontFamily:'monospace', color:props.color || '#e2e8f0', marginTop:'2px' }}>
        {props.value}
      </div>
      {props.sub && <div style={{ fontSize:'10px', color:'#475569', marginTop:'1px' }}>{props.sub}</div>}
    </div>
  );
}

function JournalModule(props) {
  var journal    = props.journal || [];
  var candidates = props.candidates || [];
  var dispatch   = props.dispatch;

  var blank = { code:'', setup:'', entry:'', sl:'', exit:'', lot:'', date: todayISO(), notes:'' };
  var fState = useState(blank); var f = fState[0], setF = fState[1];
  function set(k, v) { var n = Object.assign({}, f); n[k] = v; setF(n); }

  function prefill(code) {
    var cand = candidates.filter(function(c){ return c.code === code; })[0];
    if (!cand) { set('code', code); return; }
    setF(Object.assign({}, f, {
      code: cand.code, setup: cand.setup || '',
      entry: cand.entry || cand.price || '', sl: cand.sl || '', lot: cand.lot || '',
    }));
  }

  function submit() {
    if (!f.code) { dispatch({ type:'SET_UI_ERROR', payload:'Isi minimal kode saham untuk mencatat trade.' }); return; }
    dispatch({ type:'ADD_TRADE', payload: f });
    setF(Object.assign({}, blank, { date: f.date }));
  }

  var stats = calculateJournalStats(journal);
  var pf = stats.profitFactor;
  var pfStr = pf === null ? '—' : (pf === Infinity ? '∞' : pf.toFixed(2));

  var ctl = { backgroundColor:'#0f1117', border:'1px solid #334155', borderRadius:'4px',
              color:'#e2e8f0', fontSize:'12px', padding:'6px 8px', outline:'none', width:'100%', boxSizing:'border-box' };
  var lbl = { fontSize:'10px', color:'#64748b', display:'block', marginBottom:'3px' };
  var th  = { fontSize:'10px', color:'#64748b', textTransform:'uppercase', textAlign:'left',
              padding:'6px 8px', borderBottom:'1px solid #2a2d3e', whiteSpace:'nowrap' };
  var td  = { fontSize:'12px', color:'#e2e8f0', padding:'6px 8px', borderBottom:'1px solid #1e293b', fontFamily:'monospace' };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
      <h2 style={{ margin:0, fontSize:'15px', fontWeight:600, color:'#e2e8f0' }}>Jurnal Trading</h2>

      {/* Statistik */}
      <div style={{ display:'flex', gap:'10px', flexWrap:'wrap' }}>
        <JournalStatCard label="Trade Ditutup" value={stats.closed} sub={'dari ' + stats.count + ' entri'} />
        <JournalStatCard label="Win Rate"
          value={stats.winRate === null ? '—' : stats.winRate.toFixed(0) + '%'}
          sub={stats.wins + 'W / ' + stats.losses + 'L' + (stats.be ? ' / ' + stats.be + 'BE' : '')}
          color={stats.winRate === null ? '#e2e8f0' : stats.winRate >= 50 ? '#4ade80' : '#f87171'} />
        <JournalStatCard label="Avg R" value={stats.avgR === null ? '—' : (stats.avgR >= 0 ? '+' : '') + stats.avgR.toFixed(2) + 'R'}
          color={stats.avgR === null ? '#e2e8f0' : stats.avgR >= 0 ? '#4ade80' : '#f87171'} />
        <JournalStatCard label="Total P/L"
          value={(stats.totalPnl >= 0 ? '+' : '−') + 'Rp ' + Math.abs(Math.round(stats.totalPnl)).toLocaleString('id-ID')}
          color={stats.totalPnl >= 0 ? '#4ade80' : '#f87171'} />
        <JournalStatCard label="Profit Factor" value={pfStr}
          color={pf === null ? '#e2e8f0' : (pf >= 1 ? '#4ade80' : '#f87171')} />
      </div>

      {/* Form tambah */}
      <Card title="➕ Catat Trade">
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(110px, 1fr))', gap:'10px', alignItems:'flex-end' }}>
          <div>
            <label style={lbl}>Dari Kandidat</label>
            <select value="" onChange={function(e){ if(e.target.value) prefill(e.target.value); }} style={ctl}>
              <option value="">— pilih —</option>
              {candidates.map(function(c){ return <option key={c.id} value={c.code}>{c.code}</option>; })}
            </select>
          </div>
          <div><label style={lbl}>Kode</label>
            <input value={f.code} onChange={function(e){ set('code', e.target.value.toUpperCase()); }} placeholder="BBRI" style={ctl} /></div>
          <div><label style={lbl}>Setup</label>
            <select value={f.setup} onChange={function(e){ set('setup', e.target.value); }} style={ctl}>
              <option value="">—</option>
              {SETUP_TYPES.map(function(s){ return <option key={s.value} value={s.value}>{s.value}</option>; })}
            </select></div>
          <div><label style={lbl}>Tanggal</label>
            <input type="date" value={f.date} onChange={function(e){ set('date', e.target.value); }} style={ctl} /></div>
          <div><label style={lbl}>Entry</label>
            <input type="number" value={f.entry} onChange={function(e){ set('entry', e.target.value); }} placeholder="4870" style={ctl} /></div>
          <div><label style={lbl}>Stop Loss</label>
            <input type="number" value={f.sl} onChange={function(e){ set('sl', e.target.value); }} placeholder="4720" style={ctl} /></div>
          <div><label style={lbl}>Exit</label>
            <input type="number" value={f.exit} onChange={function(e){ set('exit', e.target.value); }} placeholder="5050" style={ctl} /></div>
          <div><label style={lbl}>Lot</label>
            <input type="number" value={f.lot} onChange={function(e){ set('lot', e.target.value); }} placeholder="10" style={ctl} /></div>
          <div style={{ gridColumn:'1 / -1' }}><label style={lbl}>Catatan</label>
            <input value={f.notes} onChange={function(e){ set('notes', e.target.value); }} placeholder="Alasan masuk/keluar, evaluasi…" style={ctl} /></div>
        </div>
        <div style={{ marginTop:'10px' }}>
          <button onClick={submit}
            style={{ padding:'7px 16px', fontSize:'12px', fontWeight:600, borderRadius:'6px',
                     backgroundColor:'#0d2a1a', color:'#4ade80', border:'1px solid #14532d', cursor:'pointer' }}>
            Simpan Trade
          </button>
          <span style={{ marginLeft:'10px', fontSize:'11px', color:'#475569' }}>
            Exit kosong = posisi masih terbuka (belum dihitung di statistik).
          </span>
        </div>
      </Card>

      {/* Tabel */}
      {journal.length === 0 ? (
        <div style={{ padding:'40px 20px', textAlign:'center', backgroundColor:'#1a1d27',
                      border:'1px solid #2a2d3e', borderRadius:'8px', fontSize:'13px', color:'#475569' }}>
          📒 Belum ada catatan trade. Tambahkan eksekusi Anda untuk melacak win-rate & P/L.
        </div>
      ) : (
        <div style={{ overflowX:'auto', backgroundColor:'#1a1d27', border:'1px solid #2a2d3e', borderRadius:'8px' }}>
          <table style={{ borderCollapse:'collapse', width:'100%', minWidth:'720px' }}>
            <thead><tr>
              {['Tanggal','Kode','Setup','Entry','Exit','Lot','P/L','R','Catatan',''].map(function(h,i){
                return <th key={i} style={th}>{h}</th>;
              })}
            </tr></thead>
            <tbody>
              {journal.map(function(t){
                var pnl = calcTradePnl(t);
                var r   = calcTradeR(t);
                var pnlColor = pnl === null ? '#64748b' : pnl > 0 ? '#4ade80' : pnl < 0 ? '#f87171' : '#94a3b8';
                return (
                  <tr key={t.id}>
                    <td style={td}>{t.date || '—'}</td>
                    <td style={Object.assign({}, td, { fontWeight:700 })}>{t.code || '—'}</td>
                    <td style={Object.assign({}, td, { fontFamily:'inherit' })}>{t.setup || '—'}</td>
                    <td style={td}>{t.entry ? Number(t.entry).toLocaleString('id-ID') : '—'}</td>
                    <td style={td}>{t.exit ? Number(t.exit).toLocaleString('id-ID') : <span style={{color:'#f59e0b'}}>open</span>}</td>
                    <td style={td}>{t.lot || '—'}</td>
                    <td style={Object.assign({}, td, { color:pnlColor, fontWeight:700 })}>
                      {pnl === null ? '—' : (pnl>=0?'+':'−') + 'Rp ' + Math.abs(Math.round(pnl)).toLocaleString('id-ID')}
                    </td>
                    <td style={Object.assign({}, td, { color:pnlColor })}>
                      {r === null ? '—' : (r>=0?'+':'') + r.toFixed(2) + 'R'}
                    </td>
                    <td style={Object.assign({}, td, { fontFamily:'inherit', color:'#94a3b8', maxWidth:'200px', whiteSpace:'normal' })}>{t.notes || ''}</td>
                    <td style={td}>
                      <button onClick={function(){ dispatch({ type:'DELETE_TRADE', payload:t.id }); }}
                        title="Hapus"
                        style={{ padding:'2px 8px', fontSize:'11px', border:'1px solid #7f1d1d',
                                 borderRadius:'3px', backgroundColor:'#450a0a', color:'#f87171', cursor:'pointer' }}>✕</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function MainPanel(props) {
  var active   = props.active;
  var state    = props.state;
  var dispatch = props.dispatch;

  if (active === 'market')    return <MarketConditionModule market={state.market} dispatch={dispatch} />;
  if (active === 'saham')     return <StockCandidateModule candidates={state.candidates} settings={state.settings} dispatch={dispatch} />;
  if (active === 'valuasi')   return <ValuationBandModule valuation={state.valuation} candidates={state.candidates} dispatch={dispatch} />;
  if (active === 'consensus') return <ConsensusModule consensus={state.consensus} candidates={state.candidates} dispatch={dispatch} />;
  if (active === 'brief')     return <BriefGeneratorModule state={state} />;
  if (active === 'jurnal')    return <JournalModule journal={state.journal} candidates={state.candidates} dispatch={dispatch} />;
  return null;
}

// ─────────────────────────────────────────────────────────
// APP ROOT
// ─────────────────────────────────────────────────────────

function App() {
  var activeState = useState('market');
  var active      = activeState[0];
  var setActive   = activeState[1];

  var importState = useState(false);
  var showImport  = importState[0];
  var setShowImport = importState[1];

  var reducerResult = useReducer(reducer, undefined, function() {
    var saved = readLocalJson(SESSION_KEY, null);
    if (saved && saved.meta && saved.meta.date === todayISO()) {
      // Merge default agar field baru (settings, journal) ada di sesi lama
      return Object.assign({}, initialState, saved, {
        settings: Object.assign({}, initialState.settings, saved.settings || {}),
        journal:  Array.isArray(saved.journal) ? saved.journal : [],
        ui: Object.assign({}, saved.ui || {}, { error: null }),
      });
    }
    return initialState;
  });
  var state    = reducerResult[0];
  var dispatch = reducerResult[1];
  var history  = loadSessionHistory();

  // Auto-save, debounced 1 s
  useEffect(function() {
    var t = setTimeout(function() {
      safeSetStorage(SESSION_KEY, JSON.stringify(state));
    }, 1000);
    return function() { clearTimeout(t); };
  }, [state]);

  // Auto-fetch data terbaru (di-generate GitHub Actions tiap pagi) saat halaman dibuka.
  // Hanya dijalankan bila BELUM ada sesi hari ini, supaya tidak menimpa edit manual.
  // Gagal fetch (mis. buka via file://) diabaikan diam-diam — fitur ini opsional.
  useEffect(function() {
    var saved = readLocalJson(SESSION_KEY, null);
    if (saved && saved.meta && saved.meta.date === todayISO()) return;

    fetch('market_data.json', { cache: 'no-store' })
      .then(function(r) { return r.ok ? r.json() : null; })
      .then(function(d) { if (d) dispatch({ type: 'IMPORT_MARKET_JSON', payload: d.market || d }); })
      .catch(function() {});

    fetch('stock_data.json', { cache: 'no-store' })
      .then(function(r) { return r.ok ? r.json() : null; })
      .then(function(d) { if (d) dispatch({ type: 'IMPORT_FROM_XLSX', payload: normalizeStockJson(d) }); })
      .catch(function() {});
  }, []);

  // Ctrl+S shortcut → manual save
  useEffect(function() {
    function onKey(e) {
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        dispatch({ type: 'SAVE_SESSION' });
      }
    }
    window.addEventListener('keydown', onKey);
    return function() { window.removeEventListener('keydown', onKey); };
  }, []);

  return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column',
                  backgroundColor:'#0f1117', color:'#e2e8f0',
                  fontFamily:'-apple-system, BlinkMacSystemFont, "Inter", sans-serif' }}>
      <style>{`
        @media (max-width: 1100px) {
          .app-header { align-items: flex-start !important; gap: 10px !important; flex-wrap: wrap !important; }
          .header-actions { justify-content: flex-end !important; flex-wrap: wrap !important; max-width: 640px !important; }
          .app-main { padding: 16px !important; }
          .app-sidebar { width: 136px !important; }
          .candidate-add-row-primary { grid-template-columns: 90px minmax(180px, 1fr) repeat(3, minmax(84px, 1fr)) !important; overflow-x: auto !important; }
          .candidate-add-row-trade { grid-template-columns: repeat(3, minmax(110px, 1fr)) repeat(4, minmax(84px, 1fr)) !important; overflow-x: auto !important; }
          .candidate-params { grid-template-columns: repeat(2, minmax(120px, 1fr)) !important; }
          .band-input-grid { grid-template-columns: repeat(5, minmax(86px, 1fr)) !important; overflow-x: auto !important; }
          .market-top-grid, .market-bottom-grid, .market-overview-grid { grid-template-columns: 1fr !important; }
          .consensus-grid { grid-template-columns: repeat(3, minmax(110px, 1fr)) !important; overflow-x: auto !important; }
        }
        @media (max-width: 760px) {
          .app-body { flex-direction: column !important; overflow: visible !important; }
          .app-sidebar { width: 100% !important; flex-direction: row !important; overflow-x: auto !important; border-right: none !important; border-bottom: 1px solid #2a2d3e !important; }
          .app-sidebar button { min-width: 130px !important; }
          .header-actions { justify-content: flex-start !important; }
          .candidate-add-row-primary, .candidate-add-row-trade, .candidate-params, .band-input-grid, .consensus-grid { grid-template-columns: 1fr !important; overflow-x: visible !important; }
        }
      `}</style>
      <Header state={state} dispatch={dispatch} history={history} onOpenImport={function() { setShowImport(true); }} />

      {state.ui && state.ui.error && (
        <div style={{ margin:'10px 20px 0', padding:'8px 12px', border:'1px solid #92400e',
                      borderRadius:'6px', backgroundColor:'#422006', color:'#fbbf24',
                      display:'flex', alignItems:'center', justifyContent:'space-between', gap:'10px',
                      fontSize:'12px' }}>
          <span>{state.ui.error}</span>
          <button onClick={function() { dispatch({ type:'CLEAR_UI_ERROR' }); }}
            style={{ background:'none', border:'none', color:'#fbbf24', cursor:'pointer', fontSize:'14px' }}>
            Tutup
          </button>
        </div>
      )}

      <div className="app-body" style={{ display:'flex', flex:1, overflow:'hidden' }}>
        <Sidebar active={active} onNavigate={setActive} />
        <main className="app-main" style={{ flex:1, overflowY:'auto', padding:'20px 24px' }}>
          <MainPanel active={active} state={state} dispatch={dispatch} />
        </main>
      </div>

      {showImport && (
        <ImportModal
          onClose={function() { setShowImport(false); }}
          onImport={function(data) {
            dispatch({ type: 'IMPORT_FROM_XLSX', payload: data });
            setShowImport(false);
            setActive('saham');
          }}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// ERROR BOUNDARY
// ─────────────────────────────────────────────────────────

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }
  static getDerivedStateFromError(err) {
    return { hasError: true, message: (err && err.message) || String(err) };
  }
  componentDidCatch(err) {
    reportAppError('Render error', err);
  }
  render() {
    if (!this.state.hasError) return this.props.children;

    var box = {
      maxWidth: '520px', margin: '60px auto', padding: '24px',
      backgroundColor: '#1a1d27', border: '1px solid #7f1d1d', borderRadius: '10px',
      color: '#e2e8f0', fontFamily: '-apple-system, BlinkMacSystemFont, "Inter", sans-serif',
    };
    var btn = {
      padding: '8px 14px', fontSize: '13px', borderRadius: '6px', cursor: 'pointer',
      border: '1px solid #334155', backgroundColor: '#1e293b', color: '#e2e8f0',
    };
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#0f1117' }}>
        <div style={box}>
          <p style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#f87171' }}>
            ⚠️ Terjadi error pada aplikasi
          </p>
          <p style={{ margin: '8px 0 0', fontSize: '13px', color: '#94a3b8' }}>
            Tampilan terhenti karena error tak terduga. Data sesi Anda kemungkinan
            masih tersimpan. Coba muat ulang; jika error berulang, reset sesi.
          </p>
          <pre style={{ margin: '12px 0', padding: '10px', backgroundColor: '#0f1117',
                        border: '1px solid #2a2d3e', borderRadius: '6px', fontSize: '11px',
                        color: '#fca5a5', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {this.state.message}
          </pre>
          <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
            <button style={btn}
              onClick={function() { if (typeof window !== 'undefined') window.location.reload(); }}>
              🔄 Muat ulang
            </button>
            <button style={Object.assign({}, btn, { borderColor: '#7f1d1d', color: '#fca5a5' })}
              onClick={function() {
                safeRemoveStorage(SESSION_KEY);
                if (typeof window !== 'undefined') window.location.reload();
              }}>
              🗑️ Reset sesi & muat ulang
            </button>
          </div>
        </div>
      </div>
    );
  }
}

// ─────────────────────────────────────────────────────────
// MOUNT
// ─────────────────────────────────────────────────────────

ReactDOM.createRoot(document.getElementById('root')).render(
  <ErrorBoundary><App /></ErrorBoundary>
);
