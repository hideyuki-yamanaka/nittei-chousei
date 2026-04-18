"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { formatDeadline } from "@/lib/date-utils";
import { nanoid } from "nanoid";
import { useRouter } from "next/navigation";
import InlineTitle from "./InlineTitle";
import ConfirmModal from "./ConfirmModal";
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

const CACHE_KEY = "event_list_cache_v1";

type CachedSnapshot = {
  active: EventWithCount[];
  trash: EventWithCount[];
  counts: Record<string, number>;
};

function readInitialIds(): string[] {
  if (typeof window === "undefined") return [];
  const stored = JSON.parse(
    localStorage.getItem("my_created_events") || "[]"
  ) as string[];
  if (!stored.includes("sample5gatsu")) {
    stored.push("sample5gatsu");
    localStorage.setItem("my_created_events", JSON.stringify(stored));
  }
  return stored;
}

function readCache(): CachedSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CachedSnapshot;
  } catch {
    return null;
  }
}

export default function EventList() {
  const router = useRouter();
  const [myEventIds, setMyEventIds] = useState<string[]>(() => readInitialIds());
  const [cache] = useState<CachedSnapshot | null>(() => readCache());
  const [tab, setTab] = useState<Tab>("active");
  const [events, setEvents] = useState<EventWithCount[]>(
    () => cache?.active ?? []
  );
  const [trashEvents, setTrashEvents] = useState<EventWithCount[]>(
    () => cache?.trash ?? []
  );
  const [respondentCounts, setRespondentCounts] = useState<
    Record<string, number>
  >(() => cache?.counts ?? {});
  // キャッシュがあれば最初からコンテンツを出す。なければローディング表示。
  const [loading, setLoading] = useState(
    () => myEventIds.length > 0 && !cache
  );
  const [showSamples, setShowSamples] = useState(
    () => myEventIds.length === 0
  );

  const loadEvents = useCallback(async () => {
    if (myEventIds.length === 0) {
      setEvents([]);
      setTrashEvents([]);
      setLoading(false);
      return;
    }

    // active / trash を同時取得
    const activePromise = supabase
      .from("events")
      .select("*")
      .in("id", myEventIds)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    const trashPromise = supabase
      .from("events")
      .select("*")
      .in("id", myEventIds)
      .not("deleted_at", "is", null)
      .order("created_at", { ascending: false });

    const respondentsPromise = supabase
      .from("respondents")
      .select("event_id")
      .in("event_id", myEventIds);

    const [{ data: active }, { data: trash }, { data: respondents }] =
      await Promise.all([activePromise, trashPromise, respondentsPromise]);

    const counts: Record<string, number> = {};
    if (respondents) {
      for (const r of respondents) {
        counts[r.event_id] = (counts[r.event_id] || 0) + 1;
      }
    }

    setEvents(active || []);
    setTrashEvents(trash || []);
    setRespondentCounts(counts);
    setLoading(false);

    try {
      localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({
          active: active || [],
          trash: trash || [],
          counts,
        })
      );
    } catch {
      // quota 超過などは無視
    }
  }, [myEventIds]);

  useEffect(() => {
    if (myEventIds.length > 0) {
      loadEvents();
    } else {
      setLoading(false);
    }
  }, [myEventIds, loadEvents]);

  async function handleDelete(eventId: string) {
    // 楽観的UI更新
    setEvents((prev) => prev.filter((e) => e.id !== eventId));
    await supabase
      .from("events")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", eventId);
    loadEvents();
  }

  async function handleRestore(eventId: string) {
    setTrashEvents((prev) => prev.filter((e) => e.id !== eventId));
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
    setTrashEvents((prev) => prev.filter((e) => e.id !== eventId));
    await supabase.from("events").delete().eq("id", eventId);
    const stored = JSON.parse(
      localStorage.getItem("my_created_events") || "[]"
    ) as string[];
    const updated = stored.filter((id: string) => id !== eventId);
    localStorage.setItem("my_created_events", JSON.stringify(updated));
    setMyEventIds(updated);
  }

  if (loading) {
    // キャッシュが無いときだけのスケルトン表示
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse"
          >
            <div className="h-5 bg-gray-100 rounded w-2/3 mb-3" />
            <div className="h-4 bg-gray-100 rounded w-1/3" />
          </div>
        ))}
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

      {(() => {
        const visible = tab === "active" ? events : trashEvents;
        return visible.length === 0 ? (
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
          {visible.map((event) => (
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
                const updater = (prev: EventWithCount[]) =>
                  prev.map((e) =>
                    e.id === event.id ? { ...e, title: newTitle } : e
                  );
                setEvents(updater);
                setTrashEvents(updater);
              }}
            />
          ))}
        </div>
      );
      })()}
    </div>
  );
}

// アイコンSVG
function EditIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function DuplicateIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function TrashIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
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
  const [modal, setModal] = useState<"delete" | "duplicate" | "restore" | "permanentDelete" | null>(null);

  const createdDate = new Date(event.created_at).toLocaleDateString("ja-JP", {
    month: "short",
    day: "numeric",
  });

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-200 hover:shadow-md transition-shadow">
        {/* 情報エリア: クリックで詳細ページへ */}
        <a
          href={isSample ? undefined : `/events/${event.id}`}
          className={`block p-4 ${isSample ? "" : "hover:bg-gray-50 transition"} rounded-t-xl`}
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

        {/* 管理アクション */}
        {!isSample && (
          <div className="border-t border-gray-100 bg-gray-50 px-4 py-2 flex items-center justify-end rounded-b-xl">
            {!isTrash ? (
              <div className="flex items-center gap-1">
                <a
                  href={`/events/${event.id}?edit=1`}
                  className="text-gray-500 hover:text-blue-600 transition p-1.5"
                  title="編集"
                >
                  <EditIcon />
                </a>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setModal("duplicate");
                  }}
                  className="text-gray-500 hover:text-blue-600 transition p-1.5"
                  title="複製"
                >
                  <DuplicateIcon />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setModal("delete");
                  }}
                  className="text-gray-500 hover:text-red-500 transition p-1.5"
                  title="削除"
                >
                  <TrashIcon />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3 w-full justify-between">
                <button
                  type="button"
                  onClick={() => setModal("restore")}
                  className="text-xs text-green-600 hover:text-green-700 font-medium transition"
                >
                  復元する
                </button>
                <button
                  type="button"
                  onClick={() => setModal("permanentDelete")}
                  className="text-xs text-red-400 hover:text-red-600 transition"
                >
                  完全に削除
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 確認モーダル */}
      <ConfirmModal
        open={modal === "delete"}
        title="イベントを削除"
        message="このイベントをゴミ箱に移動しますか？あとから復元できます。"
        confirmLabel="削除する"
        confirmColor="red"
        onConfirm={() => { setModal(null); onDelete?.(); }}
        onCancel={() => setModal(null)}
      />
      <ConfirmModal
        open={modal === "duplicate"}
        title="イベントを複製"
        message="このイベントをコピーして新しいイベントを作成しますか？"
        confirmLabel="複製する"
        confirmColor="blue"
        onConfirm={() => { setModal(null); onDuplicate?.(); }}
        onCancel={() => setModal(null)}
      />
      <ConfirmModal
        open={modal === "restore"}
        title="イベントを復元"
        message="このイベントをゴミ箱から復元しますか？"
        confirmLabel="復元する"
        confirmColor="blue"
        onConfirm={() => { setModal(null); onRestore?.(); }}
        onCancel={() => setModal(null)}
      />
      <ConfirmModal
        open={modal === "permanentDelete"}
        title="完全に削除"
        message="このイベントを完全に削除しますか？この操作は取り消せません。"
        confirmLabel="完全に削除"
        confirmColor="red"
        onConfirm={() => { setModal(null); onPermanentDelete?.(); }}
        onCancel={() => setModal(null)}
      />
    </>
  );
}
