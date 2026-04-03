"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { formatDateWithHour, formatDeadline } from "@/lib/date-utils";
import type { Event, CandidateDate, Respondent } from "@/lib/types";

export default function EventDetailPage() {
  const params = useParams();
  const eventId = params.eventId as string;

  const [event, setEvent] = useState<Event | null>(null);
  const [candidates, setCandidates] = useState<CandidateDate[]>([]);
  const [respondents, setRespondents] = useState<Respondent[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function load() {
      const [eventRes, candidatesRes, respondentsRes] = await Promise.all([
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
      ]);

      if (eventRes.data) setEvent(eventRes.data);
      if (candidatesRes.data) setCandidates(candidatesRes.data);
      if (respondentsRes.data) setRespondents(respondentsRes.data);
      setLoading(false);
    }
    load();
  }, [eventId]);

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
  const resultsUrl = `/events/${eventId}/results`;

  async function handleCopy() {
    await navigator.clipboard.writeText(answerUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-6">
      {/* 作成完了メッセージ */}
      <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3">
        <p className="text-green-800 font-bold">イベントを作成しました！</p>
        <p className="text-green-700 text-sm mt-1">
          下のリンクを参加者に共有してください。
        </p>
      </div>

      {/* イベント情報 */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h2 className="text-xl font-bold text-gray-900 mb-3">{event.title}</h2>

        {event.deadline && (
          <p className="text-sm text-gray-600 mb-3">
            ⏰ 回答期限: {formatDeadline(event.deadline)}
          </p>
        )}

        <div className="mb-3">
          <h3 className="text-sm font-bold text-gray-700 mb-2">候補日時</h3>
          <ul className="space-y-1">
            {candidates.map((cd) => (
              <li key={cd.id} className="text-sm text-gray-600">
                • {formatDateWithHour(cd.date, cd.start_hour)}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* 共有リンク */}
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
        <a
          href={answerUrl}
          className="flex-1 py-3 px-4 bg-blue-600 text-white font-bold rounded-xl text-center hover:bg-blue-700 transition"
        >
          自分も回答する
        </a>
        <a
          href={resultsUrl}
          className="flex-1 py-3 px-4 bg-white text-gray-700 font-bold rounded-xl text-center border border-gray-300 hover:bg-gray-50 transition"
        >
          結果を見る ({respondents.length}件)
        </a>
      </div>
    </div>
  );
}
