"use client";

import { useState, useRef, useCallback } from "react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  format,
  isSameMonth,
  isSameDay,
  isToday,
  isBefore,
  startOfDay,
} from "date-fns";
import { ja } from "date-fns/locale";

interface CalendarProps {
  selectedDates: Date[];
  onToggleDate: (date: Date) => void;
  onRangeDates: (dates: Date[]) => void;
}

const WEEKDAYS = ["月", "火", "水", "木", "金", "土", "日"];

export default function Calendar({
  selectedDates,
  onToggleDate,
  onRangeDates,
}: CalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const today = startOfDay(new Date());

  // ドラッグ状態
  const dragStartDate = useRef<Date | null>(null);
  const isDragging = useRef(false);
  const [previewDates, setPreviewDates] = useState<Date[]>([]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days: Date[] = [];
  let day = calendarStart;
  while (day <= calendarEnd) {
    days.push(day);
    day = addDays(day, 1);
  }

  const isSelected = (d: Date) =>
    selectedDates.some((sd) => isSameDay(sd, d));

  const isPast = (d: Date) => isBefore(d, today);

  const isInPreview = (d: Date) =>
    previewDates.some((pd) => isSameDay(pd, d));

  // 2つの日付の間の有効な日付を取得
  const getDatesInRange = useCallback(
    (start: Date, end: Date): Date[] => {
      const result: Date[] = [];
      const from = start <= end ? start : end;
      const to = start <= end ? end : start;
      let current = from;
      while (current <= to) {
        if (isSameMonth(current, currentMonth) && !isBefore(current, today)) {
          result.push(current);
        }
        current = addDays(current, 1);
      }
      return result;
    },
    [currentMonth, today]
  );

  const handlePointerDown = useCallback(
    (d: Date, e: React.PointerEvent) => {
      if (isPast(d) || !isSameMonth(d, currentMonth)) return;
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      isDragging.current = true;
      dragStartDate.current = d;
      setPreviewDates([d]);
    },
    [currentMonth]
  );

  const handlePointerEnter = useCallback(
    (d: Date) => {
      if (!isDragging.current || !dragStartDate.current) return;
      if (isPast(d) || !isSameMonth(d, currentMonth)) return;
      const range = getDatesInRange(dragStartDate.current, d);
      setPreviewDates(range);
    },
    [currentMonth, getDatesInRange]
  );

  const getDateFromPoint = useCallback(
    (clientX: number, clientY: number): Date | null => {
      const el = document.elementFromPoint(clientX, clientY);
      if (!el) return null;
      const dateAttr = el.getAttribute("data-date");
      if (!dateAttr) return null;
      return new Date(dateAttr);
    },
    []
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging.current || !dragStartDate.current) return;
      const d = getDateFromPoint(e.clientX, e.clientY);
      if (!d || isPast(d) || !isSameMonth(d, currentMonth)) return;
      const range = getDatesInRange(dragStartDate.current, d);
      setPreviewDates(range);
    },
    [currentMonth, getDatesInRange, getDateFromPoint]
  );

  const handlePointerUp = useCallback(() => {
    if (!isDragging.current) return;
    isDragging.current = false;

    if (previewDates.length <= 1 && dragStartDate.current) {
      // 1日だけ → 通常のトグル
      onToggleDate(dragStartDate.current);
    } else if (previewDates.length > 1) {
      // 範囲選択
      onRangeDates(previewDates);
    }

    dragStartDate.current = null;
    setPreviewDates([]);
  }, [previewDates, onToggleDate, onRangeDates]);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className="p-2 hover:bg-gray-100 rounded-lg transition"
        >
          ◀
        </button>
        <h3 className="text-lg font-bold text-gray-900">
          {format(currentMonth, "yyyy年M月", { locale: ja })}
        </h3>
        <button
          type="button"
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          className="p-2 hover:bg-gray-100 rounded-lg transition"
        >
          ▶
        </button>
      </div>

      <p className="text-[10px] text-gray-400 mb-2 leading-tight">
        ドラッグで範囲選択できます
      </p>

      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAYS.map((wd, i) => (
          <div
            key={wd}
            className={`text-center text-xs font-medium py-1 ${
              i === 5
                ? "text-blue-500"
                : i === 6
                ? "text-red-500"
                : "text-gray-500"
            }`}
          >
            {wd}
          </div>
        ))}
      </div>

      <div
        className="grid grid-cols-7 gap-1 select-none"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {days.map((d) => {
          const inMonth = isSameMonth(d, currentMonth);
          const selected = isSelected(d);
          const past = isPast(d);
          const todayMark = isToday(d);
          const dayOfWeek = d.getDay();
          const inPreview = isInPreview(d);

          return (
            <div
              key={d.toISOString()}
              data-date={d.toISOString()}
              onPointerDown={(e) => handlePointerDown(d, e)}
              onPointerEnter={() => handlePointerEnter(d)}
              className={`
                aspect-square flex items-center justify-center rounded-lg text-sm font-medium transition touch-none
                ${!inMonth ? "text-gray-200 cursor-default" : ""}
                ${inMonth && past ? "text-gray-300 cursor-not-allowed" : ""}
                ${inMonth && !past && !selected && !inPreview ? "hover:bg-blue-50 cursor-pointer" : ""}
                ${inMonth && !past && !selected && dayOfWeek === 6 ? "text-blue-600" : ""}
                ${inMonth && !past && !selected && dayOfWeek === 0 ? "text-red-600" : ""}
                ${selected && !inPreview ? "bg-blue-600 text-white" : ""}
                ${inPreview ? "bg-blue-400 text-white" : ""}
                ${todayMark && !selected && !inPreview ? "ring-2 ring-blue-400" : ""}
              `}
            >
              {format(d, "d")}
            </div>
          );
        })}
      </div>
    </div>
  );
}
