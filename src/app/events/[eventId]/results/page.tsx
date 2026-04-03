"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { formatDateWithHour, formatDeadline, isDeadlinePassed } from "@/lib/date-utils";
import { calculateScores, getBestDates } from "@/lib/scoring";
import { AVAILABILITY_COLORS } from "@/lib/types";
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
        <a
          href={`/events/${eventId}`}
          className="text-gray-400 hover:text-gray-600 transition text-sm"
        >
          &larr; イベント詳細
        </a>
        <h2 className="text-xl font-bold text-gray-900 mt-2 mb-1">{event.title}</h2>
        <div className="flex items-center gap-3">
          {event.deadline && (
            <p className={`text-sm ${deadlinePassed ? "text-red-500" : "text-gray-500"}`}>
              {deadlinePassed ? "回答受付終了" : `回答期限: ${formatDeadline(event.deadline)}`}
            </p>
          )}
          <span className="text-sm text-gray-400">
            回答 {respondents.length}名
          </span>
        </div>
      </div>

      {/* おすすめ日 */}
      {bestDates.length > 0 && respondents.length > 0 && (
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
      {respondents.length > 0 && (
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
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <p className="text-gray-500">まだ回答がありません</p>
        </div>
      )}

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
