import { DayBucket } from "@/lib/timeseries";
import { formatPercent } from "@/lib/utils";

const W = 720;
const H = 180;
const PAD_TOP = 8;
const PAD_BOTTOM = 22;
const PAD_X = 4;

/** Stacked success/failure bars per day with a success-rate line overlay.
 * Pure SVG server component — colors come from CSS variables so both themes work. */
export function TrendChart({ buckets }: { buckets: DayBucket[] }) {
  const maxTotal = Math.max(1, ...buckets.map((b) => b.total));
  const chartH = H - PAD_TOP - PAD_BOTTOM;
  const slot = (W - PAD_X * 2) / buckets.length;
  const barW = Math.min(28, slot * 0.55);

  const ratePoints = buckets
    .map((b, i) => {
      if (b.total === 0) return null;
      const x = PAD_X + slot * i + slot / 2;
      const y = PAD_TOP + chartH * (1 - b.success / b.total);
      return { x, y, rate: b.success / b.total };
    })
    .filter((p): p is { x: number; y: number; rate: number } => p !== null);

  const polyline = ratePoints.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      role="img"
      aria-label="Daily episode outcomes with success-rate trend"
    >
      {/* horizontal gridlines at 0/50/100% of max volume */}
      {[0.5, 1].map((f) => (
        <line
          key={f}
          x1={PAD_X}
          x2={W - PAD_X}
          y1={PAD_TOP + chartH * (1 - f)}
          y2={PAD_TOP + chartH * (1 - f)}
          stroke="var(--border)"
          strokeWidth="1"
          strokeDasharray="3 4"
        />
      ))}

      {buckets.map((b, i) => {
        const x = PAD_X + slot * i + (slot - barW) / 2;
        const successH = chartH * (b.success / maxTotal);
        const failureH = chartH * (b.failure / maxTotal);
        const yFailTop = PAD_TOP + chartH - successH - failureH;
        return (
          <g key={b.dateKey}>
            <title>{`${b.label}: ${b.success} success · ${b.failure} failure${b.total ? ` · ${formatPercent(b.success / b.total)} success rate` : ""}`}</title>
            {b.failure > 0 ? (
              <rect x={x} y={yFailTop} width={barW} height={failureH} rx="1.5" fill="var(--red)" opacity="0.85" />
            ) : null}
            {b.success > 0 ? (
              <rect
                x={x}
                y={PAD_TOP + chartH - successH}
                width={barW}
                height={successH}
                rx="1.5"
                fill="var(--green)"
                opacity="0.75"
              />
            ) : null}
            <text
              x={x + barW / 2}
              y={H - 6}
              textAnchor="middle"
              fontSize="7.5"
              fill="var(--mute)"
            >
              {b.label}
            </text>
          </g>
        );
      })}

      {ratePoints.length > 1 ? (
        <polyline
          points={polyline}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="1.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      ) : null}
      {ratePoints.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="2.2" fill="var(--accent)" />
      ))}
    </svg>
  );
}

export function TrendLegend() {
  return (
    <div className="flex items-center gap-4 text-[12px] text-faint">
      <span className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-[1px] bg-green opacity-75" /> success
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-[1px] bg-red opacity-85" /> failure
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-0.5 w-3 rounded-full bg-accent" /> success rate
      </span>
    </div>
  );
}
