"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { formatDeadline } from "@/lib/date-utils";
import { nanoid } from "nanoid";
import { useRouter } from "next/navigation";
import InlineTitle from "./InlineTitle";
import type { Event } from "@/lib/types";

type Tab = "active" | "trash";

// サンプルデータ（イベントが0件のときに表示）
const SAMPLE_EVENTS: (Event & { _sample: true; respondentCount: number })[] = [
  {
    id: "sample-1",
    title: "4月定例ミーティング",
    description: "",
    deadline: "2026-04-10T18:00:00+09:00",
    deleted_at: null,
    created_at: "2026-04-01T10:00:00+09:00",
    _sample: true,
    respondentCount: 5,
  },
  {
    id: "sample-2",
    title: "新プロジェクト キックオフ",
    description: "",
    deadline: "2026-04-15T12:00:00+09:00",
    deleted_at: null,
    created_at: "2026-03-28T14:30:00+09:00",
    _sample: true,
    respondentCount: 8,
  },
  {
    id: "sample-3",
    title: "チーム懇親会",
    description: "",
    deadline: null,
    deleted_at: null,
    created_at: "2026-03-25T09:00:00+09:00",
    _sample: true,
    respondentCount: 12,
  },
];

interface EventWithCount extends Event {
  _sample?: boolean;
  respondentCount?: number;
}

export default function EventList() {
  const router = useRouter();
  const [events, setEvents] = useState<EventWithCount[]>([]);
  const [respondentCounts, setRespondentCounts] = useState<
    Record<string, number>
  >({});
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("active");
  const [myEventIds, setMyEventIds] = useState<string[]>([]);
  const [showSamples, setShowSamples] = useState(false);

  useEffect(() => {
    const stored = JSON.parse(
      localStorage.getItem("my_created_events") || "[]"
    ) as string[];
    // サンプルイベントが未登録なら追加
    if (!stored.includes("sample5gatsu")) {
      stored.push("sample5gatsu");
      localStorage.setItem("my_created_events", JSON.stringify(stored));
    }
    setMyEventIds(stored);
    setShowSamples(stored.length === 0);
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

    // 回答者数を取得
    if (data && data.length > 0) {
      const ids = data.map((e) => e.id);
      const { data: respondents } = await supabase
        .from("respondents")
        .select("event_id")
        .in("event_id", ids);
      if (respondents) {
        const counts: Record<string, number> = {};
        for (const r of respondents) {
          counts[r.event_id] = (counts[r.event_id] || 0) + 1;
        }
        setRespondentCounts(counts);
      }
    }

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

    await supabase.from("events").insert({
      id: newId,
      title: `${event.title}（コピー）`,
      deadline: null,
    });

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

    const stored = JSON.parse(
      localStorage.getItem("my_created_events") || "[]"
    );
    stored.push(newId);
    localStorage.setItem("my_created_events", JSON.stringify(stored));
    setMyEventIds(stored);
    setShowSamples(false);

    router.push(`/events/${newId}`);
  }

  async function handlePermanentDelete(eventId: string) {
    await supabase.from("events").delete().eq("id", eventId);
    const stored = JSON.parse(
      localStorage.getItem("my_created_events") || "[]"
    ) as string[];
    const updated = stored.filter((id: string) => id !== eventId);
    localStorage.setItem("my_created_events", JSON.stringify(updated));
    setMyEventIds(updated);
  }

  if (loading) {
    return (
      <div className="text-gray-500 text-sm py-8 text-center">
        読み込み中...
      </div>
    );
  }

  // サンプル表示
  if (showSamples && myEventIds.length === 0) {
    return (
      <div className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
          <p className="text-blue-700 text-sm font-medium">
            まだイベントがありません。上の「+ 新規作成」ボタンから最初のイベントを作ってみましょう！
          </p>
          <p className="text-blue-500 text-xs mt-1">
            下のカードはサンプル表示です
          </p>
        </div>

        <div className="space-y-3 opacity-60">
          {SAMPLE_EVENTS.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              respondentCount={event.respondentCount}
              isSample
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* タブ */}
      <div className="flex bg-gray-100 rounded-lg p-0.5 w-fit">
        <button
          type="button"
          onClick={() => setTab("active")}
          className={`px-4 py-1.5 text-sm font-bold rounded-md transition ${
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
          className={`px-4 py-1.5 text-sm font-bold rounded-md transition ${
            tab === "trash"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          ゴミ箱
        </button>
      </div>

      {events.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400 text-sm">
            {tab === "active"
              ? "イベントはまだありません"
              : "ゴミ箱は空です"}
          </p>
          {tab === "active" && (
            <a
              href="/create"
              className="inline-block mt-3 px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition"
            >
              + 新規作成
            </a>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              respondentCount={respondentCounts[event.id] || 0}
              isTrash={tab === "trash"}
              onDelete={() => handleDelete(event.id)}
              onRestore={() => handleRestore(event.id)}
              onDuplicate={() => handleDuplicate(event)}
              onPermanentDelete={() => handlePermanentDelete(event.id)}
              onTitleUpdate={(newTitle) => {
                setEvents((prev) =>
                  prev.map((e) =>
                    e.id === event.id ? { ...e, title: newTitle } : e
                  )
                );
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// イベントカードコンポーネント
function EventCard({
  event,
  respondentCount,
  isSample,
  isTrash,
  onDelete,
  onRestore,
  onDuplicate,
  onPermanentDelete,
  onTitleUpdate,
}: {
  event: EventWithCount;
  respondentCount: number;
  isSample?: boolean;
  isTrash?: boolean;
  onDelete?: () => void;
  onRestore?: () => void;
  onDuplicate?: () => void;
  onPermanentDelete?: () => void;
  onTitleUpdate?: (newTitle: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  const createdDate = new Date(event.created_at).toLocaleDateString("ja-JP", {
    month: "short",
    day: "numeric",
  });

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
      {/* 情報エリア: 結果・ステータス */}
      <a
        href={isSample ? undefined : `/events/${event.id}`}
        className={`block p-4 ${isSample ? "" : "hover:bg-gray-50 transition"}`}
      >
        {/* タイトル行 */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="min-w-0 flex-1" onClick={(e) => { if (!isSample) { e.stopPropagation(); e.preventDefault(); } }}>
            {isSample ? (
              <span className="text-base font-bold text-gray-900 block truncate">
                {event.title}
              </span>
            ) : (
              <InlineTitle
                eventId={event.id}
                title={event.title}
                onUpdate={onTitleUpdate}
              />
            )}
          </div>
          <span className="text-xs text-gray-400 shrink-0 mt-0.5">
            {createdDate}
          </span>
        </div>

        {/* 回答状況 */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="flex -space-x-1">
              {Array.from({ length: Math.min(respondentCount, 3) }).map(
                (_, i) => (
                  <div
                    key={i}
                    className="w-5 h-5 rounded-full bg-blue-100 border-2 border-white flex items-center justify-center"
                  >
                    <span className="text-[8px] text-blue-600 font-bold">
                      {String.fromCharCode(65 + i)}
                    </span>
                  </div>
                )
              )}
            </div>
            <span className="text-xs font-medium text-gray-600">
              {respondentCount > 0
                ? `${respondentCount}人が回答`
                : "未回答"}
            </span>
          </div>
          {event.deadline && (
            <span className="text-xs text-orange-600">
              期限: {formatDeadline(event.deadline)}
            </span>
          )}
          {!isSample && (
            <span className="text-xs text-blue-500 ml-auto">
              詳細 &rarr;
            </span>
          )}
        </div>
      </a>

      {/* 管理アクション: 編集・複製・削除 */}
      {!isSample && (
        <div className="border-t border-gray-100 bg-gray-50 px-4 py-2 flex items-center justify-between" onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}>
          {!isTrash ? (
            <>
              <a
                href={`/events/${event.id}`}
                className="text-xs text-blue-500 hover:text-blue-700 font-medium transition"
              >
                結果を見る
              </a>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="text-gray-400 hover:text-gray-600 transition p-1"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <circle cx="3" cy="8" r="1.5" />
                    <circle cx="8" cy="8" r="1.5" />
                    <circle cx="13" cy="8" r="1.5" />
                  </svg>
                </button>
                {menuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setMenuOpen(false)}
                    />
                    <div className="absolute right-0 top-8 z-20 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[120px]">
                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpen(false);
                          onDuplicate?.();
                        }}
                        className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition"
                      >
                        複製
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpen(false);
                          onDelete?.();
                        }}
                        className="w-full text-left px-3 py-2 text-sm text-red-500 hover:bg-red-50 transition"
                      >
                        削除
                      </button>
                    </div>
                  </>
                )}
              </div>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onRestore}
                className="text-xs text-green-600 hover:text-green-700 font-medium transition"
              >
                復元する
              </button>
              <button
                type="button"
                onClick={onPermanentDelete}
                className="text-xs text-red-400 hover:text-red-600 transition"
              >
                完全に削除
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
