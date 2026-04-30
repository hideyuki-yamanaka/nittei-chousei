"use client";

import { useMemo } from "react";
import { format, parseISO } from "date-fns";
import { ja } from "date-fns/locale";

// ─── サンプルデータ ─────────────────────────────────
type Candidate = { id: string; date: string; start_hour: number | null };

const SAMPLE: Candidate[] = [
  { id: "1", date: "2026-05-07", start_hour: 19 },
  { id: "2", date: "2026-05-07", start_hour: 20 },
  { id: "3", date: "2026-05-07", start_hour: 21 },
  { id: "4", date: "2026-05-07", start_hour: 22 },
  { id: "5", date: "2026-05-08", start_hour: 19 },
  { id: "6", date: "2026-05-08", start_hour: 20 },
  { id: "7", date: "2026-05-08", start_hour: 21 },
  { id: "8", date: "2026-05-08", start_hour: 22 },
  { id: "9", date: "2026-05-09", start_hour: 19 },
  { id: "10", date: "2026-05-09", start_hour: 20 },
  { id: "11", date: "2026-05-09", start_hour: 21 },
  { id: "12", date: "2026-05-09", start_hour: 22 },
  { id: "13", date: "2026-04-20", start_hour: 18 },
  { id: "14", date: "2026-04-20", start_hour: 19 },
  { id: "15", date: "2026-04-20", start_hour: 20 },
  { id: "16", date: "2026-04-20", start_hour: 21 },
  { id: "17", date: "2026-05-18", start_hour: null },
  { id: "18", date: "2026-05-19", start_hour: null },
  { id: "19", date: "2026-05-20", start_hour: null },
];

// 日付ごとにグルーピング
function groupByDate(items: Candidate[]) {
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

// 時間帯ごとにグルーピング
function groupByHour(items: Candidate[]) {
  const map = new Map<string, string[]>();
  for (const c of items) {
    const key = c.start_hour === null ? "終日" : `${c.start_hour}:00`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(c.date);
  }
  return Array.from(map.entries())
    .map(([hour, dates]) => ({
      hour,
      dates: dates.sort(),
    }))
    .sort((a, b) => {
      // "終日" は末尾
      if (a.hour === "終日") return 1;
      if (b.hour === "終日") return -1;
      return parseInt(a.hour) - parseInt(b.hour);
    });
}

const fmtDate = (d: string) => format(parseISO(d), "M/d（E）", { locale: ja });
const fmtDateLong = (d: string) =>
  format(parseISO(d), "M月d日（E）", { locale: ja });

// ─── パターンA: 日付グルーピング + 時間チップ ──────
function PatternA({ data }: { data: Candidate[] }) {
  const groups = useMemo(() => groupByDate(data), [data]);
  return (
    <div className="space-y-2">
      {groups.map((g) => (
        <div
          key={g.date}
          className="bg-white rounded-xl border border-gray-200 p-3"
        >
          <div className="flex items-baseline justify-between mb-2">
            <span className="font-bold text-gray-900">{fmtDateLong(g.date)}</span>
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

// ─── パターンB: マトリクス（日付×時間グリッド）────
function PatternB({ data }: { data: Candidate[] }) {
  const groups = useMemo(() => groupByDate(data), [data]);
  // 出てくる時間帯（終日除く）を集める
  const allHours = useMemo(() => {
    const set = new Set<number>();
    for (const c of data) if (c.start_hour !== null) set.add(c.start_hour);
    return Array.from(set).sort((a, b) => a - b);
  }, [data]);
  const hasAllDay = groups.some((g) => g.allDay);

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-3 py-2 font-bold text-gray-700 sticky left-0 bg-gray-50">
                日付
              </th>
              {hasAllDay && (
                <th className="text-center px-2 py-2 font-bold text-gray-700">
                  終日
                </th>
              )}
              {allHours.map((h) => (
                <th
                  key={h}
                  className="text-center px-2 py-2 font-bold text-gray-700"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => (
              <tr key={g.date} className="border-b border-gray-100">
                <td className="px-3 py-2 font-medium text-gray-900 whitespace-nowrap sticky left-0 bg-white">
                  {fmtDate(g.date)}
                </td>
                {hasAllDay && (
                  <td className="text-center px-2 py-2">
                    {g.allDay ? (
                      <span className="inline-block w-5 h-5 bg-purple-500 rounded-full" />
                    ) : (
                      <span className="text-gray-200">·</span>
                    )}
                  </td>
                )}
                {allHours.map((h) => (
                  <td key={h} className="text-center px-2 py-2">
                    {g.hours.includes(h) ? (
                      <span className="inline-block w-5 h-5 bg-blue-500 rounded-full" />
                    ) : (
                      <span className="text-gray-200">·</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── パターンC: 時間帯バケット（時間ごとに日付を並べる）─
function PatternC({ data }: { data: Candidate[] }) {
  const groups = useMemo(() => groupByHour(data), [data]);
  return (
    <div className="space-y-2">
      {groups.map((g) => (
        <div
          key={g.hour}
          className="bg-white rounded-xl border border-gray-200 p-3 flex gap-3 items-center"
        >
          <div className="shrink-0 w-16 text-center">
            <div
              className={`text-base font-bold ${
                g.hour === "終日" ? "text-purple-600" : "text-blue-600"
              }`}
            >
              {g.hour}
            </div>
            <div className="text-[10px] text-gray-400">{g.dates.length}日</div>
          </div>
          <div className="flex-1 flex flex-wrap gap-1.5">
            {g.dates.map((d) => (
              <span
                key={d}
                className={`px-2 py-0.5 rounded-md text-xs font-medium border ${
                  g.hour === "終日"
                    ? "bg-purple-50 text-purple-700 border-purple-200"
                    : "bg-gray-50 text-gray-700 border-gray-200"
                }`}
              >
                {fmtDate(d)}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function DesignPreviewPage() {
  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <div>
        <a
          href="/"
          className="text-gray-400 hover:text-gray-600 transition text-sm"
        >
          &larr; 一覧に戻る
        </a>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">
          候補日時 UI デザインプレビュー
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          同じデータを 3 パターンで並べてみたよ。気に入ったのを教えて。
        </p>
      </div>

      <section>
        <div className="flex items-baseline gap-2 mb-3">
          <span className="px-2.5 py-0.5 rounded-md bg-blue-600 text-white text-xs font-bold">
            A
          </span>
          <h2 className="text-lg font-bold text-gray-900">
            日付グルーピング型
          </h2>
          <span className="text-xs text-gray-400">
            日付ごとにカード化、時間はチップで一覧
          </span>
        </div>
        <PatternA data={SAMPLE} />
      </section>

      <section>
        <div className="flex items-baseline gap-2 mb-3">
          <span className="px-2.5 py-0.5 rounded-md bg-blue-600 text-white text-xs font-bold">
            B
          </span>
          <h2 className="text-lg font-bold text-gray-900">マトリクス型</h2>
          <span className="text-xs text-gray-400">
            日付×時間のグリッドで全体を俯瞰
          </span>
        </div>
        <PatternB data={SAMPLE} />
      </section>

      <section>
        <div className="flex items-baseline gap-2 mb-3">
          <span className="px-2.5 py-0.5 rounded-md bg-blue-600 text-white text-xs font-bold">
            C
          </span>
          <h2 className="text-lg font-bold text-gray-900">時間帯バケット型</h2>
          <span className="text-xs text-gray-400">
            時間でまとめて、各時間に対応する日付を並べる
          </span>
        </div>
        <PatternC data={SAMPLE} />
      </section>

      <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 text-sm text-yellow-800">
        どれがいい？ A/B/C で教えてくれたら、本番の詳細ページに適用します。
        混ぜたり調整したいパターンがあればそれもOK。
      </div>
    </div>
  );
}
