"use client";

import { useRef, useCallback, useState } from "react";
import { HOURS, HOUR_LABELS } from "@/lib/constants";

export interface DateTimeSelection {
  date: Date;
  hours: number[];
  allDay: boolean;
}

interface TimeSlotPickerProps {
  selectedHours: number[];
  onToggleHour: (hour: number) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onAddRange: (hours: number[]) => void;
}

export default function TimeSlotPicker({
  selectedHours,
  onToggleHour,
  onSelectAll,
  onDeselectAll,
  onAddRange,
}: TimeSlotPickerProps) {
  const allSelected = HOURS.length === selectedHours.length;
  const dragStartHour = useRef<number | null>(null);
  const hasMoved = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [previewRange, setPreviewRange] = useState<[number, number] | null>(
    null
  );

  const getHourFromPoint = useCallback((clientY: number): number | null => {
    if (!containerRef.current) return null;
    const items = containerRef.current.querySelectorAll("[data-hour]");
    for (const item of items) {
      const rect = item.getBoundingClientRect();
      if (clientY >= rect.top && clientY <= rect.bottom) {
        return Number(item.getAttribute("data-hour"));
      }
    }
    return null;
  }, []);

  const handlePointerDown = useCallback(
    (hour: number, e: React.PointerEvent) => {
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      dragStartHour.current = hour;
      hasMoved.current = false;
    },
    []
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (dragStartHour.current === null) return;
      const currentHour = getHourFromPoint(e.clientY);
      if (currentHour === null) return;
      if (currentHour !== dragStartHour.current) {
        hasMoved.current = true;
      }
      if (hasMoved.current) {
        const start = Math.min(dragStartHour.current, currentHour);
        const end = Math.max(dragStartHour.current, currentHour);
        setPreviewRange([start, end]);
      }
    },
    [getHourFromPoint]
  );

  const handlePointerUp = useCallback(() => {
    if (dragStartHour.current === null) return;

    if (hasMoved.current && previewRange) {
      // ドラッグ → 範囲を既存の選択に追加
      const rangHours: number[] = [];
      for (let h = previewRange[0]; h <= previewRange[1]; h++) {
        rangHours.push(h);
      }
      onAddRange(rangHours);
    } else {
      // クリック → 1つだけトグル
      onToggleHour(dragStartHour.current);
    }

    dragStartHour.current = null;
    hasMoved.current = false;
    setPreviewRange(null);
  }, [previewRange, onAddRange, onToggleHour]);

  const isInPreview = (hour: number) => {
    if (!previewRange) return false;
    return hour >= previewRange[0] && hour <= previewRange[1];
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 w-[180px] shrink-0">
      <h3 className="font-bold text-gray-900 mb-3 text-sm">時間帯</h3>

      <button
        type="button"
        onClick={allSelected ? onDeselectAll : onSelectAll}
        className={`
          w-full px-3 py-2 rounded-lg text-sm font-bold transition border text-center mb-2
          ${
            allSelected
              ? "bg-blue-600 text-white border-blue-600"
              : "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
          }
        `}
      >
        {allSelected ? "すべて解除" : "すべて選択"}
      </button>

      <p className="text-[10px] text-gray-400 mb-2 leading-tight">
        ドラッグで範囲追加できます
      </p>

      <div
        ref={containerRef}
        className="flex flex-col gap-1 max-h-[420px] overflow-y-auto pr-1 select-none"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {HOURS.map((hour) => {
          const selected = selectedHours.includes(hour);
          const previewing = isInPreview(hour);
          return (
            <div
              key={hour}
              data-hour={hour}
              onPointerDown={(e) => handlePointerDown(hour, e)}
              className={`
                w-full px-3 py-2 rounded-lg text-sm font-medium transition border text-center cursor-pointer touch-none
                ${
                  previewing
                    ? "bg-blue-400 text-white border-blue-400"
                    : selected
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-700 border-gray-200 hover:border-blue-400 hover:text-blue-600"
                }
              `}
            >
              {HOUR_LABELS[hour]}
            </div>
          );
        })}
      </div>
    </div>
  );
}
