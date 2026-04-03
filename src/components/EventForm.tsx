"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { isSameDay, format } from "date-fns";
import { ja } from "date-fns/locale";
import { nanoid } from "nanoid";
import Calendar from "./Calendar";
import TimeSlotPicker, { type DateTimeSelection } from "./TimeSlotPicker";
import { supabase } from "@/lib/supabase";
import { HOURS } from "@/lib/constants";

const DRAFT_KEY = "event_form_draft";

interface DraftData {
  title: string;
  selections: { date: string; hours: number[]; allDay: boolean }[];
  selectedHours: number[];
  deadline: string;
  savedAt: string;
}

export default function EventForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [selections, setSelections] = useState<DateTimeSelection[]>([]);
  const [selectedHours, setSelectedHours] = useState<number[]>([]);
  const [deadline, setDeadline] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [draftRestored, setDraftRestored] = useState(false);
  const initialized = useRef(false);

  // 下書き復元
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (!saved) return;

      const draft: DraftData = JSON.parse(saved);
      if (draft.title || draft.selections.length > 0 || draft.deadline) {
        setTitle(draft.title);
        setSelections(
          draft.selections.map((s) => ({
            ...s,
            date: new Date(s.date),
          }))
        );
        setSelectedHours(draft.selectedHours);
        setDeadline(draft.deadline);
        setDraftRestored(true);
      }
    } catch {
      // ignore
    }
  }, []);

  // 下書き自動保存（500ms debounce）
  useEffect(() => {
    if (!initialized.current) return;

    const timer = setTimeout(() => {
      const draft: DraftData = {
        title,
        selections: selections.map((s) => ({
          date: s.date.toISOString(),
          hours: s.hours,
          allDay: s.allDay,
        })),
        selectedHours,
        deadline,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    }, 500);

    return () => clearTimeout(timer);
  }, [title, selections, selectedHours, deadline]);

  const selectedDates = selections.map((s) => s.date);

  function clearDraft() {
    localStorage.removeItem(DRAFT_KEY);
  }

  function handleClearForm() {
    setTitle("");
    setSelections([]);
    setSelectedHours([]);
    setDeadline("");
    setDraftRestored(false);
    clearDraft();
  }

  function handleToggleDate(date: Date) {
    setSelections((prev) => {
      const exists = prev.find((s) => isSameDay(s.date, date));
      if (exists) {
        return prev.filter((s) => !isSameDay(s.date, date));
      }
      const allDay = selectedHours.length === 0;
      const newSel: DateTimeSelection = {
        date,
        hours: [...selectedHours],
        allDay,
      };
      return [...prev, newSel].sort(
        (a, b) => a.date.getTime() - b.date.getTime()
      );
    });
  }

  function handleRangeDates(dates: Date[]) {
    setSelections((prev) => {
      const newSelections = [...prev];
      for (const date of dates) {
        const exists = newSelections.find((s) => isSameDay(s.date, date));
        if (!exists) {
          const allDay = selectedHours.length === 0;
          newSelections.push({
            date,
            hours: [...selectedHours],
            allDay,
          });
        }
      }
      return newSelections.sort(
        (a, b) => a.date.getTime() - b.date.getTime()
      );
    });
  }

  function handleToggleHour(hour: number) {
    setSelectedHours((prev) => {
      const next = prev.includes(hour)
        ? prev.filter((h) => h !== hour)
        : [...prev, hour].sort((a, b) => a - b);
      updateAllSelections(next);
      return next;
    });
  }

  function handleSelectAll() {
    const allHours = [...HOURS] as number[];
    setSelectedHours(allHours);
    updateAllSelections(allHours);
  }

  function handleDeselectAll() {
    setSelectedHours([]);
    updateAllSelections([]);
  }

  function handleAddRange(hours: number[]) {
    setSelectedHours((prev) => {
      const merged = Array.from(new Set([...prev, ...hours])).sort(
        (a, b) => a - b
      );
      updateAllSelections(merged);
      return merged;
    });
  }

  function updateAllSelections(hours: number[]) {
    setSelections((prev) =>
      prev.map((s) => ({
        ...s,
        hours: [...hours],
        allDay: hours.length === 0,
      }))
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
        if (sel.allDay || sel.hours.length === 0) {
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

      // localStorageに作成したイベントIDを保存
      const stored = JSON.parse(
        localStorage.getItem("my_created_events") || "[]"
      );
      stored.push(eventId);
      localStorage.setItem("my_created_events", JSON.stringify(stored));

      // 下書きを削除
      clearDraft();

      router.push(`/events/${eventId}`);
    } catch (err) {
      console.error(err);
      setError("作成に失敗しました。もう一度お試しください。");
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 下書き復元通知 */}
      {draftRestored && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 flex items-center justify-between">
          <p className="text-yellow-700 text-sm font-medium">
            前回の下書きを復元しました
          </p>
          <button
            type="button"
            onClick={handleClearForm}
            className="text-yellow-600 text-xs font-bold hover:text-yellow-800 transition"
          >
            クリア
          </button>
        </div>
      )}

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

      {/* カレンダー + 時間選択 */}
      <div>
        <label className="block text-sm font-bold text-gray-700 mb-2">
          候補日時を選択
        </label>
        <p className="text-xs text-gray-500 mb-3">
          右の時間帯を選んでから、カレンダーで日付をタップ（ドラッグで範囲選択も可）
        </p>
        <div className="flex gap-4 items-start">
          <div className="flex-1">
            <Calendar
              selectedDates={selectedDates}
              onToggleDate={handleToggleDate}
              onRangeDates={handleRangeDates}
            />
          </div>

          <TimeSlotPicker
            selectedHours={selectedHours}
            onToggleHour={handleToggleHour}
            onSelectAll={handleSelectAll}
            onDeselectAll={handleDeselectAll}
            onAddRange={handleAddRange}
          />
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
                    {sel.allDay || sel.hours.length === 0
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
        <div
          className="relative w-full cursor-pointer"
          onClick={() => {
            const input = document.getElementById(
              "deadline-input"
            ) as HTMLInputElement;
            input?.showPicker?.();
            input?.focus();
          }}
        >
          {!deadline && (
            <div className="absolute inset-0 flex items-center px-4 text-gray-400 pointer-events-none">
              タップして期限を設定
            </div>
          )}
          <input
            id="deadline-input"
            type="datetime-local"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className={`w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 ${
              !deadline ? "text-transparent" : ""
            }`}
          />
        </div>
        {deadline && (
          <button
            type="button"
            onClick={() => setDeadline("")}
            className="mt-1 text-xs text-gray-400 hover:text-red-500 transition"
          >
            期限をクリア
          </button>
        )}
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
