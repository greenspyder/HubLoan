import { cn } from "../../lib/utils";

type StatusChipProps = {
  status: string;
  className?: string;
};

function getTone(status: string) {
  const normalized = status.trim().toLowerCase();

  if (normalized.includes("atras") || normalized.includes("expir")) {
    return "critical";
  }

  if (normalized.includes("pend") || normalized.includes("aguard")) {
    return "warning";
  }

  if (normalized.includes("pago") || normalized.includes("desemb") || normalized.includes("aprovad") || normalized.includes("ativa")) {
    return "success";
  }

  return "neutral";
}

const toneClasses: Record<string, string> = {
  critical: "border-rose-200 bg-rose-50/80 text-rose-700",
  warning: "border-amber-200 bg-amber-50/80 text-amber-700",
  success: "border-emerald-200 bg-emerald-50/80 text-emerald-700",
  neutral: "border-slate-200 bg-slate-50 text-slate-600",
};

const dotClasses: Record<string, string> = {
  critical: "bg-rose-500",
  warning: "bg-amber-500",
  success: "bg-emerald-500",
  neutral: "bg-slate-400",
};

export function StatusChip({ status, className }: StatusChipProps) {
  const tone = getTone(status);

  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-[0.12em]", toneClasses[tone], className)}>
      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", dotClasses[tone])} />
      {status}
    </span>
  );
}