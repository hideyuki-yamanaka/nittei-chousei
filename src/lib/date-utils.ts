import { format, parseISO } from "date-fns";
import { ja } from "date-fns/locale";

export function formatDate(dateStr: string): string {
  return format(parseISO(dateStr), "M月d日（E）", { locale: ja });
}

export function formatDateWithHour(dateStr: string, startHour: number | null): string {
  const dateLabel = formatDate(dateStr);
  if (startHour === null) return `${dateLabel} 終日`;
  return `${dateLabel} ${startHour}:00`;
}

export function formatDeadline(deadline: string): string {
  return format(parseISO(deadline), "M月d日（E）HH:mm まで", { locale: ja });
}

export function isDeadlinePassed(deadline: string | null): boolean {
  if (!deadline) return false;
  return new Date() > new Date(deadline);
}
