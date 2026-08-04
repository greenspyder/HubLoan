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
    <div className="rounded-[20px] border border-slate-200 bg-white p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Fluxo do contrato</p>
      <ol className="mt-4 grid gap-3 md:grid-cols-4">
        {FLOW_STEPS.map((step, index) => {
          const isDone = index < currentStepIndex;
          const isCurrent = index === currentStepIndex;

          return (
            <li
              key={step}
              className={`rounded-xl border px-3 py-3 text-sm ${
                isCurrent
                  ? "border-slate-900 bg-slate-900 text-white"
                  : isDone
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-slate-200 bg-slate-50 text-slate-500"
              }`}
            >
              <p className="text-[11px] uppercase tracking-[0.16em]">Etapa {index + 1}</p>
              <p className="mt-1 font-semibold">{step}</p>
            </li>
          );
        })}
      </ol>

      {exceptionLabel ? (
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
          {exceptionLabel}
        </p>
      ) : null}
    </div>
  );
}