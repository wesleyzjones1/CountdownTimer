﻿import CountdownTimer from './components/CountdownTimer';
import './App.css';

function minimizeWindow() {
  window.widgetWindow?.minimize?.();
}

function closeWindow() {
  window.widgetWindow?.close?.();
}

export default function App() {
  return (
    <div className="app">
      <section className="widget-shell" aria-label="Countdown widget">
        <header className="widget-header">
          <div>
            <p className="widget-eyebrow">Desktop Widget</p>
            <h1 className="widget-title">Countdown Timer</h1>
          </div>
          <div className="widget-actions">
            <span className="widget-badge">Always on top</span>
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
          <CountdownTimer />
        </main>
      </section>
    </div>
  );
}
