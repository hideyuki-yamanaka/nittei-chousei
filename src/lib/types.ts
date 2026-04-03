export interface Event {
  id: string;
  title: string;
  description: string;
  deadline: string | null;
  deleted_at: string | null;
  created_at: string;
}

export interface CandidateDate {
  id: string;
  event_id: string;
  date: string;
  start_hour: number | null; // 9, 10, 11... null = 終日
  sort_order: number;
}

export interface Respondent {
  id: string;
  event_id: string;
  name: string;
  comment: string;
  created_at: string;
}

export interface Response {
  id: string;
  respondent_id: string;
  candidate_date_id: string;
  availability: 0 | 1 | 2; // 0=×, 1=△, 2=◯
}

export type Availability = 0 | 1 | 2;

export const AVAILABILITY_LABELS: Record<Availability, string> = {
  2: "◯",
  1: "△",
  0: "×",
};

export const AVAILABILITY_COLORS: Record<Availability, string> = {
  2: "text-green-600",
  1: "text-yellow-600",
  0: "text-red-500",
};
