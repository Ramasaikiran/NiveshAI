import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, AlertCircle, Loader2 } from 'lucide-react';
import { GoogleGenAI, Type, FunctionDeclaration, ThinkingLevel } from "@google/genai";
import ReactMarkdown from 'react-markdown';
import { ChatMessage } from '../types';

const fetchStockDataDeclaration: FunctionDeclaration = {
  name: "fetch_stock_data",
  parameters: {
    type: Type.OBJECT,
    description: "Fetch real-time stock data for a given company name or ticker symbol on the NSE.",
    properties: {
      query: {
        type: Type.STRING,
        description: "The company name or ticker symbol (e.g., 'TCS', 'Reliance', 'INFY').",
      },
    },
    required: ["query"],
  },
};

export default function MarketChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! I am your NiveshAI assistant. I can provide real-time stock prices and analysis for Indian markets. Ask me about any stock like "What is the price of RELIANCE?" or "Should I buy TCS?"',
      timestamp: Date.now()
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchStockData = async (query: string) => {
    try {
      const res = await fetch(`/api/stocks/${encodeURIComponent(query)}`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        if (res.status === 404 || errorData.error?.includes('No data found')) {
          return { error: `I couldn’t find that stock. Try using the correct name or ticker.` };
        }
        throw new Error(errorData.error || 'Failed to fetch stock data');
      }
      const data = await res.json();
      
      return {
        company_name: data.stock.name,
        ticker: data.stock.symbol,
        price: data.stock.price,
        change: data.stock.change,
        change_percent: data.stock.changePercent,
        currency: 'INR',
        exchange: 'NSE',
        timestamp: new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' }),
        // Adding extra context for "Should I buy" questions
        score: data.score,
        signals: data.signals
      };
    } catch (error) {
      console.error("Tool execution failed:", error);
      return { error: "I am not fully sure right now because I couldn’t fetch live data. Please try again." };
    }
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: 'I am sorry, but the Gemini API key is missing. Please check your environment configuration.',
        timestamp: Date.now()
      }]);
      return;
    }

    const ai = new GoogleGenAI({ apiKey });

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    const now = new Date();
    const currentDateTime = now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: [
          { role: 'user', parts: [{ text: input }] }
        ],
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          tools: [
            { functionDeclarations: [fetchStockDataDeclaration] },
            { googleSearch: {} }
          ],
          toolConfig: {
            includeServerSideToolInvocations: true
          } as any,
          systemInstruction: `You are NiveshAI, a real-time financial assistant for the Indian stock market.
          
          Current Date & Time: ${currentDateTime} IST.
          
          🚨 HARD RULES (NON-NEGOTIABLE):
          - You MUST fetch real-time data using the 'fetch_stock_data' tool for specific NSE stock prices. This is your PRIMARY source for prices.
          - If the user asks for "today's price" or "current price", you MUST use the tool.
          - Use 'googleSearch' ONLY for broader market news, trends, or if the primary tool is unavailable.
          - If search results contradict the tool data (e.g., search shows an older date), ALWAYS prioritize the tool data for prices.
          - You MUST NOT guess, estimate, or hallucinate prices.
          - If data cannot be fetched from either source, say: "I am not fully sure right now because I couldn’t fetch live data. Please try again."
          
          🧠 INSTRUCTIONS:
          When a user asks about stock prices or recommendations:
          1. Extract the company name or ticker.
          2. CALL the 'fetch_stock_data' tool for NSE stocks.
          3. Use 'googleSearch' for broader context, news, or if the primary tool is unavailable.
          4. Respond in this format:
             "[Company Name] ([Ticker]) is currently trading at ₹[Price] on [Exchange].
             Change: [Change] ([Change Percent]%)
             Last updated: [Timestamp] IST."
          
          📊 EXTENDED QUESTIONS:
          If a user asks "Should I buy [Stock]?", first fetch the data, then combine it with the provided 'score' and 'signals' from the tool output AND recent news from Google Search to give a professional reasoning (NOT financial advice).
          
          ⚠️ ERROR HANDLING:
          - If the stock is not found, say: "I couldn’t find that stock. Try using the correct name or ticker."
          
          ❌ DO NOT:
          - Never answer without calling the tool or using search.
          - Never give outdated prices.
          - Never fabricate numbers.
          
          Always include a disclaimer: "Disclaimer: I am an AI assistant, not a SEBI-registered financial advisor. Please consult with a professional before making investment decisions."`
        }
      });

      let finalContent = response.text || '';
      const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      
      // Handle function calls
      const functionCalls = response.functionCalls;
      if (functionCalls) {
        const toolResponses = [];
        for (const call of functionCalls) {
          if (call.name === 'fetch_stock_data') {
            const toolResult = await fetchStockData(call.args.query as string);
            toolResponses.push({
              functionResponse: {
                name: 'fetch_stock_data',
                response: toolResult
              }
            });
          }
        }

        // Send tool results back to model
        const secondResponse = await ai.models.generateContent({
          model: "gemini-3.1-pro-preview",
          contents: [
            { role: 'user', parts: [{ text: input }] },
            { role: 'model', parts: response.candidates[0].content.parts },
            { role: 'user', parts: toolResponses }
          ],
          config: {
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            tools: [{ googleSearch: {} }],
            toolConfig: {
              includeServerSideToolInvocations: true
            } as any,
            systemInstruction: `You are NiveshAI, a real-time financial assistant. 
            Current Date & Time: ${currentDateTime} IST.
            Follow the formatting rules provided in the initial instruction. ALWAYS prioritize the tool data for prices.`
          }
        });
        finalContent = secondResponse.text || '';
        
        // Append grounding sources if available from second response
        const secondGrounding = secondResponse.candidates?.[0]?.groundingMetadata?.groundingChunks;
        if (secondGrounding && secondGrounding.length > 0) {
          const sources = secondGrounding
            .filter(chunk => chunk.web)
            .map(chunk => `* [${chunk.web?.title}](${chunk.web?.uri})`)
            .join('\n');
          if (sources) {
            finalContent += `\n\n**Sources:**\n${sources}`;
          }
        }
      } else if (groundingChunks && groundingChunks.length > 0) {
        // Append grounding sources if available from first response
        const sources = groundingChunks
          .filter(chunk => chunk.web)
          .map(chunk => `* [${chunk.web?.title}](${chunk.web?.uri})`)
          .join('\n');
        if (sources) {
          finalContent += `\n\n**Sources:**\n${sources}`;
        }
      }

      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: finalContent || 'I apologize, but I could not process that request.',
        timestamp: Date.now()
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (error: any) {
      console.error("Chat failed", error);
      const errorMsg = error?.message || '';
      const displayMsg = errorMsg.includes('xhr error') 
        ? 'I encountered a network issue while connecting to my intelligence core. This usually happens due to a temporary connection problem. Please try again in a few seconds.'
        : 'Sorry, I encountered an error. Please try again later.';
      
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: displayMsg,
        timestamp: Date.now()
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-12rem)] flex flex-col bg-zinc-900/40 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/60">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
            <Bot size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Market ChatGPT</h3>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">AI Analyst Online</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-800/50 border border-zinc-700">
          <Sparkles size={12} className="text-amber-500" />
          <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Portfolio Aware</span>
        </div>
      </div>

      {/* Messages */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent"
      >
        {messages.map((msg) => (
          <div 
            key={msg.id}
            className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div className={`w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center ${
              msg.role === 'assistant' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-zinc-800 text-zinc-400'
            }`}>
              {msg.role === 'assistant' ? <Bot size={18} /> : <User size={18} />}
            </div>
            <div className={`max-w-[80%] space-y-1 ${msg.role === 'user' ? 'text-right' : ''}`}>
              <div className={`inline-block p-4 rounded-2xl text-sm leading-relaxed ${
                msg.role === 'assistant' 
                  ? 'bg-zinc-800/50 text-zinc-200 border border-zinc-700/50' 
                  : 'bg-emerald-600 text-white'
              }`}>
                <div className="prose prose-invert prose-sm max-w-none">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              </div>
              <div className="text-[10px] text-zinc-600 font-medium px-1">
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <Loader2 size={18} className="animate-spin" />
            </div>
            <div className="bg-zinc-800/30 border border-zinc-800 p-4 rounded-2xl">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-zinc-600 animate-bounce" />
                <div className="w-1.5 h-1.5 rounded-full bg-zinc-600 animate-bounce [animation-delay:0.2s]" />
                <div className="w-1.5 h-1.5 rounded-full bg-zinc-600 animate-bounce [animation-delay:0.4s]" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-6 bg-zinc-900/60 border-t border-zinc-800">
        <div className="relative flex items-center gap-3">
          <input 
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask about a stock (e.g., 'Is Reliance a good buy right now?')"
            className="flex-1 bg-zinc-800 border border-zinc-700 rounded-2xl py-3.5 px-5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all placeholder:text-zinc-500"
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:hover:bg-emerald-600 text-white p-3.5 rounded-2xl transition-all shadow-lg shadow-emerald-500/20"
          >
            <Send size={20} />
          </button>
        </div>
        <div className="mt-4 flex items-center gap-2 text-[10px] text-zinc-500 font-bold uppercase tracking-widest justify-center">
          <AlertCircle size={12} />
          <span>AI insights are for educational purposes only</span>
        </div>
      </div>
    </div>
  );
}
