"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { formatDateWithHour, isDeadlinePassed, formatDeadline } from "@/lib/date-utils";
import AvailabilityToggle from "@/components/AvailabilityToggle";
import type { Event, CandidateDate, Availability } from "@/lib/types";

export default function AnswerPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.eventId as string;

  const [event, setEvent] = useState<Event | null>(null);
  const [candidates, setCandidates] = useState<CandidateDate[]>([]);
  const [name, setName] = useState("");
  const [comment, setComment] = useState("");
  const [answers, setAnswers] = useState<Record<string, Availability>>({});
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      const [eventRes, candidatesRes] = await Promise.all([
        supabase.from("events").select("*").eq("id", eventId).single(),
        supabase
          .from("candidate_dates")
          .select("*")
          .eq("event_id", eventId)
          .order("sort_order"),
      ]);

      if (eventRes.data) setEvent(eventRes.data);
      if (candidatesRes.data) {
        setCandidates(candidatesRes.data);
        const defaultAnswers: Record<string, Availability> = {};
        for (const cd of candidatesRes.data) {
          defaultAnswers[cd.id] = 2; // デフォルトは◯
        }
        setAnswers(defaultAnswers);
      }
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

  if (isDeadlinePassed(event.deadline)) {
    return (
      <div className="text-center py-16">
        <p className="text-red-500 font-bold">回答期限を過ぎています</p>
        {event.deadline && (
          <p className="text-gray-500 text-sm mt-2">
            期限: {formatDeadline(event.deadline)}
          </p>
        )}
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
      // 回答者を作成
      const { data: respondent, error: respError } = await supabase
        .from("respondents")
        .insert({
          event_id: eventId,
          name: name.trim(),
          comment: comment.trim(),
        })
        .select()
        .single();

      if (respError) throw respError;

      // 各候補日への回答を作成
      const responses = candidates.map((cd) => ({
        respondent_id: respondent.id,
        candidate_date_id: cd.id,
        availability: answers[cd.id] ?? 2,
      }));

      const { error: answersError } = await supabase
        .from("responses")
        .insert(responses);

      if (answersError) throw answersError;

      // respondentId を localStorage に保存（編集用）
      const stored = JSON.parse(
        localStorage.getItem("my_respondents") || "{}"
      );
      stored[eventId] = respondent.id;
      localStorage.setItem("my_respondents", JSON.stringify(stored));

      router.push(`/events/${eventId}/results`);
    } catch (err) {
      console.error(err);
      setError("回答の送信に失敗しました。もう一度お試しください。");
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">{event.title}</h2>
        {event.deadline && (
          <p className="text-sm text-gray-500">
            ⏰ 回答期限: {formatDeadline(event.deadline)}
          </p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 名前 */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            あなたの名前
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例：田中太郎"
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-400"
          />
        </div>

        {/* 回答 */}
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

        {/* コメント */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            コメント（任意）
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="例：午後なら嬉しいです"
            rows={3}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-400 resize-none"
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
          {isSubmitting ? "送信中..." : "回答する"}
        </button>
      </form>
    </div>
  );
}
