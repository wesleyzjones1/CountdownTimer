﻿import CountdownTimer from './components/CountdownTimer';
import './App.css';

export default function App() {
  return (
    <div className="app">
      <main className="widget-shell app-main" aria-label="Countdown widget">
        <CountdownTimer />
      </main>
    </div>
  );
}
