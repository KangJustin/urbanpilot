import React, { useState, useRef, useEffect } from 'react';
import { Search, X, Loader2, MapPin } from 'lucide-react';
import { autocompleteLocation, getPlaceDetails } from '../services/analysisApi';

const DEBOUNCE_MS = 250;

export default function LocationSearch({ onLocationSelected, compact = false }) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [error, setError] = useState(null);
  const [open, setOpen] = useState(false);

  const debounceRef = useRef(null);
  const abortRef = useRef(null);
  const latestQueryRef = useRef('');

  useEffect(() => {
    return () => {
      clearTimeout(debounceRef.current);
      abortRef.current?.abort();
    };
  }, []);

  function handleChange(e) {
    const value = e.target.value;
    setQuery(value);
    setError(null);
    latestQueryRef.current = value;
    clearTimeout(debounceRef.current);
    abortRef.current?.abort();

    if (!value.trim()) {
      setSuggestions([]);
      setOpen(false);
      setSearching(false);
      return;
    }

    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const { suggestions: results } = await autocompleteLocation(value, controller.signal);
        // Discard if a newer keystroke has superseded this request.
        if (latestQueryRef.current !== value) return;
        setSuggestions(results || []);
        setOpen(true);
      } catch (err) {
        if (err.name === 'AbortError') return;
        if (latestQueryRef.current !== value) return;
        setError(err.message);
        setSuggestions([]);
      } finally {
        if (latestQueryRef.current === value) setSearching(false);
      }
    }, DEBOUNCE_MS);
  }

  async function handleSelect(suggestion) {
    setOpen(false);
    setResolving(true);
    setError(null);
    try {
      const location = await getPlaceDetails(suggestion.placeId);
      setQuery(location.formattedAddress);
      onLocationSelected(location);
    } catch (err) {
      setError(err.message);
    } finally {
      setResolving(false);
    }
  }

  function handleClear() {
    setQuery('');
    setSuggestions([]);
    setOpen(false);
    setError(null);
  }

  return (
    <div className="relative">
      <div className={`flex items-center gap-2 bg-slate-800/60 border border-slate-700 rounded-lg ${compact ? 'px-2.5 py-2' : 'px-3 py-2.5'}`}>
        <Search className="w-4 h-4 text-slate-500 shrink-0" />
        <input
          value={query}
          onChange={handleChange}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          placeholder={compact ? 'Search address, landmark, city…' : 'Search for an address, neighborhood, landmark, or city'}
          className="flex-1 min-w-0 bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none"
        />
        {(searching || resolving) && <Loader2 className="w-3.5 h-3.5 text-emerald-400 animate-spin shrink-0" />}
        {!searching && !resolving && query && (
          <button onClick={handleClear} className="text-slate-500 hover:text-slate-300 shrink-0">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {error && (
        <div className="text-xs text-rose-400 mt-1.5">{error}</div>
      )}

      {open && suggestions.length > 0 && (
        <div className="absolute z-[2000] mt-1.5 w-full bg-slate-800 border border-slate-700 rounded-lg shadow-xl overflow-hidden">
          {suggestions.map(s => (
            <button
              key={s.placeId}
              onClick={() => handleSelect(s)}
              className="w-full flex items-start gap-2 text-left px-3 py-2.5 hover:bg-slate-700 transition-colors border-b border-slate-700/60 last:border-0">
              <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-medium text-white">{s.mainText || s.text}</div>
                {s.secondaryText && <div className="text-[11px] text-slate-500">{s.secondaryText}</div>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
