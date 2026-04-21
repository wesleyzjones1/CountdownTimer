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
  const [showStats, setShowStats] = useState(true);
  const [showTimeWhileRunning, setShowTimeWhileRunning] = useState(true);
  const [refreshCooldownEnabled, setRefreshCooldownEnabled] = useState(true);
  const [hueEnabled, setHueEnabled] = useState(true);
  const [mouseRefreshEnabled, setMouseRefreshEnabled] = useState(true);
  const loadedRef = useRef(false);
  const resizeSessionRef = useRef(null);
  const onResizeMoveRef = useRef(null);
  const stopResizeRef = useRef(null);
  const dragSessionRef = useRef(null);
  const onDragMoveRef = useRef(null);
  const stopDragRef = useRef(null);

  const applySettings = useCallback((settings) => {
    if (!settings) return;
    if (typeof settings.showStats === 'boolean') {
      setShowStats(settings.showStats);
    }
    if (typeof settings.showTimeWhileRunning === 'boolean') {
      setShowTimeWhileRunning(settings.showTimeWhileRunning);
    }
    if (typeof settings.refreshCooldownEnabled === 'boolean') {
      setRefreshCooldownEnabled(settings.refreshCooldownEnabled);
    }
    if (typeof settings.hueEnabled === 'boolean') {
      setHueEnabled(settings.hueEnabled);
    }
    if (typeof settings.mouseRefreshEnabled === 'boolean') {
      setMouseRefreshEnabled(settings.mouseRefreshEnabled);
    }
  }, []);

  const cleanupResize = useCallback(() => {
    resizeSessionRef.current = null;
    if (onResizeMoveRef.current) {
      window.removeEventListener('mousemove', onResizeMoveRef.current);
    }
    if (stopResizeRef.current) {
      window.removeEventListener('mouseup', stopResizeRef.current);
    }
    onResizeMoveRef.current = null;
    stopResizeRef.current = null;
  }, []);

  const cleanupDrag = useCallback(() => {
    dragSessionRef.current = null;
    if (onDragMoveRef.current) {
      window.removeEventListener('mousemove', onDragMoveRef.current);
    }
    if (stopDragRef.current) {
      window.removeEventListener('mouseup', stopDragRef.current);
    }
    onDragMoveRef.current = null;
    stopDragRef.current = null;
  }, []);

  const beginResize = useCallback(async (e, direction) => {
    e.preventDefault();
    e.stopPropagation();
    const bounds = await window.widgetWindow?.getBounds?.();
    if (!bounds) return;

    const session = {
      direction,
      startMouseX: e.screenX,
      startMouseY: e.screenY,
      startX: bounds.x,
      startY: bounds.y,
      startSize: bounds.width,
      startRight: bounds.x + bounds.width,
      startBottom: bounds.y + bounds.height,
    };
    resizeSessionRef.current = session;

    const onMove = (moveEvent) => {
      const current = resizeSessionRef.current;
      if (!current) return;

      const dx = moveEvent.screenX - current.startMouseX;
      const dy = moveEvent.screenY - current.startMouseY;
      const dir = current.direction;
      let delta = 0;

      if (dir === 'n') delta = -dy;
      else if (dir === 's') delta = dy;
      else if (dir === 'e') delta = dx;
      else if (dir === 'w') delta = -dx;
      else if (dir === 'ne') delta = Math.max(dx, -dy);
      else if (dir === 'nw') delta = Math.max(-dx, -dy);
      else if (dir === 'se') delta = Math.max(dx, dy);
      else if (dir === 'sw') delta = Math.max(-dx, dy);

      let size = Math.max(1, Math.round(current.startSize + delta));
      let x = current.startX;
      let y = current.startY;

      if (dir.includes('w')) {
        x = current.startRight - size;
      }
      if (dir.includes('n')) {
        y = current.startBottom - size;
      }

      window.widgetWindow?.setBounds?.({ x, y, size });
    };

    const stop = () => {
      cleanupResize();
    };

    onResizeMoveRef.current = onMove;
    stopResizeRef.current = stop;
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', stop, { once: true });
  }, [cleanupResize]);

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

  // Load and subscribe to settings changes from right-click context menu.
  useEffect(() => {
    let unsubscribe;
    (async () => {
      const settings = await window.widgetWindow?.loadSettings?.();
      applySettings(settings);
      unsubscribe = window.widgetWindow?.onSettingsChange?.((next) => {
        applySettings(next);
      });
    })();

    return () => {
      unsubscribe?.();
      cleanupResize();
      cleanupDrag();
    };
  }, [applySettings, cleanupDrag, cleanupResize]);

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

  const beginDrag = useCallback(async (e) => {
    if (e.button !== 0) return;
    if (e.target.closest('button, input, .resize-zone, .widget-actions-zone, .widget-stats')) return;
    e.preventDefault();
    const startMouseX = e.screenX;
    const startMouseY = e.screenY;
    const bounds = await window.widgetWindow?.getBounds?.();
    if (!bounds) return;
    dragSessionRef.current = { startMouseX, startMouseY, startX: bounds.x, startY: bounds.y };

    const onMove = (mv) => {
      const s = dragSessionRef.current;
      if (!s) return;
      window.widgetWindow?.setPosition?.({
        x: Math.round(s.startX + mv.screenX - s.startMouseX),
        y: Math.round(s.startY + mv.screenY - s.startMouseY),
      });
    };
    const stop = () => {
      cleanupDrag();
    };
    onDragMoveRef.current = onMove;
    stopDragRef.current = stop;
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', stop, { once: true });
  }, [cleanupDrag]);

  return (
    <div className="app">
      <section className="widget-shell" aria-label="Countdown widget" onMouseDown={beginDrag}>
        <header className="widget-header">
          {showStats ? (
            <div className="widget-stats" aria-live="polite">
              <span className="widget-stats-label">
                Refreshes: <StatNum value={stats.refreshes} onChange={setRefreshes} />
              </span>
              <span className="widget-stats-label">
                Timeouts: <StatNum value={stats.timeouts} onChange={setTimeouts} />
              </span>
            </div>
          ) : (
            <div className="widget-stats-hidden" aria-hidden="true" />
          )}
          <div className="widget-actions-zone">
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
          </div>
        </header>
        <main className="app-main">
          <CountdownTimer
            onStats={handleStatsFromTimer}
            showTimeWhileRunning={showTimeWhileRunning}
            refreshCooldown={refreshCooldownEnabled ? 5 : 0}
            hueEnabled={hueEnabled}
            mouseRefreshEnabled={mouseRefreshEnabled}
          />
        </main>
        <div className="resize-zone n" onMouseDown={(e) => beginResize(e, 'n')} />
        <div className="resize-zone s" onMouseDown={(e) => beginResize(e, 's')} />
        <div className="resize-zone e" onMouseDown={(e) => beginResize(e, 'e')} />
        <div className="resize-zone w" onMouseDown={(e) => beginResize(e, 'w')} />
        <div className="resize-zone nw" onMouseDown={(e) => beginResize(e, 'nw')} />
        <div className="resize-zone ne" onMouseDown={(e) => beginResize(e, 'ne')} />
        <div className="resize-zone sw" onMouseDown={(e) => beginResize(e, 'sw')} />
        <div className="resize-zone se" onMouseDown={(e) => beginResize(e, 'se')} />
      </section>
    </div>
  );
}
