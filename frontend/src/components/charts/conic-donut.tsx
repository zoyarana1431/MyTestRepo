"use client";

export function ConicDonut({
  segments,
  centerTitle,
  centerSubtitle,
}: {
  segments: { value: number; color: string }[];
  centerTitle: string;
  centerSubtitle?: string;
}) {
  const total = segments.reduce((a, s) => a + s.value, 0);
  const active = segments.filter((s) => s.value > 0);
  const gradient =
    total > 0 && active.length > 0
      ? (() => {
          let p = 0;
          return active
            .map((s) => {
              const start = p;
              p += (s.value / total) * 100;
              return `${s.color} ${start}% ${p}%`;
            })
            .join(", ");
        })()
      : "#E2E8F0 0% 100%";

  return (
    <div className="relative mx-auto flex h-44 w-44 items-center justify-center">
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: `conic-gradient(from -90deg, ${gradient})`,
        }}
      />
      <div className="absolute inset-[18%] flex flex-col items-center justify-center rounded-full bg-white text-center">
        <p className="text-lg font-bold leading-tight text-slate-900">{centerTitle}</p>
        {centerSubtitle ? <p className="text-xs text-slate-500">{centerSubtitle}</p> : null}
      </div>
    </div>
  );
}
