"use client";

import { useState, useRef, useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface InlineTitleProps {
  eventId: string;
  title: string;
  onUpdate?: (newTitle: string) => void;
  className?: string;
}

export default function InlineTitle({
  eventId,
  title,
  onUpdate,
  className = "text-base font-bold text-gray-900",
}: InlineTitleProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(title);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setValue(title);
  }, [title]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  async function save() {
    const trimmed = value.trim();
    if (!trimmed || trimmed === title) {
      setValue(title);
      setEditing(false);
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from("events")
      .update({ title: trimmed })
      .eq("id", eventId);

    if (!error) {
      onUpdate?.(trimmed);
    } else {
      setValue(title);
    }
    setSaving(false);
    setEditing(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      save();
    } else if (e.key === "Escape") {
      setValue(title);
      setEditing(false);
    }
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={save}
        onKeyDown={handleKeyDown}
        disabled={saving}
        className={`${className} border-b-2 border-blue-500 outline-none bg-transparent w-full px-0 py-0`}
      />
    );
  }

  return (
    <span
      onClick={() => setEditing(true)}
      className={`${className} cursor-pointer hover:text-blue-600 transition truncate block`}
      title="クリックして編集"
    >
      {title}
    </span>
  );
}
