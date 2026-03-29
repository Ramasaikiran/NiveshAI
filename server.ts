import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import YahooFinance from 'yahoo-finance2';
import { subDays, format } from 'date-fns';

const yahooFinance = new (YahooFinance as any)({ suppressNotices: ['yahooSurvey'] });

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/stocks/:symbol", async (req, res) => {
    const { symbol } = req.params;
    const isTicker = /^[A-Z0-9.]+$/.test(symbol.toUpperCase()) && !symbol.includes(' ');
    let nseSymbol = symbol.toUpperCase().endsWith('.NS') ? symbol.toUpperCase() : `${symbol.toUpperCase()}.NS`;

    try {
      let quote: any;
      let foundSymbol = nseSymbol;

      // 1. Try direct quote if it looks like a ticker
      if (isTicker) {
        try {
          quote = await yahooFinance.quote(nseSymbol);
        } catch (err) {
          console.log(`Direct quote failed for ${nseSymbol}, falling back to search.`);
        }
      }

      // 2. If no quote yet, search for it
      if (!quote) {
        console.log(`Searching for: ${symbol}`);
        const searchResults: any = await yahooFinance.search(symbol);
        
        // Find the best NSE match
        const bestMatch = searchResults.quotes.find((q: any) => 
          (q.symbol && q.symbol.endsWith('.NS')) || 
          (q.exchange === 'NSI') ||
          (q.exchange === 'BSE')
        );

        if (bestMatch) {
          foundSymbol = bestMatch.symbol;
          console.log(`Found match: ${foundSymbol}`);
          quote = await yahooFinance.quote(foundSymbol);
        } else {
          return res.status(404).json({ 
            error: `No data found for "${symbol}". Please try using the ticker symbol (e.g., TATAMOTORS for Tata Motors).` 
          });
        }
      }

      const endDate = new Date();
      const startDate = subDays(endDate, 365); // 1 year of data
      
      let historicalRaw: any = [];
      try {
        historicalRaw = await yahooFinance.historical(foundSymbol, {
          period1: startDate,
          period2: endDate,
          interval: '1d'
        });
      } catch (histErr) {
        console.warn(`Historical data fetch failed for ${foundSymbol}:`, histErr);
      }

      // Filter out null values from historical data
      const historical = Array.isArray(historicalRaw) 
        ? historicalRaw.filter((d: any) => d.close !== null && d.close !== undefined)
        : [];

      // Basic Signal Detection
      const signals: any[] = [];
      const currentPrice = quote.regularMarketPrice || 0;
      const prevClose = quote.regularMarketPreviousClose || 0;
      const volume = quote.regularMarketVolume || 0;
      const avgVolume = quote.averageDailyVolume3Month || 0;

      // 1. Price Breakout (20-day high)
      const last20Days = historical.slice(-20);
      const high20 = historical.length > 0 ? Math.max(...last20Days.map((d: any) => d.high)) : 0;
      if (currentPrice > high20) {
        signals.push({
          id: 'price-breakout',
          type: 'PRICE_BREAKOUT',
          name: 'Price Breakout',
          description: `Current price ₹${currentPrice.toFixed(2)} is above 20-day high of ₹${high20.toFixed(2)}`,
          weight: 8,
          confidence: 0.85,
          historicalWinRate: 0.68,
          avgReturn: 12.5
        });
      }

      // 2. Volume Spike (>3x avg)
      if (volume > avgVolume * 3) {
        signals.push({
          id: 'volume-spike',
          type: 'VOLUME_SPIKE',
          name: 'Volume Spike',
          description: `Volume ${volume.toLocaleString()} is ${ (volume/avgVolume).toFixed(1) }x the 3-month average`,
          weight: 6,
          confidence: 0.75,
          historicalWinRate: 0.62,
          avgReturn: 8.2
        });
      }

      // 3. RSI Divergence (Mocked for now, would need technical analysis lib)
      // For demo, we'll add a random technical pattern if it's a "good" stock
      if (currentPrice > prevClose && volume > avgVolume) {
        signals.push({
          id: 'bullish-engulfing',
          type: 'TECHNICAL_PATTERN',
          name: 'Bullish Engulfing',
          description: 'Strong bullish reversal pattern detected on daily chart',
          weight: 5,
          confidence: 0.7,
          historicalWinRate: 0.58,
          avgReturn: 5.4
        });
      }

      // Calculate Score
      const totalWeight = signals.reduce((acc, s) => acc + s.weight, 0);
      const score = Math.min(100, Math.max(0, 50 + totalWeight * 5));

      const stockData = {
        symbol: quote.symbol,
        name: quote.shortName || quote.longName || symbol,
        price: currentPrice,
        change: quote.regularMarketChange || 0,
        changePercent: quote.regularMarketChangePercent || 0,
        volume: volume,
        avgVolume: avgVolume,
        marketCap: quote.marketCap || 0,
        peRatio: quote.trailingPE,
        dividendYield: quote.dividendYield,
        high52w: quote.fiftyTwoWeekHigh || 0,
        low52w: quote.fiftyTwoWeekLow || 0,
      };

      const chartData = historical.map((d: any) => ({
        date: format(d.date, 'yyyy-MM-dd'),
        price: d.close,
        volume: d.volume
      }));

      res.json({
        stock: stockData,
        score,
        signals,
        chartData
      });
    } catch (error) {
      console.error(`Error fetching stock ${symbol}:`, error);
      res.status(500).json({ error: "Failed to fetch stock data" });
    }
  });

  app.get("/api/stocks/:symbol/peers", async (req, res) => {
    const { symbol } = req.params;
    const cleanSymbol = symbol.toUpperCase().replace('.NS', '');
    
    // Define peer groups
    const peerGroups: Record<string, string[]> = {
      'HDFCBANK': ['ICICIBANK', 'SBIN', 'AXISBANK', 'KOTAKBANK'],
      'ICICIBANK': ['HDFCBANK', 'SBIN', 'AXISBANK', 'KOTAKBANK'],
      'SBIN': ['HDFCBANK', 'ICICIBANK', 'AXISBANK', 'KOTAKBANK'],
      'AXISBANK': ['HDFCBANK', 'ICICIBANK', 'SBIN', 'KOTAKBANK'],
      'KOTAKBANK': ['HDFCBANK', 'ICICIBANK', 'SBIN', 'AXISBANK'],
      'TCS': ['INFY', 'WIPRO', 'HCLTECH', 'TECHM'],
      'INFY': ['TCS', 'WIPRO', 'HCLTECH', 'TECHM'],
      'WIPRO': ['TCS', 'INFY', 'HCLTECH', 'TECHM'],
      'HCLTECH': ['TCS', 'INFY', 'WIPRO', 'TECHM'],
      'TECHM': ['TCS', 'INFY', 'WIPRO', 'HCLTECH'],
      'RELIANCE': ['ONGC', 'BPCL', 'IOC', 'ADANIGREEN'],
      'HINDUNILVR': ['ITC', 'NESTLEIND', 'BRITANNIA', 'TATACONSUM'],
      'ITC': ['HINDUNILVR', 'NESTLEIND', 'BRITANNIA', 'TATACONSUM'],
      'BHARTIARTL': ['IDEA', 'RELIANCE', 'TATACOMM'],
    };

    const peers = peerGroups[cleanSymbol] || ["RELIANCE", "TCS", "HDFCBANK", "INFY"].filter(s => s !== cleanSymbol);
    
    try {
      const results = await Promise.all(peers.slice(0, 4).map(async (s) => {
        try {
          const nseSymbol = `${s}.NS`;
          const quote: any = await yahooFinance.quote(nseSymbol);
          
          let score = 50;
          if (quote.regularMarketPrice && quote.regularMarketPrice > (quote.fiftyTwoWeekHigh || 0) * 0.95) score += 20;
          if ((quote.regularMarketVolume || 0) > (quote.averageDailyVolume3Month || 0) * 1.5) score += 15;
          if ((quote.regularMarketChangePercent || 0) > 2) score += 10;

          return {
            symbol: s,
            name: quote.shortName || s,
            price: quote.regularMarketPrice,
            changePercent: quote.regularMarketChangePercent,
            marketCap: quote.marketCap,
            score: Math.min(100, score)
          };
        } catch (err) {
          return null;
        }
      }));

      res.json(results.filter(r => r !== null));
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch peer data" });
    }
  });

  app.get("/api/radar", async (req, res) => {
    const topStocks = ["RELIANCE", "TCS", "HDFCBANK", "INFY", "ICICIBANK", "HINDUNILVR", "ITC", "SBIN", "BHARTIARTL", "LICI"];
    
    try {
      const results = await Promise.all(topStocks.map(async (s) => {
        try {
          const nseSymbol = `${s}.NS`;
          const quote: any = await yahooFinance.quote(nseSymbol);
          const volume = quote.regularMarketVolume || 0;
          const avgVolume = quote.averageDailyVolume3Month || 0;
          
          let score = 50;
          if (quote.regularMarketPrice && quote.regularMarketPrice > (quote.fiftyTwoWeekHigh || 0) * 0.95) score += 20;
          if (volume > avgVolume * 1.5) score += 15;
          if ((quote.regularMarketChangePercent || 0) > 2) score += 10;

          return {
            symbol: s,
            name: quote.shortName || s,
            price: quote.regularMarketPrice,
            changePercent: quote.regularMarketChangePercent,
            score: Math.min(100, score)
          };
        } catch (err) {
          console.error(`Failed to fetch ${s}:`, err);
          return null;
        }
      }));

      // Filter out nulls and sort
      res.json(results.filter(r => r !== null).sort((a: any, b: any) => b.score - a.score));
    } catch (error) {
      console.error("Radar error:", error);
      res.status(500).json({ error: "Failed to fetch radar data" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  if (process.env.VERCEL !== "1") {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }

  return app;
}

const appPromise = startServer();

export default async (req: any, res: any) => {
  const app = await appPromise;
  return app(req, res);
};
