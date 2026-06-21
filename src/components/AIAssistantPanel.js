import React, { useState } from 'react';
import { Send, MessageCircle, Loader2, Sparkles, X } from 'lucide-react';
import { Badge } from './ui/badge';

const SUGGESTED_QUESTIONS = [
  'How will this area handle extreme heat?',
  'What is the impact of increasing density here?',
  'Which recommendation has the biggest equity benefit?',
  'What are the biggest risks if we do nothing?',
];

// Docked AI assistant, collapsible — restyled from the original "Ask AI" tab into a floating
// panel so it's reachable regardless of which analysis section is active, matching the
// mockup's bottom-right assistant card. Logic/state all still owned by App.js.
export default function AIAssistantPanel({ chatMessages, chatInput, setChatInput, chatLoading, onAsk, enabled }) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-[2000] flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full px-4 py-2.5 shadow-lg shadow-emerald-900/40 transition-colors">
        <Sparkles className="w-4 h-4" />
        <span className="text-xs font-semibold">Ask UrbanPilot AI</span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-5 right-5 z-[2000] w-[340px] max-h-[480px] flex flex-col bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden">
      <div className="shrink-0 flex items-center justify-between px-3.5 py-2.5 border-b border-slate-800 bg-slate-800/60">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-xs font-semibold text-white">UrbanPilot AI Assistant</span>
          <Badge tone="violet">BETA</Badge>
        </div>
        <button onClick={() => setOpen(false)} className="text-slate-500 hover:text-slate-300">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3.5 py-3 space-y-2">
        {!enabled ? (
          <p className="text-[11px] text-slate-600 italic">Run an analysis first, then ask questions about the results.</p>
        ) : chatMessages.length === 0 ? (
          <div className="space-y-1.5">
            <div className="text-[11px] text-slate-500 mb-1.5 flex items-center gap-1.5">
              <MessageCircle className="w-3.5 h-3.5" /> Try asking:
            </div>
            {SUGGESTED_QUESTIONS.map(q => (
              <button
                key={q}
                onClick={() => onAsk(q)}
                className="block w-full text-left text-[11px] bg-slate-800/40 hover:bg-slate-800 border border-slate-700/40 rounded-lg px-2.5 py-2 text-slate-300 transition-colors">
                {q}
              </button>
            ))}
          </div>
        ) : (
          <>
            {chatMessages.map((m, i) => (
              <div key={i} className={m.role === 'user' ? 'text-right' : ''}>
                <div className={`inline-block max-w-[90%] text-[11px] rounded-lg px-3 py-2 leading-relaxed ${
                  m.role === 'user' ? 'bg-emerald-700 text-white' : 'bg-slate-800 text-slate-300'
                }`}>
                  {m.text}
                </div>
              </div>
            ))}
            {chatLoading && (
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                <Loader2 className="w-3 h-3 animate-spin" /> Thinking…
              </div>
            )}
          </>
        )}
      </div>

      <div className="shrink-0 flex gap-2 px-3.5 py-3 border-t border-slate-800">
        <input
          value={chatInput}
          onChange={e => setChatInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') onAsk(chatInput); }}
          disabled={!enabled}
          placeholder="Ask UrbanPilot…"
          className="flex-1 min-w-0 bg-slate-800 border border-slate-700 text-white text-xs rounded-lg px-3 py-2 placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-colors disabled:opacity-50"
        />
        <button
          onClick={() => onAsk(chatInput)}
          disabled={!enabled || !chatInput.trim() || chatLoading}
          className="shrink-0 w-9 h-9 flex items-center justify-center rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white transition-colors">
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
