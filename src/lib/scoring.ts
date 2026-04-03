import type { CandidateDate, Response } from "./types";

export interface DateScore {
  candidateDateId: string;
  date: string;
  startHour: number | null;
  totalScore: number;
  okCount: number;
  maybeCount: number;
  ngCount: number;
  respondentCount: number;
}

export function calculateScores(
  candidateDates: CandidateDate[],
  responses: Response[]
): DateScore[] {
  const responsesByCandidate = new Map<string, Response[]>();
  for (const r of responses) {
    const list = responsesByCandidate.get(r.candidate_date_id) ?? [];
    list.push(r);
    responsesByCandidate.set(r.candidate_date_id, list);
  }

  const scores: DateScore[] = candidateDates.map((cd) => {
    const cdResponses = responsesByCandidate.get(cd.id) ?? [];
    let totalScore = 0;
    let okCount = 0;
    let maybeCount = 0;
    let ngCount = 0;

    for (const r of cdResponses) {
      totalScore += r.availability;
      if (r.availability === 2) okCount++;
      else if (r.availability === 1) maybeCount++;
      else ngCount++;
    }

    return {
      candidateDateId: cd.id,
      date: cd.date,
      startHour: cd.start_hour,
      totalScore,
      okCount,
      maybeCount,
      ngCount,
      respondentCount: cdResponses.length,
    };
  });

  scores.sort((a, b) => {
    if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
    if (a.ngCount !== b.ngCount) return a.ngCount - b.ngCount;
    return b.okCount - a.okCount;
  });

  return scores;
}

export function getBestDates(scores: DateScore[]): DateScore[] {
  if (scores.length === 0) return [];
  const maxScore = scores[0].totalScore;
  if (maxScore === 0) return [];
  return scores.filter((s) => s.totalScore === maxScore);
}
