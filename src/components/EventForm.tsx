"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { isSameDay, format } from "date-fns";
import { nanoid } from "nanoid";
import Calendar from "./Calendar";
import TimeSlotPicker, { type DateTimeSelection } from "./TimeSlotPicker";
import { supabase } from "@/lib/supabase";

export default function EventForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [selections, setSelections] = useState<DateTimeSelection[]>([]);
  const [deadline, setDeadline] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const selectedDates = selections.map((s) => s.date);

  function handleToggleDate(date: Date) {
    setSelections((prev) => {
      const exists = prev.find((s) => isSameDay(s.date, date));
      if (exists) {
        return prev.filter((s) => !isSameDay(s.date, date));
      }
      const newSel: DateTimeSelection = { date, hours: [], allDay: true };
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

  function handleRemoveDate(date: Date) {
    setSelections((prev) => prev.filter((s) => !isSameDay(s.date, date)));
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

    // 時間指定モードで時間未選択のチェック
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

      // イベント作成
      const { error: eventError } = await supabase.from("events").insert({
        id: eventId,
        title: title.trim(),
        deadline: deadline || null,
      });
      if (eventError) throw eventError;

      // 候補日時作成
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

      {/* カレンダー */}
      <div>
        <label className="block text-sm font-bold text-gray-700 mb-2">
          候補日をカレンダーから選択
        </label>
        <Calendar
          selectedDates={selectedDates}
          onToggleDate={handleToggleDate}
        />
        {selections.length > 0 && (
          <p className="mt-2 text-sm text-blue-600">
            {selections.length}日選択中
          </p>
        )}
      </div>

      {/* 時間選択 */}
      <TimeSlotPicker
        selections={selections}
        onToggleHour={handleToggleHour}
        onToggleAllDay={handleToggleAllDay}
        onRemoveDate={handleRemoveDate}
      />

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
