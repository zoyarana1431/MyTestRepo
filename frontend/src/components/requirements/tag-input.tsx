"use client";

import { useState } from "react";

export function TagInput({
  tags,
  onChange,
  placeholder = "Add tag and press Enter",
  disabled,
}: {
  tags: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [input, setInput] = useState("");

  function addTag() {
    const v = input.trim();
    if (!v || tags.some((t) => t.toLowerCase() === v.toLowerCase())) {
      setInput("");
      return;
    }
    onChange([...tags, v]);
    setInput("");
  }

  function removeTag(t: string) {
    onChange(tags.filter((x) => x !== t));
  }

  return (
    <div>
      {tags.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {tags.map((t) => (
            <span
              key={t}
              className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-800 ring-1 ring-inset ring-blue-100"
            >
              {t}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeTag(t)}
                  className="rounded-full p-0.5 text-blue-600 hover:bg-blue-100"
                  aria-label={`Remove ${t}`}
                >
                  ×
                </button>
              )}
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input
          disabled={disabled}
          className="min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-60"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addTag();
            }
          }}
          placeholder={placeholder}
        />
        <button
          type="button"
          disabled={disabled || !input.trim()}
          onClick={addTag}
          className="shrink-0 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
        >
          +
        </button>
      </div>
    </div>
  );
}
