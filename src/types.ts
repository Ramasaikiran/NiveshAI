export interface StockSignal {
  id: string;
  type: 'PRICE_BREAKOUT' | 'VOLUME_SPIKE' | 'REVENUE_GROWTH' | 'INSIDER_BUYING' | 'SENTIMENT_SHIFT' | 'TECHNICAL_PATTERN';
  name: string;
  description: string;
  weight: number; // -10 to 10
  confidence: number; // 0 to 1
  historicalWinRate?: number;
  avgReturn?: number;
  maxDrawdown?: number;
}

export interface StockData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  avgVolume: number;
  marketCap: number;
  peRatio?: number;
  dividendYield?: number;
  high52w: number;
  low52w: number;
}

export interface NewsArticle {
  title: string;
  url: string;
  source: string;
  date: string;
  summary?: string;
}

export interface StockIntelligence {
  stock: StockData;
  score: number; // 0-100
  signals: StockSignal[];
  aiInsight?: string;
  chartData: { date: string; price: number; volume: number }[];
  news?: NewsArticle[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}
