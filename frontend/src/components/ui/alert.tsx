import { cn } from "../../lib/utils";
import type { ReactNode } from "react";

type AlertVariant = "success" | "error" | "warning" | "neutral";

const styles: Record<AlertVariant, { container: string; dot: string }> = {
  success: { container: "border-emerald-200 bg-emerald-50 text-emerald-800", dot: "bg-emerald-500" },
  error: { container: "border-rose-200 bg-rose-50 text-rose-800", dot: "bg-rose-500" },
  warning: { container: "border-amber-200 bg-amber-50 text-amber-800", dot: "bg-amber-500" },
  neutral: { container: "border-slate-200 bg-slate-50 text-slate-700", dot: "bg-slate-400" },
};

type AlertProps = {
  children: ReactNode;
  variant?: AlertVariant;
  className?: string;
};

export function detectAlertVariant(message: string): AlertVariant {
  const lower = message.toLowerCase();
  if (
    lower.includes("sucesso") ||
    lower.includes("criado") ||
    lower.includes("realizado") ||
    lower.includes("autorizado") ||
    lower.includes("assinado") ||
    lower.includes("contratada") ||
    lower.includes("executado") ||
    lower.includes("processamento")
  ) {
    return "success";
  }
  if (lower.includes("falha") || lower.includes("não foi") || lower.includes("erro") || lower.includes("inválido")) {
    return "error";
  }
  return "neutral";
}

export function Alert({ children, variant = "neutral", className }: AlertProps) {
  const { container, dot } = styles[variant];
  return (
    <div role="alert" className={cn("flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm font-medium", container, className)}>
      <span className={cn("mt-[3px] h-2 w-2 shrink-0 rounded-full", dot)} />
      <span>{children}</span>
    </div>
  );
}
