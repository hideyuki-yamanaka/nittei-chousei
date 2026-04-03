"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { formatDeadline } from "@/lib/date-utils";
import { nanoid } from "nanoid";
import { useRouter } from "next/navigation";
import type { Event } from "@/lib/types";

type Tab = "active" | "trash";

export default function EventList() {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("active");
  const [myEventIds, setMyEventIds] = useState<string[]>([]);

  useEffect(() => {
    const stored = JSON.parse(
      localStorage.getItem("my_created_events") || "[]"
    );
    setMyEventIds(stored);
  }, []);

  const loadEvents = useCallback(async () => {
    if (myEventIds.length === 0) {
      setEvents([]);
      setLoading(false);
      return;
    }

    const query = supabase
      .from("events")
      .select("*")
      .in("id", myEventIds)
      .order("created_at", { ascending: false });

    if (tab === "active") {
      query.is("deleted_at", null);
    } else {
      query.not("deleted_at", "is", null);
    }

    const { data } = await query;
    setEvents(data || []);
    setLoading(false);
  }, [myEventIds, tab]);

  useEffect(() => {
    if (myEventIds.length > 0) {
      loadEvents();
    } else {
      setLoading(false);
    }
  }, [myEventIds, loadEvents]);

  async function handleDelete(eventId: string) {
    await supabase
      .from("events")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", eventId);
    loadEvents();
  }

  async function handleRestore(eventId: string) {
    await supabase
      .from("events")
      .update({ deleted_at: null })
      .eq("id", eventId);
    loadEvents();
  }

  async function handleDuplicate(event: Event) {
    const newId = nanoid(12);

    // イベントを複製
    await supabase.from("events").insert({
      id: newId,
      title: `${event.title}（コピー）`,
      deadline: null,
    });

    // 候補日時を複製
    const { data: candidates } = await supabase
      .from("candidate_dates")
      .select("*")
      .eq("event_id", event.id)
      .order("sort_order");

    if (candidates && candidates.length > 0) {
      const newCandidates = candidates.map((cd) => ({
        event_id: newId,
        date: cd.date,
        start_hour: cd.start_hour,
        sort_order: cd.sort_order,
      }));
      await supabase.from("candidate_dates").insert(newCandidates);
    }

    // localStorageに追加
    const stored = JSON.parse(
      localStorage.getItem("my_created_events") || "[]"
    );
    stored.push(newId);
    localStorage.setItem("my_created_events", JSON.stringify(stored));
    setMyEventIds(stored);

    router.push(`/events/${newId}`);
  }

  async function handlePermanentDelete(eventId: string) {
    await supabase.from("events").delete().eq("id", eventId);
    // localStorageからも削除
    const stored = JSON.parse(
      localStorage.getItem("my_created_events") || "[]"
    ) as string[];
    const updated = stored.filter((id: string) => id !== eventId);
    localStorage.setItem("my_created_events", JSON.stringify(updated));
    setMyEventIds(updated);
  }

  if (loading) {
    return <div className="text-gray-500 text-sm py-4">読み込み中...</div>;
  }

  if (myEventIds.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">作成したイベント</h2>
        <div className="flex bg-gray-100 rounded-lg p-0.5">
          <button
            type="button"
            onClick={() => setTab("active")}
            className={`px-3 py-1 text-xs font-bold rounded-md transition ${
              tab === "active"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            一覧
          </button>
          <button
            type="button"
            onClick={() => setTab("trash")}
            className={`px-3 py-1 text-xs font-bold rounded-md transition ${
              tab === "trash"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            ゴミ箱
          </button>
        </div>
      </div>

      {events.length === 0 ? (
        <p className="text-sm text-gray-400 py-4 text-center">
          {tab === "active"
            ? "イベントはまだありません"
            : "ゴミ箱は空です"}
        </p>
      ) : (
        <div className="space-y-2">
          {events.map((event) => (
            <div
              key={event.id}
              className="bg-white rounded-xl border border-gray-200 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <a
                    href={`/events/${event.id}`}
                    className="text-sm font-bold text-gray-900 hover:text-blue-600 transition block truncate"
                  >
                    {event.title}
                  </a>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                    <span>
                      作成:{" "}
                      {new Date(event.created_at).toLocaleDateString("ja-JP")}
                    </span>
                    {event.deadline && (
                      <span>期限: {formatDeadline(event.deadline)}</span>
                    )}
                  </div>
                </div>

                {tab === "active" ? (
                  <div className="flex gap-1 shrink-0">
                    <a
                      href={`/events/${event.id}/results`}
                      className="px-2.5 py-1.5 text-xs font-bold text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition"
                    >
                      結果
                    </a>
                    <button
                      type="button"
                      onClick={() => handleDuplicate(event)}
                      className="px-2.5 py-1.5 text-xs font-bold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
                    >
                      複製
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(event.id)}
                      className="px-2.5 py-1.5 text-xs font-bold text-red-500 bg-red-50 rounded-lg hover:bg-red-100 transition"
                    >
                      削除
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleRestore(event.id)}
                      className="px-2.5 py-1.5 text-xs font-bold text-green-600 bg-green-50 rounded-lg hover:bg-green-100 transition"
                    >
                      復元
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePermanentDelete(event.id)}
                      className="px-2.5 py-1.5 text-xs font-bold text-red-500 bg-red-50 rounded-lg hover:bg-red-100 transition"
                    >
                      完全削除
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
