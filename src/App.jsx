﻿import { useState, useEffect, useRef, useCallback } from 'react';
import CountdownTimer from './components/CountdownTimer';
import './App.css';

function minimizeWindow() {
  window.widgetWindow?.minimize?.();
}

function closeWindow() {
  window.widgetWindow?.close?.();
}

function StatNum({ value, onChange }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const inputRef = useRef(null);

  const startEdit = () => {
    setDraft(String(value));
    setEditing(true);
  };

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  const commit = () => {
    const n = parseInt(draft, 10);
    onChange(Number.isNaN(n) || n < 0 ? 0 : Math.min(n, 999));
    setEditing(false);
  };

  const handleKey = (e) => {
    if (e.key === 'Enter') commit();
    if (e.key === 'Escape') setEditing(false);
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        className="widget-stats-edit"
        type="text"
        inputMode="numeric"
        value={draft}
        onChange={(e) => setDraft(e.target.value.replace(/\D/g, '').slice(0, 3))}
        onBlur={commit}
        onKeyDown={handleKey}
        maxLength={3}
        aria-label="edit value"
      />
    );
  }

  return (
    <span
      className="widget-stats-num"
      onClick={startEdit}
      title="Click to edit"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && startEdit()}
    >
      {value}
    </span>
  );
}

export default function App() {
  const [stats, setStats] = useState({ refreshes: 0, timeouts: 0 });
  const loadedRef = useRef(false);

  // Load persisted stats on mount
  useEffect(() => {
    (async () => {
      const saved = await window.widgetWindow?.loadStats?.();
      if (saved) {
        setStats(saved);
      }
      loadedRef.current = true;
    })();
  }, []);

  // Save stats whenever they change (after initial load)
  useEffect(() => {
    if (!loadedRef.current) return;
    window.widgetWindow?.saveStats?.(stats);
  }, [stats]);

  const handleStatsFromTimer = useCallback((timerStats) => {
    setStats(prev => ({
      refreshes: prev.refreshes + (timerStats.refreshDelta ?? 0),
      timeouts: prev.timeouts + (timerStats.timeoutDelta ?? 0),
    }));
  }, []);

  const setRefreshes = useCallback((n) => setStats(prev => ({ ...prev, refreshes: n })), []);
  const setTimeouts = useCallback((n) => setStats(prev => ({ ...prev, timeouts: n })), []);

  return (
    <div className="app">
      <section className="widget-shell" aria-label="Countdown widget">
        <header className="widget-header">
          <div className="widget-stats" aria-live="polite">
            <span className="widget-stats-label">
              Refreshes: <StatNum value={stats.refreshes} onChange={setRefreshes} />
            </span>
            <span className="widget-stats-label">
              Timeouts: <StatNum value={stats.timeouts} onChange={setTimeouts} />
            </span>
          </div>
          <div className="widget-actions">
            <button
              type="button"
              className="window-button"
              aria-label="Minimize widget"
              onClick={minimizeWindow}
            >
              -
            </button>
            <button
              type="button"
              className="window-button close"
              aria-label="Close widget"
              onClick={closeWindow}
            >
              x
            </button>
          </div>
        </header>
        <main className="app-main">
          <CountdownTimer onStats={handleStatsFromTimer} />
        </main>
      </section>
    </div>
  );
}
