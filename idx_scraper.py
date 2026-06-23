#!/usr/bin/env python3
"""
IDX Stock Scraper — Scalping Brief Generator
=============================================
Scrape data saham IDX sesuai kebutuhan 3 modul app:
  - Kandidat Saham  : harga, %change, volume, vol-multiplier, forecast
  - PE/PBV Band     : EPS, BVPS, PE, PBV saat ini
  - Consensus       : rating analis, target price, estimasi EPS/revenue

Output:
  - Tabel terminal per modul (berwarna)
  - stock_data.json  →  import ke app via tombol "📥 Import XLSX/JSON"
  - (opsional) Excel historis 10 hari  →  --ohlcv

Install:  pip install yfinance pandas openpyxl
Jalankan: py idx_scraper.py                         ← input manual
          py idx_scraper.py BBRI BBCA ANTM           ← langsung (+ keystats & peer table)
          py idx_scraper.py BBRI BBCA --ohlcv        ← tabel 10 hari
          py idx_scraper.py BBRI BBCA --no-export    ← tanpa simpan JSON
          py idx_scraper.py BBRI --seasonality       ← rata-rata return per bulan
          py idx_scraper.py --movers                 ← top gainers/losers + dekat ARA/ARB
          py idx_scraper.py BBRI BBCA --movers       ← scan universe kustom
"""

import sys, io, csv, json, time, warnings
from datetime import datetime, timedelta
from typing import Optional

import pandas as pd
import yfinance as yf

warnings.filterwarnings("ignore")

# ── Fix encoding Windows terminal ─────────────────────────────────────────────
if sys.stdout.encoding and sys.stdout.encoding.lower() not in ("utf-8", "utf-8-sig"):
    try:
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
        sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")
    except Exception:
        pass

GREEN  = "\033[32m"; RED    = "\033[31m"; YELLOW = "\033[33m"
CYAN   = "\033[36m"; BOLD   = "\033[1m";  DIM    = "\033[2m"; RESET  = "\033[0m"

TRADING_DAYS = 10
FETCH_WINDOW = 30

# App-level assumption for decision-support labels, not a latest exchange-rule claim.
IDX_AUTO_REJECTION_RULE = {
    "ara_bands": [
        {"max_price": 200, "pct": 35},
        {"max_price": 5000, "pct": 25},
        {"max_price": float("inf"), "pct": 20},
    ],
    "arb_pct": 7,
}

# Universe likuid (≈LQ45) untuk pemindai top movers --movers
IDX_LIQUID = [
    "BBRI","BBCA","BMRI","BBNI","BRIS","ARTO","TLKM","ASII","UNTR","ADRO",
    "PGAS","PTBA","ITMG","ANTM","INCO","MDKA","TINS","BRPT","TPIA","BUMI",
    "GOTO","EMTK","BUKA","WIFI","UNVR","ICBP","INDF","MYOR","KLBF","SIDO",
    "AMRT","CPIN","JPFA","ASII","SMGR","INTP","CTRA","PWON","BSDE","TOWR",
    "EXCL","ISAT","MAPI","ACES","MNCN",
]


# ═══════════════════════════════════════════════════════════════
# 1. OHLCV historis
# ═══════════════════════════════════════════════════════════════

def fetch_ohlcv(code: str, n: int = TRADING_DAYS) -> Optional[pd.DataFrame]:
    try:
        raw = yf.download(
            f"{code}.JK",
            start=datetime.now() - timedelta(days=FETCH_WINDOW),
            end=datetime.now() + timedelta(days=1),
            progress=False, auto_adjust=True,
        )
    except Exception:
        return None
    if raw.empty:
        return None
    if isinstance(raw.columns, pd.MultiIndex):
        raw.columns = raw.columns.droplevel(1)
    df = raw.tail(n)[["Open","High","Low","Close","Volume"]].copy()
    df["Change (%)"] = df["Close"].pct_change().mul(100).round(2)
    df["Change (Rp)"] = df["Close"].diff().round(0)
    df.index = pd.to_datetime(df.index).strftime("%Y-%m-%d")
    df.index.name = "Date"
    for c in ["Open","High","Low","Close"]:
        df[c] = df[c].round(0).astype("Int64")
    df["Volume"] = df["Volume"].astype("Int64")
    return df


# ═══════════════════════════════════════════════════════════════
# 2. Data lengkap satu saham (fundamental + analis)
# ═══════════════════════════════════════════════════════════════

def fetch_stock(code: str) -> dict:
    jk = f"{code}.JK"
    s = {
        "code": code, "name": code,
        "price": None, "prevClose": None, "changePct": None,
        "volume": None, "avgVolume": None, "volMultiplier": None,
        "eps": None, "bvps": None, "pe": None, "pbv": None,
        "peBand": None, "pbvBand": None,
        # Keystats fundamental (Tier 2)
        "sector": None, "marketCap": None, "roe": None, "der": None,
        "netMargin": None, "divYield": None,
        "analystBuy": None, "analystHold": None, "analystSell": None,
        "targetLow": None, "targetMean": None, "targetHigh": None,
        "epsCurrentYear": None, "epsNextYear": None, "epsGrowth": None,
        "revCurrentYear": None, "revNextYear": None, "revGrowth": None,
        "nextEarnings": None,
        "ohlcv": None,
    }

    t = yf.Ticker(jk)

    # OHLCV history
    ohlcv = fetch_ohlcv(code)
    s["ohlcv"] = ohlcv

    # Info dasar
    try:
        info = t.info
        s["name"]      = info.get("longName") or info.get("shortName") or code
        s["price"]     = info.get("currentPrice") or info.get("regularMarketPrice")
        s["prevClose"] = info.get("previousClose") or info.get("regularMarketPreviousClose")
        s["volume"]    = info.get("volume") or info.get("regularMarketVolume")
        s["avgVolume"] = info.get("averageVolume") or info.get("averageVolume10days")
        s["eps"]       = info.get("trailingEps")
        s["bvps"]      = info.get("bookValue")
        s["pe"]        = info.get("trailingPE")
        s["pbv"]       = info.get("priceToBook")
        s["targetLow"] = info.get("targetLowPrice")
        s["targetMean"]= info.get("targetMeanPrice")
        s["targetHigh"]= info.get("targetHighPrice")
        # Keystats (Tier 2) — yfinance memberi rasio sebagai fraksi (kecuali DER ~ persen)
        s["sector"]    = info.get("sector")
        s["marketCap"] = info.get("marketCap")
        s["roe"]       = info.get("returnOnEquity")    # 0.18 = 18%
        s["der"]       = info.get("debtToEquity")      # 120.5 → 1.21x
        s["netMargin"] = info.get("profitMargins")     # 0.22 = 22%
        s["divYield"]  = info.get("dividendYield") or info.get("trailingAnnualDividendYield")
    except Exception:
        pass

    # Fallback harga dari OHLCV
    if (not s["price"] or not s["prevClose"]) and ohlcv is not None and len(ohlcv) >= 2:
        closes = ohlcv["Close"].dropna()
        if len(closes) >= 2:
            if not s["prevClose"]: s["prevClose"] = float(closes.iloc[-2])
            if not s["price"]:     s["price"]     = float(closes.iloc[-1])

    # % change
    if s["price"] and s["prevClose"] and s["prevClose"] != 0:
        s["changePct"] = round((s["price"] - s["prevClose"]) / s["prevClose"] * 100, 2)

    # Volume multiplier
    if s["volume"] and s["avgVolume"] and s["avgVolume"] > 0:
        s["volMultiplier"] = round(s["volume"] / s["avgVolume"], 2)
    elif ohlcv is not None and len(ohlcv) >= 2:
        vols = ohlcv["Volume"].dropna()
        if len(vols) >= 2:
            today_vol = float(vols.iloc[-1])
            avg_vol   = float(vols.iloc[:-1].mean())
            if avg_vol > 0:
                s["volMultiplier"] = round(today_vol / avg_vol, 2)

    # Rekomendasi analis
    try:
        recs = t.recommendations
        if recs is not None and not recs.empty:
            latest = recs.iloc[-1]
            def _i(k): return int(latest.get(k) or 0)
            s["analystBuy"]  = _i("strongBuy") + _i("buy")
            s["analystHold"] = _i("hold")
            s["analystSell"] = _i("strongSell") + _i("sell")
    except Exception:
        pass

    # Estimasi EPS tahunan
    try:
        ee = t.earnings_estimate
        if ee is not None and not ee.empty and "avg" in ee.columns:
            def _v(row):
                if row in ee.index:
                    v = ee.loc[row, "avg"]
                    return float(v) if pd.notna(v) else None
                return None
            s["epsCurrentYear"] = _v("0y")
            s["epsNextYear"]    = _v("+1y")
    except Exception:
        pass

    if s["epsCurrentYear"] and s["epsNextYear"] and s["epsCurrentYear"] != 0:
        s["epsGrowth"] = round((s["epsNextYear"] - s["epsCurrentYear"]) / abs(s["epsCurrentYear"]) * 100, 1)

    # Estimasi revenue tahunan (dalam Triliun IDR)
    try:
        re = t.revenue_estimate
        if re is not None and not re.empty and "avg" in re.columns:
            def _rv(row):
                if row in re.index:
                    v = re.loc[row, "avg"]
                    return round(float(v) / 1e12, 2) if pd.notna(v) else None
                return None
            s["revCurrentYear"] = _rv("0y")
            s["revNextYear"]    = _rv("+1y")
    except Exception:
        pass

    if s["revCurrentYear"] and s["revNextYear"] and s["revCurrentYear"] != 0:
        s["revGrowth"] = round((s["revNextYear"] - s["revCurrentYear"]) / abs(s["revCurrentYear"]) * 100, 1)

    # Next earnings date
    try:
        cal = t.calendar
        if cal and "Earnings Date" in cal:
            dates = cal["Earnings Date"]
            if hasattr(dates, "__iter__") and not isinstance(dates, str):
                d = next(iter(dates), None)
                if d:
                    s["nextEarnings"] = str(d)[:10]
    except Exception:
        pass

    # PE/PBV Band historis (dari harga 1 tahun ÷ EPS/BVPS saat ini)
    s["peBand"]  = compute_band(code, s["eps"],  decimals=1)
    s["pbvBand"] = compute_band(code, s["bvps"], decimals=2)

    return s


def compute_band(code: str, divisor, decimals: int = 1) -> Optional[dict]:
    """
    Hitung band valuasi (min / -1SD / median / +1SD / max) dari rasio
    harga historis 1 tahun ÷ divisor (EPS untuk PE, BVPS untuk PBV).

    Asumsi: EPS/BVPS dianggap konstan (TTM saat ini) — pendekatan praktis
    karena historical fundamentals tidak tersedia gratis. Cukup akurat
    untuk konteks band relatif scalping.
    """
    if not divisor or divisor <= 0:
        return None
    try:
        hist = yf.download(
            f"{code}.JK",
            start=datetime.now() - timedelta(days=400),
            end=datetime.now() + timedelta(days=1),
            progress=False, auto_adjust=True,
        )
        if hist.empty:
            return None
        if isinstance(hist.columns, pd.MultiIndex):
            hist.columns = hist.columns.droplevel(1)
        closes = hist["Close"].dropna()
        if len(closes) < 30:
            return None

        ratio = closes / divisor
        mean  = float(ratio.mean())
        sd    = float(ratio.std())

        def r(x): return round(float(x), decimals)
        return {
            "min":       r(ratio.min()),
            "sd_minus1": r(mean - sd),
            "median":    r(ratio.median()),
            "sd_plus1":  r(mean + sd),
            "max":       r(ratio.max()),
        }
    except Exception:
        return None


# ═══════════════════════════════════════════════════════════════
# 3. Kalkulasi (mirror logika di scalping-brief.jsx)
# ═══════════════════════════════════════════════════════════════

def _safe(v, digits=0):
    """Format angka aman, return '' jika None."""
    if v is None: return ""
    return str(round(v, digits) if digits else int(round(v, 0)))

def consensus_score(buy, hold, sell) -> float:
    total = (buy or 0) + (hold or 0) + (sell or 0)
    if total == 0: return 50.0
    return round(((buy or 0) * 100 + (hold or 0) * 50) / total, 1)

def auto_rejection_limits(price):
    try:
        p = float(price or 0)
    except (TypeError, ValueError):
        p = 0
    ara_pct = 25
    if p > 0:
        for band in IDX_AUTO_REJECTION_RULE["ara_bands"]:
            if p <= band["max_price"]:
                ara_pct = band["pct"]
                break
    return ara_pct, -IDX_AUTO_REJECTION_RULE["arb_pct"]

def forecast_signal(change_pct, vol_mult, cs_score, price=None) -> Optional[dict]:
    if change_pct is None: return None
    vm = float(vol_mult  or 0)
    cs = float(cs_score  or 50)
    ara_limit, arb_limit = auto_rejection_limits(price)

    if change_pct >= ara_limit * 0.8 or (ara_limit - change_pct) <= 3:
        return {"label":"ARA Potential","color":"#a855f7","bg":"#2e1065","icon":"🚀"}
    if change_pct <= arb_limit * 0.8 or (change_pct - arb_limit) <= 1.5:
        return {"label":"ARB Risk","color":"#ef4444","bg":"#450a0a","icon":"🔻"}

    bull = 0
    if change_pct > 2:     bull += 35
    elif change_pct > 0.5: bull += 20
    if vm > 2:             bull += 30
    elif vm > 1.5:         bull += 15
    if cs > 70:            bull += 20
    if bull >= 50:
        return {"label":"Bullish","color":"#22c55e","bg":"#052e16","icon":"📈"}

    bear = 0
    if change_pct < -2:     bear += 35
    elif change_pct < -0.5: bear += 20
    if vm > 1.5 and change_pct < 0: bear += 25
    if bear >= 40:
        return {"label":"Bearish","color":"#ef4444","bg":"#450a0a","icon":"📉"}

    return {"label":"Sideways","color":"#94a3b8","bg":"#0f172a","icon":"➡️"}

def round_idx_price(price):
    """IDX price fraction rounding."""
    if price < 200:    return round(price)
    elif price < 500:  return round(price / 5)  * 5
    elif price < 2000: return round(price / 10) * 10
    elif price < 5000: return round(price / 25) * 25
    else:              return round(price / 50) * 50

def ara_arb(prev_close):
    if not prev_close: return None, None
    ara_limit, arb_limit = auto_rejection_limits(prev_close)
    return (
        round_idx_price(prev_close * (1 + ara_limit / 100)),
        round_idx_price(prev_close * (1 + arb_limit / 100)),
    )


# ═══════════════════════════════════════════════════════════════
# 4. Terminal display per modul
# ═══════════════════════════════════════════════════════════════

def _chg(v):
    if v is None: return DIM + "N/A" + RESET
    c = GREEN if v > 0 else (RED if v < 0 else "")
    return f"{c}{'+' if v > 0 else ''}{v:.2f}%{RESET}"

def _rp(v):
    if v is None: return "N/A"
    return f"Rp {int(v):,}"

def _pct(frac, digits=1):
    """Fraksi (0.18) → '18.0%'. Sudah-persen (>1.5) dianggap apa adanya."""
    if frac is None: return DIM + "N/A" + RESET
    val = frac * 100 if abs(frac) <= 1.5 else frac
    return f"{val:.{digits}f}%"

def _mcap(v):
    if v is None: return DIM + "N/A" + RESET
    if v >= 1e12: return f"Rp {v/1e12:.1f} T"
    if v >= 1e9:  return f"Rp {v/1e9:.1f} M"
    return f"Rp {v:,.0f}"

def _der(v):
    if v is None: return DIM + "N/A" + RESET
    return f"{v/100:.2f}x" if v > 5 else f"{v:.2f}x"   # yfinance kadang persen (120.5)

def print_stock(s: dict):
    code = s["code"]
    cs   = consensus_score(s["analystBuy"], s["analystHold"], s["analystSell"])
    fc   = forecast_signal(s["changePct"], s["volMultiplier"], cs, s["price"])
    ara, arb = ara_arb(s["prevClose"])

    print(f"\n{'═' * 68}")
    print(f"  {BOLD}{code}{RESET}  —  {DIM}{s['name']}{RESET}")
    print(f"{'─' * 68}")

    # ── Kandidat Saham ──────────────────────────────────────────
    print(f"  {BOLD}[KANDIDAT SAHAM]{RESET}")
    vm_str = (f"{s['volMultiplier']:.1f}x" if s["volMultiplier"] else "N/A")
    fc_str = f"{fc['icon']} {fc['label']}" if fc else "N/A"
    print(f"    Harga      : {_rp(s['price']):<14} Change : {_chg(s['changePct'])}")
    print(f"    Volume     : {(str(int(s['volume'] / 1e6)) + ' Jt lot') if s['volume'] else 'N/A':<14} Vol Mult: {vm_str}")
    print(f"    Forecast   : {fc_str:<30} ARA: {_rp(ara)}  ARB: {_rp(arb)}")

    # ── PE/PBV Band ──────────────────────────────────────────────
    print(f"\n  {BOLD}[PE/PBV BAND]{RESET}")
    eps_str  = (f"Rp {s['eps']:.2f}"  if s["eps"]  else DIM+"N/A"+RESET)
    bvps_str = (f"Rp {s['bvps']:.2f}" if s["bvps"] else DIM+"N/A"+RESET)
    pe_str   = (f"{s['pe']:.1f}x"     if s["pe"]   else DIM+"N/A"+RESET)
    pbv_str  = (f"{s['pbv']:.2f}x"    if s["pbv"]  else DIM+"N/A"+RESET)
    print(f"    EPS        : {eps_str:<20} BVPS : {bvps_str}")
    print(f"    PE saat ini: {pe_str:<20} PBV  : {pbv_str}")
    if s["peBand"]:
        b = s["peBand"]
        print(f"    PE Band    : min {b['min']} · -1SD {b['sd_minus1']} · "
              f"med {b['median']} · +1SD {b['sd_plus1']} · max {b['max']}")
    if s["pbvBand"]:
        b = s["pbvBand"]
        print(f"    PBV Band   : min {b['min']} · -1SD {b['sd_minus1']} · "
              f"med {b['median']} · +1SD {b['sd_plus1']} · max {b['max']}")
    if not s["peBand"] and not s["pbvBand"]:
        print(f"    {DIM}* Band tidak bisa dihitung (data EPS/BVPS/harga kurang){RESET}")

    # ── Keystats fundamental ─────────────────────────────────────
    print(f"\n  {BOLD}[KEYSTATS]{RESET}")
    print(f"    Sektor     : {s['sector'] or (DIM+'N/A'+RESET):<22} Market Cap: {_mcap(s['marketCap'])}")
    print(f"    ROE        : {_pct(s['roe']):<22} Net Margin: {_pct(s['netMargin'])}")
    print(f"    DER        : {_der(s['der']):<22} Div Yield : {_pct(s['divYield'], 2)}")

    # ── Consensus ────────────────────────────────────────────────
    print(f"\n  {BOLD}[CONSENSUS]{RESET}")
    buy  = s["analystBuy"]  or 0
    hold = s["analystHold"] or 0
    sell = s["analystSell"] or 0
    total = buy + hold + sell
    if total:
        rating_str = (f"{GREEN}{buy} Buy{RESET}  "
                      f"{YELLOW}{hold} Hold{RESET}  "
                      f"{RED}{sell} Sell{RESET}  "
                      f"({DIM}{total} analis{RESET})")
    else:
        rating_str = DIM + "N/A" + RESET

    print(f"    Analis     : {rating_str}")

    if s["targetLow"] or s["targetMean"] or s["targetHigh"]:
        up_mean = ((s["targetMean"] - s["price"]) / s["price"] * 100
                   if s["targetMean"] and s["price"] else None)
        up_high = ((s["targetHigh"] - s["price"]) / s["price"] * 100
                   if s["targetHigh"] and s["price"] else None)
        print(f"    Target     : Low {_rp(s['targetLow'])}   "
              f"Mean {_rp(s['targetMean'])} ({GREEN + '+'+f'{up_mean:.1f}%' + RESET if up_mean else ''})   "
              f"High {_rp(s['targetHigh'])} ({GREEN + '+'+f'{up_high:.1f}%' + RESET if up_high else ''})")
    else:
        print(f"    Target     : {DIM}N/A{RESET}")

    if s["epsCurrentYear"] or s["epsNextYear"]:
        g = (f"{GREEN}+{s['epsGrowth']:.1f}%{RESET}" if s["epsGrowth"] and s["epsGrowth"] > 0
             else (f"{RED}{s['epsGrowth']:.1f}%{RESET}" if s["epsGrowth"] else ""))
        print(f"    EPS Est    : FY0 Rp {s['epsCurrentYear']:.2f}   "
              f"FY+1 Rp {s['epsNextYear']:.2f}   Growth: {g}")
    else:
        print(f"    EPS Est    : {DIM}N/A{RESET}")

    if s["revCurrentYear"]:
        print(f"    Revenue Est: FY0 Rp {s['revCurrentYear']:.2f}T   "
              f"FY+1 Rp {(s['revNextYear'] or 0):.2f}T  {DIM}(Triliun IDR){RESET}")

    if s["nextEarnings"]:
        print(f"    Next Earn  : {s['nextEarnings']}")

    print()


def print_ohlcv_table(code: str, df: pd.DataFrame):
    cols   = list(df.columns)
    widths = {"Open":8,"High":8,"Low":8,"Close":8,"Volume":16,"Change (%)":10,"Change (Rp)":10}

    def fmt(c, v):
        if pd.isna(v): return "–"
        if c in ("Open","High","Low","Close"): return f"{int(v):,}"
        if c == "Volume": return f"{int(v):,}"
        if c == "Change (%)":
            vf = float(v); return (f"+{vf:.2f}%" if vf > 0 else f"{vf:.2f}%")
        if c == "Change (Rp)":
            vi = int(v);   return (f"+{vi:,}" if vi > 0 else f"{vi:,}")
        return str(v)

    def clr(c, v):
        if pd.isna(v): return ""
        if c in ("Change (%)","Change (Rp)"):
            try:
                vf = float(v)
                return GREEN if vf > 0 else (RED if vf < 0 else "")
            except: pass
        return ""

    row_w = 12 + sum(widths.get(c, 12) + 2 for c in cols)
    print(f"\n{'─' * row_w}")
    print(f"  {BOLD}{code}{RESET}  OHLCV {len(df)} hari terakhir")
    print(f"{'─' * row_w}")
    hdr = f"  {BOLD}{'Date':<12}"
    for c in cols: hdr += f"  {c:>{widths.get(c, 12)}}"
    print(hdr + RESET)
    print("  " + "·" * (row_w - 2))
    for date, row in df.iterrows():
        line = f"  {date:<12}"
        for c in cols:
            val = row[c]; w = widths.get(c, 12)
            s2 = fmt(c, val); cc = clr(c, val)
            line += f"  {cc}{s2:>{w}}{RESET if cc else ''}"
        print(line)


# ═══════════════════════════════════════════════════════════════
# 5. Build JSON output (format kompatibel IMPORT_FROM_XLSX)
# ═══════════════════════════════════════════════════════════════

def build_app_json(stocks: list) -> dict:
    candidates        = []
    fundamentals_all  = {}
    consensus_all     = {}

    for s in stocks:
        code = s["code"]
        cs   = consensus_score(s["analystBuy"], s["analystHold"], s["analystSell"])
        fc   = forecast_signal(s["changePct"], s["volMultiplier"], cs, s["price"])
        ara, arb = ara_arb(s["prevClose"])
        price = s["price"]
        chg   = s["changePct"]

        # ── Kandidat ──
        candidates.append({
            "code":          code,
            "name":          s["name"],
            "price":         _safe(price) if price else "",
            "changePct":     chg,
            "volume":        s["volume"],
            "volMultiplier": s["volMultiplier"],
            "setup":         "",
            "trend":         ("uptrend" if (chg or 0) > 0 else ("downtrend" if (chg or 0) < 0 else "sideways")),
            "prevClose":     s["prevClose"],
            "araPrice":      ara,
            "arbPrice":      arb,
            "forecast":      fc,
            "consensusScore": cs,
            "keystats": {
                "sector": s["sector"], "marketCap": s["marketCap"], "roe": s["roe"],
                "der": s["der"], "netMargin": s["netMargin"], "divYield": s["divYield"],
            },
        })

        # ── Valuasi / PE-PBV Band ──
        def band_str(band):
            empty = {"min":"","sd_minus1":"","median":"","sd_plus1":"","max":""}
            if not band: return empty
            return { k: str(band[k]) for k in empty }

        fundamentals_all[code] = {
            "selectedStock": code,
            "currentPrice":  _safe(price) if price else "",
            "eps":           _safe(s["eps"],  2) if s["eps"]  else "",
            "bvps":          _safe(s["bvps"], 2) if s["bvps"] else "",
            "peBand":  band_str(s["peBand"]),
            "pbvBand": band_str(s["pbvBand"]),
        }

        # ── Consensus ──
        consensus_all[code] = {
            "selectedStock": code,
            "analysts": {
                "buy":  str(s["analystBuy"]  or ""),
                "hold": str(s["analystHold"] or ""),
                "sell": str(s["analystSell"] or ""),
            },
            "targetPrice": {
                "low":  _safe(s["targetLow"])  if s["targetLow"]  else "",
                "mean": _safe(s["targetMean"]) if s["targetMean"] else "",
                "high": _safe(s["targetHigh"]) if s["targetHigh"] else "",
            },
            "epsEstimate": {
                "current": _safe(s["epsCurrentYear"], 2) if s["epsCurrentYear"] else "",
                "next":    _safe(s["epsNextYear"],    2) if s["epsNextYear"]    else "",
                "growth":  _safe(s["epsGrowth"],      1) if s["epsGrowth"]      else "",
            },
            "revenueEstimate": {
                "current": _safe(s["revCurrentYear"], 1) if s["revCurrentYear"] else "",
                "next":    _safe(s["revNextYear"],    1) if s["revNextYear"]    else "",
                "growth":  _safe(s["revGrowth"],      1) if s["revGrowth"]      else "",
            },
            "nextEarningsDate": s["nextEarnings"] or "",
        }

    first_code = stocks[0]["code"] if stocks else ""

    return {
        "generated_at":     datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "candidates":        candidates,
        "valuation":         fundamentals_all.get(first_code, {}),
        "consensus":         consensus_all.get(first_code, {}),
        "fundamentals_all":  fundamentals_all,
        "consensus_all":     consensus_all,
    }


# ═══════════════════════════════════════════════════════════════
# 5b. Peer comparison · Seasonality · Top movers (Tier 2)
# ═══════════════════════════════════════════════════════════════

def print_peer_table(stocks):
    """Tabel perbandingan valuasi & fundamental antar saham."""
    if len(stocks) < 2:
        return
    print(f"\n{'═' * 78}")
    print(f"  {BOLD}PERBANDINGAN PEER{RESET}")
    print(f"{'─' * 78}")
    hdr = (f"  {BOLD}{'Kode':<6}{'Harga':>9}{'%Chg':>8}{'PE':>7}{'PBV':>7}"
           f"{'ROE':>8}{'DER':>7}{'DivY':>7}  Forecast{RESET}")
    print(hdr)
    print("  " + "·" * 76)
    def keyfn(s):
        order = {"ARA Potential":0,"Bullish":1,"Sideways":2,"Bearish":3,"ARB Risk":4}
        cs = consensus_score(s["analystBuy"], s["analystHold"], s["analystSell"])
        fc = forecast_signal(s["changePct"], s["volMultiplier"], cs, s["price"])
        return order.get(fc["label"], 9) if fc else 9
    for s in sorted(stocks, key=keyfn):
        cs = consensus_score(s["analystBuy"], s["analystHold"], s["analystSell"])
        fc = forecast_signal(s["changePct"], s["volMultiplier"], cs, s["price"])
        fc_str = f"{fc['icon']} {fc['label']}" if fc else "N/A"
        chg = _chg(s["changePct"])
        pe  = f"{s['pe']:.1f}"  if s["pe"]  else "–"
        pbv = f"{s['pbv']:.2f}" if s["pbv"] else "–"
        roe = _pct(s["roe"]) if s["roe"] is not None else "–"
        der = _der(s["der"]) if s["der"] is not None else "–"
        dy  = _pct(s["divYield"],1) if s["divYield"] is not None else "–"
        harga = f"{int(s['price']):,}" if s["price"] else "–"
        # padding manual karena _chg mengandung kode warna ANSI
        print(f"  {s['code']:<6}{harga:>9}{chg:>16}{pe:>7}{pbv:>7}{roe:>8}{der:>7}{dy:>7}  {fc_str}")
    print(f"{'═' * 78}")


def fetch_seasonality(code, years=5):
    """Rata-rata return per bulan kalender + win-rate dari histori `years` tahun."""
    try:
        hist = yf.download(f"{code}.JK",
            start=datetime.now() - timedelta(days=365*years + 30),
            end=datetime.now() + timedelta(days=1),
            progress=False, auto_adjust=True)
        if hist.empty:
            return None
        if isinstance(hist.columns, pd.MultiIndex):
            hist.columns = hist.columns.droplevel(1)
        closes = hist["Close"].dropna()
        monthly = closes.resample("ME").last()
        rets = monthly.pct_change().dropna() * 100
        if rets.empty:
            return None
        out = []
        for m in range(1, 13):
            mr = rets[rets.index.month == m]
            if len(mr) == 0:
                out.append((m, None, None, 0)); continue
            avg = float(mr.mean())
            win = float((mr > 0).sum() / len(mr) * 100)
            out.append((m, avg, win, len(mr)))
        return out
    except Exception:
        return None

def print_seasonality(code, data):
    months = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"]
    print(f"\n{'─' * 60}")
    print(f"  {BOLD}SEASONALITY {code}{RESET}  (rata-rata return per bulan)")
    print(f"{'─' * 60}")
    print(f"  {BOLD}{'Bulan':<6}{'Avg Return':>14}{'Win Rate':>12}{'n':>6}{RESET}")
    for m, avg, win, n in data:
        if avg is None:
            print(f"  {months[m-1]:<6}{DIM+'N/A'+RESET:>14}"); continue
        c = GREEN if avg > 0 else (RED if avg < 0 else "")
        avg_s = f"{c}{'+' if avg>0 else ''}{avg:.2f}%{RESET}"
        print(f"  {months[m-1]:<6}{avg_s:>22}{win:>10.0f}%{n:>6}")
    print(f"{'─' * 60}")


def scan_movers(universe, top=10):
    """Pindai universe → top gainers/losers + dekat ARA/ARB (1 batch download)."""
    uniq = list(dict.fromkeys(universe))
    print(f"\n  Memindai {len(uniq)} saham (batch download)...", end="  ", flush=True)
    try:
        raw = yf.download([f"{c}.JK" for c in uniq], period="5d",
                          progress=False, auto_adjust=True)
    except Exception as e:
        print(f"{RED}gagal: {e}{RESET}"); return []
    if raw.empty:
        print(f"{RED}tidak ada data{RESET}"); return []
    closes = raw["Close"] if isinstance(raw.columns, pd.MultiIndex) else raw[["Close"]]
    print(f"{GREEN}OK{RESET}")
    rows = []
    for c in uniq:
        col = f"{c}.JK"
        if col not in closes.columns: continue
        ser = closes[col].dropna()
        if len(ser) < 2: continue
        prev, last = float(ser.iloc[-2]), float(ser.iloc[-1])
        if prev <= 0: continue
        chg = (last - prev) / prev * 100
        ara_lim, arb_lim = auto_rejection_limits(last)
        room_ara = ara_lim - chg
        room_arb = chg - arb_lim
        flag = ""
        if chg >= ara_lim * 0.8 or room_ara <= 3: flag = "🚀 dekat ARA"
        elif chg <= arb_lim * 0.8 or room_arb <= 1.5: flag = "🔻 dekat ARB"
        rows.append({"code": c, "last": last, "chg": chg, "flag": flag})
    return rows

def print_movers(rows, top=10):
    if not rows:
        print(f"{RED}Tidak ada data mover.{RESET}"); return
    gainers = sorted(rows, key=lambda r: r["chg"], reverse=True)[:top]
    losers  = sorted(rows, key=lambda r: r["chg"])[:top]
    def block(title, items, color):
        print(f"\n  {BOLD}{color}{title}{RESET}")
        print("  " + "·" * 50)
        for r in items:
            chg = _chg(r["chg"])
            print(f"    {r['code']:<6} Rp {int(r['last']):>8,}   {chg:>16}   {r['flag']}")
    print(f"\n{'═' * 60}")
    print(f"  {BOLD}TOP MOVERS HARIAN{RESET}  —  {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    print(f"{'═' * 60}")
    block("TOP GAINERS", gainers, GREEN)
    block("TOP LOSERS", losers, RED)
    near = [r for r in rows if r["flag"]]
    if near:
        print(f"\n  {BOLD}DEKAT ARA/ARB{RESET}")
        print("  " + "·" * 50)
        for r in sorted(near, key=lambda r: r["chg"], reverse=True):
            print(f"    {r['code']:<6} {_chg(r['chg']):>16}   {r['flag']}")
    print(f"{'═' * 60}")


# ═══════════════════════════════════════════════════════════════
# 6. Export Excel
# ═══════════════════════════════════════════════════════════════

def export_excel_ohlcv(results: dict):
    fname = f"idx_ohlcv_{datetime.now().strftime('%Y%m%d_%H%M')}.xlsx"
    with pd.ExcelWriter(fname, engine="openpyxl") as writer:
        for code, df in results.items():
            if df is not None:
                df.to_excel(writer, sheet_name=code)
                ws = writer.sheets[code]
                for cc in ws.columns:
                    ws.column_dimensions[cc[0].column_letter].width = 18
    print(f"{GREEN}Tersimpan: {fname}{RESET}")


# ═══════════════════════════════════════════════════════════════
# 7. Main
# ═══════════════════════════════════════════════════════════════

BANNER = (
    f"\n{BOLD}"
    "================================================================\n"
    "  IDX Stock Scraper  —  Scalping Brief Generator\n"
    "  Data: Yahoo Finance (.JK)  |  tanpa login, otomatis\n"
    "  Output: stock_data.json  →  import ke app\n"
    "================================================================"
    f"{RESET}"
)


def parse_args():
    args     = sys.argv[1:]
    tickers  = []
    flags = {
        "ohlcv_only":  "--ohlcv"       in args,
        "no_export":   "--no-export"   in args,
        "movers":      "--movers"      in args,
        "seasonality": "--seasonality" in args,
    }
    for a in args:
        if not a.startswith("--"):
            tickers.extend([t.upper() for t in a.replace(",", " ").split() if t.strip()])
    return tickers, flags


def main():
    print(BANNER)

    tickers, flags = parse_args()
    ohlcv_only = flags["ohlcv_only"]
    no_export  = flags["no_export"]

    # ── MODE: Top movers (pemindai universe) ───────────────────
    if flags["movers"]:
        universe = tickers if tickers else IDX_LIQUID
        print(f"\n{BOLD}Mode  : Top Movers{RESET} (universe {len(set(universe))} saham)")
        print_movers(scan_movers(universe))
        return

    if not tickers:
        raw = input("\nKode saham IDX (pisah koma/spasi, contoh: BBRI BBCA ANTM): ").strip()
        tickers = [t.upper() for t in raw.replace(",", " ").split() if t.strip()]
    if not tickers:
        print("Tidak ada kode saham."); return

    # Validasi kode: 3–5 huruf kapital
    import re
    valid   = [c for c in tickers if re.match(r'^[A-Z]{3,5}$', c)]
    invalid = [c for c in tickers if c not in valid]
    if invalid:
        print(f"{YELLOW}  Kode tidak valid (diabaikan): {', '.join(invalid)}{RESET}")
    if not valid:
        print("Tidak ada kode valid."); return

    print(f"\n{BOLD}Saham : {', '.join(valid)}{RESET}")
    print(f"Mode  : {'OHLCV Historis' if ohlcv_only else 'Data Lengkap (Kandidat + PE/PBV + Consensus)'}")
    print("=" * 68)

    # ── MODE: OHLCV saja ──────────────────────────────────────
    if ohlcv_only:
        ohlcv_results = {}
        for code in valid:
            print(f"\n  Fetching OHLCV {BOLD}{code}{RESET} ...", end="  ", flush=True)
            df = fetch_ohlcv(code)
            if df is None:
                print(f"{RED}tidak ditemukan{RESET}"); continue
            print(f"{GREEN}OK{RESET}")
            ohlcv_results[code] = df
            print_ohlcv_table(code, df)
            time.sleep(0.3)

        if ohlcv_results and input("\nExport Excel (.xlsx)? [y/n]: ").lower().strip() == "y":
            export_excel_ohlcv(ohlcv_results)
        return

    # ── MODE: Data lengkap ─────────────────────────────────────
    stocks = []
    for code in valid:
        print(f"\n  Fetching {BOLD}{code}{RESET} ...", end="  ", flush=True)
        s = fetch_stock(code)
        ok_str = f"{GREEN}OK{RESET}"
        items  = []
        if s["price"]:     items.append("harga")
        if s["eps"]:       items.append("EPS")
        if s["analystBuy"] is not None: items.append("analis")
        print(f"{ok_str}  ({', '.join(items) if items else DIM + 'data terbatas' + RESET})")
        stocks.append(s)
        time.sleep(0.5)  # rate limit

    print()
    for s in stocks:
        print_stock(s)

    if not stocks: return

    # Tabel perbandingan peer (otomatis bila ≥2 saham)
    print_peer_table(stocks)

    # Seasonality (opsional --seasonality)
    if flags["seasonality"]:
        for s in stocks:
            sea = fetch_seasonality(s["code"])
            if sea: print_seasonality(s["code"], sea)
            else:   print(f"\n  {DIM}Seasonality {s['code']}: data kurang.{RESET}")

    if not no_export:
        data = build_app_json(stocks)
        fname = "stock_data.json"
        with open(fname, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2, default=str)
        print(f"{GREEN}Tersimpan: {fname}{RESET}")
        print(f"{DIM}  Buka app → klik '📥 Import XLSX/JSON' → pilih {fname}{RESET}")
        print(f"{DIM}  (Kandidat, PE/PBV, Consensus akan terisi otomatis){RESET}")

    try:
        if input("\nTampilkan OHLCV historis 10 hari? [y/n]: ").lower().strip() == "y":
            for s in stocks:
                if s["ohlcv"] is not None:
                    print_ohlcv_table(s["code"], s["ohlcv"])
            if input("Export Excel OHLCV? [y/n]: ").lower().strip() == "y":
                export_excel_ohlcv({ s["code"]: s["ohlcv"] for s in stocks if s["ohlcv"] is not None })
    except EOFError:
        pass


if __name__ == "__main__":
    main()
