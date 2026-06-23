const fs = require('fs');

const source = fs.readFileSync('build_scalping_excel.py', 'utf8');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function test(name, fn) {
  try {
    fn();
    console.log('PASS ' + name);
  } catch (err) {
    console.error('FAIL ' + name);
    console.error('  ' + err.message);
    process.exitCode = 1;
  }
}

test('builder has reusable stock-code parser for terminal input', () => {
  assert(/def parse_stock_codes\(raw\):/.test(source), 'expected parse_stock_codes(raw)');
  assert(/replace\(",", " "\)/.test(source), 'expected comma separated input support');
  assert(/dict\.fromkeys/.test(source), 'expected duplicate removal preserving order');
});

test('builder prompts interactively when --stocks is omitted', () => {
  assert(/default=None/.test(source), 'expected --stocks default None so omitted arg can trigger prompt');
  assert(/input\(/.test(source), 'expected terminal input prompt');
  assert(/resolve_stocks\(args\.stocks\)/.test(source), 'expected STOCKS resolved through helper');
});

test('builder keeps non-interactive --stocks path', () => {
  assert(/--stocks/.test(source), 'expected --stocks CLI option to remain');
  assert(/nargs="\*"/.test(source), 'expected --stocks to accept optional multiple codes');
});

test('builder fills GF_Import from idx_scraper OHLCV logic', () => {
  assert(/from idx_scraper import fetch_ohlcv/.test(source), 'expected builder to reuse idx_scraper.fetch_ohlcv');
  assert(/def build_gf_import_rows\(kode, df\):/.test(source), 'expected helper to convert OHLCV dataframe into GF_Import rows');
  assert(/fetch_ohlcv\(kode, 10\)/.test(source), 'expected exactly 10 recent OHLCV rows per input stock');
  assert(!/sample_data = \{/.test(source), 'expected hardcoded sample_data block to be removed from GF_Import population');
});
