"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { formatDateWithHour, isDeadlinePassed } from "@/lib/date-utils";
import AvailabilityToggle from "@/components/AvailabilityToggle";
import type { Event, CandidateDate, Respondent, Response, Availability } from "@/lib/types";

export default function EditAnswerPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.eventId as string;
  const respondentId = params.respondentId as string;

  const [event, setEvent] = useState<Event | null>(null);
  const [candidates, setCandidates] = useState<CandidateDate[]>([]);
  const [respondent, setRespondent] = useState<Respondent | null>(null);
  const [name, setName] = useState("");
  const [comment, setComment] = useState("");
  const [answers, setAnswers] = useState<Record<string, Availability>>({});
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      const [eventRes, candidatesRes, respondentRes, responsesRes] =
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
            .eq("id", respondentId)
            .single(),
          supabase
            .from("responses")
            .select("*")
            .eq("respondent_id", respondentId),
        ]);

      if (eventRes.data) setEvent(eventRes.data);
      if (candidatesRes.data) setCandidates(candidatesRes.data);
      if (respondentRes.data) {
        setRespondent(respondentRes.data);
        setName(respondentRes.data.name);
        setComment(respondentRes.data.comment || "");
      }
      if (responsesRes.data) {
        const a: Record<string, Availability> = {};
        for (const r of responsesRes.data) {
          a[r.candidate_date_id] = r.availability as Availability;
        }
        setAnswers(a);
      }
      setLoading(false);
    }
    load();
  }, [eventId, respondentId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    );
  }

  if (!event || !respondent) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500">データが見つかりませんでした</p>
      </div>
    );
  }

  if (isDeadlinePassed(event.deadline)) {
    return (
      <div className="text-center py-16">
        <p className="text-red-500 font-bold">回答期限を過ぎています</p>
        <a
          href={`/events/${eventId}/results`}
          className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg"
        >
          結果を見る
        </a>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("名前を入力してください");
      return;
    }

    setIsSubmitting(true);

    try {
      // 回答者情報を更新
      await supabase
        .from("respondents")
        .update({ name: name.trim(), comment: comment.trim() })
        .eq("id", respondentId);

      // 既存の回答を削除して再作成
      await supabase.from("responses").delete().eq("respondent_id", respondentId);

      const responses = candidates.map((cd) => ({
        respondent_id: respondentId,
        candidate_date_id: cd.id,
        availability: answers[cd.id] ?? 2,
      }));

      const { error: answersError } = await supabase
        .from("responses")
        .insert(responses);

      if (answersError) throw answersError;

      router.push(`/events/${eventId}/results`);
    } catch (err) {
      console.error(err);
      setError("更新に失敗しました。もう一度お試しください。");
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">{event.title}</h2>
        <p className="text-sm text-gray-500">回答を修正</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            あなたの名前
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            各候補日の都合を選択
          </label>
          <div className="space-y-3">
            {candidates.map((cd) => (
              <div
                key={cd.id}
                className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-center justify-between gap-3"
              >
                <span className="text-sm text-gray-900 font-medium">
                  {formatDateWithHour(cd.date, cd.start_hour)}
                </span>
                <AvailabilityToggle
                  value={answers[cd.id] ?? 2}
                  onChange={(v) =>
                    setAnswers((prev) => ({ ...prev, [cd.id]: v }))
                  }
                />
              </div>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            コメント（任意）
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 resize-none"
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3 px-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "更新中..." : "回答を修正する"}
        </button>
      </form>
    </div>
  );
}
