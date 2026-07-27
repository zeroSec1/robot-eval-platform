import { cn } from "@/lib/utils";

type Tone =
  | "neutral"
  | "success"
  | "danger"
  | "warning"
  | "info"
  | "accent"
  | "violet"
  | "orange"
  | "pink";

const TONE_CLASSES: Record<Tone, string> = {
  neutral: "bg-hover text-dim ring-1 ring-inset ring-border-strong",
  success: "bg-green/10 text-green ring-1 ring-inset ring-green/30",
  danger: "bg-red/10 text-red ring-1 ring-inset ring-red/30",
  warning: "bg-amber/10 text-amber ring-1 ring-inset ring-amber/30",
  info: "bg-blue/10 text-blue ring-1 ring-inset ring-blue/30",
  accent: "bg-accent/10 text-accent ring-1 ring-inset ring-accent/30",
  violet: "bg-violet/10 text-violet ring-1 ring-inset ring-violet/30",
  orange: "bg-orange/10 text-orange ring-1 ring-inset ring-orange/30",
  pink: "bg-pink/10 text-pink ring-1 ring-inset ring-pink/30",
};

export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-[12px] font-medium whitespace-nowrap",
        TONE_CLASSES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
