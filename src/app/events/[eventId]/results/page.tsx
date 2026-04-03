"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { formatDateWithHour, formatDeadline, isDeadlinePassed } from "@/lib/date-utils";
import { calculateScores, getBestDates } from "@/lib/scoring";
import { AVAILABILITY_LABELS, AVAILABILITY_COLORS } from "@/lib/types";
import type { Event, CandidateDate, Respondent, Response, Availability } from "@/lib/types";

export default function ResultsPage() {
  const params = useParams();
  const eventId = params.eventId as string;

  const [event, setEvent] = useState<Event | null>(null);
  const [candidates, setCandidates] = useState<CandidateDate[]>([]);
  const [respondents, setRespondents] = useState<Respondent[]>([]);
  const [responses, setResponses] = useState<Response[]>([]);
  const [loading, setLoading] = useState(true);
  const [myRespondentId, setMyRespondentId] = useState<string | null>(null);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("my_respondents") || "{}");
    setMyRespondentId(stored[eventId] || null);

    async function load() {
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

  const scores = calculateScores(candidates, responses);
  const bestDates = getBestDates(scores);
  const bestIds = new Set(bestDates.map((b) => b.candidateDateId));

  // 回答マトリクスのデータ
  const getResponse = (respondentId: string, candidateId: string) => {
    return responses.find(
      (r) =>
        r.respondent_id === respondentId &&
        r.candidate_date_id === candidateId
    );
  };

  const deadlinePassed = isDeadlinePassed(event.deadline);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">{event.title}</h2>
        {event.deadline && (
          <p className={`text-sm ${deadlinePassed ? "text-red-500" : "text-gray-500"}`}>
            ⏰ {deadlinePassed ? "回答受付終了" : `回答期限: ${formatDeadline(event.deadline)}`}
          </p>
        )}
      </div>

      {/* おすすめ日 */}
      {bestDates.length > 0 && respondents.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
          <p className="text-blue-800 font-bold text-sm mb-1">
            🎯 おすすめ日
          </p>
          {bestDates.map((bd) => (
            <p key={bd.candidateDateId} className="text-blue-900 font-bold">
              {formatDateWithHour(bd.date, bd.startHour)}
              <span className="text-sm font-normal text-blue-700 ml-2">
                （◯{bd.okCount} △{bd.maybeCount} ×{bd.ngCount}）
              </span>
            </p>
          ))}
        </div>
      )}

      {/* 回答一覧テーブル */}
      {respondents.length > 0 ? (
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
                  <th className="text-center px-3 py-2 font-bold text-gray-700 min-w-[60px]">
                    スコア
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
                        isBest ? "bg-blue-50" : ""
                      }`}
                    >
                      <td className={`px-3 py-2 font-medium text-gray-900 sticky left-0 ${isBest ? "bg-blue-50" : "bg-white"}`}>
                        {isBest && "🎯 "}
                        {formatDateWithHour(cd.date, cd.start_hour)}
                      </td>
                      {respondents.map((r) => {
                        const resp = getResponse(r.id, cd.id);
                        const avail = (resp?.availability ?? null) as Availability | null;
                        return (
                          <td key={r.id} className="text-center px-3 py-2">
                            {avail !== null && (
                              <span
                                className={`inline-flex w-8 h-8 items-center justify-center rounded-lg font-bold ${AVAILABILITY_COLORS[avail]}`}
                              >
                                {AVAILABILITY_LABELS[avail]}
                              </span>
                            )}
                          </td>
                        );
                      })}
                      <td className="text-center px-3 py-2 font-bold text-gray-700">
                        {score?.totalScore ?? 0}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <p className="text-gray-500">まだ回答がありません</p>
        </div>
      )}

      {/* コメント */}
      {respondents.some((r) => r.comment) && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-sm font-bold text-gray-700 mb-3">💬 コメント</h3>
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

      {/* アクションボタン */}
      <div className="flex gap-3">
        {!deadlinePassed && (
          <a
            href={`/events/${eventId}/answer`}
            className="flex-1 py-3 px-4 bg-blue-600 text-white font-bold rounded-xl text-center hover:bg-blue-700 transition"
          >
            回答する
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
    </div>
  );
}
