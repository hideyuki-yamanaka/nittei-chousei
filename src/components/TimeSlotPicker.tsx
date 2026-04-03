"use client";

import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { HOURS, HOUR_LABELS } from "@/lib/constants";

export interface DateTimeSelection {
  date: Date;
  hours: number[]; // 選択された時間帯。空 = 終日
  allDay: boolean;
}

interface TimeSlotPickerProps {
  selections: DateTimeSelection[];
  onToggleHour: (date: Date, hour: number) => void;
  onToggleAllDay: (date: Date) => void;
  onRemoveDate: (date: Date) => void;
}

export default function TimeSlotPicker({
  selections,
  onToggleHour,
  onToggleAllDay,
  onRemoveDate,
}: TimeSlotPickerProps) {
  if (selections.length === 0) return null;

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-bold text-gray-700">
        選択した日の時間帯を設定
      </h3>
      {selections.map((sel) => (
        <div
          key={sel.date.toISOString()}
          className="bg-white rounded-xl border border-gray-200 p-4"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="font-bold text-gray-900">
              📅 {format(sel.date, "M月d日（E）", { locale: ja })}
            </span>
            <button
              type="button"
              onClick={() => onRemoveDate(sel.date)}
              className="text-gray-400 hover:text-red-500 text-sm transition"
            >
              ✕ 削除
            </button>
          </div>

          <label className="flex items-center gap-2 mb-3 cursor-pointer">
            <input
              type="checkbox"
              checked={sel.allDay}
              onChange={() => onToggleAllDay(sel.date)}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">終日（時間を指定しない）</span>
          </label>

          {!sel.allDay && (
            <div className="grid grid-cols-5 gap-2">
              {HOURS.map((hour) => {
                const selected = sel.hours.includes(hour);
                return (
                  <button
                    key={hour}
                    type="button"
                    onClick={() => onToggleHour(sel.date, hour)}
                    className={`
                      px-2 py-2 rounded-lg text-sm font-medium transition
                      ${
                        selected
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-blue-50"
                      }
                    `}
                  >
                    {HOUR_LABELS[hour]}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
