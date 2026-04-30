"use client";

import { useMemo } from "react";
import { format, parseISO } from "date-fns";
import { ja } from "date-fns/locale";
import type { CandidateDate } from "@/lib/types";

interface Props {
  candidates: CandidateDate[];
}

type Group = { date: string; hours: number[]; allDay: boolean };

function groupByDate(items: CandidateDate[]): Group[] {
  const map = new Map<string, number[]>();
  const allDay = new Set<string>();
  for (const c of items) {
    if (!map.has(c.date)) map.set(c.date, []);
    if (c.start_hour === null) {
      allDay.add(c.date);
    } else {
      map.get(c.date)!.push(c.start_hour);
    }
  }
  return Array.from(map.entries())
    .map(([date, hours]) => ({
      date,
      hours: hours.sort((a, b) => a - b),
      allDay: allDay.has(date),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

const fmtDateLong = (d: string) =>
  format(parseISO(d), "M月d日（E）", { locale: ja });

/**
 * 候補日時の読み取り表示。
 * 日付ごとにカード化、時間はチップで横並び（デザイン案A）。
 */
export default function CandidateList({ candidates }: Props) {
  const groups = useMemo(() => groupByDate(candidates), [candidates]);

  if (groups.length === 0) {
    return (
      <p className="text-sm text-gray-400 py-4">候補日時がまだありません</p>
    );
  }

  return (
    <div className="space-y-2">
      {groups.map((g) => (
        <div
          key={g.date}
          className="bg-white rounded-xl border border-gray-200 p-3"
        >
          <div className="flex items-baseline justify-between mb-2">
            <span className="font-bold text-gray-900 text-sm">
              {fmtDateLong(g.date)}
            </span>
            <span className="text-xs text-gray-400">
              {g.allDay ? "" : `${g.hours.length}枠`}
            </span>
          </div>
          {g.allDay ? (
            <span className="inline-block px-3 py-1 rounded-full bg-purple-100 text-purple-700 text-xs font-bold">
              終日
            </span>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {g.hours.map((h) => (
                <span
                  key={h}
                  className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200"
                >
                  {h}:00
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
