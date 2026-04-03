"use client";

import { useState } from "react";
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
}

const WEEKDAYS = ["月", "火", "水", "木", "金", "土", "日"];

export default function Calendar({ selectedDates, onToggleDate }: CalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const today = startOfDay(new Date());

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

      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAYS.map((wd, i) => (
          <div
            key={wd}
            className={`text-center text-xs font-medium py-1 ${
              i === 5 ? "text-blue-500" : i === 6 ? "text-red-500" : "text-gray-500"
            }`}
          >
            {wd}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((d) => {
          const inMonth = isSameMonth(d, currentMonth);
          const selected = isSelected(d);
          const past = isPast(d);
          const todayMark = isToday(d);
          const dayOfWeek = d.getDay();

          return (
            <button
              key={d.toISOString()}
              type="button"
              disabled={past || !inMonth}
              onClick={() => onToggleDate(d)}
              className={`
                aspect-square flex items-center justify-center rounded-lg text-sm font-medium transition
                ${!inMonth ? "text-gray-200 cursor-default" : ""}
                ${inMonth && past ? "text-gray-300 cursor-not-allowed" : ""}
                ${inMonth && !past && !selected ? "hover:bg-blue-50 cursor-pointer" : ""}
                ${inMonth && !past && dayOfWeek === 6 ? "text-blue-600" : ""}
                ${inMonth && !past && dayOfWeek === 0 ? "text-red-600" : ""}
                ${selected ? "bg-blue-600 text-white hover:bg-blue-700" : ""}
                ${todayMark && !selected ? "ring-2 ring-blue-400" : ""}
              `}
            >
              {format(d, "d")}
            </button>
          );
        })}
      </div>
    </div>
  );
}
