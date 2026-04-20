import { useState, useEffect, useRef, useCallback } from 'react';
import './CountdownTimer.css';

const RADIUS = 140;
const STROKE = 12;
const CENTER = RADIUS + STROKE;
const VIEW_SIZE = CENTER * 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function lerpColor(progress) {
  // progress: 0 = start (green), 1 = end (subtle red)
  const r = Math.round(40 + progress * 160);
  const g = Math.round(200 - progress * 130);
  const b = Math.round(80 + progress * 5);
  return `rgb(${r}, ${g}, ${b})`;
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function CountdownTimer({ onStats }) {
  const [minutesInput, setMinutesInput] = useState('5');
  const [secondsInput, setSecondsInput] = useState('00');
  const timerLoadedRef = useRef(false);
  const [totalSeconds, setTotalSeconds] = useState(null);
  const [remaining, setRemaining] = useState(null);
  const [phase, setPhase] = useState('setup'); // setup | running | finished
  const [refreshCount, setRefreshCount] = useState(0);
  const [timeoutCount, setTimeoutCount] = useState(0);
  const intervalRef = useRef(null);
  const isPointerOverClockRef = useRef(false);
  const prevStatsRef = useRef({ refreshes: 0, timeouts: 0 });

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const getConfiguredSeconds = useCallback(() => {
    const mins = parseInt(minutesInput || '0', 10);
    const secs = parseInt(secondsInput || '0', 10);
    if (Number.isNaN(mins) || Number.isNaN(secs)) return 0;
    const safeMins = Math.max(0, Math.min(99, mins));
    const safeSecs = Math.max(0, Math.min(59, secs));
    return safeMins * 60 + safeSecs;
  }, [minutesInput, secondsInput]);

  const startCountdown = useCallback((overrideSeconds) => {
    const secs = overrideSeconds ?? getConfiguredSeconds();
    if (!secs || secs <= 0 || secs > 5999) return;
    const wasRunning = phase === 'running';
    if (!wasRunning) {
      clearTimer();
    }
    setTotalSeconds(secs);
    setRemaining(secs);
    if (!wasRunning) {
      setPhase('running');
    }
  }, [getConfiguredSeconds, clearTimer, phase]);

  const stopAndReset = useCallback(() => {
    clearTimer();
    setTotalSeconds(null);
    setRemaining(null);
    setPhase('setup');
  }, [clearTimer]);

  const handleHoverRestart = useCallback(() => {
    if (phase === 'running') {
      setRefreshCount(c => c + 1);
      startCountdown(totalSeconds ?? undefined);
    } else if (phase === 'finished') {
      startCountdown(totalSeconds ?? undefined);
    }
  }, [phase, startCountdown, totalSeconds]);

  const handleClockToggle = useCallback(() => {
    if (phase === 'setup') {
      startCountdown();
      return;
    }

    if (phase === 'running') {
      stopAndReset();
      return;
    }

    startCountdown(totalSeconds ?? undefined);
  }, [phase, startCountdown, stopAndReset, totalSeconds]);

  // Countdown tick
  useEffect(() => {
    if (phase !== 'running') return;
    intervalRef.current = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) {
          setTimeoutCount(c => c + 1);
          if (isPointerOverClockRef.current && totalSeconds) {
            return totalSeconds;
          }

          clearTimer();
          setPhase('finished');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return clearTimer;
  }, [phase, clearTimer, totalSeconds]);

  // Load saved timer config on mount
  useEffect(() => {
    (async () => {
      const saved = await window.widgetWindow?.loadTimer?.();
      if (saved) {
        setMinutesInput(saved.minutes ?? '5');
        setSecondsInput(saved.seconds ?? '00');
      }
      timerLoadedRef.current = true;
    })();
  }, []);

  // Save timer config whenever inputs change (setup phase only)
  useEffect(() => {
    if (!timerLoadedRef.current || phase !== 'setup') return;
    window.widgetWindow?.saveTimer?.({ minutes: minutesInput, seconds: secondsInput });
  }, [minutesInput, secondsInput, phase]);

  // Report stats to parent as deltas
  useEffect(() => {
    const prev = prevStatsRef.current;
    const refreshDelta = refreshCount - prev.refreshes;
    const timeoutDelta = timeoutCount - prev.timeouts;
    if (refreshDelta !== 0 || timeoutDelta !== 0) {
      onStats?.({ refreshDelta, timeoutDelta });
      prevStatsRef.current = { refreshes: refreshCount, timeouts: timeoutCount };
    }
  }, [refreshCount, timeoutCount, onStats]);

  // Derived values
  const progress = totalSeconds ? 1 - remaining / totalSeconds : 0;
  const strokeColor = totalSeconds ? lerpColor(progress) : lerpColor(0);
  const fillOffset = CIRCUMFERENCE * (1 - progress);
  const configuredSeconds = getConfiguredSeconds();
  const displayTime = remaining !== null ? formatTime(remaining) : formatTime(configuredSeconds);

  const handleMinutesChange = (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 2);
    setMinutesInput(val);
  };

  const handleSecondsChange = (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 2);
    setSecondsInput(val);
  };

  const handleSecondsBlur = () => {
    const val = parseInt(secondsInput || '0', 10);
    const clamped = Number.isNaN(val) ? 0 : Math.max(0, Math.min(59, val));
    setSecondsInput(clamped.toString().padStart(2, '0'));
  };

  const handleMinutesBlur = () => {
    const val = parseInt(minutesInput || '0', 10);
    const clamped = Number.isNaN(val) ? 0 : Math.max(0, Math.min(99, val));
    setMinutesInput(clamped.toString());
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && phase === 'setup') {
      startCountdown();
    }
  };

  return (
    <div className="timer-container">
      <div
        className={`clock-wrapper ${phase === 'finished' ? 'finished' : ''}`}
        onMouseEnter={() => {
          isPointerOverClockRef.current = true;
          handleHoverRestart();
        }}
        onMouseLeave={() => {
          isPointerOverClockRef.current = false;
        }}
        onClick={handleClockToggle}
      >
        <svg
          viewBox={`0 0 ${VIEW_SIZE} ${VIEW_SIZE}`}
          className="clock-svg"
        >
          {/* Invisible hit area for pointer events */}
          <circle cx={CENTER} cy={CENTER} r={RADIUS} fill="transparent" stroke="none" />
          {/* Background track */}
          <circle
            cx={CENTER}
            cy={CENTER}
            r={RADIUS}
            fill="none"
            stroke="var(--track-color)"
            strokeWidth={STROKE}
          />
          {/* Progress arc */}
          <circle
            cx={CENTER}
            cy={CENTER}
            r={RADIUS}
            fill="none"
            stroke={strokeColor}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={fillOffset}
            className="progress-ring"
            style={{
              filter: `drop-shadow(0 0 8px ${strokeColor}40)`,
            }}
          />
          {/* Glow overlay */}
          {phase === 'running' && (
            <circle
              cx={CENTER}
              cy={CENTER}
              r={RADIUS}
              fill="none"
              stroke={strokeColor}
              strokeWidth={STROKE + 6}
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={fillOffset}
              className="progress-glow"
              style={{ opacity: 0.15 }}
            />
          )}
        </svg>
        <div className="clock-center">
          {phase === 'setup' ? (
            <div
              className="time-editor"
              aria-label="edit timer"
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <input
                type="text"
                inputMode="numeric"
                value={minutesInput}
                onChange={handleMinutesChange}
                onBlur={handleMinutesBlur}
                onKeyDown={handleKeyDown}
                className="time-edit-input"
                aria-label="minutes"
                maxLength={2}
              />
              <span className="time-separator">:</span>
              <input
                type="text"
                inputMode="numeric"
                value={secondsInput}
                onChange={handleSecondsChange}
                onBlur={handleSecondsBlur}
                onKeyDown={handleKeyDown}
                className="time-edit-input"
                aria-label="seconds"
                maxLength={2}
              />
            </div>
          ) : (
            <span
              className="time-display"
              style={{ color: strokeColor }}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
            >
              {phase === 'finished' ? '0:00' : displayTime}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
