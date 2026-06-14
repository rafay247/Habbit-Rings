"use client";

import { useEffect, useRef, useState } from "react";
import { useHabits } from "../lib/HabitContext";
import { addDays, todayISO, isSameYear, formatHumanDate } from "../lib/dateUtils";

function computeHeatmapLayout(containerWidth: number, dayCount: number) {
  const gap = 3;
  const minCell = 4;
  const maxCell = 11;
  let cols = Math.min(53, Math.max(1, dayCount));
  let cellPx = Math.floor((containerWidth - (cols - 1) * gap) / cols);
  while (cellPx < minCell && cols > 12) {
    cols -= 1;
    cellPx = Math.floor((containerWidth - (cols - 1) * gap) / cols);
  }
  cellPx = Math.max(minCell, Math.min(maxCell, cellPx));
  const totalW = cols * cellPx + (cols - 1) * gap;
  return { cols, cellPx, gap, totalW };
}

export default function Heatmap() {
  const { state, selectedDate, setSelectedDate, heatmapYear, setHeatmapYear } =
    useHabits();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [containerW, setContainerW] = useState(0);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) setContainerW(e.contentRect.width);
    });
    ro.observe(el);
    setContainerW(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const yearStart = todayISO(new Date(Date.UTC(heatmapYear, 0, 1)));
  const yearEnd = todayISO(new Date(Date.UTC(heatmapYear, 11, 31)));

  const counts: Record<string, number> = {};
  Object.entries(state.checkins).forEach(([iso, habitsDone]) => {
    if (!isSameYear(iso, heatmapYear)) return;
    counts[iso] = Object.values(habitsDone).length;
  });

  const days: string[] = [];
  let cursor = yearStart;
  while (cursor <= yearEnd) {
    days.push(cursor);
    cursor = addDays(cursor, 1);
  }

  let effectiveW = containerW;
  if (effectiveW < 48 && typeof window !== "undefined") {
    effectiveW = Math.round(window.innerWidth * 0.46);
  }
  const { cols, cellPx, gap, totalW } = computeHeatmapLayout(
    effectiveW || 480,
    days.length
  );
  const todayStr = todayISO();

  return (
    <div className="heatmap-panel">
      <div className="heatmap-legend">
        <span>None</span>
        <div className="legend-squares">
          {Array.from({ length: 9 }, (_, i) => (
            <span className={`legend-square level-${i}`} key={i} />
          ))}
        </div>
        <span>8+</span>
      </div>
      <div className="heatmap-scroll" ref={scrollRef}>
        <div
          className="heatmap"
          aria-label="Daily habit activity for the year"
          style={{
            gridTemplateColumns: `repeat(${cols}, ${cellPx}px)`,
            gridAutoRows: `${cellPx}px`,
            gap: `${gap}px`,
            width: `${totalW}px`,
          }}
        >
          {days.map((iso) => {
            const count = counts[iso] || 0;
            const level = count <= 0 ? 0 : count >= 8 ? 8 : count;
            const cls = [
              "heatmap-cell",
              `level-${level}`,
              iso === todayStr ? "heatmap-cell--today" : "",
              iso === selectedDate ? "heatmap-cell--selected" : "",
            ]
              .filter(Boolean)
              .join(" ");
            return (
              <div
                key={iso}
                className={cls}
                title={`${formatHumanDate(iso)} · ${count} habit${
                  count === 1 ? "" : "s"
                }`}
                onClick={() => setSelectedDate(iso)}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
