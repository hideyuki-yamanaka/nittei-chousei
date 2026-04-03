"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { isSameDay, format } from "date-fns";
import { ja } from "date-fns/locale";
import { supabase } from "@/lib/supabase";
import { formatDateWithHour, formatDeadline, isDeadlinePassed } from "@/lib/date-utils";
import { calculateScores, getBestDates } from "@/lib/scoring";
import { AVAILABILITY_COLORS } from "@/lib/types";
import { HOURS } from "@/lib/constants";
import InlineTitle from "@/components/InlineTitle";
import Calendar from "@/components/Calendar";
import TimeSlotPicker from "@/components/TimeSlotPicker";
import type { DateTimeSelection } from "@/components/TimeSlotPicker";
import type { Event, CandidateDate, Respondent, Response, Availability } from "@/lib/types";

function AvailabilityIcon({ value }: { value: Availability }) {
  if (value === 2) {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="inline">
        <circle cx="12" cy="12" r="9" fill="currentColor" opacity="0.2" stroke="currentColor" strokeWidth="2.5" />
      </svg>
    );
  }
  if (value === 1) {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="inline">
        <path d="M12 4L22 20H2L12 4Z" fill="currentColor" opacity="0.2" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="inline">
      <path d="M7 7L17 17M17 7L7 17" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

function ResultBar({ okCount, maybeCount, ngCount, total }: { okCount: number; maybeCount: number; ngCount: number; total: number }) {
  if (total === 0) return null;
  const okPct = (okCount / total) * 100;
  const maybePct = (maybeCount / total) * 100;
  const ngPct = (ngCount / total) * 100;

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-5 rounded-full overflow-hidden bg-gray-100 flex">
        {okPct > 0 && (
          <div
            className="bg-green-400 h-full flex items-center justify-center text-[10px] font-bold text-white"
            style={{ width: `${okPct}%`, minWidth: okPct > 0 ? "16px" : "0" }}
          >
            {okCount}
          </div>
        )}
        {maybePct > 0 && (
          <div
            className="bg-yellow-400 h-full flex items-center justify-center text-[10px] font-bold text-white"
            style={{ width: `${maybePct}%`, minWidth: maybePct > 0 ? "16px" : "0" }}
          >
            {maybeCount}
          </div>
        )}
        {ngPct > 0 && (
          <div
            className="bg-red-400 h-full flex items-center justify-center text-[10px] font-bold text-white"
            style={{ width: `${ngPct}%`, minWidth: ngPct > 0 ? "16px" : "0" }}
          >
            {ngCount}
          </div>
        )}
      </div>
    </div>
  );
}

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.eventId as string;

  const [event, setEvent] = useState<Event | null>(null);
  const [candidates, setCandidates] = useState<CandidateDate[]>([]);
  const [respondents, setRespondents] = useState<Respondent[]>([]);
  const [responses, setResponses] = useState<Response[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [myRespondentId, setMyRespondentId] = useState<string | null>(null);

  // 編集モード
  const [editing, setEditing] = useState(false);
  const [editSelections, setEditSelections] = useState<DateTimeSelection[]>([]);
  const [editSelectedHours, setEditSelectedHours] = useState<number[]>([]);
  const [editDeadline, setEditDeadline] = useState("");
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    const [eventRes, candidatesRes, respondentsRes, responsesRes] =
      await Promise.all([
        supabase.from("events").select("*").eq("id", eventId).single(),
        supabase
          .from("candidate_dates")
          .select("*")
          .eq("event_id", eventId)
          .order("sort_order"),
        supabase
          .from("respondents")
          .select("*")
          .eq("event_id", eventId)
          .order("created_at"),
        supabase
          .from("responses")
          .select("*, candidate_dates!inner(event_id)")
          .eq("candidate_dates.event_id", eventId),
      ]);

    if (eventRes.data) setEvent(eventRes.data);
    if (candidatesRes.data) setCandidates(candidatesRes.data);
    if (respondentsRes.data) setRespondents(respondentsRes.data);
    if (responsesRes.data) setResponses(responsesRes.data);
    setLoading(false);
  }, [eventId]);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("my_respondents") || "{}");
    setMyRespondentId(stored[eventId] || null);
    loadData();
  }, [eventId, loadData]);

  // 編集モードに入るとき、現在のデータを編集用stateにセット
  function startEditing() {
    // 候補日時からDateTimeSelection[]を構築
    const dateMap = new Map<string, number[]>();
    const allHoursSet = new Set<number>();
    for (const cd of candidates) {
      const dateStr = cd.date;
      if (!dateMap.has(dateStr)) {
        dateMap.set(dateStr, []);
      }
      if (cd.start_hour !== null) {
        dateMap.get(dateStr)!.push(cd.start_hour);
        allHoursSet.add(cd.start_hour);
      }
    }

    const selections: DateTimeSelection[] = [];
    for (const [dateStr, hours] of dateMap) {
      selections.push({
        date: new Date(dateStr + "T00:00:00"),
        hours: hours.sort((a, b) => a - b),
        allDay: hours.length === 0,
      });
    }
    selections.sort((a, b) => a.date.getTime() - b.date.getTime());

    setEditSelections(selections);
    setEditSelectedHours(Array.from(allHoursSet).sort((a, b) => a - b));

    // deadline
    if (event?.deadline) {
      // datetime-local形式に変換
      const d = new Date(event.deadline);
      const pad = (n: number) => String(n).padStart(2, "0");
      setEditDeadline(
        `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
      );
    } else {
      setEditDeadline("");
    }

    setEditing(true);
  }

  function cancelEditing() {
    setEditing(false);
  }

  // カレンダー操作
  function handleToggleDate(date: Date) {
    setEditSelections((prev) => {
      const exists = prev.find((s) => isSameDay(s.date, date));
      if (exists) {
        return prev.filter((s) => !isSameDay(s.date, date));
      }
      const allDay = editSelectedHours.length === 0;
      const newSel: DateTimeSelection = {
        date,
        hours: [...editSelectedHours],
        allDay,
      };
      return [...prev, newSel].sort(
        (a, b) => a.date.getTime() - b.date.getTime()
      );
    });
  }

  function handleRangeDates(dates: Date[]) {
    setEditSelections((prev) => {
      const newSelections = [...prev];
      for (const date of dates) {
        const exists = newSelections.find((s) => isSameDay(s.date, date));
        if (!exists) {
          const allDay = editSelectedHours.length === 0;
          newSelections.push({
            date,
            hours: [...editSelectedHours],
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
    setEditSelectedHours((prev) => {
      const next = prev.includes(hour)
        ? prev.filter((h) => h !== hour)
        : [...prev, hour].sort((a, b) => a - b);
      updateAllEditSelections(next);
      return next;
    });
  }

  function handleSelectAll() {
    const allHours = [...HOURS] as number[];
    setEditSelectedHours(allHours);
    updateAllEditSelections(allHours);
  }

  function handleDeselectAll() {
    setEditSelectedHours([]);
    updateAllEditSelections([]);
  }

  function handleAddRange(hours: number[]) {
    setEditSelectedHours((prev) => {
      const merged = Array.from(new Set([...prev, ...hours])).sort(
        (a, b) => a - b
      );
      updateAllEditSelections(merged);
      return merged;
    });
  }

  function updateAllEditSelections(hours: number[]) {
    setEditSelections((prev) =>
      prev.map((s) => ({
        ...s,
        hours: [...hours],
        allDay: hours.length === 0,
      }))
    );
  }

  async function handleSaveEdit() {
    if (editSelections.length === 0) return;

    setSaving(true);

    // 期限を更新
    await supabase
      .from("events")
      .update({ deadline: editDeadline || null })
      .eq("id", eventId);

    // 既存の候補日を削除して新しく入れ直す
    await supabase
      .from("candidate_dates")
      .delete()
      .eq("event_id", eventId);

    let sortOrder = 0;
    const newCandidates: {
      event_id: string;
      date: string;
      start_hour: number | null;
      sort_order: number;
    }[] = [];

    for (const sel of editSelections) {
      const dateStr = format(sel.date, "yyyy-MM-dd");
      if (sel.allDay || sel.hours.length === 0) {
        newCandidates.push({
          event_id: eventId,
          date: dateStr,
          start_hour: null,
          sort_order: sortOrder++,
        });
      } else {
        for (const hour of sel.hours) {
          newCandidates.push({
            event_id: eventId,
            date: dateStr,
            start_hour: hour,
            sort_order: sortOrder++,
          });
        }
      }
    }

    await supabase.from("candidate_dates").insert(newCandidates);

    setSaving(false);
    setEditing(false);

    // データ再読み込み
    await loadData();
  }

  async function handleDelete() {
    if (!confirm("このイベントをゴミ箱に移動しますか？")) return;
    await supabase
      .from("events")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", eventId);
    router.push("/");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500">イベントが見つかりませんでした</p>
      </div>
    );
  }

  const answerUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/events/${eventId}/answer`;
  const deadlinePassed = isDeadlinePassed(event.deadline);

  const scores = calculateScores(candidates, responses);
  const bestDates = getBestDates(scores);
  const bestIds = new Set(bestDates.map((b) => b.candidateDateId));

  const getResponse = (respondentId: string, candidateId: string) => {
    return responses.find(
      (r) =>
        r.respondent_id === respondentId &&
        r.candidate_date_id === candidateId
    );
  };

  async function handleCopy() {
    await navigator.clipboard.writeText(answerUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const selectedDates = editSelections.map((s) => s.date);

  return (
    <div className="space-y-6">
      {/* ナビ */}
      <a
        href="/"
        className="text-gray-400 hover:text-gray-600 transition text-sm"
      >
        &larr; 一覧に戻る
      </a>

      {/* イベント情報 */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <InlineTitle
            eventId={eventId}
            title={event.title}
            onUpdate={(newTitle) =>
              setEvent((prev) => (prev ? { ...prev, title: newTitle } : prev))
            }
            className="text-xl font-bold text-gray-900"
          />
          <span className="shrink-0 text-xs font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
            作成済み
          </span>
          <button
            type="button"
            onClick={handleDelete}
            className="shrink-0 ml-auto text-gray-300 hover:text-red-500 transition p-1"
            title="削除"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
        </div>

        <div className="flex items-center gap-3 text-sm text-gray-500">
          {event.deadline && (
            <p className={deadlinePassed ? "text-red-500" : ""}>
              {deadlinePassed ? "回答受付終了" : `期限: ${formatDeadline(event.deadline)}`}
            </p>
          )}
          <span>回答 {respondents.length}名</span>
        </div>

        {/* 候補日時 表示 or 編集 */}
        {!editing ? (
          <div className="mt-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-gray-700">候補日時</h3>
              <button
                type="button"
                onClick={startEditing}
                className="text-xs text-blue-500 hover:text-blue-700 font-medium transition"
              >
                編集
              </button>
            </div>
            <ul className="space-y-1">
              {candidates.map((cd) => (
                <li key={cd.id} className="text-sm text-gray-600">
                  {formatDateWithHour(cd.date, cd.start_hour)}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {/* カレンダー + 時間選択 */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                候補日時を選択
              </label>
              <p className="text-xs text-gray-500 mb-3">
                右の時間帯を選んでから、カレンダーで日付をタップ
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
                  selectedHours={editSelectedHours}
                  onToggleHour={handleToggleHour}
                  onSelectAll={handleSelectAll}
                  onDeselectAll={handleDeselectAll}
                  onAddRange={handleAddRange}
                />
              </div>

              {editSelections.length > 0 && (
                <p className="mt-2 text-sm text-blue-600">
                  {editSelections.length}日選択中
                </p>
              )}
            </div>

            {/* 選択済みサマリー */}
            {editSelections.length > 0 && (
              <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
                <h3 className="text-sm font-bold text-gray-700 mb-2">
                  選択した候補日時
                </h3>
                <div className="space-y-1">
                  {editSelections.map((sel) => (
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
                    "edit-deadline-input"
                  ) as HTMLInputElement;
                  input?.showPicker?.();
                  input?.focus();
                }}
              >
                {!editDeadline && (
                  <div className="absolute inset-0 flex items-center px-4 text-gray-400 pointer-events-none">
                    タップして期限を設定
                  </div>
                )}
                <input
                  id="edit-deadline-input"
                  type="datetime-local"
                  value={editDeadline}
                  onChange={(e) => setEditDeadline(e.target.value)}
                  className={`w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 ${
                    !editDeadline ? "text-transparent" : ""
                  }`}
                />
              </div>
              {editDeadline && (
                <button
                  type="button"
                  onClick={() => setEditDeadline("")}
                  className="mt-1 text-xs text-gray-400 hover:text-red-500 transition"
                >
                  期限をクリア
                </button>
              )}
            </div>

            {/* 保存・キャンセル */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={saving || editSelections.length === 0}
                className="flex-1 py-3 px-4 bg-blue-600 text-white font-bold rounded-xl text-center hover:bg-blue-700 transition disabled:opacity-50"
              >
                {saving ? "保存中..." : "保存する"}
              </button>
              <button
                type="button"
                onClick={cancelEditing}
                className="py-3 px-4 bg-white text-gray-700 font-bold rounded-xl text-center border border-gray-300 hover:bg-gray-50 transition"
              >
                キャンセル
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 共有リンク */}
      {!editing && (
        <>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-sm font-bold text-gray-700 mb-2">
              回答用リンク
            </h3>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={answerUrl}
                className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600 truncate"
              />
              <button
                onClick={handleCopy}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition whitespace-nowrap"
              >
                {copied ? "コピーした！" : "コピー"}
              </button>
            </div>
          </div>

          {/* アクションボタン */}
          <div className="flex gap-3">
            {!deadlinePassed && (
              <a
                href={`/events/${eventId}/answer`}
                className="flex-1 py-3 px-4 bg-blue-600 text-white font-bold rounded-xl text-center hover:bg-blue-700 transition"
              >
                {myRespondentId ? "回答を修正" : "回答する"}
              </a>
            )}
            {myRespondentId && !deadlinePassed && (
              <a
                href={`/events/${eventId}/answer/${myRespondentId}`}
                className="flex-1 py-3 px-4 bg-white text-gray-700 font-bold rounded-xl text-center border border-gray-300 hover:bg-gray-50 transition"
              >
                回答を修正
              </a>
            )}
          </div>

          {/* === 回答結果セクション === */}
          {respondents.length > 0 && (
            <>
              <hr className="border-gray-200" />

              {/* おすすめ日 */}
              {bestDates.length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-4">
                  <p className="text-green-800 font-bold text-sm mb-2">
                    みんなの都合がいい日
                  </p>
                  {bestDates.map((bd) => {
                    const allOk = bd.ngCount === 0 && bd.maybeCount === 0;
                    return (
                      <div key={bd.candidateDateId} className="flex items-center gap-3 mb-1">
                        <span className="text-green-900 font-bold text-lg">
                          {formatDateWithHour(bd.date, bd.startHour)}
                        </span>
                        {allOk ? (
                          <span className="text-xs font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded-full">
                            全員OK
                          </span>
                        ) : (
                          <span className="text-xs text-green-700">
                            <span className="text-green-600 font-bold">{bd.okCount}</span>人OK
                            {bd.maybeCount > 0 && (
                              <span className="ml-1 text-yellow-600 font-bold">{bd.maybeCount}</span>
                            )}
                            {bd.maybeCount > 0 && "人微妙"}
                            {bd.ngCount > 0 && (
                              <span className="ml-1 text-red-500 font-bold">{bd.ngCount}</span>
                            )}
                            {bd.ngCount > 0 && "人NG"}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* 凡例 */}
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1 text-green-600">
                  <AvailabilityIcon value={2} /> OK
                </span>
                <span className="flex items-center gap-1 text-yellow-600">
                  <AvailabilityIcon value={1} /> 微妙
                </span>
                <span className="flex items-center gap-1 text-red-500">
                  <AvailabilityIcon value={0} /> NG
                </span>
                <span className="ml-auto text-gray-400">
                  棒グラフは回答の割合
                </span>
              </div>

              {/* 回答一覧テーブル */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="text-left px-3 py-2 font-bold text-gray-700 sticky left-0 bg-gray-50 min-w-[120px]">
                          候補日時
                        </th>
                        {respondents.map((r) => (
                          <th
                            key={r.id}
                            className="text-center px-3 py-2 font-bold text-gray-700 min-w-[60px]"
                          >
                            {r.name}
                          </th>
                        ))}
                        <th className="text-center px-3 py-2 font-bold text-gray-700 min-w-[100px]">
                          結果
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {candidates.map((cd) => {
                        const isBest = bestIds.has(cd.id);
                        const score = scores.find(
                          (s) => s.candidateDateId === cd.id
                        );

                        return (
                          <tr
                            key={cd.id}
                            className={`border-b border-gray-100 ${
                              isBest ? "bg-green-50" : ""
                            }`}
                          >
                            <td className={`px-3 py-2.5 font-medium text-gray-900 sticky left-0 ${isBest ? "bg-green-50" : "bg-white"}`}>
                              <div className="flex items-center gap-1">
                                {isBest && <span className="text-green-500 text-base">&#10003;</span>}
                                {formatDateWithHour(cd.date, cd.start_hour)}
                              </div>
                            </td>
                            {respondents.map((r) => {
                              const resp = getResponse(r.id, cd.id);
                              const avail = (resp?.availability ?? null) as Availability | null;
                              return (
                                <td key={r.id} className="text-center px-3 py-2.5">
                                  {avail !== null && (
                                    <span
                                      className={`inline-flex w-8 h-8 items-center justify-center rounded-lg ${AVAILABILITY_COLORS[avail]}`}
                                    >
                                      <AvailabilityIcon value={avail} />
                                    </span>
                                  )}
                                </td>
                              );
                            })}
                            <td className="px-3 py-2.5">
                              {score && (
                                <ResultBar
                                  okCount={score.okCount}
                                  maybeCount={score.maybeCount}
                                  ngCount={score.ngCount}
                                  total={respondents.length}
                                />
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* コメント */}
              {respondents.some((r) => r.comment) && (
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <h3 className="text-sm font-bold text-gray-700 mb-3">コメント</h3>
                  <div className="space-y-2">
                    {respondents
                      .filter((r) => r.comment)
                      .map((r) => (
                        <div key={r.id} className="text-sm">
                          <span className="font-bold text-gray-900">{r.name}:</span>{" "}
                          <span className="text-gray-600">{r.comment}</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* 回答がまだない場合 */}
          {respondents.length === 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
              <p className="text-gray-400 text-sm">まだ回答がありません</p>
              <p className="text-gray-400 text-xs mt-1">回答用リンクを共有して回答を集めましょう</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
