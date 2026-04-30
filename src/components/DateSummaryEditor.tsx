"use client";

import { useState } from "react";
import { isSameDay, format } from "date-fns";
import { ja } from "date-fns/locale";
import { HOURS } from "@/lib/constants";
import type { DateTimeSelection } from "./TimeSlotPicker";

interface Props {
  selections: DateTimeSelection[];
  onUpdate: (next: DateTimeSelection[]) => void;
}

/**
 * 日ごとに時間帯を個別編集できるサマリーエディタ。
 * 各行を展開すると、その日付だけの時間チップを ON/OFF できる。
 */
export default function DateSummaryEditor({ selections, onUpdate }: Props) {
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  if (selections.length === 0) return null;

  const removeDate = (date: Date) => {
    onUpdate(selections.filter((s) => !isSameDay(s.date, date)));
  };

  const toggleHourForDate = (date: Date, hour: number) => {
    onUpdate(
      selections.map((s) => {
        if (!isSameDay(s.date, date)) return s;
        const has = s.hours.includes(hour);
        const nextHours = has
          ? s.hours.filter((h) => h !== hour)
          : [...s.hours, hour].sort((a, b) => a - b);
        return {
          ...s,
          hours: nextHours,
          allDay: nextHours.length === 0,
        };
      })
    );
  };

  const setAllDay = (date: Date) => {
    onUpdate(
      selections.map((s) =>
        isSameDay(s.date, date) ? { ...s, hours: [], allDay: true } : s
      )
    );
  };

  return (
    <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-bold text-gray-700">選択した候補日時</h3>
        <span className="text-xs text-gray-400">
          日付をタップで時間を個別編集
        </span>
      </div>

      <div className="divide-y divide-gray-200">
        {selections.map((sel) => {
          const key = sel.date.toISOString();
          const expanded = expandedKey === key;
          const isAllDay = sel.allDay || sel.hours.length === 0;

          return (
            <div key={key} className="py-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setExpandedKey(expanded ? null : key)}
                  className="flex-1 flex items-center gap-2 text-left hover:bg-white rounded-lg px-2 py-1 transition"
                >
                  <span className="text-gray-400 text-xs w-3">
                    {expanded ? "▼" : "▶"}
                  </span>
                  <span className="font-medium text-gray-900 text-sm">
                    {format(sel.date, "M/d（E）", { locale: ja })}
                  </span>
                  <span className="text-gray-500 text-sm ml-1 truncate">
                    {isAllDay
                      ? "終日"
                      : sel.hours.map((h) => `${h}:00`).join(", ")}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => removeDate(sel.date)}
                  className="text-gray-400 hover:text-red-500 text-xs transition px-2"
                  aria-label="この日付を削除"
                >
                  ✕
                </button>
              </div>

              {expanded && (
                <div className="mt-2 ml-5 mr-2 p-3 bg-white rounded-lg border border-gray-200">
                  <p className="text-[11px] text-gray-500 mb-2">
                    この日付だけ反映されます
                  </p>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    <button
                      type="button"
                      onClick={() => setAllDay(sel.date)}
                      className={`px-2.5 py-1 rounded-full text-xs font-bold transition border ${
                        isAllDay
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-white text-gray-600 border-gray-300 hover:border-blue-400"
                      }`}
                    >
                      終日
                    </button>
                    {HOURS.map((h) => {
                      const on = !isAllDay && sel.hours.includes(h);
                      return (
                        <button
                          key={h}
                          type="button"
                          onClick={() => toggleHourForDate(sel.date, h)}
                          className={`px-2.5 py-1 rounded-full text-xs font-medium transition border ${
                            on
                              ? "bg-blue-600 text-white border-blue-600"
                              : "bg-white text-gray-600 border-gray-300 hover:border-blue-400"
                          }`}
                        >
                          {h}:00
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
