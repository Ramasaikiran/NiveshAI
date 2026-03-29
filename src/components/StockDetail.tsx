import React, { useState, useEffect } from 'react';
import { ArrowLeft, TrendingUp, TrendingDown, Target, History, Info, Zap, ShieldCheck, AlertCircle, Sparkles, Newspaper, ExternalLink } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { StockIntelligence, NewsArticle } from '../types';
import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
import ReactMarkdown from 'react-markdown';

export default function StockDetail({ symbol, onBack }: { symbol: string, onBack: () => void }) {
  const [data, setData] = useState<StockIntelligence | null>(null);
  const [peers, setPeers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiInsight, setAiInsight] = useState<string>('');
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [generatingAi, setGeneratingAi] = useState(false);
  const [signalExplanations, setSignalExplanations] = useState<Record<string, string>>({});

  useEffect(() => {
    setLoading(true);
    fetch(`/api/stocks/${symbol}`)
      .then(async res => {
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error || `Failed to fetch stock data: ${res.status}`);
        }
        return res.json();
      })
      .then(async (stockData) => {
        if (stockData && stockData.stock && stockData.stock.symbol) {
          setData(stockData);
          setLoading(false);
          generateAIInsight(stockData);
          
          // Fetch peers
          fetch(`/api/stocks/${symbol}/peers`)
            .then(res => res.json())
            .then(peerData => setPeers(peerData))
            .catch(err => console.error('Failed to fetch peers:', err));
        } else {
          console.error('Invalid stock data received for symbol:', symbol, stockData);
          setData(null);
          setLoading(false);
        }
      })
      .catch(err => {
        console.error(`Fetch error for ${symbol}:`, err);
        setData(null);
        setLoading(false);
      });
  }, [symbol]);

  const generateAIInsight = async (stockData: StockIntelligence) => {
    if (!stockData || !stockData.stock || !stockData.stock.name) {
      console.warn("Insufficient stock data for AI generation");
      setAiInsight('Detailed analysis unavailable due to incomplete data.');
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("Gemini API key is missing");
      setAiInsight('Unable to generate AI analysis: API key is missing.');
      return;
    }

    const ai = new GoogleGenAI({ apiKey });

    const now = new Date();
    const currentDateTime = now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

    setGeneratingAi(true);
    setAiInsight('');
    setNews([]);
    try {
      const prompt = `You are a professional financial analyst specializing in the Indian market.
      Current Date & Time: ${currentDateTime} IST.
      Analyze this stock data for ${stockData.stock.name} (${stockData.stock.symbol}):
      Price: ₹${stockData.stock.price}
      Score: ${stockData.score}/100
      Signals: ${stockData.signals?.map(s => `${s.name}: ${s.description}`).join('; ') || 'No specific signals detected'}
      
      Provide a concise, professional investment insight for an Indian retail investor. 
      Use Google Search to find the LATEST news, corporate announcements, and market context for this stock as of ${currentDateTime}.
      Also, for each detected signal, provide a plain-English explanation of why it matters for the investor.
      Finally, extract a list of the top 3-4 most relevant recent news articles with their titles, sources, and URLs.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: prompt,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          tools: [{ googleSearch: {} }],
          toolConfig: {
            includeServerSideToolInvocations: true
          } as any,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: {
                type: Type.STRING,
                description: "A markdown-formatted summary including Market Context, Risk Profile, and Strategic Verdict."
              },
              explanations: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    signalName: { type: Type.STRING },
                    explanation: { type: Type.STRING, description: "A plain-English explanation of the signal." }
                  },
                  required: ["signalName", "explanation"]
                }
              },
              news: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    url: { type: Type.STRING },
                    source: { type: Type.STRING },
                    date: { type: Type.STRING, description: "Relative date like '2 hours ago' or 'Yesterday'" },
                    summary: { type: Type.STRING, description: "A very brief one-sentence summary of the news." }
                  },
                  required: ["title", "url", "source", "date"]
                }
              }
            },
            required: ["summary", "explanations", "news"]
          }
        }
      });

      const result = JSON.parse(response.text || '{}');
      let summary = result.summary || 'Analysis currently unavailable.';
      
      // Append grounding sources if available
      const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (groundingChunks && groundingChunks.length > 0) {
        const sources = groundingChunks
          .filter(chunk => chunk.web)
          .map(chunk => `* [${chunk.web?.title}](${chunk.web?.uri})`)
          .join('\n');
        if (sources) {
          summary += `\n\n**Research Sources:**\n${sources}`;
        }
      }

      setAiInsight(summary);
      setNews(result.news || []);
      
      const explanationsMap: Record<string, string> = {};
      result.explanations?.forEach((exp: any) => {
        explanationsMap[exp.signalName] = exp.explanation;
      });
      setSignalExplanations(explanationsMap);

    } catch (error: any) {
      console.error("AI Insight Generation failed:", error);
      const errorMsg = error?.message || '';
      if (errorMsg.includes('xhr error')) {
        setAiInsight('I encountered a temporary network issue while generating this analysis. Please refresh or try again in a moment.');
      } else {
        setAiInsight('Unable to generate AI analysis at this time. Please review the technical signals below.');
      }
    } finally {
      setGeneratingAi(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-10 w-48 bg-zinc-900 rounded-lg" />
        <div className="h-96 bg-zinc-900 rounded-3xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-48 bg-zinc-900 rounded-2xl" />
          <div className="h-48 bg-zinc-900 rounded-2xl" />
          <div className="h-48 bg-zinc-900 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!data || !data.stock) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="p-4 rounded-full bg-red-500/10 text-red-500">
          <AlertCircle size={32} />
        </div>
        <div className="text-center">
          <h3 className="text-xl font-bold text-white mb-2">Stock Not Found</h3>
          <p className="text-zinc-400 max-w-xs mx-auto">
            We couldn't find data for "{symbol}". It may be delisted, or the ticker symbol might be incorrect.
          </p>
        </div>
        <button 
          onClick={onBack}
          className="mt-4 px-6 py-2 rounded-full bg-zinc-800 text-white hover:bg-zinc-700 transition-colors"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <button 
        onClick={onBack}
        className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors group"
      >
        <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
        Back to Radar
      </button>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Left Column: Chart and Stats */}
        <div className="flex-1 space-y-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-4xl font-bold font-mono tracking-tighter">{data.stock.symbol}</h1>
                <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 text-[10px] font-bold uppercase tracking-widest">NSE</span>
              </div>
              <p className="text-zinc-500 font-medium">{data.stock.name}</p>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold font-mono tracking-tighter">₹{data.stock.price.toFixed(2)}</div>
              <div className={`text-sm font-bold flex items-center justify-end gap-1 ${data.stock.change >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                {data.stock.change >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                {data.stock.change.toFixed(2)} ({data.stock.changePercent.toFixed(2)}%)
              </div>
            </div>
          </div>

          <div className="bg-zinc-900/40 border border-zinc-800 rounded-3xl p-6 h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.chartData}>
                <defs>
                  <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  stroke="#4b5563" 
                  fontSize={10} 
                  tickFormatter={(str) => str.split('-').slice(1).join('/')}
                />
                <YAxis 
                  stroke="#4b5563" 
                  fontSize={10} 
                  domain={['auto', 'auto']}
                  tickFormatter={(val) => `₹${val}`}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '12px' }}
                  itemStyle={{ color: '#10b981' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="price" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorPrice)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Market Cap', value: `₹${(data.stock.marketCap / 10000000).toFixed(0)} Cr` },
              { label: 'P/E Ratio', value: data.stock.peRatio?.toFixed(2) || 'N/A' },
              { label: '52W High', value: `₹${data.stock.high52w.toFixed(2)}` },
              { label: '52W Low', value: `₹${data.stock.low52w.toFixed(2)}` },
            ].map((stat, i) => (
              <div key={i} className="bg-zinc-900/40 border border-zinc-800 p-4 rounded-2xl">
                <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold block mb-1">{stat.label}</span>
                <span className="text-sm font-bold font-mono">{stat.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Intelligence */}
        <div className="w-full lg:w-96 space-y-6">
          <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-3xl p-6 relative overflow-hidden">
            <div className="relative z-10 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-widest text-emerald-500">Intelligence Score</h3>
                <Zap size={20} className="text-emerald-500 fill-emerald-500" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-6xl font-black tracking-tighter text-white">{data.score}</span>
                <span className="text-emerald-500/60 font-bold">/ 100</span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Based on {data.signals.length} active signals and historical backtesting data.
              </p>
            </div>
            <div className="absolute -right-4 -bottom-4 opacity-10">
              <Zap size={120} />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2">
              <Target size={14} /> Active Signals
            </h3>
            <div className="space-y-3">
              {data.signals.map((signal, i) => (
                <div key={i} className="bg-zinc-900/40 border border-zinc-800 p-4 rounded-2xl space-y-2">
                  <div className="flex justify-between items-start">
                    <span className="text-sm font-bold text-zinc-200">{signal.name}</span>
                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500">+{signal.weight}</span>
                  </div>
                  <p className="text-xs text-zinc-500 leading-relaxed">{signal.description}</p>
                  
                  {signalExplanations[signal.name] && (
                    <div className="mt-3 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Sparkles size={10} className="text-emerald-500" />
                        <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">AI Explanation</span>
                      </div>
                      <p className="text-[11px] text-zinc-400 leading-relaxed italic">
                        {signalExplanations[signal.name]}
                      </p>
                    </div>
                  )}

                  {signal.historicalWinRate && (
                    <div className="pt-2 flex items-center gap-4 border-t border-zinc-800/50">
                      <div className="flex items-center gap-1">
                        <History size={10} className="text-zinc-500" />
                        <span className="text-[10px] text-zinc-400 font-medium">Win Rate: <span className="text-emerald-500">{(signal.historicalWinRate * 100).toFixed(0)}%</span></span>
                      </div>
                      <div className="flex items-center gap-1">
                        <TrendingUp size={10} className="text-zinc-500" />
                        <span className="text-[10px] text-zinc-400 font-medium">Avg. Ret: <span className="text-emerald-500">+{signal.avgReturn}%</span></span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-zinc-900/40 border border-zinc-800 rounded-3xl p-6 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2">
              <ShieldCheck size={14} /> AI Insight
            </h3>
            {generatingAi ? (
              <div className="space-y-2">
                <div className="h-3 w-full bg-zinc-800 rounded animate-pulse" />
                <div className="h-3 w-5/6 bg-zinc-800 rounded animate-pulse" />
                <div className="h-3 w-4/6 bg-zinc-800 rounded animate-pulse" />
              </div>
            ) : (
              <div className="prose prose-invert prose-xs max-w-none text-zinc-400 text-xs leading-relaxed">
                <ReactMarkdown>{aiInsight}</ReactMarkdown>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Peer Comparison and News Section */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Peer Comparison */}
        {peers.length > 0 && (
          <div className="bg-zinc-900/20 border border-zinc-800/50 rounded-3xl p-8 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <History size={20} className="text-zinc-400" />
                Peer Comparison
              </h3>
              <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Sector Analysis</span>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="py-4 px-4 text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Company</th>
                    <th className="py-4 px-4 text-[10px] uppercase tracking-widest text-zinc-500 font-bold text-right">Price</th>
                    <th className="py-4 px-4 text-[10px] uppercase tracking-widest text-zinc-500 font-bold text-right">24h Change</th>
                    <th className="py-4 px-4 text-[10px] uppercase tracking-widest text-zinc-500 font-bold text-right">Market Cap</th>
                    <th className="py-4 px-4 text-[10px] uppercase tracking-widest text-zinc-500 font-bold text-right">Intelligence Score</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Current Stock */}
                  <tr className="bg-emerald-500/5 border-b border-zinc-800/50">
                    <td className="py-4 px-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-white">{data.stock.symbol}</span>
                        <span className="text-[10px] text-zinc-500">{data.stock.name}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right font-mono text-sm">₹{data.stock.price.toFixed(2)}</td>
                    <td className={`py-4 px-4 text-right font-mono text-sm font-bold ${data.stock.changePercent >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {data.stock.changePercent.toFixed(2)}%
                    </td>
                    <td className="py-4 px-4 text-right font-mono text-sm text-zinc-400">
                      ₹{(data.stock.marketCap / 10000000).toFixed(0)} Cr
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500" style={{ width: `${data.score}%` }} />
                        </div>
                        <span className="font-bold text-emerald-500 font-mono text-sm">{data.score}</span>
                      </div>
                    </td>
                  </tr>
                  {/* Peers */}
                  {peers.map((peer, i) => (
                    <tr key={i} className="border-b border-zinc-800/30 hover:bg-zinc-800/10 transition-colors">
                      <td className="py-4 px-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-zinc-300">{peer.symbol}</span>
                          <span className="text-[10px] text-zinc-500">{peer.name}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-right font-mono text-sm text-zinc-400">₹{peer.price.toFixed(2)}</td>
                      <td className={`py-4 px-4 text-right font-mono text-sm ${peer.changePercent >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {peer.changePercent.toFixed(2)}%
                      </td>
                      <td className="py-4 px-4 text-right font-mono text-sm text-zinc-500">
                        ₹{(peer.marketCap / 10000000).toFixed(0)} Cr
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                            <div className="h-full bg-zinc-600" style={{ width: `${peer.score}%` }} />
                          </div>
                          <span className="font-bold text-zinc-400 font-mono text-sm">{peer.score}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Recent News Section */}
        <div className="bg-zinc-900/20 border border-zinc-800/50 rounded-3xl p-8 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Newspaper size={20} className="text-zinc-400" />
              Recent News
            </h3>
            <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Latest Updates</span>
          </div>

          <div className="space-y-4">
            {generatingAi ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-2 animate-pulse">
                  <div className="h-4 w-3/4 bg-zinc-800 rounded" />
                  <div className="h-3 w-1/4 bg-zinc-800 rounded" />
                </div>
              ))
            ) : news.length > 0 ? (
              news.map((article, i) => (
                <a 
                  key={i} 
                  href={article.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="block p-4 rounded-2xl bg-zinc-900/40 border border-zinc-800 hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all group"
                >
                  <div className="flex justify-between items-start gap-4 mb-2">
                    <h4 className="text-sm font-bold text-zinc-200 group-hover:text-emerald-500 transition-colors leading-snug">
                      {article.title}
                    </h4>
                    <ExternalLink size={14} className="text-zinc-600 group-hover:text-emerald-500 flex-shrink-0" />
                  </div>
                  {article.summary && (
                    <p className="text-xs text-zinc-500 mb-3 line-clamp-2 leading-relaxed">
                      {article.summary}
                    </p>
                  )}
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{article.source}</span>
                    <span className="w-1 h-1 rounded-full bg-zinc-800" />
                    <span className="text-[10px] text-zinc-500">{article.date}</span>
                  </div>
                </a>
              ))
            ) : (
              <div className="text-center py-8">
                <p className="text-sm text-zinc-500 italic">No recent news articles found.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
