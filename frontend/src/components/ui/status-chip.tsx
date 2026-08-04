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
  critical: "border-rose-200 bg-rose-50 text-rose-700",
  warning: "border-amber-200 bg-amber-50 text-amber-700",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  neutral: "border-slate-200 bg-slate-100 text-slate-700",
};

export function StatusChip({ status, className }: StatusChipProps) {
  const tone = getTone(status);

  return (
    <span className={cn("inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]", toneClasses[tone], className)}>
      {status}
    </span>
  );
}