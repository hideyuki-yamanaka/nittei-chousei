"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";

export default function ResultsRedirect() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.eventId as string;

  useEffect(() => {
    router.replace(`/events/${eventId}`);
  }, [eventId, router]);

  return (
    <div className="flex items-center justify-center py-16">
      <div className="text-gray-500">リダイレクト中...</div>
    </div>
  );
}
