"use client";

import type { Availability } from "@/lib/types";
import { AVAILABILITY_LABELS } from "@/lib/types";

interface AvailabilityToggleProps {
  value: Availability;
  onChange: (value: Availability) => void;
}

const CYCLE: Availability[] = [2, 1, 0];

export default function AvailabilityToggle({
  value,
  onChange,
}: AvailabilityToggleProps) {
  return (
    <div className="flex gap-1">
      {CYCLE.map((v) => {
        const active = value === v;
        let colorClass = "";
        if (v === 2) colorClass = active ? "bg-green-500 text-white" : "bg-gray-100 text-green-600 hover:bg-green-50";
        else if (v === 1) colorClass = active ? "bg-yellow-500 text-white" : "bg-gray-100 text-yellow-600 hover:bg-yellow-50";
        else colorClass = active ? "bg-red-500 text-white" : "bg-gray-100 text-red-600 hover:bg-red-50";

        return (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            className={`w-10 h-10 rounded-lg font-bold text-lg transition ${colorClass}`}
          >
            {AVAILABILITY_LABELS[v]}
          </button>
        );
      })}
    </div>
  );
}
