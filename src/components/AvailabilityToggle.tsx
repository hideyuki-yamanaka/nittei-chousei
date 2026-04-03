"use client";

import type { Availability } from "@/lib/types";

interface AvailabilityToggleProps {
  value: Availability;
  onChange: (value: Availability) => void;
}

const CYCLE: Availability[] = [2, 1, 0];

function CircleIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="2.5"
        fill={filled ? "currentColor" : "none"}
      />
      {filled && (
        <circle cx="12" cy="12" r="9" fill="currentColor" opacity="0.2" />
      )}
    </svg>
  );
}

function TriangleIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 4L22 20H2L12 4Z"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinejoin="round"
        fill={filled ? "currentColor" : "none"}
      />
      {filled && (
        <path
          d="M12 4L22 20H2L12 4Z"
          fill="currentColor"
          opacity="0.2"
        />
      )}
    </svg>
  );
}

function CrossIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      {filled && (
        <rect x="2" y="2" width="20" height="20" rx="4" fill="currentColor" opacity="0.15" />
      )}
      <path
        d="M7 7L17 17M17 7L7 17"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function AvailabilityToggle({
  value,
  onChange,
}: AvailabilityToggleProps) {
  return (
    <div className="flex gap-1.5">
      {CYCLE.map((v) => {
        const active = value === v;

        let colorClass = "";
        let Icon: React.FC<{ filled: boolean }>;

        if (v === 2) {
          colorClass = active
            ? "bg-green-100 text-green-600 border-green-400 ring-2 ring-green-300"
            : "bg-white text-gray-300 border-gray-200 hover:text-green-400 hover:border-green-300";
          Icon = CircleIcon;
        } else if (v === 1) {
          colorClass = active
            ? "bg-yellow-100 text-yellow-600 border-yellow-400 ring-2 ring-yellow-300"
            : "bg-white text-gray-300 border-gray-200 hover:text-yellow-400 hover:border-yellow-300";
          Icon = TriangleIcon;
        } else {
          colorClass = active
            ? "bg-red-100 text-red-500 border-red-400 ring-2 ring-red-300"
            : "bg-white text-gray-300 border-gray-200 hover:text-red-400 hover:border-red-300";
          Icon = CrossIcon;
        }

        return (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            className={`w-11 h-11 rounded-xl border-2 flex items-center justify-center transition-all ${colorClass}`}
          >
            <Icon filled={active} />
          </button>
        );
      })}
    </div>
  );
}
