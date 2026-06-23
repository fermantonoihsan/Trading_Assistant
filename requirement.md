# Requirement Document — Scalping Brief Generator
**Version:** 1.0  
**Date:** 2026-06-10  
**Project:** IDX Scalping Brief Generator + Interactive Adjust Form

---

## 1. Overview

Scalping Brief Generator adalah tool berbasis web (single-page app) yang membantu trader IDX menyusun **brief harian** sebelum sesi trading dimulai. Tool ini mengintegrasikan empat modul utama dalam satu antarmuka interaktif:

1. **Kondisi Market** — snapshot makro & sentimen IHSG
2. **Kandidat Saham** — screening & watchlist scalping harian
3. **Analisis Forecasting PE/PBV Band** — valuasi relatif terhadap band historis
4. **Consensus Estimate** — ringkasan target harga & estimasi analis

---

## 2. Functional Requirements

### 2.1 Modul Kondisi Market

| ID | Requirement |
|----|-------------|
| FR-M01 | User dapat mengisi/update kondisi IHSG: harga, %change, trend (bullish/bearish/sideways) |
| FR-M02 | User dapat input foreign net flow (buy/sell, nilai Rp) |
| FR-M03 | User dapat input sentimen regional: Nikkei, HSI, STI, S&P Futures (%change) |
| FR-M04 | User dapat pilih sektor terkuat & terlemah hari ini |
| FR-M05 | System menghitung **Market Score** (0–100) berdasarkan input FR-M01 s/d FR-M04 |
| FR-M06 | Market Score menentukan rekomendasi agresivitas trading: Aggressive / Normal / Defensive / Avoid |
| FR-M07 | User dapat input catatan bebas (free text) kondisi market hari ini |

### 2.2 Modul Kandidat Saham

| ID | Requirement |
|----|-------------|
| FR-S01 | User dapat menambahkan saham ke watchlist (kode + nama) |
| FR-S02 | Untuk setiap saham, user mengisi: harga terakhir, volume vs avg, % change, setup type |
| FR-S03 | Setup type options: Gap Continuation / Breakout / Pullback MA / VWAP Bounce / Reversal |
| FR-S04 | System menampilkan scoring kandidat berdasarkan: volume multiplier, setup strength, trend alignment |
| FR-S05 | User dapat tandai saham sebagai Priority / Watch / Skip |
| FR-S06 | System menampilkan entry, SL, TP1, TP2, R:R per saham (dapat diedit manual) |
| FR-S07 | User dapat drag-and-drop reorder kandidat sesuai prioritas |
| FR-S08 | Maksimal 5 kandidat aktif ditampilkan di brief |

### 2.3 Modul Analisis Forecasting PE/PBV Band

| ID | Requirement |
|----|-------------|
| FR-V01 | User dapat input data valuasi saham: harga saat ini, EPS TTM, Book Value per Share |
| FR-V02 | User dapat input PE Band historis: PE Min, PE -1SD, PE Median, PE +1SD, PE Max |
| FR-V03 | User dapat input PBV Band historis: PBV Min, PBV -1SD, PBV Median, PBV +1SD, PBV Max |
| FR-V04 | System menghitung posisi PE & PBV saat ini terhadap band (dalam bentuk persentil) |
| FR-V05 | System menampilkan **Implied Price** di setiap band PE dan PBV |
| FR-V06 | System menampilkan upside/downside ke masing-masing band (%) |
| FR-V07 | System menghasilkan label valuasi otomatis: Deeply Undervalued / Undervalued / Fair Value / Overvalued / Deeply Overvalued |
| FR-V08 | Visualisasi berupa horizontal band chart (gauge/range bar) yang menunjukkan posisi harga saat ini |
| FR-V09 | User dapat simpan profil PE/PBV per saham untuk reuse |

### 2.4 Modul Consensus Estimate

| ID | Requirement |
|----|-------------|
| FR-C01 | User dapat input data consensus: jumlah analis Buy / Hold / Sell |
| FR-C02 | User dapat input range target price: Low, Mean, High |
| FR-C03 | User dapat input estimasi EPS: FY saat ini, FY+1, EPS growth YoY |
| FR-C04 | User dapat input estimasi Revenue: FY saat ini, FY+1, Revenue growth YoY |
| FR-C05 | System menampilkan **Consensus Score** berdasarkan distribusi Buy/Hold/Sell |
| FR-C06 | System menghitung upside ke mean target price dan high target price |
| FR-C07 | System menampilkan ringkasan: Bullish / Neutral / Bearish consensus |
| FR-C08 | User dapat input tanggal rilis laporan keuangan berikutnya sebagai catalyst flag |

### 2.5 Brief Generator & Export

| ID | Requirement |
|----|-------------|
| FR-E01 | System menghasilkan **Scalping Brief** terformat dari semua modul |
| FR-E02 | Brief dapat di-copy ke clipboard dalam format teks (untuk paste ke chat/notes) |
| FR-E03 | Brief dapat di-export ke PDF |
| FR-E04 | User dapat menyimpan sesi brief (localStorage) untuk dibuka kembali |
| FR-E05 | User dapat reset/clear semua input |

---

## 3. Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| NFR-01 | Aplikasi berjalan sepenuhnya di browser (no backend/server required) |
| NFR-02 | Load time < 2 detik pada koneksi normal |
| NFR-03 | Responsif untuk layar desktop (1280px+) dan laptop (1024px+) |
| NFR-04 | Semua kalkulasi real-time (update saat user mengetik) |
| NFR-05 | Data tersimpan di localStorage — tidak ada data yang dikirim ke server |
| NFR-06 | UI dalam Bahasa Indonesia |
| NFR-07 | Warna coding konsisten: hijau = bullish/positif, merah = bearish/negatif, abu = netral |

---

## 4. User Flow

```
[Buka App]
    │
    ▼
[Isi Kondisi Market] ──► [Market Score dihitung otomatis]
    │
    ▼
[Tambah Kandidat Saham] ──► [Scoring & Setup terisi]
    │
    ▼
[Input PE/PBV Band] ──► [Posisi valuasi & implied price tampil]
    │
    ▼
[Input Consensus Estimate] ──► [Consensus Score tampil]
    │
    ▼
[Generate Brief] ──► [Copy / Export PDF]
```

---

## 5. Asumsi & Batasan

- Data harga, PE band, dan consensus **diinput manual** oleh user (tidak ada API feed real-time)
- Kalkulasi PE/PBV berbasis data yang diinput user, bukan dari database eksternal
- Tool ini bersifat **decision support**, bukan sinyal trading otomatis
- Tidak ada autentikasi — tool bersifat personal/lokal

---

## 6. Glossary

| Term | Definisi |
|------|----------|
| PE Band | Rentang Price-to-Earnings historis suatu saham (min, -1SD, median, +1SD, max) |
| PBV Band | Rentang Price-to-Book Value historis suatu saham |
| Implied Price | Harga saham yang terimplikasi jika PE/PBV berada di titik band tertentu |
| Market Score | Skor 0–100 yang merangkum kondisi market hari ini |
| Consensus Score | Skor berdasarkan distribusi rekomendasi analis Buy/Hold/Sell |
| TTM | Trailing Twelve Months |
| R:R | Risk-to-Reward Ratio |
