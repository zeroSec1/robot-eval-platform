"use client";

import { useCallback, useRef, useState } from "react";
import REPORT from "@/data/eval-report.json";

// Every value drawn here comes from src/data/eval-report.json, which
// scripts/build-eval-report.py regenerates from the source parquet and
// cross-checks against the shipped telemetry. Nothing in this file may
// hardcode a statistic; eval-report-tests.py enforces the report itself.

const FIG_W = 640;

type TipState = { x: number; y: number; lines: string[] } | null;

function useTooltip() {
  const [tip, setTip] = useState<TipState>(null);
  const ref = useRef<HTMLDivElement>(null);
  const show = useCallback((evt: React.MouseEvent, lines: string[]) => {
    const box = ref.current?.getBoundingClientRect();
    if (!box) return;
    setTip({ x: evt.clientX - box.left, y: evt.clientY - box.top, lines });
  }, []);
  const hide = useCallback(() => setTip(null), []);
  return { tip, ref, show, hide };
}

function Tooltip({ tip }: { tip: TipState }) {
  if (!tip) return null;
  return (
    <div
      className="pointer-events-none absolute z-10 rounded-md border border-border bg-surface px-2.5 py-1.5 text-[12px] leading-relaxed text-dim shadow-sm"
      style={{
        left: Math.min(tip.x + 12, FIG_W - 150),
        top: Math.max(tip.y - 10, 0),
      }}
    >
      {tip.lines.map((l, i) => (
        <div key={i} className={i === 0 ? "text-text" : undefined}>{l}</div>
      ))}
    </div>
  );
}

function FigureShell({
  caption,
  children,
  tipRef,
  tip,
}: {
  caption: string;
  children: React.ReactNode;
  tipRef: React.RefObject<HTMLDivElement | null>;
  tip: TipState;
}) {
  return (
    <figure className="my-1 rounded-md border border-border bg-card p-3.5">
      <div ref={tipRef} className="relative">
        {children}
        <Tooltip tip={tip} />
      </div>
      <figcaption className="mt-2 text-[12.5px] leading-relaxed text-faint">{caption}</figcaption>
    </figure>
  );
}

function LegendRow({ items }: { items: { color: string; label: string }[] }) {
  return (
    <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1">
      {items.map((it) => (
        <span key={it.label} className="flex items-center gap-1.5 text-[12px] text-dim">
          <span className="h-2 w-2 rounded-full" style={{ background: it.color }} />
          {it.label}
        </span>
      ))}
    </div>
  );
}

// Horizontal bar with a 4px rounded data-end and a square baseline end.
function barPath(x: number, y: number, w: number, h: number) {
  const r = Math.min(4, w);
  return `M${x},${y} h${w - r} a${r},${r} 0 0 1 ${r},${r} v${h - 2 * r} a${r},${r} 0 0 1 -${r},${r} h-${w - r} Z`;
}

const SUCCESS = "var(--accent)";
const FAILURE = "var(--red)";
const ENVELOPE = "var(--violet)";
const RAN_OUT = "var(--orange)";

export function OutcomesFigure() {
  const { tip, ref, show, hide } = useTooltip();
  const sets = Object.values(REPORT.scoredDatasets);
  const max = Math.max(...sets.flatMap((d) => [d.success, d.failure]));
  const barH = 18;
  const rowGap = 14;
  const groupGap = 22;
  const left = 8;
  const plotW = FIG_W - left - 120;
  const h = sets.length * (2 * barH + rowGap + groupGap) + 8;

  let y = 4;
  const rows: React.ReactNode[] = [];
  for (const d of sets) {
    rows.push(
      <text key={`${d.label}-t`} x={left} y={y + 10} className="fill-dim" fontSize={12.5}>
        {d.label}
      </text>,
    );
    y += 18;
    for (const [kind, count, color] of [
      ["success", d.success, SUCCESS],
      ["failure", d.failure, FAILURE],
    ] as const) {
      const w = Math.max((count / max) * plotW, count === 0 ? 2 : 6);
      const yy = y;
      rows.push(
        <g
          key={`${d.label}-${kind}`}
          onMouseMove={(e) => show(e, [`${d.label}`, `${count} ${kind} episodes`])}
          onMouseLeave={hide}
        >
          <path d={barPath(left, yy, w, barH)} fill={color} />
          <text x={left + w + 8} y={yy + barH / 2 + 4} className="fill-text" fontSize={12}>
            {count} {kind}
          </text>
        </g>,
      );
      y += barH + 4;
    }
    y += groupGap - 4;
  }

  return (
    <FigureShell
      tipRef={ref}
      tip={tip}
      caption="Figure 1. Scored outcomes in the two auto-scorable datasets. Success criterion: max coverage reward of at least 0.9. The remaining 248 of 308 episodes have no automatic success signal and stay unscored rather than guessed."
    >
      <LegendRow items={[{ color: SUCCESS, label: "success" }, { color: FAILURE, label: "failure" }]} />
      <svg viewBox={`0 0 ${FIG_W} ${y}`} className="h-auto w-full" role="img"
        aria-label="Bar chart of scored episode outcomes per dataset">
        {rows}
      </svg>
    </FigureShell>
  );
}

export function EnvelopeFigure() {
  const { tip, ref, show, hide } = useTooltip();
  const f = REPORT.figures.envelope;
  const w = FIG_W;
  const h = 300;
  const m = { top: 14, right: 12, bottom: 30, left: 40 };
  const tMax = Math.max(f.envelopeT[f.envelopeT.length - 1], f.exemplarT[f.exemplarT.length - 1]);
  const sx = (t: number) => m.left + (t / tMax) * (w - m.left - m.right);
  const sy = (v: number) => m.top + (1 - v) * (h - m.top - m.bottom);

  const path = (ts: number[], vs: number[]) =>
    vs.map((v, i) => `${i ? "L" : "M"}${sx(ts[i]).toFixed(1)},${sy(v).toFixed(1)}`).join("");

  const anomalyIdx = f.exemplarT.findIndex((t) => t >= f.exemplarAnomalyS);
  const ax = sx(f.exemplarAnomalyS);
  const ay = sy(f.exemplarCoverage[Math.max(anomalyIdx, 0)]);

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = e.currentTarget;
    const t = ((e.clientX - svg.getBoundingClientRect().left) / svg.clientWidth) * w;
    const time = Math.max(0, Math.min(tMax, ((t - m.left) / (w - m.left - m.right)) * tMax));
    const ei = Math.min(f.envelopeT.length - 1, Math.round((time / f.envelopeT[f.envelopeT.length - 1]) * (f.envelopeT.length - 1)));
    const xi = Math.round((time / f.exemplarT[f.exemplarT.length - 1]) * (f.exemplarT.length - 1));
    const lines = [`t = ${time.toFixed(1)} s`,
      `envelope (P10): ${f.envelopeP10[ei]?.toFixed(2) ?? "-"}`,
      `success median: ${f.successMedian[ei]?.toFixed(2) ?? "-"}`];
    if (xi >= 0 && xi < f.exemplarCoverage.length)
      lines.push(`failed episode: ${f.exemplarCoverage[xi].toFixed(2)}`);
    show(e, lines);
  };

  return (
    <FigureShell
      tipRef={ref}
      tip={tip}
      caption={`Figure 2. Coverage over time. The violet line is the 10th-percentile envelope of the 25 successful trials; the teal line is their median. The red line is failed episode ${f.exemplarId}, flagged at ${f.exemplarAnomalyS.toFixed(1)} s, the first moment it stays below the envelope for 0.5 s.`}
    >
      <LegendRow
        items={[
          { color: ENVELOPE, label: "envelope (P10 of successes)" },
          { color: SUCCESS, label: "success median (P50)" },
          { color: FAILURE, label: `failed episode ${f.exemplarId}` },
        ]}
      />
      <svg viewBox={`0 0 ${w} ${h}`} className="h-auto w-full" role="img"
        aria-label="Line chart of coverage over time with anomaly marker"
        onMouseMove={onMove} onMouseLeave={hide}>
        {[0, 0.25, 0.5, 0.75, 1].map((v) => (
          <g key={v}>
            <line x1={m.left} x2={w - m.right} y1={sy(v)} y2={sy(v)} stroke="var(--border)" strokeWidth={1} />
            <text x={m.left - 6} y={sy(v) + 4} textAnchor="end" fontSize={11} className="fill-faint"
              style={{ fontVariantNumeric: "tabular-nums" }}>
              {v}
            </text>
          </g>
        ))}
        {Array.from({ length: Math.floor(tMax / 5) + 1 }, (_, i) => i * 5).map((t) => (
          <text key={t} x={sx(t)} y={h - 10} textAnchor="middle" fontSize={11} className="fill-faint"
            style={{ fontVariantNumeric: "tabular-nums" }}>
            {t}s
          </text>
        ))}
        <path d={path(f.envelopeT, f.envelopeP10)} fill="none" stroke={ENVELOPE} strokeWidth={2}
          strokeLinejoin="round" strokeLinecap="round" />
        <path d={path(f.envelopeT, f.successMedian)} fill="none" stroke={SUCCESS} strokeWidth={2}
          strokeLinejoin="round" strokeLinecap="round" />
        <path d={path(f.exemplarT, f.exemplarCoverage)} fill="none" stroke={FAILURE} strokeWidth={2}
          strokeLinejoin="round" strokeLinecap="round" />
        <line x1={ax} x2={ax} y1={m.top} y2={h - m.bottom} stroke={FAILURE} strokeWidth={1} opacity={0.5} />
        <circle cx={ax} cy={ay} r={5} fill={FAILURE} stroke="var(--card)" strokeWidth={2} />
        <text x={ax + 8} y={m.top + 12} fontSize={12} className="fill-text">
          flagged at {f.exemplarAnomalyS.toFixed(1)} s
        </text>
      </svg>
    </FigureShell>
  );
}

export function TimingFigure() {
  const { tip, ref, show, hide } = useTooltip();
  const pts = REPORT.figures.anomalyStrip;
  const w = FIG_W;
  const h = 300;
  const m = { top: 14, right: 16, bottom: 34, left: 40 };
  const dMax = Math.ceil(Math.max(...pts.map((p) => p.durationS)) + 1);
  const sx = (v: number) => m.left + (v / dMax) * (w - m.left - m.right);
  const sy = (v: number) => m.top + (1 - v / dMax) * (h - m.top - m.bottom);

  return (
    <FigureShell
      tipRef={ref}
      tip={tip}
      caption="Figure 3. When each of the 27 failed episodes was flagged, against how long it ran. Points on the diagonal were flagged at episode end: they tracked the success envelope but ran out of time at their coverage peak. Points below the diagonal diverged mid-episode."
    >
      <LegendRow
        items={[
          { color: ENVELOPE, label: `diverged from envelope (${pts.filter((p) => p.method === "envelope-drop").length})` },
          { color: RAN_OUT, label: `ran out of time at coverage peak (${pts.filter((p) => p.method === "peak-fallback").length})` },
        ]}
      />
      <svg viewBox={`0 0 ${w} ${h}`} className="h-auto w-full" role="img"
        aria-label="Scatter plot of anomaly time versus episode duration for failed episodes">
        {Array.from({ length: Math.floor(dMax / 5) + 1 }, (_, i) => i * 5).map((v) => (
          <g key={v}>
            <line x1={sx(v)} x2={sx(v)} y1={m.top} y2={h - m.bottom} stroke="var(--border)" strokeWidth={1} />
            <line x1={m.left} x2={w - m.right} y1={sy(v)} y2={sy(v)} stroke="var(--border)" strokeWidth={1} />
            <text x={sx(v)} y={h - 14} textAnchor="middle" fontSize={11} className="fill-faint"
              style={{ fontVariantNumeric: "tabular-nums" }}>{v}s</text>
            <text x={m.left - 6} y={sy(v) + 4} textAnchor="end" fontSize={11} className="fill-faint"
              style={{ fontVariantNumeric: "tabular-nums" }}>{v}s</text>
          </g>
        ))}
        <line x1={sx(0)} y1={sy(0)} x2={sx(dMax)} y2={sy(dMax)} stroke="var(--border-strong)" strokeWidth={1} />
        <text x={sx(dMax * 0.62)} y={sy(dMax * 0.62) - 8} fontSize={11.5} className="fill-faint"
          transform={`rotate(${-Math.atan((h - m.top - m.bottom) / (w - m.left - m.right)) * (180 / Math.PI)} ${sx(dMax * 0.62)} ${sy(dMax * 0.62) - 8})`}>
          flagged at episode end
        </text>
        {pts.map((p) => (
          <circle
            key={p.id}
            cx={sx(p.durationS)}
            cy={sy(p.anomalyS)}
            r={4.5}
            fill={p.method === "envelope-drop" ? ENVELOPE : RAN_OUT}
            stroke="var(--card)"
            strokeWidth={2}
            onMouseMove={(e) =>
              show(e, [p.id, `flagged at ${p.anomalyS.toFixed(1)} s of ${p.durationS.toFixed(1)} s`,
                p.method === "envelope-drop" ? "diverged from envelope" : "ran out of time"])}
            onMouseLeave={hide}
          />
        ))}
        <text x={sx(dMax) - 4} y={h - m.bottom - 6} textAnchor="end" fontSize={11.5} className="fill-faint">
          episode duration
        </text>
        <text x={m.left + 6} y={m.top + 10} fontSize={11.5} className="fill-faint">
          anomaly time
        </text>
      </svg>
    </FigureShell>
  );
}

const EVAL_FIGURES: Record<string, React.ComponentType> = {
  outcomes: OutcomesFigure,
  envelope: EnvelopeFigure,
  timing: TimingFigure,
};
