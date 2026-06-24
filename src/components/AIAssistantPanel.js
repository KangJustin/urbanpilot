import React, { useState } from 'react';
import { Send, MessageCircle, Loader2, X } from 'lucide-react';
import { Badge } from './ui/badge';

const SUGGESTED_QUESTIONS = [
  'How will this area handle extreme heat?',
  'What is the impact of increasing density here?',
  'Which recommendation has the biggest equity benefit?',
  'What are the biggest risks if we do nothing?',
];

// Docked AI assistant, collapsible — restyled from the original "Ask AI" tab into a floating
// panel so it's reachable regardless of which analysis section is active. Logic/state all still
// owned by App.js. Civic-planning redesign Phase 6: restyled to a restrained light panel, no
// sparkle/glow — same open/close state, message list shape, suggested questions, input/send
// behavior, loading behavior, and error display as before; nothing here calls a different
// handler or changes when loading begins/ends.
export default function AIAssistantPanel({ chatMessages, chatInput, setChatInput, chatLoading, onAsk, enabled }) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        aria-label="Ask UrbanPilot AI"
        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[2000] flex items-center gap-2 bg-civic-accent hover:bg-civic-accent/90 text-white rounded-full px-4 py-2.5 shadow-civic-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-civic-accent/40">
        <MessageCircle className="w-4 h-4" />
        <span className="text-xs font-semibold">Ask UrbanPilot AI</span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[2000] w-[calc(100vw-2rem)] sm:w-[340px] max-h-[70vh] sm:max-h-[480px] flex flex-col bg-civic-surface border border-civic-border rounded-xl shadow-civic-sm overflow-hidden">
      <div className="shrink-0 flex items-center justify-between px-3.5 py-2.5 border-b border-civic-border bg-civic-surface-secondary">
        <div className="flex items-center gap-1.5">
          <MessageCircle className="w-3.5 h-3.5 text-civic-accent" />
          <span className="text-xs font-semibold text-civic-text">Ask UrbanPilot AI</span>
          <Badge tone="civic-modeled">BETA</Badge>
        </div>
        <button
          onClick={() => setOpen(false)} aria-label="Close AI assistant"
          className="text-civic-text-muted hover:text-civic-text rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-civic-accent/40">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3.5 py-3 space-y-2" aria-live="polite">
        {!enabled ? (
          <p className="text-[11px] text-civic-text-muted italic">Run an analysis first, then ask questions about the results.</p>
        ) : chatMessages.length === 0 ? (
          <div className="space-y-1.5">
            <div className="text-[11px] text-civic-text-muted mb-1.5 flex items-center gap-1.5">
              <MessageCircle className="w-3.5 h-3.5" /> Try asking:
            </div>
            {SUGGESTED_QUESTIONS.map(q => (
              <button
                key={q}
                onClick={() => onAsk(q)}
                className="block w-full text-left text-[11px] bg-civic-surface-secondary hover:bg-civic-border/40 border border-civic-border rounded-lg px-2.5 py-2 text-civic-text transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-civic-accent/40">
                {q}
              </button>
            ))}
          </div>
        ) : (
          <>
            {chatMessages.map((m, i) => (
              <div key={i} className={m.role === 'user' ? 'text-right' : ''}>
                <div className={`inline-block max-w-[90%] text-[11px] rounded-lg px-3 py-2 leading-relaxed ${
                  m.role === 'user' ? 'bg-civic-accent text-white' : 'bg-civic-surface-secondary text-civic-text'
                }`}>
                  {m.text}
                </div>
              </div>
            ))}
            {chatLoading && (
              <div className="flex items-center gap-1.5 text-[11px] text-civic-text-muted">
                <Loader2 className="w-3 h-3 animate-spin" /> Thinking…
              </div>
            )}
          </>
        )}
      </div>

      <div className="shrink-0 flex gap-2 px-3.5 py-3 border-t border-civic-border">
        <label htmlFor="ai-assistant-input" className="sr-only">Ask UrbanPilot AI a question</label>
        <input
          id="ai-assistant-input"
          value={chatInput}
          onChange={e => setChatInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') onAsk(chatInput); }}
          disabled={!enabled}
          placeholder="Ask UrbanPilot…"
          className="flex-1 min-w-0 bg-civic-surface border border-civic-border text-civic-text text-xs rounded-lg px-3 py-2 placeholder-civic-text-muted focus:outline-none focus:ring-2 focus:ring-civic-accent/40 focus:border-civic-accent transition-colors disabled:opacity-50"
        />
        <button
          onClick={() => onAsk(chatInput)}
          disabled={!enabled || !chatInput.trim() || chatLoading}
          aria-label="Send question"
          className="shrink-0 w-9 h-9 flex items-center justify-center rounded-lg bg-civic-accent hover:bg-civic-accent/90 disabled:opacity-40 text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-civic-accent/40">
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
