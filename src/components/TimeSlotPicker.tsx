"use client";

import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { HOURS, HOUR_LABELS } from "@/lib/constants";

export interface DateTimeSelection {
  date: Date;
  hours: number[];
  allDay: boolean;
}

interface TimeSlotPickerProps {
  activeDate: Date | null;
  selections: DateTimeSelection[];
  onToggleHour: (date: Date, hour: number) => void;
  onToggleAllDay: (date: Date) => void;
}

export default function TimeSlotPicker({
  activeDate,
  selections,
  onToggleHour,
  onToggleAllDay,
}: TimeSlotPickerProps) {
  if (!activeDate) return null;

  const sel = selections.find(
    (s) => s.date.toDateString() === activeDate.toDateString()
  );
  if (!sel) return null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 min-w-[180px]">
      <h3 className="font-bold text-gray-900 mb-3 text-sm">
        {format(activeDate, "M月d日（E）", { locale: ja })}
      </h3>

      <label className="flex items-center gap-2 mb-3 cursor-pointer">
        <input
          type="checkbox"
          checked={sel.allDay}
          onChange={() => onToggleAllDay(activeDate)}
          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <span className="text-sm text-gray-700">終日</span>
      </label>

      {!sel.allDay && (
        <div className="flex flex-col gap-1.5 max-h-[400px] overflow-y-auto pr-1">
          {HOURS.map((hour) => {
            const selected = sel.hours.includes(hour);
            return (
              <button
                key={hour}
                type="button"
                onClick={() => onToggleHour(activeDate, hour)}
                className={`
                  w-full px-3 py-2 rounded-lg text-sm font-medium transition border text-center
                  ${
                    selected
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-gray-700 border-gray-200 hover:border-blue-400 hover:text-blue-600"
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
  );
}
