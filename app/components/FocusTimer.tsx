"use client";

import { useEffect, useRef, useState } from "react";

type Phase = "setup" | "running" | "done";

export default function FocusTimer() {
  const [phase, setPhase] = useState<Phase>("setup");
  const [minutes, setMinutes] = useState("");
  const [countdown, setCountdown] = useState("00:00");
  const [fraction, setFraction] = useState(1); // 1 full → 0 empty
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const minVal = parseInt(minutes, 10);
  const canStart = minVal >= 1 && minVal <= 60;

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const playChime = () => {
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      const ctx = new AudioCtx();
      const tone = (freq: number, time: number, dur: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = freq;
        osc.type = "sine";
        gain.gain.setValueAtTime(0.15, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + dur);
        osc.start(time);
        osc.stop(time + dur);
      };
      const now = ctx.currentTime;
      tone(523.25, now, 0.15);
      tone(659.25, now + 0.15, 0.15);
      tone(783.99, now + 0.3, 0.3);
    } catch {
      /* audio not supported */
    }
  };

  const start = () => {
    if (!canStart) return;
    const totalMs = minVal * 60 * 1000;
    const endTime = Date.now() + totalMs;
    setPhase("running");
    setFraction(1);
    intervalRef.current = setInterval(() => {
      const remaining = Math.max(0, endTime - Date.now());
      const frac = remaining / totalMs;
      const totalSec = Math.ceil(remaining / 1000);
      const m = Math.floor(totalSec / 60);
      const s = totalSec % 60;
      setCountdown(
        String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0")
      );
      setFraction(frac);
      if (remaining <= 0) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = null;
        setPhase("done");
        playChime();
      }
    }, 250);
  };

  const reset = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    setPhase("setup");
    setMinutes("");
    setCountdown("00:00");
    setFraction(1);
  };

  const topPct = Math.max(0, Math.min(100, fraction * 100));
  const bottomPct = Math.max(0, Math.min(100, (1 - fraction) * 100));

  return (
    <div className="focus-timer" id="focus-timer">
      {phase === "setup" && (
        <div className="focus-timer__setup">
          <div className="focus-timer__label">⏳ Focus Timer</div>
          <div className="focus-timer__input-row">
            <input
              type="number"
              className="focus-timer__input"
              min={1}
              max={60}
              placeholder="Min"
              aria-label="Minutes (1-60)"
              value={minutes}
              onChange={(e) => {
                let v = parseInt(e.target.value, 10);
                if (v > 60) v = 60;
                setMinutes(Number.isNaN(v) ? "" : String(v));
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && canStart) start();
              }}
            />
            <span className="focus-timer__unit"></span>
          </div>
          <button
            className="btn btn-primary focus-timer__start"
            disabled={!canStart}
            onClick={start}
          >
            ▶ Start
          </button>
        </div>
      )}

      {phase === "running" && (
        <div className="focus-timer__running" style={{ display: "flex" }}>
          <div className="sand-timer">
            <div className="sand-timer__frame">
              <div className="sand-timer__bulb sand-timer__bulb--top">
                <div
                  className="sand-timer__sand sand-timer__sand--top"
                  style={{ height: `${topPct}%` }}
                />
              </div>
              <div className="sand-timer__neck">
                <div className="sand-timer__stream flowing" />
              </div>
              <div className="sand-timer__bulb sand-timer__bulb--bottom">
                <div
                  className="sand-timer__sand sand-timer__sand--bottom"
                  style={{ height: `${bottomPct}%` }}
                />
              </div>
            </div>
            <div className="sand-timer__base" />
          </div>
          <div className="focus-timer__countdown">{countdown}</div>
          <button
            className="btn btn-ghost btn-small focus-timer__cancel"
            onClick={reset}
          >
            ✕ Cancel
          </button>
        </div>
      )}

      {phase === "done" && (
        <div className="focus-timer__done" style={{ display: "flex" }}>
          <div className="focus-timer__done-icon">🎉</div>
          <div className="focus-timer__done-text">Time&apos;s up!</div>
          <button className="btn btn-soft btn-small" onClick={reset}>
            Reset
          </button>
        </div>
      )}
    </div>
  );
}
