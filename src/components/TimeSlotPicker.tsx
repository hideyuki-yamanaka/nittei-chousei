"use client";

import { useRef, useCallback } from "react";
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
  onRangeSelect: (startHour: number, endHour: number) => void;
}

export default function TimeSlotPicker({
  selectedHours,
  onToggleHour,
  onSelectAll,
  onDeselectAll,
  onRangeSelect,
}: TimeSlotPickerProps) {
  const allSelected = HOURS.length === selectedHours.length;
  const dragStartHour = useRef<number | null>(null);
  const isDragging = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handlePointerDown = useCallback(
    (hour: number, e: React.PointerEvent) => {
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      isDragging.current = true;
      dragStartHour.current = hour;
    },
    []
  );

  const getHourFromPoint = useCallback((clientY: number): number | null => {
    if (!containerRef.current) return null;
    const buttons = containerRef.current.querySelectorAll("[data-hour]");
    for (const btn of buttons) {
      const rect = btn.getBoundingClientRect();
      if (clientY >= rect.top && clientY <= rect.bottom) {
        return Number(btn.getAttribute("data-hour"));
      }
    }
    return null;
  }, []);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging.current || dragStartHour.current === null) return;
      const currentHour = getHourFromPoint(e.clientY);
      if (currentHour === null) return;

      const start = Math.min(dragStartHour.current, currentHour);
      const end = Math.max(dragStartHour.current, currentHour);
      onRangeSelect(start, end);
    },
    [getHourFromPoint, onRangeSelect]
  );

  const handlePointerUp = useCallback(() => {
    if (isDragging.current && dragStartHour.current !== null) {
      // 動かさずに離した場合（タップ/クリック）は単一トグル
      // onRangeSelectが呼ばれなかった場合のフォールバック
    }
    isDragging.current = false;
    dragStartHour.current = null;
  }, []);

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
        ドラッグで範囲選択できます
      </p>

      <div
        ref={containerRef}
        className="flex flex-col gap-1 max-h-[420px] overflow-y-auto pr-1 select-none"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {HOURS.map((hour) => {
          const selected = selectedHours.includes(hour);
          return (
            <div
              key={hour}
              data-hour={hour}
              onPointerDown={(e) => handlePointerDown(hour, e)}
              onClick={() => {
                if (!isDragging.current) {
                  onToggleHour(hour);
                }
              }}
              className={`
                w-full px-3 py-2 rounded-lg text-sm font-medium transition border text-center cursor-pointer touch-none
                ${
                  selected
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
