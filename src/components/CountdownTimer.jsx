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

function rgbToRgba(rgb, alpha) {
  const m = rgb.match(/rgb\(\s*(\d+),\s*(\d+),\s*(\d+)\s*\)/);
  if (!m) return rgb;
  return `rgba(${m[1]}, ${m[2]}, ${m[3]}, ${alpha})`;
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function CountdownTimer({ onStats, showTimeWhileRunning = true, refreshCooldown = 5, hueEnabled = true }) {
  const [minutesInput, setMinutesInput] = useState('5');
  const [secondsInput, setSecondsInput] = useState('00');
  const timerLoadedRef = useRef(false);
  const [totalSeconds, setTotalSeconds] = useState(null);
  const [remaining, setRemaining] = useState(null);
  const [nowMs, setNowMs] = useState(null);
  const [startMs, setStartMs] = useState(0);
  const [phase, setPhase] = useState('setup'); // setup | running | finished
  const [refreshCount, setRefreshCount] = useState(0);
  const [timeoutCount, setTimeoutCount] = useState(0);
  const animationFrameRef = useRef(null);
  const endTimeRef = useRef(0);
  const runTokenRef = useRef(0);
  const isPointerOverClockRef = useRef(false);
  const prevStatsRef = useRef({ refreshes: 0, timeouts: 0 });
  const refreshCooldownUntilRef = useRef(0);

  const clearTimer = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
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
    const startNow = Date.now();
    runTokenRef.current += 1;
    clearTimer();
    endTimeRef.current = startNow + (secs * 1000);
    refreshCooldownUntilRef.current = startNow + (refreshCooldown * 1000);
    setStartMs(startNow);
    setTotalSeconds(secs);
    setRemaining(secs);
    setNowMs(startNow);
    setPhase('running');
  }, [getConfiguredSeconds, clearTimer, refreshCooldown]);

  const stopAndReset = useCallback(() => {
    runTokenRef.current += 1;
    clearTimer();
    endTimeRef.current = 0;
    refreshCooldownUntilRef.current = 0;
    setTotalSeconds(null);
    setRemaining(null);
    setNowMs(null);
    setStartMs(0);
    setPhase('setup');
  }, [clearTimer]);

  const handleHoverRestart = useCallback(() => {
    const restartSeconds = totalSeconds ?? getConfiguredSeconds();
    if (!restartSeconds) return;

    if (phase === 'running') {
      const now = Date.now();
      if (now < refreshCooldownUntilRef.current) {
        return;
      }
      refreshCooldownUntilRef.current = now + (refreshCooldown * 1000);
      setRefreshCount(c => c + 1);
      startCountdown(restartSeconds);
    } else if (phase === 'finished') {
      refreshCooldownUntilRef.current = 0;
      startCountdown(restartSeconds);
    }
  }, [phase, startCountdown, totalSeconds, getConfiguredSeconds, refreshCooldown]);

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

  // Countdown animation + timing
  useEffect(() => {
    if (phase !== 'running' || !totalSeconds || !endTimeRef.current || !startMs) return;

    const runToken = runTokenRef.current;

    const tick = () => {
      if (runToken !== runTokenRef.current) {
        return;
      }

      const currentNow = Date.now();
      const msLeft = Math.max(0, endTimeRef.current - currentNow);
      const secondsLeft = Math.ceil(msLeft / 1000);

      setNowMs(currentNow);
      setRemaining(prev => (prev === secondsLeft ? prev : secondsLeft));

      if (msLeft <= 0) {
        clearTimer();

        if (isPointerOverClockRef.current && totalSeconds) {
          setTimeoutCount(c => c + 1);
          refreshCooldownUntilRef.current = currentNow + (refreshCooldown * 1000);
          startCountdown(totalSeconds);
          return;
        }

        setTimeoutCount(c => c + 1);
        refreshCooldownUntilRef.current = 0;
        setRemaining(0);
        setNowMs(endTimeRef.current);
        setPhase('finished');
        return;
      }

      animationFrameRef.current = requestAnimationFrame(tick);
    };

    animationFrameRef.current = requestAnimationFrame(tick);
    return clearTimer;
  }, [phase, clearTimer, startCountdown, totalSeconds, startMs, refreshCooldown]);

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

  useEffect(() => {
    const clearPointerState = () => {
      isPointerOverClockRef.current = false;
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        clearPointerState();
      }
    };

    window.addEventListener('blur', clearPointerState);
    window.addEventListener('contextmenu', clearPointerState);
    window.addEventListener('mouseleave', clearPointerState);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('blur', clearPointerState);
      window.removeEventListener('contextmenu', clearPointerState);
      window.removeEventListener('mouseleave', clearPointerState);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

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
  const progress = totalSeconds
    ? phase === 'running' && nowMs !== null && startMs
      ? Math.min(1, Math.max(0, (nowMs - startMs) / (totalSeconds * 1000)))
      : phase === 'finished'
        ? 1
        : 0
    : 0;
  const hueColor = totalSeconds ? lerpColor(progress) : lerpColor(0);
  const strokeColor = hueColor;
  const glowColorStrong = hueEnabled ? rgbToRgba(hueColor, 0.4) : 'transparent';
  const glowColorSoft = hueEnabled ? rgbToRgba(hueColor, 0.20) : 'transparent';
  const fillOffset = CIRCUMFERENCE * (1 - progress);
  const configuredSeconds = getConfiguredSeconds();
  const displayTime = remaining !== null ? formatTime(remaining) : formatTime(configuredSeconds);
  const shouldHideDisplayedTime = !showTimeWhileRunning && phase !== 'setup';

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
              filter: hueEnabled ? `drop-shadow(0 0 12px ${rgbToRgba(hueColor, 0.6)})` : 'none',
            }}
          />
          {/* Glow overlay */}
          {phase !== 'setup' && hueEnabled && (
            <circle
              cx={CENTER}
              cy={CENTER}
              r={RADIUS}
              fill="none"
              stroke={strokeColor}
              strokeWidth={STROKE + 12}
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={fillOffset}
              className="progress-glow"
              style={{ opacity: 0.28 }}
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
              className={`time-display ${shouldHideDisplayedTime ? 'hidden' : ''}`}
              style={{
                color: strokeColor,
                textShadow: hueEnabled ? `0 0 12px ${glowColorStrong}, 0 0 24px ${glowColorSoft}` : 'none',
              }}
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
