"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { isSameDay, format } from "date-fns";
import { ja } from "date-fns/locale";
import { nanoid } from "nanoid";
import Calendar from "./Calendar";
import TimeSlotPicker, { type DateTimeSelection } from "./TimeSlotPicker";
import { supabase } from "@/lib/supabase";

export default function EventForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [selections, setSelections] = useState<DateTimeSelection[]>([]);
  const [activeDate, setActiveDate] = useState<Date | null>(null);
  const [deadline, setDeadline] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const selectedDates = selections.map((s) => s.date);

  function handleToggleDate(date: Date) {
    setSelections((prev) => {
      const exists = prev.find((s) => isSameDay(s.date, date));
      if (exists) {
        // 選択解除
        const next = prev.filter((s) => !isSameDay(s.date, date));
        if (activeDate && isSameDay(activeDate, date)) {
          setActiveDate(next.length > 0 ? next[next.length - 1].date : null);
        }
        return next;
      }
      // 新規選択
      const newSel: DateTimeSelection = { date, hours: [], allDay: true };
      setActiveDate(date);
      return [...prev, newSel].sort(
        (a, b) => a.date.getTime() - b.date.getTime()
      );
    });
  }

  function handleToggleHour(date: Date, hour: number) {
    setSelections((prev) =>
      prev.map((s) => {
        if (!isSameDay(s.date, date)) return s;
        const hours = s.hours.includes(hour)
          ? s.hours.filter((h) => h !== hour)
          : [...s.hours, hour].sort((a, b) => a - b);
        return { ...s, hours };
      })
    );
  }

  function handleToggleAllDay(date: Date) {
    setSelections((prev) =>
      prev.map((s) => {
        if (!isSameDay(s.date, date)) return s;
        return { ...s, allDay: !s.allDay, hours: [] };
      })
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!title.trim()) {
      setError("イベント名を入力してください");
      return;
    }
    if (selections.length === 0) {
      setError("候補日を1つ以上選択してください");
      return;
    }

    const invalidDates = selections.filter(
      (s) => !s.allDay && s.hours.length === 0
    );
    if (invalidDates.length > 0) {
      setError("時間を選択するか、「終日」にチェックしてください");
      return;
    }

    setIsSubmitting(true);

    try {
      const eventId = nanoid(12);

      const { error: eventError } = await supabase.from("events").insert({
        id: eventId,
        title: title.trim(),
        deadline: deadline || null,
      });
      if (eventError) throw eventError;

      let sortOrder = 0;
      const candidateDates: {
        event_id: string;
        date: string;
        start_hour: number | null;
        sort_order: number;
      }[] = [];

      for (const sel of selections) {
        const dateStr = format(sel.date, "yyyy-MM-dd");
        if (sel.allDay) {
          candidateDates.push({
            event_id: eventId,
            date: dateStr,
            start_hour: null,
            sort_order: sortOrder++,
          });
        } else {
          for (const hour of sel.hours) {
            candidateDates.push({
              event_id: eventId,
              date: dateStr,
              start_hour: hour,
              sort_order: sortOrder++,
            });
          }
        }
      }

      const { error: datesError } = await supabase
        .from("candidate_dates")
        .insert(candidateDates);
      if (datesError) throw datesError;

      router.push(`/events/${eventId}`);
    } catch (err) {
      console.error(err);
      setError("作成に失敗しました。もう一度お試しください。");
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* イベント名 */}
      <div>
        <label className="block text-sm font-bold text-gray-700 mb-2">
          イベント名
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="例：4月定例ミーティング"
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-400"
        />
      </div>

      {/* カレンダー + 時間選択（横並び） */}
      <div>
        <label className="block text-sm font-bold text-gray-700 mb-2">
          候補日時を選択
        </label>
        <div className="flex gap-4 items-start">
          {/* カレンダー */}
          <div className="flex-1">
            <Calendar
              selectedDates={selectedDates}
              onToggleDate={handleToggleDate}
            />
          </div>

          {/* 時間スロット（Calendly風：右側に縦並び） */}
          {activeDate && (
            <TimeSlotPicker
              activeDate={activeDate}
              selections={selections}
              onToggleHour={handleToggleHour}
              onToggleAllDay={handleToggleAllDay}
            />
          )}
        </div>

        {selections.length > 0 && (
          <p className="mt-2 text-sm text-blue-600">
            {selections.length}日選択中
          </p>
        )}
      </div>

      {/* 選択済み候補日時のサマリー */}
      {selections.length > 0 && (
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
          <h3 className="text-sm font-bold text-gray-700 mb-2">
            選択した候補日時
          </h3>
          <div className="space-y-1">
            {selections.map((sel) => (
              <div
                key={sel.date.toISOString()}
                className="flex items-center justify-between text-sm"
              >
                <div className="text-gray-900">
                  <span className="font-medium">
                    {format(sel.date, "M/d（E）", { locale: ja })}
                  </span>
                  <span className="text-gray-500 ml-2">
                    {sel.allDay
                      ? "終日"
                      : sel.hours.map((h) => `${h}:00`).join(", ")}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleDate(sel.date)}
                  className="text-gray-400 hover:text-red-500 text-xs transition"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 回答期限 */}
      <div>
        <label className="block text-sm font-bold text-gray-700 mb-2">
          回答期限（任意）
        </label>
        <input
          type="datetime-local"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
        />
      </div>

      {/* エラー */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* 送信 */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-3 px-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? "作成中..." : "イベントを作成"}
      </button>
    </form>
  );
}
