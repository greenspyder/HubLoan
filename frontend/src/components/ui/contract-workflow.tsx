import { Fragment } from "react";

type ContractWorkflowProps = {
  status: string;
};

const FLOW_STEPS = [
  "Geração de contratos",
  "Pendente assinatura",
  "Aguardando desembolso",
  "Desembolsado",
] as const;

function normalizeStatus(status: string) {
  return status.trim().toLowerCase();
}

function getCurrentStepIndex(status: string) {
  const normalized = normalizeStatus(status);

  if (normalized.includes("gera")) {
    return 0;
  }

  if (normalized.includes("pendente assin")) {
    return 1;
  }

  if (normalized.includes("aguardando desemb")) {
    return 2;
  }

  return 3;
}

function getExceptionLabel(status: string) {
  const normalized = normalizeStatus(status);

  if (normalized.includes("atras")) {
    return "Contrato com parcelas em atraso";
  }

  if (normalized.includes("expir")) {
    return "Contrato expirado";
  }

  return null;
}

export function ContractWorkflow({ status }: ContractWorkflowProps) {
  const currentStepIndex = getCurrentStepIndex(status);
  const exceptionLabel = getExceptionLabel(status);

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_4px_20px_-4px_rgba(15,23,42,0.07)]">
      <p className="text-[10px] font-bold uppercase tracking-[0.32em] text-indigo-500">Fluxo do contrato</p>

      {/* Step indicators with connecting lines */}
      <div className="mt-5 flex items-center px-2">
        {FLOW_STEPS.map((step, index) => (
          <Fragment key={step}>
            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all ${
              index < currentStepIndex
                ? "bg-emerald-500 text-white"
                : index === currentStepIndex
                  ? "bg-indigo-600 text-white shadow-[0_0_0_4px_rgba(99,102,241,0.18)]"
                  : "border-2 border-slate-200 bg-white text-slate-400"
            }`}>
              {index < currentStepIndex ? "✓" : index + 1}
            </div>
            {index < FLOW_STEPS.length - 1 ? (
              <div className={`h-0.5 flex-1 ${index < currentStepIndex ? "bg-emerald-300" : "bg-slate-100"}`} />
            ) : null}
          </Fragment>
        ))}
      </div>

      {/* Labels */}
      <div className="mt-2.5 grid grid-cols-4">
        {FLOW_STEPS.map((step, index) => (
          <p key={`label-${step}`} className={`px-1 text-center text-[11px] font-medium leading-tight ${
            index < currentStepIndex
              ? "text-emerald-700"
              : index === currentStepIndex
                ? "text-indigo-700"
                : "text-slate-400"
          }`}>
            {step}
          </p>
        ))}
      </div>

      {exceptionLabel ? (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
          ⚠ {exceptionLabel}
        </div>
      ) : null}
    </div>
  );
}