const fs = require('fs');
const vm = require('vm');

const source = fs.readFileSync('scalping-brief.jsx', 'utf8');
const prefix = source.slice(0, source.indexOf('// ─────────────────────────────────────────────────────────\n// PRIMITIVE UI HELPERS'));

const storage = new Map();
const sandbox = {
  console,
  Math,
  Date,
  setTimeout,
  clearTimeout,
  localStorage: {
    getItem: (key) => storage.has(key) ? storage.get(key) : null,
    setItem: (key, value) => storage.set(key, String(value)),
    removeItem: (key) => storage.delete(key),
  },
  React: { useState() {}, useReducer() {}, useEffect() {} },
};

vm.createContext(sandbox);
vm.runInContext(prefix, sandbox);
const initialState = vm.runInContext('initialState', sandbox);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function test(name, fn) {
  try {
    storage.clear();
    fn();
    console.log('PASS ' + name);
  } catch (err) {
    console.error('FAIL ' + name);
    console.error('  ' + err.message);
    process.exitCode = 1;
  }
}

function candidate(id, status) {
  return {
    id: id,
    code: id.toUpperCase(),
    name: id,
    price: '1000',
    volumeMultiplier: '2',
    change: '1',
    setup: 'Breakout',
    trend: 'uptrend',
    entry: '1000',
    sl: '950',
    tp1: '1100',
    tp2: '',
    status: status || 'Watch',
    rr: null,
    score: 0,
  };
}

test('XLSX import parser exposes per-stock valuation and consensus maps', () => {
  assert(source.includes('fundamentals_all') && source.includes('consensus_all'), 'expected parser/reducer support for per-stock import maps');
  const parseStart = source.indexOf('function parseXLSXToAppData');
  const parseEnd = source.indexOf('// Parse stock_data.json', parseStart);
  const parseBody = source.slice(parseStart, parseEnd);
  assert(parseBody.includes('fundamentals_all'), 'parseXLSXToAppData must return fundamentals_all');
  assert(parseBody.includes('consensus_all'), 'parseXLSXToAppData must return consensus_all');
});

test('cannot add sixth active candidate', () => {
  const state = Object.assign({}, initialState, {
    candidates: [1, 2, 3, 4, 5].map((n) => candidate('c' + n, 'Watch')),
  });
  const next = sandbox.reducer(state, { type: 'ADD_CANDIDATE', payload: candidate('c6', 'Watch') });
  assert(next.candidates.length === 5, 'expected active add to be rejected at 5 candidates');
  assert(next.ui && next.ui.error, 'expected user-visible error after rejected add');
});

test('cannot change Skip candidate to active when active cap is full', () => {
  const skipped = candidate('skip1', 'Skip');
  const state = Object.assign({}, initialState, {
    candidates: [1, 2, 3, 4, 5].map((n) => candidate('c' + n, 'Watch')).concat([skipped]),
  });
  const next = sandbox.reducer(state, {
    type: 'UPDATE_CANDIDATE',
    payload: { id: skipped.id, fields: { status: 'Priority' } },
  });
  const updated = next.candidates.filter((c) => c.id === skipped.id)[0];
  assert(updated.status === 'Skip', 'expected status change to active to be rejected');
  assert(next.ui && next.ui.error, 'expected user-visible error after rejected status change');
});

test('save session records latest seven history entries', () => {
  let state = initialState;
  for (let i = 0; i < 9; i++) {
    state = Object.assign({}, state, {
      meta: Object.assign({}, state.meta, { date: '2026-06-' + String(10 + i).padStart(2, '0') }),
    });
    state = sandbox.reducer(state, { type: 'SAVE_SESSION' });
  }
  const history = JSON.parse(storage.get('scalping-brief-history') || '[]');
  assert(history.length === 7, 'expected exactly seven history entries');
  assert(history[0].state.meta.date === '2026-06-18', 'expected newest session first');
});

test('ARA and ARB limits share one configurable app assumption', () => {
  assert(sandbox.IDX_AUTO_REJECTION_RULE, 'expected shared IDX_AUTO_REJECTION_RULE');
  assert(sandbox.getARALimit(100) === 35, 'expected low-price ARA limit from shared rule');
  assert(sandbox.getARBLimit(100) === -7, 'expected ARB limit from shared rule');
  const levels = sandbox.calcAraArb(100);
  assert(levels.ara === 135 && levels.arb === 93, 'expected calcAraArb to use shared limits');
});
