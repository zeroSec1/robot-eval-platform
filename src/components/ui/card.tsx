import { cn } from "@/lib/utils";

export function Card({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("rounded-md border border-border bg-card", className)}>{children}</div>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
  className,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 border-b border-border px-3.5 py-2.5",
        className,
      )}
    >
      <div>
        <h3 className="text-[15px] font-medium text-text">{title}</h3>
        {subtitle ? <p className="mt-0.5 text-[13px] text-faint">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}
