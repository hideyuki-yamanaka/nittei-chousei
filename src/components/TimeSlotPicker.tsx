"use client";

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
}

export default function TimeSlotPicker({
  selectedHours,
  onToggleHour,
  onSelectAll,
  onDeselectAll,
}: TimeSlotPickerProps) {
  const allSelected = HOURS.length === selectedHours.length;

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

      <div className="flex flex-col gap-1 max-h-[420px] overflow-y-auto pr-1">
        {HOURS.map((hour) => {
          const selected = selectedHours.includes(hour);
          return (
            <button
              key={hour}
              type="button"
              onClick={() => onToggleHour(hour)}
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
    </div>
  );
}
