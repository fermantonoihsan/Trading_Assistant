#!/usr/bin/env python3
"""
IHSG Market Condition Scraper
==============================
Ambil data kondisi market IDX untuk Scalping Brief Generator.

Data yang di-fetch:
  - IHSG         : Harga, % perubahan, trend auto-detect
  - Regional     : Nikkei, Hang Seng, STI, S&P Futures
  - Sektor       : 11 sektor IDX (avg % change dari saham perwakilan)
  - Ekstra       : USD/IDR, Gold, Oil

Output:
  - Tabel terminal berwarna
  - market_data.json  → import langsung ke app via tombol "Import Market JSON"

Install:  pip install yfinance pandas
Jalankan: py ihsg_market.py
          py ihsg_market.py --no-export    (terminal only, tanpa simpan JSON)
"""

import sys
import io
import json
import time
import warnings
from datetime import datetime
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

# ── ANSI colors ────────────────────────────────────────────────────────────────
GREEN  = "\033[32m"
RED    = "\033[31m"
YELLOW = "\033[33m"
CYAN   = "\033[36m"
BOLD   = "\033[1m"
DIM    = "\033[2m"
RESET  = "\033[0m"

# ── Sektor mapping (sama persis dengan DEFAULT_SECTOR_ROTATION di app) ─────────
SECTOR_MAP = [
    { "name": "Basic-Ind",    "stocks": ["ANTM", "BRMS", "BRPT"]  },
    { "name": "Cyclical",     "stocks": ["MNCN", "SCMA", "MINA"]  },
    { "name": "Energy",       "stocks": ["ADRO", "BUMI", "PGAS"]  },
    { "name": "Health",       "stocks": ["KLBF", "SIDO", "KAEF"]  },
    { "name": "Finance",      "stocks": ["BBCA", "BBRI", "BMRI"]  },
    { "name": "Industrial",   "stocks": ["ASII", "UNTR", "IMPC"]  },
    { "name": "Infrastruktur","stocks": ["TLKM", "ADHI", "CDIA"]  },
    { "name": "Transport",    "stocks": ["PJHB", "GIAA", "SMDR"]  },
    { "name": "Technology",   "stocks": ["GOTO", "WIFI", "EMTK"]  },
    { "name": "Non-Cyclical", "stocks": ["UNVR", "INDF", "ICBP"]  },
    { "name": "Property",     "stocks": ["CTRA", "PWON", "BSDE"]  },
]

# Semua sektor saham jadi satu list .JK untuk batch download
ALL_SECTOR_JK = [
    s + ".JK"
    for sec in SECTOR_MAP
    for s in sec["stocks"]
]

# Indeks regional
REGIONAL_TICKERS = {
    "Nikkei":  "^N225",
    "HSI":     "^HSI",
    "STI":     "^STI",
    "S&P Fut": "ES=F",
}

# Ekstra
EXTRA_TICKERS = {
    "USD/IDR": "USDIDR=X",
    "Gold":    "GC=F",
    "Oil":     "CL=F",
}


# ── Core: ambil % change dari 2 close terakhir ─────────────────────────────────

def pct_change_from_close(ticker_jk: str, closes: pd.DataFrame) -> Optional[float]:
    """Hitung % change dari data Close DataFrame (multi-ticker)."""
    col = ticker_jk if ticker_jk in closes.columns else None
    if col is None:
        return None
    series = closes[col].dropna()
    if len(series) < 2:
        return None
    prev = float(series.iloc[-2])
    curr = float(series.iloc[-1])
    if prev == 0:
        return None
    return round((curr - prev) / prev * 100, 2)


def latest_close(ticker_jk: str, closes: pd.DataFrame) -> Optional[float]:
    col = ticker_jk if ticker_jk in closes.columns else None
    if col is None:
        return None
    series = closes[col].dropna()
    if series.empty:
        return None
    return round(float(series.iloc[-1]), 0)


def batch_download(tickers: list, label: str = "") -> pd.DataFrame:
    """Download batch tickers, return DataFrame Close dengan kolom per ticker."""
    if label:
        print(f"  Fetching {DIM}{label}{RESET} ...", end="  ", flush=True)
    try:
        raw = yf.download(tickers, period="5d", progress=False, auto_adjust=True)
    except Exception as e:
        print(f"{RED}gagal: {e}{RESET}")
        return pd.DataFrame()

    if raw.empty:
        print(f"{RED}tidak ada data{RESET}")
        return pd.DataFrame()

    if isinstance(raw.columns, pd.MultiIndex):
        closes = raw["Close"].copy()
    else:
        # Single ticker — yfinance returns flat columns
        closes = raw[["Close"]].copy()
        closes.columns = [tickers[0] if isinstance(tickers, list) else tickers]

    if label:
        print(f"{GREEN}OK{RESET}")
    return closes


def auto_trend(change_pct: Optional[float]) -> str:
    if change_pct is None: return "sideways"
    if change_pct >  0.5:  return "bullish"
    if change_pct < -0.5:  return "bearish"
    return "sideways"


# ── Fetch IHSG ─────────────────────────────────────────────────────────────────

def fetch_ihsg():
    closes = batch_download(["^JKSE"], "IHSG ^JKSE")
    change = pct_change_from_close("^JKSE", closes)
    price  = latest_close("^JKSE", closes)
    return {
        "price":  str(int(price)) if price else "",
        "change": str(change)     if change is not None else "",
        "trend":  auto_trend(change),
        "_change_raw": change,
        "_price_raw":  price,
    }


# ── Fetch regional ─────────────────────────────────────────────────────────────

def fetch_regional():
    tickers_list = list(REGIONAL_TICKERS.values())
    closes = batch_download(tickers_list, "Regional (Nikkei/HSI/STI/S&P Fut)")
    result = []
    for name, ticker in REGIONAL_TICKERS.items():
        chg = pct_change_from_close(ticker, closes)
        result.append({
            "name":   name,
            "change": str(chg) if chg is not None else "",
            "_change_raw": chg,
        })
    return result


# ── Fetch sector saham ─────────────────────────────────────────────────────────

def fetch_sectors():
    closes = batch_download(ALL_SECTOR_JK, "Sektor saham IDX (33 ticker)")
    sectors = []
    for sec in SECTOR_MAP:
        stock_data = []
        valid_changes = []
        for ticker in sec["stocks"]:
            jk  = ticker + ".JK"
            chg = pct_change_from_close(jk, closes)
            stock_data.append({
                "ticker": ticker,
                "change": str(round(chg, 2)) if chg is not None else "",
            })
            if chg is not None:
                valid_changes.append(chg)
        avg_change = round(sum(valid_changes) / len(valid_changes), 2) if valid_changes else None
        sectors.append({
            "name":   sec["name"],
            "change": str(avg_change) if avg_change is not None else "",
            "stocks": stock_data,
            "_change_raw": avg_change,
        })
    return sectors


# ── Fetch extras (USD/IDR, Gold, Oil) ─────────────────────────────────────────

def fetch_extras():
    tickers_list = list(EXTRA_TICKERS.values())
    closes = batch_download(tickers_list, "USD/IDR + Gold + Oil")
    result = {}
    for name, ticker in EXTRA_TICKERS.items():
        result[name] = latest_close(ticker, closes)
    return result


# ── Terminal display ────────────────────────────────────────────────────────────

def color_chg(val):
    if val is None: return DIM + "N/A" + RESET
    c = GREEN if val > 0 else (RED if val < 0 else "")
    sign = "+" if val > 0 else ""
    return f"{c}{sign}{val:.2f}%{RESET}"

def trend_tag(trend):
    tags = { "bullish": GREEN + "BULLISH" + RESET,
             "bearish": RED   + "BEARISH" + RESET,
             "sideways": DIM  + "SIDEWAYS" + RESET }
    return tags.get(trend, trend)

def print_results(ihsg, regional, sectors, extras):
    print(f"\n{'═' * 70}")
    print(f"  {BOLD}KONDISI MARKET IDX{RESET}  —  {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    print(f"{'═' * 70}")

    # IHSG
    p = ihsg.get("_price_raw")
    c = ihsg.get("_change_raw")
    price_str = f"Rp {int(p):,}" if p else "N/A"
    print(f"\n  {BOLD}{'IHSG':<20}{RESET}{price_str:<16} {color_chg(c)}  → {trend_tag(ihsg['trend'])}")

    # Extras
    usd_idr = extras.get("USD/IDR")
    gold    = extras.get("Gold")
    oil     = extras.get("Oil")
    print(f"\n  {DIM}USD/IDR: {int(usd_idr):,}  |  Gold: ${gold:,.0f}/oz  |  Oil: ${oil:.1f}/bbl{RESET}"
          if usd_idr and gold and oil else "")

    # Regional
    print(f"\n  {BOLD}Regional Index{RESET}")
    for r in regional:
        print(f"    {r['name']:<14} {color_chg(r.get('_change_raw'))}")

    # Sektor
    print(f"\n  {BOLD}Sektor Saham{RESET}")
    for sec in sectors:
        avg = sec.get("_change_raw")
        stocks_str = "  ".join(
            f"{s['ticker']}:{color_chg(float(s['change']) if s['change'] else None)}"
            for s in sec["stocks"]
        )
        print(f"    {sec['name']:<16} avg: {color_chg(avg):<24} {DIM}{stocks_str}{RESET}")

    print(f"\n{'═' * 70}")


# ── Build JSON output ──────────────────────────────────────────────────────────

def build_json(ihsg, regional, sectors, extras):
    """
    Format JSON yang persis sesuai struktur state.market di scalping-brief.jsx
    sehingga bisa di-import langsung via tombol "Import Market JSON".
    """
    # Strip _internal keys
    def clean_ihsg(d):
        return { "price": d["price"], "change": d["change"], "trend": d["trend"] }

    def clean_regional(lst):
        return [{ "name": r["name"], "change": r["change"] } for r in lst]

    def clean_sectors(lst):
        return [{
            "name":   s["name"],
            "change": s["change"],
            "stocks": s["stocks"],
        } for s in lst]

    return {
        "generated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "market": {
            "ihsg":          clean_ihsg(ihsg),
            "regional":      clean_regional(regional),
            "sectorRotation": clean_sectors(sectors),
        },
        "extras": {
            "usdIdr": int(extras["USD/IDR"])  if extras.get("USD/IDR") else None,
            "gold":   float(extras["Gold"])   if extras.get("Gold")    else None,
            "oil":    float(extras["Oil"])    if extras.get("Oil")     else None,
        }
    }


# ── Main ───────────────────────────────────────────────────────────────────────

BANNER = (
    f"\n{BOLD}"
    "================================================================\n"
    "  IHSG Market Condition Scraper\n"
    "  Data: Yahoo Finance  |  Update: real-time (setiap dijalankan)\n"
    "  Output: market_data.json  →  import ke Scalping Brief app\n"
    "================================================================"
    f"{RESET}"
)

def main():
    no_export = "--no-export" in sys.argv
    print(BANNER)
    print()

    # Fetch semua data
    print(f"  {CYAN}Mengambil data...{RESET}")
    ihsg     = fetch_ihsg()
    regional = fetch_regional()
    sectors  = fetch_sectors()
    extras   = fetch_extras()

    # Tampilkan tabel terminal
    print_results(ihsg, regional, sectors, extras)

    if not no_export:
        # Simpan ke JSON
        data = build_json(ihsg, regional, sectors, extras)
        fname = "market_data.json"
        with open(fname, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"\n{GREEN}Tersimpan: {fname}{RESET}")
        print(f"{DIM}  Buka app → Kondisi Market → klik 'Import Market JSON' → pilih {fname}{RESET}")
    else:
        print(f"\n{DIM}(--no-export: file JSON tidak disimpan){RESET}")

    # Cara otomasi
    print(f"\n{DIM}"
          "  Tips: jalankan setiap pagi sebelum market buka (08:45 WIB)\n"
          "  Windows Task Scheduler:  py C:\\path\\ihsg_market.py\n"
          "  Atau pakai: watch -n 600 py ihsg_market.py (Linux/Mac)"
          f"{RESET}\n")


if __name__ == "__main__":
    main()
