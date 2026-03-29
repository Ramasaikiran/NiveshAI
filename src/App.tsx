import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Zap, BarChart3, Search, MessageSquare, Radar, ArrowUpRight, ArrowDownRight, Info } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

import { StockIntelligence, ChatMessage } from './types';
import OpportunityRadar from './components/OpportunityRadar';
import StockDetail from './components/StockDetail';
import MarketChat from './components/MarketChat';
import { auth } from './firebase';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, User } from 'firebase/auth';

export default function App() {
  const [activeTab, setActiveTab] = useState<'radar' | 'chat'>('radar');
  const [selectedStock, setSelectedStock] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const handleLogout = () => signOut(auth);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="animate-pulse text-emerald-500 font-mono">INITIALIZING NIVESHAI...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center p-4 text-white">
        <div className="max-w-md w-full space-y-8 text-center">
          <div className="space-y-2">
            <h1 className="text-5xl font-bold tracking-tighter text-emerald-500 font-mono">NIVESHAI</h1>
            <p className="text-zinc-400">Next-gen Stock Intelligence for Indian Retail Investors</p>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800 p-8 rounded-2xl space-y-6">
            <p className="text-sm text-zinc-500">Connect your account to access Opportunity Radar, Signal Scoring, and AI-powered insights.</p>
            <button 
              onClick={handleLogin}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-3 rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <img src="https://www.google.com/favicon.ico" className="w-4 h-4 invert" alt="Google" />
              Sign in with Google
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-zinc-100 font-sans selection:bg-emerald-500/30">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-[#0A0A0A]/80 backdrop-blur-xl border-bottom border-zinc-800/50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <h1 
              className="text-xl font-bold tracking-tighter text-emerald-500 font-mono cursor-pointer"
              onClick={() => { setSelectedStock(null); setActiveTab('radar'); }}
            >
              NIVESHAI
            </h1>
            <div className="hidden md:flex items-center gap-1 bg-zinc-900/50 p-1 rounded-lg border border-zinc-800">
              <button 
                onClick={() => { setActiveTab('radar'); setSelectedStock(null); }}
                className={cn(
                  "px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2",
                  activeTab === 'radar' ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-400 hover:text-zinc-200"
                )}
              >
                <Radar size={16} />
                Radar
              </button>
              <button 
                onClick={() => { setActiveTab('chat'); setSelectedStock(null); }}
                className={cn(
                  "px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2",
                  activeTab === 'chat' ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-400 hover:text-zinc-200"
                )}
              >
                <MessageSquare size={16} />
                Market Chat
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-xs font-medium text-zinc-200">{user.displayName}</span>
              <button onClick={handleLogout} className="text-[10px] text-zinc-500 hover:text-zinc-300 uppercase tracking-widest">Sign Out</button>
            </div>
            <img src={user.photoURL || ''} className="w-8 h-8 rounded-full border border-zinc-700" alt="Avatar" />
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {selectedStock ? (
          <StockDetail 
            symbol={selectedStock} 
            onBack={() => setSelectedStock(null)} 
          />
        ) : activeTab === 'radar' ? (
          <OpportunityRadar onSelectStock={setSelectedStock} />
        ) : (
          <MarketChat />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-900 mt-20 py-12">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="space-y-2 text-center md:text-left">
            <h2 className="text-emerald-500 font-mono font-bold">NIVESHAI</h2>
            <p className="text-xs text-zinc-500 max-w-xs">AI-powered stock intelligence for the modern Indian investor. Data sourced from NSE via Yahoo Finance.</p>
          </div>
          <div className="flex gap-8 text-xs text-zinc-500 font-medium uppercase tracking-widest">
            <a href="#" className="hover:text-emerald-500 transition-colors">Terms</a>
            <a href="#" className="hover:text-emerald-500 transition-colors">Privacy</a>
            <a href="#" className="hover:text-emerald-500 transition-colors">Disclaimer</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
