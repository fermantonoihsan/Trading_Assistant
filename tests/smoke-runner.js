const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const root = process.cwd();
const port = 8765;
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.jsx': 'text/javascript; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

const verifyHtml = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Scalping Smoke Verify</title>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/react/18.2.0/umd/react.production.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.2.0/umd/react-dom.production.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/babel-standalone/7.23.2/babel.min.js"></script>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
</head>
<body>
  <div id="root"></div>
  <pre id="verification-result">RUNNING</pre>
  <script type="text/babel" src="scalping-brief.jsx"></script>
  <script type="text/babel">
    (async function() {
      var lines = [];
      function ok(condition, name) {
        if (!condition) throw new Error(name);
        lines.push('PASS ' + name);
      }
      try {
        await new Promise(function(resolve) { setTimeout(resolve, 4500); });
        ok(document.body.innerText.indexOf('Scalping Brief Generator') >= 0, 'app renders');
        ok(typeof parseJSONToAppData === 'function', 'JSON parser available');
        ok(typeof parseXLSXToAppData === 'function', 'XLSX parser available');
        ok(typeof html2pdf !== 'undefined', 'html2pdf available');
        var stockResp = await fetch('stock_data.json');
        var stockBlob = await stockResp.blob();
        var stockData = await parseJSONToAppData(new File([stockBlob], 'stock_data.json', { type: 'application/json' }));
        ok(stockData.candidates && stockData.candidates.length > 0, 'stock_data.json imports candidates');
        ok(stockData.fundamentals_all && Object.keys(stockData.fundamentals_all).length > 0, 'stock_data.json imports valuation map');
        ok(stockData.consensus_all && Object.keys(stockData.consensus_all).length > 0, 'stock_data.json imports consensus map');
        var xlsxResp = await fetch('Scalping_Analysis.xlsx');
        var xlsxBlob = await xlsxResp.blob();
        var xlsxData = await parseXLSXToAppData(new File([xlsxBlob], 'Scalping_Analysis.xlsx'));
        ok(xlsxData.candidates && xlsxData.candidates.length > 0, 'XLSX imports candidates');
        ok(xlsxData.fundamentals_all && Object.keys(xlsxData.fundamentals_all).length > 0, 'XLSX imports valuation map');
        ok(xlsxData.consensus_all && Object.keys(xlsxData.consensus_all).length > 0, 'XLSX imports consensus map');
        var marketResp = await fetch('market_data.json');
        var marketData = await marketResp.json();
        ok(marketData.market && marketData.market.ihsg && marketData.market.regional, 'market_data.json shape valid');
        var levels = calcAraArb(100);
        ok(levels.ara === 135 && levels.arb === 93, 'ARA/ARB uses shared assumption');
        Array.from(document.querySelectorAll('button')).filter(function(btn) {
          return btn.innerText.indexOf('Brief') >= 0;
        })[0].click();
        await new Promise(function(resolve) { setTimeout(resolve, 300); });
        var copyBtn = Array.from(document.querySelectorAll('button')).filter(function(btn) {
          return btn.innerText.indexOf('Copy Teks') >= 0;
        })[0];
        ok(copyBtn, 'brief copy button visible');
        copyBtn.click();
        await new Promise(function(resolve) { setTimeout(resolve, 300); });
        ok(document.body.innerText.indexOf('Tersalin') >= 0, 'brief copy click updates UI');
        document.getElementById('verification-result').textContent = lines.join('\\n');
      } catch (err) {
        lines.push('FAIL ' + (err && err.message ? err.message : String(err)));
        document.getElementById('verification-result').textContent = lines.join('\\n');
      }
    })();
  </script>
</body>
</html>`;

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath === '/__verify_smoke.html') {
    res.writeHead(200, { 'Content-Type': mime['.html'] });
    res.end(verifyHtml);
    return;
  }
  const safePath = path.normalize(urlPath).replace(/^(\.\.[/\\])+/, '');
  const filePath = path.join(root, safePath === '/' ? 'index.html' : safePath);
  if (!filePath.startsWith(root)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': mime[path.extname(filePath)] || 'application/octet-stream' });
    res.end(data);
  });
});

server.listen(port, '127.0.0.1', () => {
  const edge = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const profile = path.join(process.env.TEMP || root, 'trading-edge-smoke-node');
  fs.rmSync(profile, { recursive: true, force: true });
  const child = spawn(edge, [
    '--headless=new',
    '--disable-gpu',
    '--dump-dom',
    '--virtual-time-budget=30000',
    '--user-data-dir=' + profile,
    'http://127.0.0.1:' + port + '/__verify_smoke.html',
  ], { windowsHide: true });

  let out = '';
  let err = '';
  child.stdout.on('data', (chunk) => { out += chunk.toString(); });
  child.stderr.on('data', (chunk) => { err += chunk.toString(); });
  child.on('close', (code) => {
    server.close();
    const pre = out.match(/<pre id="verification-result">([\s\S]*?)<\/pre>/);
    const text = pre ? pre[1] : out.replace(/<[^>]+>/g, '\n');
    const matches = text.split(/\r?\n/).map((s) => s.trim()).filter((s) => /^PASS |^FAIL |Scalping Brief Generator/.test(s));
    console.log(matches.join('\n'));
    if (err.trim()) console.error(err.trim());
    process.exit(code || (matches.some((s) => s.startsWith('FAIL ')) ? 1 : 0));
  });
});
