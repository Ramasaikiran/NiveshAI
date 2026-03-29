import React, { useState, useEffect } from 'react';
import { Radar, ArrowUpRight, ArrowDownRight, Zap, TrendingUp, Search } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface RadarStock {
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
  score: number;
}

export default function OpportunityRadar({ onSelectStock }: { onSelectStock: (s: string) => void }) {
  const [stocks, setStocks] = useState<RadarStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetch('/api/radar')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setStocks(data);
        } else {
          console.error('Radar data is not an array:', data);
          setStocks([]);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setStocks([]);
        setLoading(false);
      });
  }, []);

  const filteredStocks = Array.isArray(stocks) ? stocks.filter(s => 
    s.symbol.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) : [];

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="h-48 bg-zinc-900/50 rounded-2xl animate-pulse border border-zinc-800" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Opportunity Radar</h2>
          <p className="text-zinc-400">High-conviction signals detected in the last 24 hours across NSE.</p>
        </div>
        
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
          <input 
            type="text" 
            placeholder="Search symbol or company..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredStocks.map((stock) => (
          <div 
            key={stock.symbol}
            onClick={() => onSelectStock(stock.symbol)}
            className="group relative bg-zinc-900/40 border border-zinc-800 hover:border-emerald-500/50 rounded-2xl p-6 transition-all cursor-pointer hover:shadow-2xl hover:shadow-emerald-500/5"
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-bold font-mono group-hover:text-emerald-400 transition-colors">{stock.symbol}</h3>
                <p className="text-xs text-zinc-500 truncate max-w-[150px]">{stock.name}</p>
              </div>
              <div className={cn(
                "flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold",
                stock.changePercent >= 0 ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
              )}>
                {stock.changePercent >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                {Math.abs(stock.changePercent).toFixed(2)}%
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-end justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Opportunity Score</span>
                  <div className="flex items-center gap-2">
                    <span className="text-3xl font-bold tracking-tighter">{stock.score}</span>
                    <div className="h-2 w-24 bg-zinc-800 rounded-full overflow-hidden">
                      <div 
                        className={cn(
                          "h-full transition-all duration-1000",
                          stock.score > 75 ? "bg-emerald-500" : stock.score > 50 ? "bg-amber-500" : "bg-rose-500"
                        )}
                        style={{ width: `${stock.score}%` }}
                      />
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold block">Price</span>
                  <span className="text-lg font-bold font-mono">₹{stock.price?.toFixed(2)}</span>
                </div>
              </div>

              <div className="flex gap-2">
                {stock.score > 80 && (
                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-500 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                    <Zap size={10} /> High Conviction
                  </span>
                )}
                {stock.changePercent > 3 && (
                  <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-500 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                    <TrendingUp size={10} /> Momentum
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredStocks.length === 0 && (
        <div className="text-center py-20 bg-zinc-900/20 rounded-3xl border border-dashed border-zinc-800">
          <p className="text-zinc-500">No stocks matching your search were found in the radar.</p>
        </div>
      )}
    </div>
  );
}
