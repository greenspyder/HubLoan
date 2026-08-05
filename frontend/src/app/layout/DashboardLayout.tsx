import { useEffect, useState } from "react";
import { Outlet, NavLink, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, UserCircle, Calendar, X, Settings, ChevronRight } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { getOperationalDate, setOperationalDate } from "../../services/creditService";
import { useImpersonation } from "../contexts/ImpersonationContext";

function getBreadcrumb(pathname: string) {
  if (pathname.startsWith("/cliente/ofertas/")) {
    return "Simulação de crédito";
  }

  if (pathname.startsWith("/admin/contratos/")) {
    return "Detalhes da operação";
  }

  if (pathname.startsWith("/cliente")) {
    return "Plataforma do cliente";
  }

  return "Plataforma administrativa";
}

export function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { impersonatedClientId, clearImpersonation } = useImpersonation();
  const [showConfig, setShowConfig] = useState(false);
  const [operationalDateInput, setOperationalDateInput] = useState("");
  const [operationalDateLabel, setOperationalDateLabel] = useState("-");
  const [savingOperationalDate, setSavingOperationalDate] = useState(false);
  const [configMessage, setConfigMessage] = useState("");

  const loadOperationalDate = async () => {
    const current = await getOperationalDate();
    setOperationalDateInput(current.usandoDataCustomizada ? current.dataAtual.slice(0, 10) : "");
    const formattedDate = new Date(current.dataAtual).toLocaleDateString("pt-BR");
    setOperationalDateLabel(`${formattedDate} ${current.usandoDataCustomizada ? "(customizada)" : "(relógio do sistema)"}`);
  };

  useEffect(() => {
    void loadOperationalDate().catch(() => {
      setOperationalDateLabel("Indisponível");
    });
  }, []);

  const handleApplyOperationalDate = async () => {
    if (!operationalDateInput) {
      setConfigMessage("Informe uma data válida.");
      return;
    }

    setSavingOperationalDate(true);
    setConfigMessage("");

    try {
      await setOperationalDate(operationalDateInput);
      await loadOperationalDate();
      setConfigMessage("Data operacional atualizada.");
    } catch (error) {
      setConfigMessage(error instanceof Error ? error.message : "Falha ao atualizar data operacional.");
    } finally {
      setSavingOperationalDate(false);
    }
  };

  const handleResetOperationalDate = async () => {
    setSavingOperationalDate(true);
    setConfigMessage("");

    try {
      await setOperationalDate(null);
      await loadOperationalDate();
      setConfigMessage("Data operacional voltou para o relógio do sistema.");
    } catch (error) {
      setConfigMessage(error instanceof Error ? error.message : "Falha ao limpar data operacional.");
    } finally {
      setSavingOperationalDate(false);
    }
  };

  return (
    <div className="min-h-screen text-slate-900 lg:grid lg:grid-cols-[272px_1fr]">
      {/* Sidebar */}
      <aside className="border-b border-white/[0.06] bg-gradient-to-b from-[#0c1322] to-[#080d18] px-4 py-6 lg:sticky lg:top-0 lg:flex lg:min-h-screen lg:flex-col lg:border-b-0 lg:border-r lg:border-white/[0.06]">
        {/* Brand */}
        <div className="flex items-center gap-3 px-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-400 to-indigo-600 text-[13px] font-black text-white shadow-[0_0_18px_rgba(99,102,241,0.5)]">
            HL
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-indigo-400/70">HubLoan</p>
            <p className="text-sm font-semibold text-white/90">Crédito corporativo</p>
          </div>
        </div>

        <div className="my-5 h-px bg-white/[0.06]" />

        <div>
          <p className="mb-2 px-2 text-[9px] font-bold uppercase tracking-[0.38em] text-slate-600">Menu</p>
          <nav className="space-y-0.5">
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? "bg-indigo-500/[0.18] text-indigo-300 ring-1 ring-inset ring-indigo-500/25"
                    : "text-slate-400 hover:bg-white/[0.05] hover:text-slate-200"
                }`
              }
            >
              <LayoutDashboard className="h-4 w-4 shrink-0" />
              Plataforma administrativa
            </NavLink>
            {impersonatedClientId !== null ? (
              <NavLink
                to="/cliente"
                className={({ isActive }) =>
                  `flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? "bg-indigo-500/[0.18] text-indigo-300 ring-1 ring-inset ring-indigo-500/25"
                      : "text-slate-400 hover:bg-white/[0.05] hover:text-slate-200"
                  }`
                }
              >
                <UserCircle className="h-4 w-4 shrink-0" />
                Plataforma do cliente
              </NavLink>
            ) : null}
          </nav>
        </div>

        <div className="flex-1" />

        {/* Operational date footer card */}
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-slate-500" />
            <p className="text-[9px] font-bold uppercase tracking-[0.28em] text-slate-600">Data operacional</p>
          </div>
          <p className="mt-1.5 text-xs font-medium text-slate-300">{operationalDateLabel}</p>
        </div>
      </aside>

      {/* Content area */}
      <div className="flex min-h-screen flex-col">
        {/* Header */}
        <header className="sticky top-0 z-10 border-b border-slate-200/60 bg-white/85 px-6 py-3.5 shadow-[0_1px_0_rgba(15,23,42,0.04)] backdrop-blur-xl">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
              <span className="text-[10px] font-bold uppercase tracking-[0.28em] text-slate-500">
                {getBreadcrumb(location.pathname)}
              </span>
            </div>
            {impersonatedClientId !== null ? (
              <div className="flex items-center gap-2 rounded-full border border-indigo-200 bg-gradient-to-r from-indigo-50 to-indigo-100/60 py-1.5 pl-2.5 pr-4">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500 text-[10px] font-bold text-white">
                  {impersonatedClientId}
                </span>
                <span className="text-xs font-semibold text-indigo-700">
                  Cliente #{impersonatedClientId}
                </span>
              </div>
            ) : null}
          </div>
        </header>

        <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8">
          <Outlet />
        </main>

        <footer className="border-t border-slate-200/60 px-6 py-4 text-xs text-slate-400">
          © 2024 HubLoan · Plataforma de crédito corporativo
        </footer>
      </div>

      {/* Floating config */}
      <div className="fixed bottom-5 right-5 z-40">
        <button
          type="button"
          onClick={() => setShowConfig((current) => !current)}
          className={`flex h-11 w-11 items-center justify-center rounded-full transition-all duration-200 ${
            showConfig
              ? "bg-slate-900 text-white shadow-[0_4px_18px_-4px_rgba(15,23,42,0.6)]"
              : "border border-slate-200 bg-white text-slate-500 shadow-md hover:-translate-y-0.5 hover:border-slate-300 hover:text-slate-800 hover:shadow-lg"
          }`}
        >
          <Settings className="h-4 w-4" />
        </button>

        {showConfig ? (
          <div className="absolute bottom-14 right-0 w-[320px] overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_20px_56px_-12px_rgba(15,23,42,0.28),0_0_0_1px_rgba(15,23,42,0.04)]">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">Menu rápido</p>
                <p className="text-xs text-slate-500">Contexto e controles operacionais</p>
              </div>
              <button
                type="button"
                onClick={() => setShowConfig(false)}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 p-4">
              <div className="grid gap-2">
                <Button variant="outline" className="w-full justify-start gap-2" onClick={() => navigate("/admin")}>
                  <LayoutDashboard className="h-4 w-4" />
                  Ir para administrativo
                </Button>
                {impersonatedClientId !== null ? (
                  <Button variant="outline" className="w-full justify-start gap-2" onClick={() => navigate("/cliente")}>
                    <UserCircle className="h-4 w-4" />
                    Ir para cliente
                  </Button>
                ) : null}
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                <p className="text-[9px] font-bold uppercase tracking-[0.28em] text-slate-500">Impersonação</p>
                {impersonatedClientId !== null ? (
                  <>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-[11px] font-bold text-indigo-600">
                        {impersonatedClientId}
                      </span>
                      <p className="text-sm font-medium text-slate-700">Cliente #{impersonatedClientId} ativo</p>
                    </div>
                    <Button
                      variant="outline"
                      className="mt-2.5 w-full"
                      onClick={() => {
                        clearImpersonation();
                        navigate("/admin");
                        setShowConfig(false);
                      }}
                    >
                      Encerrar impersonação
                    </Button>
                  </>
                ) : (
                  <p className="mt-2 text-xs text-slate-500">Nenhum cliente selecionado.</p>
                )}
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                  <p className="text-[9px] font-bold uppercase tracking-[0.28em] text-slate-500">Data operacional</p>
                </div>
                <p className="mt-1.5 text-xs text-slate-600">
                  Em uso: <span className="font-semibold text-slate-800">{operationalDateLabel}</span>
                </p>
                <Input className="mt-2.5 rounded-xl" type="date" value={operationalDateInput} onChange={(event) => setOperationalDateInput(event.target.value)} />
                <div className="mt-2.5 grid grid-cols-2 gap-2">
                  <Button onClick={() => void handleApplyOperationalDate()} disabled={savingOperationalDate}>
                    Aplicar
                  </Button>
                  <Button variant="outline" onClick={() => void handleResetOperationalDate()} disabled={savingOperationalDate}>
                    Usar hoje
                  </Button>
                </div>
              </div>

              {configMessage ? (
                <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">{configMessage}</p>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}