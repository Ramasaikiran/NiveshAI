# NiveshAI 📈

 AI-powered stock intelligence platform for Indian markets (NSE & BSE)

NiveshAI helps retail investors cut through market noise. Enter any stock name or ticker — get real-time data, signal detection, peer benchmarking, and a market radar, all in one dashboard.

---

## What It Does

| Feature | Description |
|---|---|
| **Stock Lookup** | Search by ticker (e.g. `TATAMOTORS`) or company name — auto-resolves to NSE/BSE symbol |
| **Signal Detection** | Detects Price Breakouts, Volume Spikes, and Bullish Engulfing patterns with confidence scores |
| **Stock Scoring** | Proprietary 0–100 score based on weighted signal strength |
| **Historical Charts** | 1-year price + volume chart powered by Yahoo Finance |
| **Peer Comparison** | Benchmark any stock against sector peers (Banking, IT, FMCG, Telecom) |
| **Market Radar** | Live leaderboard of top 10 Nifty stocks ranked by signal score |
| **AI Analysis** | Gemini-powered natural language insights on any stock |

---

## Tech Stack

```
Frontend    React 19 · TypeScript · Vite · Tailwind CSS v4
Backend     Express · tsx (TypeScript runtime)
Data        yahoo-finance2 (real-time NSE/BSE quotes + historicals)
AI          Google Gemini API (@google/genai)
Auth/DB     Firebase
Charts      Recharts
Animation   Motion (Framer Motion v12)
```

---

## Project Structure

```
NiveshAI/
├── server.ts              # Express API server
│   ├── GET /api/stocks/:symbol        # Quote + signals + chart data
│   ├── GET /api/stocks/:symbol/peers  # Sector peer comparison
│   └── GET /api/radar                 # Top 10 NSE stocks by score
├── src/                   # React frontend (Vite SPA)
├── index.html             # Entry point
├── vite.config.ts         # Vite + Tailwind config
├── tsconfig.json
├── .env.example           # Required env vars
└── package.json
```

---

## Getting Started

### Prerequisites

- Node.js v18+
- A [Google Gemini API key](https://aistudio.google.com/app/apikey)

### Installation

```bash
# 1. Clone the repo
git clone https://github.com/Ramasaikiran/NiveshAI.git
cd NiveshAI

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env.local
# Add your GEMINI_API_KEY to .env.local

# 4. Start the dev server
npm run dev
```

App runs at **http://localhost:3000**

---

## Environment Variables

```env
GEMINI_API_KEY=your_gemini_api_key_here
```

See `.env.example` for the full list.

---

## Signal Detection Logic

NiveshAI calculates a **stock score (0–100)** using three signals:

| Signal | Trigger Condition | Weight | Historical Win Rate |
|---|---|---|---|
| Price Breakout | Price > 20-day high | 8 | 68% |
| Volume Spike | Volume > 3× 3-month avg | 6 | 62% |
| Bullish Engulfing | Price up + above avg volume | 5 | 58% |

Score = `min(100, 50 + totalWeight × 5)`

> **Note:** The Bullish Engulfing pattern is currently a heuristic approximation. True candlestick pattern detection requires OHLC analysis — a planned improvement.

---

## Available Scripts

```bash
npm run dev       # Start dev server (Express + Vite)
npm run build     # Production build
npm run preview   # Preview production build
npm run lint      # TypeScript type check
npm run clean     # Remove dist/
```

---

## Supported Peer Groups

Pre-mapped sector peers for instant benchmarking:

- **Banking**: HDFCBANK, ICICIBANK, SBIN, AXISBANK, KOTAKBANK
- **IT**: TCS, INFY, WIPRO, HCLTECH, TECHM
- **Energy**: RELIANCE, ONGC, BPCL, IOC
- **FMCG**: HINDUNILVR, ITC, NESTLEIND, BRITANNIA, TATACONSUM
- **Telecom**: BHARTIARTL, IDEA, TATACOMM

---

## Deployment

### Production Build

```bash
npm run build
NODE_ENV=production node server.ts
```

The Express server serves the Vite SPA from `dist/` in production mode and handles all API routes.

### Platforms

Works with any Node.js hosting — Railway, Render, Fly.io, or a basic VPS.

---

## Known Limitations

- **Candlestick patterns** are heuristic — not true OHLC-based detection
- **Peer groups** are hardcoded; stocks outside the list fall back to Nifty 50 defaults
- **No financial advice** — NiveshAI is a research tool, not a SEBI-registered advisor
- **Yahoo Finance rate limits** may affect radar endpoint under heavy load

---

## Roadmap

- [ ] RSI, MACD, Bollinger Bands via a proper TA library
- [ ] Portfolio tracker with watchlist support
- [ ] News sentiment analysis (Gemini + web search)
- [ ] F&O data integration
- [ ] User auth + saved searches via Firebase

---

## Contributing

Pull requests are welcome. For major changes, open an issue first.

```bash
# Fork → Branch → Commit → PR
git checkout -b feature/your-feature-name
```

---

## Disclaimer

NiveshAI is built for **educational and research purposes only**. Nothing on this platform constitutes financial advice. Always do your own research before investing.
---
## Author

**Rama Sai Kiran Medam**
---
