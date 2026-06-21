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

  const inputId = compact ? 'location-search-compact' : 'location-search';

  return (
    <div className="relative">
      <label htmlFor={inputId} className="sr-only">Search for an address, neighborhood, landmark, or city</label>
      <div className={`flex items-center gap-2 bg-civic-surface border border-civic-border rounded-lg focus-within:ring-2 focus-within:ring-civic-accent/40 focus-within:border-civic-accent ${compact ? 'px-2.5 py-2' : 'px-3 py-2.5'}`}>
        <Search className="w-4 h-4 text-civic-text-muted shrink-0" />
        <input
          id={inputId}
          value={query}
          onChange={handleChange}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          placeholder={compact ? 'Search address, landmark, city…' : 'Search for an address, neighborhood, landmark, or city'}
          className="flex-1 min-w-0 bg-transparent text-sm text-civic-text placeholder-civic-text-muted focus:outline-none"
        />
        {(searching || resolving) && <Loader2 className="w-3.5 h-3.5 text-civic-accent animate-spin shrink-0" />}
        {!searching && !resolving && query && (
          <button
            onClick={handleClear}
            aria-label="Clear search"
            className="text-civic-text-muted hover:text-civic-text shrink-0 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-civic-accent/40">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {error && (
        <div className="text-xs text-civic-risk-high mt-1.5">{error}</div>
      )}

      {open && suggestions.length > 0 && (
        <div className="absolute z-[2000] mt-1.5 w-full bg-civic-surface border border-civic-border rounded-lg shadow-civic-sm overflow-hidden">
          {suggestions.map(s => (
            <button
              key={s.placeId}
              onClick={() => handleSelect(s)}
              className="w-full flex items-start gap-2 text-left px-3 py-2.5 hover:bg-civic-surface-secondary transition-colors border-b border-civic-border last:border-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-civic-accent/40">
              <MapPin className="w-3.5 h-3.5 text-civic-accent shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-medium text-civic-text">{s.mainText || s.text}</div>
                {s.secondaryText && <div className="text-[11px] text-civic-text-muted">{s.secondaryText}</div>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
