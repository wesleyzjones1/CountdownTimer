﻿import { useState } from 'react';
import CountdownTimer from './components/CountdownTimer';
import './App.css';

function minimizeWindow() {
  window.widgetWindow?.minimize?.();
}

function closeWindow() {
  window.widgetWindow?.close?.();
}

export default function App() {
  const [stats, setStats] = useState({ refreshes: 0, timeouts: 0 });

  return (
    <div className="app">
      <section className="widget-shell" aria-label="Countdown widget">
        <header className="widget-header">
          <div className="widget-stats" aria-live="polite">
            <span className="widget-stats-label">Refreshes: <span className="widget-stats-num">{stats.refreshes}</span></span>
            <span className="widget-stats-label">Timeouts: <span className="widget-stats-num">{stats.timeouts}</span></span>
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
          <CountdownTimer onStats={setStats} />
        </main>
      </section>
    </div>
  );
}
